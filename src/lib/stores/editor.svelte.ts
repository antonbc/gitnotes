import type { Ext, ViewMode } from "$lib/types";

export interface OpenTab {
  path: string;
  ext: Ext;
  content: string;
  savedContent: string;
  dirty: boolean;
}

export const editorState = $state<{
  tabs: OpenTab[];
  activePath: string | null;
  viewMode: ViewMode;
  vimMode: boolean;
  toolbar: boolean;
}>({
  tabs: [],
  activePath: null,
  viewMode: "split",
  vimMode: true,
  toolbar: true
});
