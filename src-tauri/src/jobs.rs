use serde::Serialize;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Clone, Debug, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum JobStatus {
    Downloading { progress: f32 },
    Done { file_path: String, filename: String },
    Error { message: String },
}

#[derive(Clone, Debug, Serialize)]
pub struct Job {
    pub id: String,
    pub url: String,
    pub title: String,
    pub status: JobStatus,
}

#[derive(Default, Clone)]
pub struct JobStore(pub Arc<RwLock<HashMap<String, Job>>>);

impl JobStore {
    pub async fn insert(&self, job: Job) {
        self.0.write().await.insert(job.id.clone(), job);
    }

    pub async fn get(&self, id: &str) -> Option<Job> {
        self.0.read().await.get(id).cloned()
    }

    pub async fn update_progress(&self, id: &str, progress: f32) {
        if let Some(job) = self.0.write().await.get_mut(id) {
            job.status = JobStatus::Downloading { progress };
        }
    }

    pub async fn mark_done(&self, id: &str, file_path: PathBuf, filename: String) {
        if let Some(job) = self.0.write().await.get_mut(id) {
            job.status = JobStatus::Done {
                file_path: file_path.to_string_lossy().to_string(),
                filename,
            };
        }
    }

    pub async fn mark_error(&self, id: &str, message: String) {
        if let Some(job) = self.0.write().await.get_mut(id) {
            job.status = JobStatus::Error { message };
        }
    }
}
