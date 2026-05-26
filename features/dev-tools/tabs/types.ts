export type UserContext = {
  authenticated: boolean;
  user: { id: string; email: string; name: string } | null;
  subscription: {
    plan: string;
    status: string;
    canceledAt: string | null;
  } | null;
  businesses: Array<{
    id: string;
    name: string;
    slug: string;
    plan: string;
  }>;
};

export type PanelPosition = "bottom-right" | "bottom-left" | "top-right" | "top-left";
export type PanelTab = "context" | "tools" | "settings";

export type DevSettings = {
  position: PanelPosition;
  showGridOverlay: boolean;
  slowNetwork: boolean;
  showRenderOutlines: boolean;
};

export const PLANS = ["free", "pro", "business"] as const;

export const POSITION_CLASSES: Record<PanelPosition, string> = {
  "bottom-right": "right-4 bottom-4",
  "bottom-left": "left-4 bottom-4",
  "top-right": "right-4 top-4",
  "top-left": "left-4 top-4",
};

export const STORAGE_KEY = "dev-tools-settings";
export const OPEN_KEY = "dev-tools-open";

export const DEFAULT_SETTINGS: DevSettings = {
  position: "bottom-right",
  showGridOverlay: false,
  slowNetwork: false,
  showRenderOutlines: false,
};

export function loadSettings(): DevSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch {
    // ignore
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: DevSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
