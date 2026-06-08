use crate::{
    core::{
        errors::AppError,
        fs::{resolve_for_write, safe_relative_path},
    },
    state::AppState,
};
use serde::Serialize;
use std::path::Path;
use tauri::State;
use typst::{
    diag::{Severity, SourceDiagnostic},
    layout::PagedDocument,
    WorldExt,
};
use typst_as_lib::{typst_kit_options::TypstKitFontOptions, TypstEngine};

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum DiagnosticSeverity {
    Error,
    Warning,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Diagnostic {
    pub line: usize,
    pub col: usize,
    pub severity: DiagnosticSeverity,
    pub message: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TypstResult {
    pub svg_pages: Vec<String>,
    pub diagnostics: Vec<Diagnostic>,
}

#[tauri::command]
pub fn compile_typst(
    state: State<'_, AppState>,
    path: String,
    content: String,
) -> Result<TypstResult, AppError> {
    let vault = state.vault()?;
    let safe = safe_relative_path(&path)?;
    if safe.extension().and_then(|ext| ext.to_str()) != Some("typ") {
        return Err(AppError::new("INVALID_EXT", "Typst preview requires a .typ file."));
    }
    let _ = resolve_for_write(&vault, &path)?;
    let file_id = safe.to_string_lossy().replace('\\', "/");
    Ok(compile_typst_inner(&vault.root, &file_id, &content))
}

pub fn compile_typst_inner(vault_root: &Path, file_id: &str, content: &str) -> TypstResult {
    let engine = TypstEngine::builder()
        .with_static_source_file_resolver([(file_id, content)])
        .with_file_system_resolver(vault_root)
        .search_fonts_with(
            TypstKitFontOptions::default()
                .include_system_fonts(true)
                .include_embedded_fonts(true),
        )
        .build();

    match engine.with_world(file_id, |world| {
        let warned = typst::compile::<PagedDocument>(world);
        let mut diagnostics = warned
            .warnings
            .iter()
            .map(|diag| diagnostic_from(world, content, diag))
            .collect::<Vec<_>>();

        match warned.output {
            Ok(document) => {
                let svg_pages = document.pages.iter().map(typst_svg::svg).collect();
                TypstResult { svg_pages, diagnostics }
            }
            Err(errors) => {
                diagnostics
                    .extend(errors.iter().map(|diag| diagnostic_from(world, content, diag)));
                TypstResult { svg_pages: Vec::new(), diagnostics }
            }
        }
    }) {
        Ok(result) => result,
        Err(err) => TypstResult {
            svg_pages: Vec::new(),
            diagnostics: vec![Diagnostic {
                line: 1,
                col: 1,
                severity: DiagnosticSeverity::Error,
                message: err.to_string(),
            }],
        },
    }
}

fn diagnostic_from(
    world: &typst_as_lib::TypstWorld<'_>,
    content: &str,
    diag: &SourceDiagnostic,
) -> Diagnostic {
    let (line, col) = world
        .range(diag.span)
        .map(|range| line_col(content, range.start))
        .unwrap_or((1, 1));
    Diagnostic {
        line,
        col,
        severity: match diag.severity {
            Severity::Error => DiagnosticSeverity::Error,
            Severity::Warning => DiagnosticSeverity::Warning,
        },
        message: diag.message.to_string(),
    }
}

fn line_col(content: &str, offset: usize) -> (usize, usize) {
    let mut line = 1;
    let mut col = 1;
    for (idx, ch) in content.char_indices() {
        if idx >= offset {
            break;
        }
        if ch == '\n' {
            line += 1;
            col = 1;
        } else {
            col += 1;
        }
    }
    (line, col)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn valid_typst_produces_svg_pages() {
        let tmp = TempDir::new().unwrap();
        let result =
            compile_typst_inner(tmp.path(), "test.typ", "= Hello World\n\nThis is a test.");
        assert!(
            !result.svg_pages.is_empty(),
            "Valid Typst should produce at least one SVG page"
        );
        assert!(
            result.diagnostics.iter().all(|d| !matches!(d.severity, DiagnosticSeverity::Error)),
            "Valid Typst should have no errors"
        );
    }

    #[test]
    fn invalid_typst_produces_error_diagnostics() {
        let tmp = TempDir::new().unwrap();
        let result = compile_typst_inner(tmp.path(), "test.typ", "#let x = (");
        assert!(result.svg_pages.is_empty(), "Failed compile should produce no SVGs");
        assert!(!result.diagnostics.is_empty(), "Should report diagnostics");
        assert!(
            result.diagnostics.iter().any(|d| matches!(d.severity, DiagnosticSeverity::Error)),
            "Should have at least one error diagnostic"
        );
    }

    #[test]
    fn vault_relative_import_resolves() {
        let tmp = TempDir::new().unwrap();
        fs::write(
            tmp.path().join("lib.typ"),
            "#let greet(name) = [Hello, #name!]",
        )
        .unwrap();
        let result = compile_typst_inner(
            tmp.path(),
            "main.typ",
            "#import \"lib.typ\": greet\n#greet[World]",
        );
        assert!(
            !result.svg_pages.is_empty(),
            "Vault-relative import should compile successfully"
        );
    }
}
