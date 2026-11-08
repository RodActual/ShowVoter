// Stable user identity. 'user1'/'user2' never change; names are display-only.
// DB fields keep their original names (anthony* = user1, pam* = user2) so existing data still works.

export const USER_KEYS = ['user1', 'user2'];

// Display names only; stored colors from older versions are ignored.
export const DEFAULT_SETTINGS = {
  user1Name: 'Anthony',
  user2Name: 'Pam',
  services: [] // streaming services you subscribe to (names from STREAMING_SERVICES)
};

const LEGACY_DEFAULT_NAMES = { user1: 'Anthony', user2: 'Pam' };

export const ratingField = (userKey) => (userKey === 'user1' ? 'anthonyRating' : 'pamRating');
export const priorityField = (userKey) => (userKey === 'user1' ? 'anthonyPriority' : 'pamPriority');
// "Not for me" on a To Watch title (#52).
export const vetoField = (userKey) => (userKey === 'user1' ? 'anthonyVeto' : 'pamVeto');
export const vetoedBy = (item) => USER_KEYS.filter((k) => item[vetoField(k)]);

export const userName = (settings, userKey) => settings[`${userKey}Name`] || LEGACY_DEFAULT_NAMES[userKey];

// Older records stored a display name ("Anthony") instead of a key. Returns null when unknown (e.g. 'System').
export function resolveUserKey(value, settings) {
  if (!value) return null;
  if (USER_KEYS.includes(value)) return value;
  for (const key of USER_KEYS) {
    if (value === userName(settings, key) || value === LEGACY_DEFAULT_NAMES[key]) return key;
  }
  return null;
}

// Average of the ratings that are set; 0 means "not rated yet".
export function averageRating(...ratings) {
  const rated = ratings.filter((r) => (r || 0) > 0);
  return rated.length ? rated.reduce((a, b) => a + b, 0) / rated.length : 0;
}
