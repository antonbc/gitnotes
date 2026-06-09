export const THEMES = ['light', 'dark', 'oled'] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_LABELS: Record<Theme, string> = {
  light: 'Light',
  dark: 'Dark',
  oled: 'Pure Black',
};

// Mini-window swatch colors for the appearance popover (from prototype SW)
export const THEME_SWATCHES: Record<Theme, {
  top: string; bar: string; bg: string; line: string; line2: string; acc: string;
}> = {
  light: { top: '#ececee', bar: '#e9e9ec', bg: '#ffffff', line: '#1d1d1f', line2: '#c9c9cf', acc: '#0a6cff' },
  dark:  { top: '#2c2c2e', bar: '#232325', bg: '#1c1c1e', line: '#f1f1f3', line2: '#46464a', acc: '#0a84ff' },
  oled:  { top: '#0a0a0b', bar: '#050506', bg: '#000000', line: '#fafafa', line2: '#333333', acc: '#0a84ff' },
};

export const EDITOR_FONTS = ['mono', 'sans', 'serif'] as const;
export type EditorFont = (typeof EDITOR_FONTS)[number];

export const EDITOR_FONT_LABELS: Record<EditorFont, string> = {
  mono:  'Monospace',
  sans:  'Sans',
  serif: 'Serif',
};

export const EDITOR_FONT_DESCS: Record<EditorFont, string> = {
  mono:  'JetBrains Mono — code & structure',
  sans:  'System — clean & neutral',
  serif: 'Charter — for reading prose',
};

// font-family used to render each option's preview glyph
export const EDITOR_FONT_STACKS: Record<EditorFont, string> = {
  mono:  'var(--font-mono)',
  sans:  'var(--font-prose-sans)',
  serif: 'var(--font-prose-serif)',
};

const LEGACY_THEME_MAP: Record<string, Theme> = {
  warm: 'light',
  cool: 'light',
  dark: 'dark',
  forest: 'dark',
  midnight: 'oled',
};

const PREFS_KEY = 'gitnotes.prefs.v1';
const LEGACY_PREFS_KEY = 'gitnotes-prefs';

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function migrateLegacyPrefs(legacy: Record<string, unknown>): Record<string, unknown> {
  const legacyTheme = typeof legacy.theme === 'string' ? legacy.theme : '';
  const theme = THEMES.includes(legacyTheme as Theme)
    ? legacyTheme
    : (LEGACY_THEME_MAP[legacyTheme] ?? 'light');

  const font = EDITOR_FONTS.includes(legacy.editorFont as EditorFont)
    ? legacy.editorFont
    : 'mono';

  return {
    theme,
    font,
    autosave: true,
    sidebarOn: true,
    lastVaultRoot: '',
    openTabs: [],
    activePath: null,
    viewMode: 'split',
    vimMode: true,
    onboardingSeen: false,
  };
}

function normalizePrefs(raw: Record<string, unknown>): Record<string, unknown> {
  const theme = typeof raw.theme === 'string' && THEMES.includes(raw.theme as Theme)
    ? raw.theme
    : (typeof raw.theme === 'string' ? LEGACY_THEME_MAP[raw.theme] : undefined) ?? 'light';

  const font = EDITOR_FONTS.includes(raw.font as EditorFont) ? raw.font : 'mono';

  return {
    theme,
    font,
    autosave: typeof raw.autosave === 'boolean' ? raw.autosave : true,
    sidebarOn: typeof raw.sidebarOn === 'boolean' ? raw.sidebarOn : true,
    lastVaultRoot: typeof raw.lastVaultRoot === 'string' ? raw.lastVaultRoot : '',
    openTabs: stringArray(raw.openTabs),
    activePath: typeof raw.activePath === 'string' ? raw.activePath : null,
    viewMode: ['edit', 'preview', 'split'].includes(raw.viewMode as string) ? raw.viewMode : 'split',
    vimMode: typeof raw.vimMode === 'boolean' ? raw.vimMode : true,
    onboardingSeen: typeof raw.onboardingSeen === 'boolean' ? raw.onboardingSeen : false,
  };
}

function load() {
  if (typeof localStorage === 'undefined') return normalizePrefs({});

  try {
    const current = localStorage.getItem(PREFS_KEY);
    if (current) return normalizePrefs(JSON.parse(current) as Record<string, unknown>);

    const legacy = localStorage.getItem(LEGACY_PREFS_KEY);
    if (!legacy) return normalizePrefs({});

    const migrated = migrateLegacyPrefs(JSON.parse(legacy) as Record<string, unknown>);
    localStorage.setItem(PREFS_KEY, JSON.stringify(migrated));
    localStorage.removeItem(LEGACY_PREFS_KEY);
    return normalizePrefs(migrated);
  } catch {
    return normalizePrefs({});
  }
}

const stored = load();

export const settings = $state({
  theme: stored.theme as Theme,
  editorFont: stored.font as EditorFont,
  autosave: stored.autosave as boolean,
  sidebarOpen: stored.sidebarOn as boolean,
  lastVaultRoot: stored.lastVaultRoot as string,
  openTabs: stored.openTabs as string[],
  activePath: stored.activePath as string | null,
  viewMode: stored.viewMode as 'edit' | 'preview' | 'split',
  vimMode: stored.vimMode as boolean,
  onboardingSeen: stored.onboardingSeen as boolean,
});

export function saveSettings() {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(PREFS_KEY, JSON.stringify({
    theme: settings.theme,
    font: settings.editorFont,
    autosave: settings.autosave,
    sidebarOn: settings.sidebarOpen,
    lastVaultRoot: settings.lastVaultRoot,
    activePath: settings.activePath,
    openTabs: settings.openTabs,
    viewMode: settings.viewMode,
    vimMode: settings.vimMode,
    onboardingSeen: settings.onboardingSeen,
  }));
}
