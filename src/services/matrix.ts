import {
  ClientEvent,
  createClient,
  IndexedDBCryptoStore,
  IndexedDBStore,
  MatrixClient,
  MsgType,
  Room,
  RoomEvent,
  SyncState,
} from 'matrix-js-sdk';

import { matrixFetch, matrixRequestError } from './nativeFetch';
import type { StoredMatrixSession } from './sessionStore';

export type LoginInput = {
  baseUrl: string;
  username: string;
  password: string;
};

export type RoomSummary = {
  id: string;
  name: string;
  encrypted: boolean;
  unread: number;
};

export type MatrixRuntime = {
  client: MatrixClient;
  stop: () => void;
};

const normalizeBaseUrl = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed.replace(/\/+$/g, '');
  return `https://${trimmed.replace(/\/+$/g, '')}`;
};

type MatrixWellKnown = {
  'm.homeserver'?: {
    base_url?: string;
  };
};

type MatrixClientOptions = Parameters<typeof createClient>[0];

const createNativeMatrixClient = (options: MatrixClientOptions): MatrixClient =>
  createClient({
    ...options,
    fetchFn: matrixFetch,
  } as MatrixClientOptions & { fetchFn: typeof fetch });

const readJsonSafely = async <T>(response: Response): Promise<T | undefined> => {
  try {
    return (await response.json()) as T;
  } catch {
    return undefined;
  }
};

const discoverHomeserver = async (inputBaseUrl: string): Promise<string> => {
  const baseUrl = normalizeBaseUrl(inputBaseUrl);
  if (!baseUrl) return '';

  try {
    const response = await matrixFetch(`${baseUrl}/.well-known/matrix/client`, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) return baseUrl;

    const wellKnown = await readJsonSafely<MatrixWellKnown>(response);
    const discoveredBaseUrl = wellKnown?.['m.homeserver']?.base_url;

    if (discoveredBaseUrl) {
      return normalizeBaseUrl(discoveredBaseUrl);
    }
  } catch {
    return baseUrl;
  }

  return baseUrl;
};

const verifyHomeserver = async (baseUrl: string): Promise<void> => {
  const versionsUrl = `${baseUrl}/_matrix/client/versions`;

  try {
    const response = await matrixFetch(versionsUrl, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Matrix API 探测失败：${versionsUrl} 返回 HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (contentType && !contentType.toLowerCase().includes('json')) {
      throw new Error(
        `这个地址不像 Matrix API：${versionsUrl} 返回的是 ${contentType}。如果你填的是网页地址，请改填真实 homeserver API 地址。`
      );
    }
  } catch (error) {
    throw matrixRequestError(error, baseUrl);
  }
};

export async function loginWithPassword(input: LoginInput): Promise<StoredMatrixSession> {
  const baseUrl = await discoverHomeserver(input.baseUrl);

  try {
    await verifyHomeserver(baseUrl);

    const mx = createNativeMatrixClient({ baseUrl });
    const response = await mx.login('m.login.password', {
      identifier: {
        type: 'm.id.user',
        user: input.username.trim(),
      },
      password: input.password,
      initial_device_display_name: 'Starfire iOS',
    } as never);

    if (!response.access_token || !response.user_id || !response.device_id) {
      throw new Error('Homeserver did not return a complete login session.');
    }

    return {
      baseUrl,
      accessToken: response.access_token,
      userId: response.user_id,
      deviceId: response.device_id,
    };
  } catch (error) {
    throw matrixRequestError(error, baseUrl);
  }
}

export async function createMatrixRuntime(
  session: StoredMatrixSession,
  onRoomsChanged: (rooms: RoomSummary[]) => void,
  onSyncStateChanged: (state: SyncState | null) => void
): Promise<MatrixRuntime> {
  const indexedDBStore = new IndexedDBStore({
    indexedDB: globalThis.indexedDB,
    localStorage: globalThis.localStorage,
    dbName: `ioscinny-sync-${session.userId}`,
  });
  const cryptoStore = new IndexedDBCryptoStore(
    globalThis.indexedDB,
    `ioscinny-crypto-${session.userId}`
  );

  const client = createNativeMatrixClient({
    baseUrl: session.baseUrl,
    accessToken: session.accessToken,
    userId: session.userId,
    deviceId: session.deviceId,
    store: indexedDBStore,
    cryptoStore,
    timelineSupport: true,
    verificationMethods: ['m.sas.v1'],
  });

  await indexedDBStore.startup();
  await client.initRustCrypto();

  const refreshRooms = () => onRoomsChanged(getJoinedRooms(client));
  const handleSync = (state: SyncState | null) => {
    onSyncStateChanged(state);
    refreshRooms();
  };

  client.on(ClientEvent.Sync, handleSync);
  client.on(RoomEvent.Timeline, refreshRooms);
  client.on(RoomEvent.MyMembership, refreshRooms);

  await client.startClient({
    lazyLoadMembers: true,
  });
  refreshRooms();

  return {
    client,
    stop: () => {
      client.removeListener(ClientEvent.Sync, handleSync);
      client.removeListener(RoomEvent.Timeline, refreshRooms);
      client.removeListener(RoomEvent.MyMembership, refreshRooms);
      client.stopClient();
    },
  };
}

export function getJoinedRooms(client: MatrixClient): RoomSummary[] {
  return client
    .getRooms()
    .filter((room: Room) => room.getMyMembership() === 'join' && !room.isSpaceRoom())
    .map((room) => ({
      id: room.roomId,
      name: room.name || room.roomId,
      encrypted: room.hasEncryptionStateEvent(),
      unread: room.getUnreadNotificationCount(),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
}

export async function sendTextMessage(
  client: MatrixClient,
  roomId: string,
  body: string
): Promise<void> {
  const trimmed = body.trim();
  if (!trimmed) return;

  await client.sendMessage(roomId, {
    msgtype: MsgType.Text,
    body: trimmed,
  });
}
