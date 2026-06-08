use crate::core::{
    errors::AppError,
    fs::{normalize_rel, Vault},
};
use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::{
    collections::BTreeSet,
    path::Path,
    sync::mpsc,
    time::Duration,
};
use tauri::{AppHandle, Emitter};

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct VaultChanged {
    paths: Vec<String>,
}

pub fn start(app: AppHandle, vault: Vault) -> Result<RecommendedWatcher, AppError> {
    let (tx, rx) = mpsc::channel::<notify::Result<Event>>();
    let mut watcher = RecommendedWatcher::new(
        move |result| {
            let _ = tx.send(result);
        },
        Config::default().with_poll_interval(Duration::from_secs(2)),
    )
    .map_err(|err| AppError::new("WATCHER_ERROR", err.to_string()))?;
    watcher
        .watch(&vault.root, RecursiveMode::Recursive)
        .map_err(|err| AppError::new("WATCHER_ERROR", err.to_string()))?;

    std::thread::spawn(move || {
        let mut pending = BTreeSet::new();
        loop {
            match rx.recv_timeout(Duration::from_millis(250)) {
                Ok(Ok(event)) => {
                    for path in event.paths {
                        if should_emit(&path, &vault) {
                            if let Ok(rel) = normalize_rel(&path, &vault) {
                                pending.insert(rel);
                            }
                        }
                    }
                }
                Ok(Err(_)) => {}
                Err(mpsc::RecvTimeoutError::Timeout) => {
                    if !pending.is_empty() {
                        let paths = pending.iter().cloned().collect::<Vec<_>>();
                        pending.clear();
                        let _ = app.emit("vault_changed", VaultChanged { paths });
                    }
                }
                Err(mpsc::RecvTimeoutError::Disconnected) => break,
            }
        }
    });

    Ok(watcher)
}

fn should_emit(path: &Path, vault: &Vault) -> bool {
    if !path.starts_with(&vault.root) {
        return false;
    }
    let Ok(rel) = path.strip_prefix(&vault.root) else {
        return false;
    };
    for component in rel.components() {
        let part = component.as_os_str().to_string_lossy();
        if part == ".git" || part == ".archive" || part.ends_with(".tmp") || part.ends_with(".swp")
        {
            return false;
        }
    }
    true
}
