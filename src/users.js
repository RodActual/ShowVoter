// Stable user identity. 'user1'/'user2' never change; names and colors are display-only.
// DB fields keep their original names (anthony* = user1, pam* = user2) so existing data still works.

export const USER_KEYS = ['user1', 'user2'];

export const DEFAULT_SETTINGS = {
  user1Name: 'Anthony',
  user1Color: '#2563EB',
  user2Name: 'Pam',
  user2Color: '#DB2777'
};

const LEGACY_DEFAULT_NAMES = { user1: 'Anthony', user2: 'Pam' };

export const ratingField = (userKey) => (userKey === 'user1' ? 'anthonyRating' : 'pamRating');
export const priorityField = (userKey) => (userKey === 'user1' ? 'anthonyPriority' : 'pamPriority');

export const userName = (settings, userKey) => settings[`${userKey}Name`] || LEGACY_DEFAULT_NAMES[userKey];
export const userColor = (settings, userKey) => settings[`${userKey}Color`];

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
