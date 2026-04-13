use serde::Serialize;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Clone, Debug, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum CompressJobStatus {
    Compressing {
        progress: f64,
        speed: Option<String>,
        pass: Option<u32>,
        total_passes: Option<u32>,
    },
    Done {
        output_path: String,
        output_filename: String,
        output_size: u64,
    },
    Error {
        message: String,
    },
    Cancelled,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompressJob {
    pub id: String,
    pub input_path: String,
    pub input_filename: String,
    pub output_path: String,
    pub status: CompressJobStatus,
    pub duration_secs: f64,
}

#[derive(Default, Clone)]
pub struct CompressJobStore {
    pub jobs: Arc<RwLock<HashMap<String, CompressJob>>>,
    pub pids: Arc<RwLock<HashMap<String, u32>>>,
}

impl CompressJobStore {
    pub async fn insert(&self, job: CompressJob) {
        self.jobs.write().await.insert(job.id.clone(), job);
    }

    pub async fn get(&self, id: &str) -> Option<CompressJob> {
        self.jobs.read().await.get(id).cloned()
    }

    pub async fn update_progress(&self, id: &str, progress: f64, speed: Option<String>, pass: Option<u32>, total_passes: Option<u32>) {
        if let Some(job) = self.jobs.write().await.get_mut(id) {
            if let CompressJobStatus::Compressing {
                progress: ref mut p,
                speed: ref mut s,
                pass: ref mut pa,
                total_passes: ref mut tp,
            } = job.status
            {
                if progress >= 0.0 {
                    *p = progress;
                }
                if speed.is_some() {
                    *s = speed;
                }
                if pass.is_some() {
                    *pa = pass;
                }
                if total_passes.is_some() {
                    *tp = total_passes;
                }
            }
        }
    }

    pub async fn mark_done(&self, id: &str, output_path: String, output_filename: String, output_size: u64) {
        if let Some(job) = self.jobs.write().await.get_mut(id) {
            job.status = CompressJobStatus::Done {
                output_path,
                output_filename,
                output_size,
            };
        }
    }

    pub async fn mark_error(&self, id: &str, message: String) {
        if let Some(job) = self.jobs.write().await.get_mut(id) {
            job.status = CompressJobStatus::Error { message };
        }
    }

    pub async fn mark_cancelled(&self, id: &str) {
        if let Some(job) = self.jobs.write().await.get_mut(id) {
            job.status = CompressJobStatus::Cancelled;
        }
    }

    pub async fn store_pid(&self, id: &str, pid: u32) {
        self.pids.write().await.insert(id.to_string(), pid);
    }

    pub async fn remove_pid(&self, id: &str) {
        self.pids.write().await.remove(id);
    }

    pub async fn get_pid(&self, id: &str) -> Option<u32> {
        self.pids.read().await.get(id).copied()
    }
}
