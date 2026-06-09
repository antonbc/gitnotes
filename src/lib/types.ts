export type Ext = "md" | "typ";

export interface VaultInfo {
  root: string;
  mode: "local" | "git";
  remote?: string;
}

export interface FileNode {
  path: string;
  name: string;
  ext?: Ext;
  isDir: boolean;
  children?: FileNode[];
}

export interface FileContent {
  path: string;
  ext: Ext;
  content: string;
}

export interface SearchHit {
  path: string;
  title: string;
  snippet: string;
}

export interface Diagnostic {
  line: number;
  col: number;
  severity: "error" | "warning";
  message: string;
}

export interface TypstResult {
  svgPages: string[];
  diagnostics: Diagnostic[];
}

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  dirty: boolean;
  conflicted: string[];
}

export interface RemoteStatus {
  reachable: boolean;
  authed: boolean;
  message?: string;
}

export interface TrashEntry {
  trashId: string;
  originalPath: string;
  deletedAt: string;
}

export interface AppError {
  code: string;
  message: string;
}

export type ViewMode = "edit" | "preview" | "split";

export interface EditorMetrics {
  cursor: { ln: number; col: number };
  selection: { chars: number; ranges: number };
  lineCount: number;
  wordCount: number;
  charCount: number;
}

export interface PaletteCommand {
  id: string;
  label: string;
  detail?: string;
  shortcut?: string;
  disabled?: boolean;
  run: () => void | Promise<void>;
}

export type FormatAction =
  | "bold"
  | "italic"
  | "heading1"
  | "heading2"
  | "bullet"
  | "numbered"
  | "task"
  | "link"
  | "image"
  | "inlineCode"
  | "codeBlock"
  | "quote"
  | "table";
