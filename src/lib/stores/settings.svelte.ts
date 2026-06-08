export const THEMES = ['warm', 'cool', 'dark', 'forest', 'midnight'] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_LABELS: Record<Theme, string> = {
  warm: 'Warm',
  cool: 'Cool',
  dark: 'Dark',
  forest: 'Forest',
  midnight: 'Midnight',
};

// bg, accent colors used for the swatch preview
export const THEME_SWATCHES: Record<Theme, { bg: string; accent: string; text: string }> = {
  warm:     { bg: '#f0ece6', accent: '#2d7770', text: '#1a1917' },
  cool:     { bg: '#f5f7fa', accent: '#0969da', text: '#0d1117' },
  dark:     { bg: '#1e1e1e', accent: '#4ec9b0', text: '#d4d4d4' },
  forest:   { bg: '#131a13', accent: '#5ab870', text: '#c8dcc0' },
  midnight: { bg: '#0e1117', accent: '#7c8cf8', text: '#c4cce4' },
};

export const EDITOR_FONTS = ['mono', 'sans', 'serif'] as const;
export type EditorFont = (typeof EDITOR_FONTS)[number];

export const EDITOR_FONT_LABELS: Record<EditorFont, string> = {
  mono:  'Monospace',
  sans:  'Sans-serif',
  serif: 'Serif',
};

function load() {
  if (typeof localStorage === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem('gitnotes-prefs') ?? '{}') as Record<string, unknown>;
  } catch {
    return {};
  }
}

const stored = load();

export const settings = $state({
  theme: (THEMES.includes(stored.theme as Theme) ? stored.theme : 'warm') as Theme,
  editorFont: (EDITOR_FONTS.includes(stored.editorFont as EditorFont) ? stored.editorFont : 'mono') as EditorFont,
  fontSize: (typeof stored.fontSize === 'number' && stored.fontSize >= 11 && stored.fontSize <= 22
    ? stored.fontSize
    : 14) as number,
});

export function saveSettings() {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem('gitnotes-prefs', JSON.stringify({
    theme: settings.theme,
    editorFont: settings.editorFont,
    fontSize: settings.fontSize,
  }));
}
