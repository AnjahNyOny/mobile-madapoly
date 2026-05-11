import { Platform } from 'react-native';

const KEY = 'madapoly_session';

export interface SavedSession {
  roomCode: string;
  localPlayerId: string;
  playerName: string;
  playerAvatar: string;
  savedAt: number;
}

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 min max

function storage() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return window.localStorage;
  return null;
}

export function saveSession(s: Omit<SavedSession, 'savedAt'>) {
  const store = storage();
  if (!store) return;
  store.setItem(KEY, JSON.stringify({ ...s, savedAt: Date.now() }));
}

export function loadSession(): SavedSession | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(KEY);
    if (!raw) return null;
    const s: SavedSession = JSON.parse(raw);
    if (Date.now() - s.savedAt > SESSION_TTL_MS) {
      store.removeItem(KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function clearSession() {
  const store = storage();
  if (!store) return;
  store.removeItem(KEY);
}
