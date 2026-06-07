import { Preferences } from '@capacitor/preferences';

export type StoredMatrixSession = {
  baseUrl: string;
  userId: string;
  deviceId: string;
  accessToken: string;
};

const SESSION_KEY = 'ioscinny.matrixSession';

export async function loadStoredSession(): Promise<StoredMatrixSession | undefined> {
  const { value } = await Preferences.get({ key: SESSION_KEY });
  if (!value) return undefined;

  try {
    const parsed = JSON.parse(value) as Partial<StoredMatrixSession>;
    if (
      parsed.baseUrl &&
      parsed.userId &&
      parsed.deviceId &&
      parsed.accessToken
    ) {
      return parsed as StoredMatrixSession;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export async function saveStoredSession(session: StoredMatrixSession): Promise<void> {
  await Preferences.set({
    key: SESSION_KEY,
    value: JSON.stringify(session),
  });
}

export async function clearStoredSession(): Promise<void> {
  await Preferences.remove({ key: SESSION_KEY });
}
