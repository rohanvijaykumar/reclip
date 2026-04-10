use serde::Serialize;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Clone, Debug, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum ConvertJobStatus {
    Converting {
        progress: f64,
        speed: Option<String>,
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
pub struct ConvertJob {
    pub id: String,
    pub input_path: String,
    pub input_filename: String,
    pub output_path: String,
    pub status: ConvertJobStatus,
    pub duration_secs: f64,
}

#[derive(Default, Clone)]
pub struct ConvertJobStore {
    pub jobs: Arc<RwLock<HashMap<String, ConvertJob>>>,
    // Store process IDs for cancellation
    pub pids: Arc<RwLock<HashMap<String, u32>>>,
}

impl ConvertJobStore {
    pub async fn insert(&self, job: ConvertJob) {
        self.jobs.write().await.insert(job.id.clone(), job);
    }

    pub async fn get(&self, id: &str) -> Option<ConvertJob> {
        self.jobs.read().await.get(id).cloned()
    }

    pub async fn update_progress(&self, id: &str, progress: f64, speed: Option<String>) {
        if let Some(job) = self.jobs.write().await.get_mut(id) {
            job.status = ConvertJobStatus::Converting { progress, speed };
        }
    }

    pub async fn mark_done(&self, id: &str, output_path: String, output_filename: String, output_size: u64) {
        if let Some(job) = self.jobs.write().await.get_mut(id) {
            job.status = ConvertJobStatus::Done {
                output_path,
                output_filename,
                output_size,
            };
        }
    }

    pub async fn mark_error(&self, id: &str, message: String) {
        if let Some(job) = self.jobs.write().await.get_mut(id) {
            job.status = ConvertJobStatus::Error { message };
        }
    }

    pub async fn mark_cancelled(&self, id: &str) {
        if let Some(job) = self.jobs.write().await.get_mut(id) {
            job.status = ConvertJobStatus::Cancelled;
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
