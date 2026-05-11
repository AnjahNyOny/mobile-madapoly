import { Platform } from 'react-native';

const KEY = 'madapoly_session';

export interface SavedSession {
  roomCode: string;
  localPlayerId: string;
  playerName: string;
  playerAvatar: string;
  savedAt: number;
  gameStarted?: boolean;
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

const GAME_STATE_KEY = 'madapoly_game_state';

export function saveGameState(state: object) {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(GAME_STATE_KEY, JSON.stringify({ ...state, savedAt: Date.now() }));
  } catch {}
}

export function loadGameState(): Record<string, any> | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(GAME_STATE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearGameState() {
  const store = storage();
  if (!store) return;
  store.removeItem(GAME_STATE_KEY);
}
