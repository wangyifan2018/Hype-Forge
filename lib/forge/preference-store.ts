import {
  EMPTY_PROFILE,
  type PreferenceProfile,
} from "@/lib/forge/edit-preferences";

const PREF_KEY = "hype-forge:preferences";

export function loadPreferenceProfile(): PreferenceProfile {
  if (typeof window === "undefined") return EMPTY_PROFILE;
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (!raw) return EMPTY_PROFILE;
    const parsed = JSON.parse(raw) as PreferenceProfile;
    if (!parsed || typeof parsed !== "object" || !parsed.counts) {
      return EMPTY_PROFILE;
    }
    return {
      version: 1,
      counts: parsed.counts,
      samples: Number(parsed.samples) || 0,
      lastUpdatedAt: parsed.lastUpdatedAt ?? EMPTY_PROFILE.lastUpdatedAt,
    };
  } catch {
    return EMPTY_PROFILE;
  }
}

export function savePreferenceProfile(profile: PreferenceProfile): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(profile));
  } catch {
    // 配额/隐私模式：静默失败
  }
}

export function clearPreferenceProfile(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PREF_KEY);
  } catch {
    // ignore
  }
}
