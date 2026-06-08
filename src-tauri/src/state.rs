use crate::core::{
    errors::AppError,
    fs::{app_data_dir, Vault},
    index,
};
use notify::RecommendedWatcher;
use rusqlite::Connection;
use std::{
    path::PathBuf,
    sync::{Mutex, MutexGuard},
};

pub struct AppState {
    vault: Mutex<Option<Vault>>,
    db: Mutex<Connection>,
    watcher: Mutex<Option<RecommendedWatcher>>,
    app_data: PathBuf,
}

impl AppState {
    pub fn new() -> Result<Self, AppError> {
        let app_data = app_data_dir()?;
        let db_path = app_data.join("index.sqlite");
        let db = Connection::open(db_path)?;
        index::init(&db)?;
        Ok(Self {
            vault: Mutex::new(None),
            db: Mutex::new(db),
            watcher: Mutex::new(None),
            app_data,
        })
    }

    pub fn app_data(&self) -> &PathBuf {
        &self.app_data
    }

    pub fn set_vault(&self, vault: Vault) -> Result<(), AppError> {
        *self.vault.lock().map_err(lock_error)? = Some(vault);
        Ok(())
    }

    pub fn vault(&self) -> Result<Vault, AppError> {
        self.vault
            .lock()
            .map_err(lock_error)?
            .clone()
            .ok_or_else(AppError::vault_closed)
    }

    pub fn db(&self) -> Result<MutexGuard<'_, Connection>, AppError> {
        self.db.lock().map_err(lock_error)
    }

    pub fn set_watcher(&self, watcher: RecommendedWatcher) -> Result<(), AppError> {
        *self.watcher.lock().map_err(lock_error)? = Some(watcher);
        Ok(())
    }
}

fn lock_error<T>(_: std::sync::PoisonError<T>) -> AppError {
    AppError::new("STATE_LOCKED", "Application state lock was poisoned.")
}
