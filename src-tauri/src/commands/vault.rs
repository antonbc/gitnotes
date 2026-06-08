use crate::{
    core::{
        errors::AppError,
        fs::{canonicalize_vault, ensure_vault_layout, VaultInfo},
        gitcli, index, watcher,
    },
    state::AppState,
};
use rusqlite::Connection;
use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
pub async fn pick_and_open_vault(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<Option<VaultInfo>, AppError> {
    let Some(path) = app.dialog().file().blocking_pick_folder() else {
        return Ok(None);
    };
    let path = path.as_path().ok_or_else(|| {
        AppError::new("INVALID_PATH", "Selected folder is not a filesystem path.")
    })?;
    open_vault_inner(app, &state, path.to_string_lossy().as_ref()).map(Some)
}

#[tauri::command]
pub fn open_vault(
    app: AppHandle,
    state: State<'_, AppState>,
    path: String,
) -> Result<VaultInfo, AppError> {
    open_vault_inner(app, &state, &path)
}

fn open_vault_inner(
    app: AppHandle,
    state: &State<'_, AppState>,
    path: &str,
) -> Result<VaultInfo, AppError> {
    let vault = canonicalize_vault(path)?;
    ensure_vault_layout(&vault)?;
    state.set_vault(vault.clone())?;

    let watcher = watcher::start(app.clone(), vault.clone())?;
    state.set_watcher(watcher)?;
    reindex_vault_background(
        app.clone(),
        vault.clone(),
        state.app_data().join("index.sqlite"),
    );

    let remote = gitcli::remote_url(&vault);
    let mode = if vault.root.join(".git").exists() {
        "git"
    } else {
        "local"
    };
    Ok(VaultInfo {
        root: vault.root.to_string_lossy().into_owned(),
        mode: mode.to_string(),
        remote,
    })
}

fn reindex_vault_background(
    app: AppHandle,
    vault: crate::core::fs::Vault,
    db_path: std::path::PathBuf,
) {
    tauri::async_runtime::spawn_blocking(move || {
        let result = (|| -> Result<(), AppError> {
            let mut db = Connection::open(db_path)?;
            index::init(&db)?;
            index::reindex_vault(&mut db, &vault, Some(&app))
        })();

        if let Err(err) = result {
            eprintln!("GitNotes background reindex failed: {err}");
        }
    });
}
