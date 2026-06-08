use crate::{
    core::{
        errors::AppError,
        fs::{canonicalize_vault, ensure_vault_layout, VaultInfo},
        gitcli, index, watcher,
    },
    state::AppState,
};
use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
pub fn pick_and_open_vault(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<Option<VaultInfo>, AppError> {
    let Some(path) = app.dialog().file().blocking_pick_folder() else {
        return Ok(None);
    };
    let path = path
        .as_path()
        .ok_or_else(|| AppError::new("INVALID_PATH", "Selected folder is not a filesystem path."))?;
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

    {
        let mut db = state.db()?;
        index::reindex_vault(&mut db, &vault, Some(&app))?;
    }

    let watcher = watcher::start(app, vault.clone())?;
    state.set_watcher(watcher)?;

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
