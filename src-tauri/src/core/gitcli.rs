use crate::core::{errors::AppError, fs::Vault};
use serde::Serialize;
use std::process::Command;

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitStatus {
    pub branch: String,
    pub ahead: i32,
    pub behind: i32,
    pub dirty: bool,
    pub conflicted: Vec<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteStatus {
    pub reachable: bool,
    pub authed: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
pub struct PullResult {
    pub conflicts: Vec<String>,
}

pub fn git_available() -> bool {
    Command::new("git")
        .arg("--version")
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

pub fn remote_url(vault: &Vault) -> Option<String> {
    git_output(vault, &["remote", "get-url", "origin"])
        .ok()
        .map(|output| output.trim().to_string())
        .filter(|output| !output.is_empty())
}

pub fn ensure_git() -> Result<(), AppError> {
    if git_available() {
        Ok(())
    } else {
        Err(AppError::new(
            "GIT_MISSING",
            "Git is not available. Install Xcode Command Line Tools with `xcode-select --install`.",
        ))
    }
}

pub fn status(vault: &Vault) -> Result<GitStatus, AppError> {
    ensure_git()?;
    let output = git_output(vault, &["status", "--porcelain=v2", "--branch"])?;
    Ok(parse_status(&output))
}

pub fn remote_status(vault: &Vault) -> Result<RemoteStatus, AppError> {
    ensure_git()?;
    let output = Command::new("git")
        .current_dir(&vault.root)
        .args(["ls-remote", "--exit-code", "origin"])
        .output()?;
    if output.status.success() {
        Ok(RemoteStatus {
            reachable: true,
            authed: true,
            message: None,
        })
    } else {
        let message = stderr_or_stdout(&output);
        Ok(RemoteStatus {
            reachable: false,
            authed: !message.to_lowercase().contains("authentication")
                && !message.to_lowercase().contains("permission denied"),
            message: Some(message),
        })
    }
}

pub fn convert(vault: &Vault, remote_url: &str) -> Result<(), AppError> {
    ensure_git()?;
    if !vault.root.join(".git").exists() {
        git_run(vault, &["init"])?;
    }
    crate::core::fs::ensure_vault_layout(vault)?;
    git_run(vault, &["add", "-A"])?;
    let _ = git_run(vault, &["commit", "--allow-empty", "-m", "Initial GitNotes vault"]);
    set_remote(vault, remote_url)?;

    let branch = current_branch(vault).unwrap_or_else(|| "main".to_string());
    match git_run(vault, &["push", "-u", "origin", &branch]) {
        Ok(()) => Ok(()),
        Err(first_err) => {
            let pull = git_run(
                vault,
                &[
                    "pull",
                    "--no-rebase",
                    "--allow-unrelated-histories",
                    "origin",
                    &branch,
                ],
            );
            if pull.is_ok() {
                git_run(vault, &["push", "-u", "origin", &branch])
            } else {
                Err(first_err)
            }
        }
    }
}

pub fn set_remote(vault: &Vault, url: &str) -> Result<(), AppError> {
    ensure_git()?;
    let existing = git_output(vault, &["remote"]).unwrap_or_default();
    if existing.lines().any(|line| line == "origin") {
        git_run(vault, &["remote", "set-url", "origin", url])
    } else {
        git_run(vault, &["remote", "add", "origin", url])
    }
}

pub fn pull(vault: &Vault) -> Result<PullResult, AppError> {
    ensure_git()?;
    let before = status(vault).unwrap_or_else(|_| GitStatus {
        branch: "main".to_string(),
        ahead: 0,
        behind: 0,
        dirty: false,
        conflicted: Vec::new(),
    });
    if before.dirty && before.conflicted.is_empty() {
        git_run(vault, &["add", "-A"])?;
        let _ = git_run(vault, &["commit", "-m", "GitNotes autosave before pull"]);
    }
    let pull = git_run(vault, &["pull", "--no-rebase"]);
    let after = status(vault)?;
    if !after.conflicted.is_empty() {
        return Ok(PullResult {
            conflicts: after.conflicted,
        });
    }
    pull?;
    Ok(PullResult {
        conflicts: Vec::new(),
    })
}

pub fn commit_push(vault: &Vault, message: &str) -> Result<(), AppError> {
    ensure_git()?;
    git_run(vault, &["add", "-A"])?;
    let _ = git_run(vault, &["commit", "-m", message]);
    match git_run(vault, &["push"]) {
        Ok(()) => Ok(()),
        Err(err) if err.message.to_lowercase().contains("non-fast-forward") => Err(AppError::new(
            "PULL_FIRST",
            "Remote has new commits. Pull before pushing.",
        )),
        Err(err) => Err(err),
    }
}

pub fn resolve_conflict(vault: &Vault, rel: &str) -> Result<(), AppError> {
    git_run(vault, &["add", rel])?;
    let remaining = status(vault)?.conflicted;
    if remaining.is_empty() {
        let _ = git_run(vault, &["commit", "--no-edit"]);
    }
    Ok(())
}

pub fn parse_status(output: &str) -> GitStatus {
    let mut status = GitStatus {
        branch: "unknown".to_string(),
        ahead: 0,
        behind: 0,
        dirty: false,
        conflicted: Vec::new(),
    };

    for line in output.lines() {
        if let Some(branch) = line.strip_prefix("# branch.head ") {
            status.branch = branch.to_string();
        } else if let Some(ab) = line.strip_prefix("# branch.ab ") {
            for part in ab.split_whitespace() {
                if let Some(ahead) = part.strip_prefix('+') {
                    status.ahead = ahead.parse().unwrap_or(0);
                } else if let Some(behind) = part.strip_prefix('-') {
                    status.behind = behind.parse().unwrap_or(0);
                }
            }
        } else if !line.starts_with('#') && !line.is_empty() {
            status.dirty = true;
            if line.starts_with("u ") {
                if let Some(path) = porcelain_path(line) {
                    status.conflicted.push(path);
                }
            }
        }
    }

    status
}

fn current_branch(vault: &Vault) -> Option<String> {
    git_output(vault, &["branch", "--show-current"])
        .ok()
        .map(|branch| branch.trim().to_string())
        .filter(|branch| !branch.is_empty())
}

fn porcelain_path(line: &str) -> Option<String> {
    line.split('\t')
        .last()
        .filter(|path| *path != line)
        .map(|path| path.to_string())
        .or_else(|| line.split_whitespace().last().map(|path| path.to_string()))
}

fn git_run(vault: &Vault, args: &[&str]) -> Result<(), AppError> {
    let output = Command::new("git").current_dir(&vault.root).args(args).output()?;
    if output.status.success() {
        Ok(())
    } else {
        Err(AppError::new("GIT_ERROR", stderr_or_stdout(&output)))
    }
}

fn git_output(vault: &Vault, args: &[&str]) -> Result<String, AppError> {
    let output = Command::new("git").current_dir(&vault.root).args(args).output()?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(AppError::new("GIT_ERROR", stderr_or_stdout(&output)))
    }
}

fn stderr_or_stdout(output: &std::process::Output) -> String {
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    if stderr.is_empty() {
        String::from_utf8_lossy(&output.stdout).trim().to_string()
    } else {
        stderr
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::{atomic_write::atomic_write, fs::ensure_vault_layout};
    use std::{fs, process::Command};
    use tempfile::TempDir;

    // ── unit tests: status parser ────────────────────────────────────────────

    #[test]
    fn parse_clean_status() {
        let output = "# branch.head main\n# branch.ab +0 -0\n";
        let s = parse_status(output);
        assert_eq!(s.branch, "main");
        assert_eq!(s.ahead, 0);
        assert_eq!(s.behind, 0);
        assert!(!s.dirty);
        assert!(s.conflicted.is_empty());
    }

    #[test]
    fn parse_ahead_behind_and_dirty() {
        let output = "# branch.head feature\n# branch.ab +3 -2\n\
            1 M. N... 100644 100644 100644 aaa bbb notes.md\n";
        let s = parse_status(output);
        assert_eq!(s.branch, "feature");
        assert_eq!(s.ahead, 3);
        assert_eq!(s.behind, 2);
        assert!(s.dirty);
        assert!(s.conflicted.is_empty());
    }

    #[test]
    fn parse_conflicted_file() {
        let output = "# branch.head main\n# branch.ab +0 -0\n\
            u UU N... 100644 100644 100644 100644 aaa bbb ccc\tconflict.md\n";
        let s = parse_status(output);
        assert!(s.dirty);
        assert_eq!(s.conflicted, vec!["conflict.md"]);
    }

    // ── integration tests: full Git workflow ─────────────────────────────────

    fn git_user_configured() -> bool {
        Command::new("git")
            .args(["config", "user.email"])
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }

    fn git_cmd(dir: &std::path::Path, args: &[&str]) -> bool {
        Command::new("git")
            .current_dir(dir)
            .args(args)
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }

    #[test]
    fn git_init_commit_push_pull() {
        if !git_available() || !git_user_configured() {
            eprintln!("Skipping: git unavailable or user not configured");
            return;
        }

        // 1. Set up a bare remote repository.
        let remote_dir = TempDir::new().unwrap();
        assert!(git_cmd(remote_dir.path(), &["init", "--bare"]));

        // 2. Convert a temp vault to git, pointing at the bare remote.
        let v1_dir = TempDir::new().unwrap();
        let v1_root = fs::canonicalize(v1_dir.path()).unwrap();
        let v1 = Vault { root: v1_root.clone() };
        ensure_vault_layout(&v1).unwrap();
        atomic_write(&v1.root.join("note.md"), "# First Note\n\nHello!").unwrap();

        let remote_url = remote_dir.path().to_string_lossy().to_string();
        convert(&v1, &remote_url).unwrap();

        let gs = status(&v1).unwrap();
        assert_eq!(gs.ahead, 0);
        assert!(!gs.dirty);

        // 3. Clone the remote into a second "client" vault.
        let v2_dir = TempDir::new().unwrap();
        let v2_root = v2_dir.path().to_path_buf();
        assert!(
            Command::new("git")
                .args(["clone", &remote_url, &v2_root.to_string_lossy()])
                .output()
                .unwrap()
                .status
                .success(),
            "clone failed"
        );

        // 4. Add a new commit from v2 and push.
        fs::write(v2_root.join("from_v2.md"), "# From V2").unwrap();
        git_cmd(&v2_root, &["add", "-A"]);
        git_cmd(&v2_root, &["commit", "-m", "add from_v2"]);
        git_cmd(&v2_root, &["push"]);

        // 5. Pull in v1 — should get from_v2.md with no conflicts.
        let pull_result = pull(&v1).unwrap();
        assert!(pull_result.conflicts.is_empty(), "Expected clean pull");
        assert!(v1_root.join("from_v2.md").exists(), "Pulled file should appear in v1");

        // 6. Create a conflict: both vaults modify conflict.md differently.
        atomic_write(&v1.root.join("conflict.md"), "# v1 version\n").unwrap();
        git_cmd(&v1_root, &["add", "-A"]);
        git_cmd(&v1_root, &["commit", "-m", "v1 conflict"]);

        fs::write(v2_root.join("conflict.md"), "# v2 version\n").unwrap();
        git_cmd(&v2_root, &["add", "-A"]);
        git_cmd(&v2_root, &["commit", "-m", "v2 conflict"]);
        git_cmd(&v2_root, &["push"]);

        // 7. Pull in v1 again — should surface a conflict.
        let pull_result = pull(&v1).unwrap();
        assert!(!pull_result.conflicts.is_empty(), "Expected a conflict");
        assert!(pull_result.conflicts.contains(&"conflict.md".to_string()));

        // 8. Resolve the conflict.
        let resolved = "# Resolved version\n\nMerged manually.";
        atomic_write(&v1.root.join("conflict.md"), resolved).unwrap();
        resolve_conflict(&v1, "conflict.md").unwrap();

        let final_status = status(&v1).unwrap();
        assert!(final_status.conflicted.is_empty(), "No conflicts should remain after resolve");
    }
}
