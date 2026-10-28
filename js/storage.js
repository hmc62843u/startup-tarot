const STORAGE_KEY = 'founder_gap_data';

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('Saved app data could not be read; starting with an empty profile.', error);
    return null;
  }
}
