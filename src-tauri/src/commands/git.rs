use crate::{
    core::{
        atomic_write::atomic_write,
        errors::AppError,
        fs::resolve_for_write,
        gitcli::{self, GitStatus, PullResult, RemoteStatus},
    },
    state::AppState,
};
use tauri::State;

#[tauri::command]
pub async fn check_git_available() -> bool {
    gitcli::git_available()
}

#[tauri::command]
pub async fn git_remote_status(state: State<'_, AppState>) -> Result<RemoteStatus, AppError> {
    let vault = state.vault()?;
    gitcli::remote_status(&vault)
}

#[tauri::command]
pub async fn git_status(state: State<'_, AppState>) -> Result<GitStatus, AppError> {
    let vault = state.vault()?;
    gitcli::status(&vault)
}

#[tauri::command]
pub async fn convert_vault_to_git(
    state: State<'_, AppState>,
    remote_url: String,
) -> Result<(), AppError> {
    let vault = state.vault()?;
    gitcli::convert(&vault, &remote_url)
}

#[tauri::command]
pub async fn set_git_remote(state: State<'_, AppState>, url: String) -> Result<(), AppError> {
    let vault = state.vault()?;
    gitcli::set_remote(&vault, &url)
}

#[tauri::command]
pub async fn git_pull(state: State<'_, AppState>) -> Result<PullResult, AppError> {
    let vault = state.vault()?;
    gitcli::pull(&vault)
}

#[tauri::command]
pub async fn git_commit_push(state: State<'_, AppState>, message: String) -> Result<(), AppError> {
    let vault = state.vault()?;
    gitcli::commit_push(&vault, &message)
}

#[tauri::command]
pub async fn git_resolve_conflict(
    state: State<'_, AppState>,
    path: String,
    resolved_content: String,
) -> Result<(), AppError> {
    let vault = state.vault()?;
    let target = resolve_for_write(&vault, &path)?;
    atomic_write(&target, &resolved_content)?;
    gitcli::resolve_conflict(&vault, &path)
}
