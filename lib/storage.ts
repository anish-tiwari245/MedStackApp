import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Drug, Group, MapType, User } from '@/types/medstack';

const KEYS = {
  users: 'medstack:users',
  session: 'medstack:session',
  drugs: (userId: string) => `medstack:${userId}:drugs`,
  groups: (userId: string) => `medstack:${userId}:groups`,
  mapType: (userId: string) => `medstack:${userId}:mapType`,
  onboarded: (userId: string) => `medstack:${userId}:onboarded`,
};

async function readJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function writeJSON(key: string, value: unknown) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // best-effort persistence; app still works in-memory this session
  }
}

export const storage = {
  loadUsers: () => readJSON<User[]>(KEYS.users, []),
  saveUsers: (users: User[]) => writeJSON(KEYS.users, users),

  loadSession: () => AsyncStorage.getItem(KEYS.session).catch(() => null),
  saveSession: (userId: string | null) =>
    userId ? AsyncStorage.setItem(KEYS.session, userId).catch(() => {}) : AsyncStorage.removeItem(KEYS.session).catch(() => {}),

  loadDrugs: (userId: string) => readJSON<Drug[]>(KEYS.drugs(userId), []),
  saveDrugs: (userId: string, drugs: Drug[]) => writeJSON(KEYS.drugs(userId), drugs),

  loadGroups: (userId: string) => readJSON<Group[]>(KEYS.groups(userId), []),
  saveGroups: (userId: string, groups: Group[]) => writeJSON(KEYS.groups(userId), groups),

  loadMapType: (userId: string) => readJSON<MapType>(KEYS.mapType(userId), 'node'),
  saveMapType: (userId: string, type: MapType) => writeJSON(KEYS.mapType(userId), type),

  loadOnboarded: (userId: string) => readJSON<boolean>(KEYS.onboarded(userId), false),
  saveOnboarded: (userId: string, val: boolean) => writeJSON(KEYS.onboarded(userId), val),
};
