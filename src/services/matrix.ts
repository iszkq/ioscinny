import {
  ClientEvent,
  createClient,
  IndexedDBCryptoStore,
  IndexedDBStore,
  MatrixClient,
  MatrixEvent,
  MsgType,
  NotificationCountType,
  Room,
  RoomEvent,
  RoomMember,
  SyncState,
} from 'matrix-js-sdk';
import {
  ConditionKind,
  PushRuleActionName,
  PushRuleKind,
  TweakName,
} from 'matrix-js-sdk/lib/@types/PushRules.js';
import { deriveRecoveryKeyFromPassphrase } from 'matrix-js-sdk/lib/crypto-api/key-passphrase.js';
import { decodeRecoveryKey } from 'matrix-js-sdk/lib/crypto-api/recovery-key.js';
import { MatrixEventEvent } from 'matrix-js-sdk/lib/models/event.js';

import { matrixFetch, matrixRequestError } from './nativeFetch';
import type { StoredMatrixSession } from './sessionStore';

export type LoginInput = {
  baseUrl: string;
  username: string;
  password: string;
};

export type RoomMembership = 'join' | 'invite' | 'leave' | 'ban' | 'knock' | string;
export type RoomNotificationMode = 'default' | 'all' | 'mentions' | 'mute';

export type RoomSummary = {
  id: string;
  name: string;
  canonicalAlias?: string;
  topic?: string;
  avatarUrl?: string;
  parentSpaceIds: string[];
  encrypted: boolean;
  notificationMode: RoomNotificationMode;
  muted: boolean;
  direct: boolean;
  space: boolean;
  membership: RoomMembership;
  unread: number;
  highlight: number;
  memberCount: number;
  lastMessage: string;
  lastTs: number;
};

export type EncryptedMediaFile = {
  url: string;
  key: JsonWebKey & {
    alg?: string;
    key_ops?: string[];
    k?: string;
  };
  iv: string;
  hashes?: Record<string, string>;
  v?: string;
};

export type ChatAttachment = {
  kind: 'image' | 'video' | 'audio' | 'file';
  mxcUrl?: string;
  url?: string;
  authUrl?: string;
  previewEncryptedFile?: EncryptedMediaFile;
  previewMimeType?: string;
  downloadUrl?: string;
  authDownloadUrl?: string;
  encryptedFile?: EncryptedMediaFile;
  name?: string;
  mimeType?: string;
  size?: number;
  durationMs?: number;
  width?: number;
  height?: number;
};

export type ChatReaction = {
  key: string;
  shortcode?: string;
  count: number;
  reactedByMe: boolean;
  reactors: MessageReadReceipt[];
};

export type MessageReadReceipt = {
  userId: string;
  name: string;
  avatarUrl?: string;
  timestamp?: number;
};

export type ChatReply = {
  eventId: string;
  senderId?: string;
  senderName?: string;
  body: string;
};

export type FavoriteSourceMetadata = {
  roomId: string;
  roomName: string;
  roomAvatarUrl?: string;
  eventId: string;
  senderId?: string;
  senderName: string;
  senderAvatarUrl?: string;
  sourceTimestamp: number;
  favoritedAt: number;
};

export type ChatMessage = {
  id: string;
  roomId: string;
  eventType: string;
  forwardContent?: Record<string, unknown>;
  kind: 'message' | 'system';
  sender?: string;
  senderName?: string;
  senderAvatarUrl?: string;
  body: string;
  timestamp: number;
  mine: boolean;
  edited: boolean;
  encrypted: boolean;
  canEdit: boolean;
  canRedact: boolean;
  pinned: boolean;
  replyTo?: ChatReply;
  attachment?: ChatAttachment;
  reactions: ChatReaction[];
  readReceipts: MessageReadReceipt[];
  favoriteSource?: FavoriteSourceMetadata;
};

export type InlineReadReceiptState = {
  readReceipts: MessageReadReceipt[];
  totalCount: number;
};

export type RoomMemberSummary = {
  id: string;
  name: string;
  avatarUrl?: string;
  membership?: string;
  powerLevel?: number;
};

export type OwnProfile = {
  userId: string;
  displayName?: string;
  avatarUrl?: string;
};

export type ExploreSourceKind = 'server' | 'web' | 'nav';
export type ExploreWebOpenMode = 'auto' | 'external';
export type ExploreWebEmbedStatus = 'unknown' | 'embeddable' | 'blocked';

export type ExploreNavCard = {
  id: string;
  title: string;
  url: string;
  description?: string;
  iconUrl?: string;
  tags?: string[];
};

export type ExploreNavSection = {
  id: string;
  title: string;
  cards: ExploreNavCard[];
};

export type ExploreSource = {
  id: string;
  kind: ExploreSourceKind;
  title: string;
  description?: string;
  value: string;
  createdAt: number;
  updatedAt: number;
  webOpenMode?: ExploreWebOpenMode;
  webEmbedStatus?: ExploreWebEmbedStatus;
  navSections?: ExploreNavSection[];
};

export type RoomMediaItem = {
  messageId: string;
  roomId: string;
  kind: ChatAttachment['kind'];
  mxcUrl?: string;
  url?: string;
  authUrl?: string;
  previewEncryptedFile?: EncryptedMediaFile;
  previewMimeType?: string;
  downloadUrl?: string;
  authDownloadUrl?: string;
  encryptedFile?: EncryptedMediaFile;
  name: string;
  mimeType?: string;
  size?: number;
  durationMs?: number;
  width?: number;
  height?: number;
  senderName?: string;
  timestamp: number;
};

export type PinnedMessageSummary = {
  id: string;
  roomId: string;
  body: string;
  senderName?: string;
  timestamp?: number;
  available: boolean;
};

export type CustomEmojiUsage = 'emoticon' | 'sticker';

export type CustomEmojiItem = {
  id: string;
  packId: string;
  shortcode: string;
  body: string;
  packName: string;
  usage: CustomEmojiUsage[];
  mxcUrl: string;
  url?: string;
  authUrl?: string;
  downloadUrl?: string;
  authDownloadUrl?: string;
  info?: Record<string, unknown>;
};

export type CustomEmojiPack = {
  id: string;
  name: string;
  usage: CustomEmojiUsage[];
  items: CustomEmojiItem[];
  cover?: CustomEmojiItem;
  isDefault: boolean;
  editable: boolean;
  deletable: boolean;
  orderable: boolean;
};

export type CustomEmojiDebugSummary = {
  defaultPackImageCount: number;
  defaultPackSyncedImageCount: number;
  defaultPackLocalImageCount: number;
  defaultPackSyncedSourcePackIds: string[];
  cinnyRootKeys: string[];
  cinnyOrder: string[];
  cinnyPackIds: string[];
  cinnyPacks: Array<{
    packId: string;
    packName: string;
    imageCount: number;
    sampleShortcodes: string[];
  }>;
  roomPackCount: number;
  dedupedPackSummaries: Array<{
    packId: string;
    packName: string;
    total: number;
    emoticonCount: number;
    stickerCount: number;
  }>;
};

export type LocalMessageSearchResult = {
  room: RoomSummary;
  message: ChatMessage;
};

export type MatrixSnapshot = {
  version: number;
  rooms: RoomSummary[];
  totalUnread: number;
  totalHighlights: number;
};

export type PublicRoomSummary = {
  id: string;
  alias?: string;
  name: string;
  topic?: string;
  avatarUrl?: string;
  joinedMembers: number;
  worldReadable: boolean;
};

export type CryptoStatus = {
  cryptoReady: boolean;
  secretStorageReady?: boolean;
  activeBackupVersion?: string | null;
  backupVersion?: string | null;
  backupTrusted?: boolean;
  backupMatchesDecryptionKey?: boolean;
  crossSigningReady?: boolean;
  crossSigningPrivateKeysInSecretStorage?: boolean;
  currentDeviceVerified?: boolean;
  currentDeviceCrossSigned?: boolean;
  currentDeviceLocallyVerified?: boolean;
};

export type KeyRestoreProgress = {
  stage?: string;
  successes?: number;
  failures?: number;
  total?: number;
};

export type KeyRestoreResult = {
  total: number;
  imported: number;
};

export type CurrentDeviceVerificationResult = {
  attempted: boolean;
  crossSigningReady?: boolean;
  crossSigningPrivateKeysInSecretStorage?: boolean;
  currentDeviceVerified?: boolean;
  currentDeviceCrossSigned?: boolean;
  currentDeviceLocallyVerified?: boolean;
  signedCurrentDevice?: boolean;
  skippedReason?: 'crypto-unavailable' | 'missing-device-id' | 'no-cross-signing-private-keys';
};

export type MatrixRuntime = {
  client: MatrixClient;
  stop: () => void;
};

let matrixSnapshotVersion = 0;

type MatrixWellKnown = {
  'm.homeserver'?: {
    base_url?: string;
  };
};

type MatrixClientOptions = Parameters<typeof createClient>[0];
type AccountDataEventLike = {
  getContent: () => unknown;
};
type SecretStorageKeyInfo = Record<string, unknown> & {
  passphrase?: {
    salt?: string;
    iterations?: number;
    bits?: number;
  };
};
type SecretStorageApi = {
  getDefaultKeyId?: () => Promise<string | null>;
  getKey?: (keyId?: string | null) => Promise<[string, SecretStorageKeyInfo] | null>;
};
type SecretStorageCacheSource = 'recovery-key' | 'security-phrase';

const FULLY_READ_EVENT_TYPE = 'm.fully_read';
const OPTIMISTIC_ROOM_READ_MARKERS_STORAGE_KEY = 'ioscinny.optimisticRoomReadMarkers';
const NOTIFICATION_EVENT_TYPES = new Set([
  'm.room.create',
  'm.room.message',
  'm.room.encrypted',
  'm.poll.start',
  'org.matrix.msc3381.poll.start',
  'm.sticker',
]);
const optimisticRoomReadMarkers = new Map<string, string>();

type FullyReadContent = {
  event_id?: string;
};

type OptimisticRoomReadMarkersByUser = Record<string, Record<string, string>>;

type RoomReadMarkerState = {
  eventId?: string;
  optimistic: boolean;
};

type LiveTimelineUnreadState = {
  reliable: boolean;
  total: number;
};

type ReceiptWithTimestamp = {
  ts?: number;
  data?: {
    ts?: number;
  };
};

const ROOM_NAME_FALLBACK = '未命名房间';
const DEFAULT_MESSAGE_LIMIT = 260;
const MAX_RECEIPT_CONTEXT_MESSAGE_COUNT = 520;
const MAX_CUSTOM_EMOJI_ITEMS = 4096;
const secretStorageKeys = new Map<string, Uint8Array>();

const cryptoCallbacks = {
  getSecretStorageKey: async ({ keys }: { keys: Record<string, unknown> }) => {
    const keyId = Object.keys(keys).find((candidate) => secretStorageKeys.has(candidate));
    if (!keyId) return null;
    const privateKey = secretStorageKeys.get(keyId);
    return privateKey ? ([keyId, privateKey] as [string, Uint8Array]) : null;
  },
  cacheSecretStorageKey: (keyId: string, _keyInfo: unknown, privateKey: Uint8Array) => {
    if (privateKey instanceof Uint8Array) {
      secretStorageKeys.set(keyId, privateKey);
    }
  },
};

const normalizeBaseUrl = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed.replace(/\/+$/g, '');
  return `https://${trimmed.replace(/\/+$/g, '')}`;
};

const createNativeMatrixClient = (options: MatrixClientOptions): MatrixClient =>
  createClient({
    cryptoCallbacks,
    ...options,
    fetchFn: matrixFetch,
  } as MatrixClientOptions & { fetchFn: typeof fetch });

const sanitizeStoreSegment = (value: string): string =>
  value
    .trim()
    .replace(/[^a-z0-9_-]+/gi, '_')
    .replace(/^_+|_+$/g, '') || 'session';

const getSessionStoreKey = (session: Pick<StoredMatrixSession, 'userId' | 'deviceId'>): string =>
  `${sanitizeStoreSegment(session.userId)}__${sanitizeStoreSegment(session.deviceId)}`;

const getAccountDataContent = (
  client: MatrixClient,
  eventType: string
): Record<string, unknown> | undefined => {
  const event = (
    client as unknown as {
      getAccountData: (type: string) => AccountDataEventLike | undefined;
    }
  ).getAccountData(eventType);
  const content = event?.getContent();
  return content && typeof content === 'object' ? (content as Record<string, unknown>) : undefined;
};

const hasProtocol = (value: string): boolean => /^[a-z][a-z0-9+.-]*:\/\//i.test(value);

const toTimestamp = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const trimOptionalText = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeOptionalText = (value: unknown): string => trimOptionalText(value) ?? '';

const isExploreSourceKind = (value: unknown): value is ExploreSourceKind =>
  value === 'server' || value === 'web' || value === 'nav';

const isExploreWebOpenMode = (value: unknown): value is ExploreWebOpenMode =>
  value === 'auto' || value === 'external';

const isExploreWebEmbedStatus = (value: unknown): value is ExploreWebEmbedStatus =>
  value === 'unknown' || value === 'embeddable' || value === 'blocked';

const normalizeExploreServerAddress = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) throw new Error('Missing server address');

  const candidate = hasProtocol(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(candidate);
  const host = url.host.trim().toLowerCase();
  if (!host) throw new Error('Invalid server address');
  return host;
};

const normalizeExploreWebUrl = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) throw new Error('Missing URL');

  const candidate = hasProtocol(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(candidate);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Unsupported URL protocol');
  }
  return url.toString();
};

const getDefaultExploreSourceTitle = (kind: ExploreSourceKind, value: string): string => {
  if (kind === 'server') return value;
  if (kind === 'nav') return '未命名导航站';

  try {
    return new URL(value).hostname || value;
  } catch {
    return value;
  }
};

const normalizeExploreTags = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;

  const tags = value
    .map((item) => trimOptionalText(item))
    .filter((item): item is string => Boolean(item));

  return tags.length > 0 ? Array.from(new Set(tags)) : undefined;
};

const normalizeExploreNavCard = (value: unknown): ExploreNavCard | undefined => {
  if (!value || typeof value !== 'object') return undefined;

  const card = value as Record<string, unknown>;
  const id = trimOptionalText(card.id);
  const title = trimOptionalText(card.title);
  const rawUrl = trimOptionalText(card.url);
  if (!id || !title || !rawUrl) return undefined;

  let url: string;
  try {
    url = normalizeExploreWebUrl(rawUrl);
  } catch {
    return undefined;
  }

  let iconUrl: string | undefined;
  const rawIconUrl = trimOptionalText(card.iconUrl);
  if (rawIconUrl) {
    try {
      iconUrl = normalizeExploreWebUrl(rawIconUrl);
    } catch {
      iconUrl = undefined;
    }
  }

  return {
    id,
    title,
    url,
    description: trimOptionalText(card.description),
    iconUrl,
    tags: normalizeExploreTags(card.tags),
  };
};

const normalizeExploreNavSections = (value: unknown): ExploreNavSection[] | undefined => {
  if (!Array.isArray(value)) return undefined;

  const sections = value.reduce<ExploreNavSection[]>((acc, item) => {
    if (!item || typeof item !== 'object') return acc;

    const section = item as Record<string, unknown>;
    const id = trimOptionalText(section.id);
    const title = trimOptionalText(section.title);
    if (!id || !title || !Array.isArray(section.cards)) return acc;

    const cards = section.cards
      .map((card) => normalizeExploreNavCard(card))
      .filter((card): card is ExploreNavCard => Boolean(card));

    acc.push({ id, title, cards });
    return acc;
  }, []);

  return sections;
};

const normalizeExploreSourceValue = (kind: ExploreSourceKind, value: unknown): string => {
  const normalizedValue = normalizeOptionalText(value);
  if (kind === 'server') return normalizeExploreServerAddress(normalizedValue);
  if (kind === 'web') return normalizeExploreWebUrl(normalizedValue);
  return normalizedValue;
};

const readOptimisticRoomReadMarkers = (): OptimisticRoomReadMarkersByUser => {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(OPTIMISTIC_ROOM_READ_MARKERS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as OptimisticRoomReadMarkersByUser) : {};
  } catch {
    return {};
  }
};

const writeOptimisticRoomReadMarkers = (markers: OptimisticRoomReadMarkersByUser) => {
  if (typeof window === 'undefined') return;

  try {
    if (Object.keys(markers).length === 0) {
      window.localStorage.removeItem(OPTIMISTIC_ROOM_READ_MARKERS_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(OPTIMISTIC_ROOM_READ_MARKERS_STORAGE_KEY, JSON.stringify(markers));
  } catch {
    // Ignore localStorage failures.
  }
};

const getPersistedOptimisticRoomReadMarker = (
  roomId: string,
  userId?: string | null
): string | undefined => {
  if (!userId) return undefined;
  const eventId = readOptimisticRoomReadMarkers()[userId]?.[roomId];
  return typeof eventId === 'string' ? eventId : undefined;
};

const setPersistedOptimisticRoomReadMarker = (
  roomId: string,
  eventId: string,
  userId?: string | null
) => {
  if (!userId) return;

  const markers = readOptimisticRoomReadMarkers();
  markers[userId] = {
    ...(markers[userId] ?? {}),
    [roomId]: eventId,
  };
  writeOptimisticRoomReadMarkers(markers);
};

const clearPersistedOptimisticRoomReadMarker = (roomId: string, userId?: string | null) => {
  if (!userId) return;

  const markers = readOptimisticRoomReadMarkers();
  const userMarkers = markers[userId];
  if (!userMarkers || !(roomId in userMarkers)) return;

  delete userMarkers[roomId];
  if (Object.keys(userMarkers).length === 0) {
    delete markers[userId];
  } else {
    markers[userId] = userMarkers;
  }
  writeOptimisticRoomReadMarkers(markers);
};

const getRoomFullyReadEventId = (room: Room): string | undefined => {
  const fullyReadEvent = room.accountData.get(FULLY_READ_EVENT_TYPE);
  const eventId = fullyReadEvent?.getContent<FullyReadContent>()?.event_id;
  return typeof eventId === 'string' ? eventId : undefined;
};

const setOptimisticRoomReadMarker = (roomId: string, eventId: string, userId?: string | null) => {
  optimisticRoomReadMarkers.set(roomId, eventId);
  setPersistedOptimisticRoomReadMarker(roomId, eventId, userId);
};

const clearOptimisticRoomReadMarker = (roomId: string, eventId?: string, userId?: string | null) => {
  if (eventId && optimisticRoomReadMarkers.get(roomId) !== eventId) return;
  optimisticRoomReadMarkers.delete(roomId);
  clearPersistedOptimisticRoomReadMarker(roomId, userId);
};

const getStoredRoomReadMarkerEventId = (room: Room, userId?: string | null): string | undefined => {
  const fullyReadEventId = getRoomFullyReadEventId(room);
  if (fullyReadEventId) return fullyReadEventId;
  if (!userId) return undefined;
  return room.getEventReadUpTo(userId) ?? undefined;
};

const getLiveTimelineEventIndex = (room: Room, eventId?: string): number => {
  if (!eventId) return -1;
  return room.getLiveTimeline().getEvents().findIndex((event) => event.getId() === eventId);
};

const getRoomReadMarkerState = (room: Room, userId?: string | null): RoomReadMarkerState => {
  const storedReadMarkerEventId = getStoredRoomReadMarkerEventId(room, userId);
  const optimisticReadMarkerEventId =
    optimisticRoomReadMarkers.get(room.roomId) ??
    getPersistedOptimisticRoomReadMarker(room.roomId, userId);

  if (optimisticReadMarkerEventId) {
    optimisticRoomReadMarkers.set(room.roomId, optimisticReadMarkerEventId);
  }

  if (!optimisticReadMarkerEventId) {
    return {
      eventId: storedReadMarkerEventId,
      optimistic: false,
    };
  }

  if (storedReadMarkerEventId === optimisticReadMarkerEventId) {
    clearOptimisticRoomReadMarker(room.roomId, optimisticReadMarkerEventId, userId);
    return {
      eventId: storedReadMarkerEventId,
      optimistic: false,
    };
  }

  const optimisticIndex = getLiveTimelineEventIndex(room, optimisticReadMarkerEventId);
  if (optimisticIndex === -1) {
    clearOptimisticRoomReadMarker(room.roomId, optimisticReadMarkerEventId, userId);
    return {
      eventId: storedReadMarkerEventId,
      optimistic: false,
    };
  }

  const storedIndex = getLiveTimelineEventIndex(room, storedReadMarkerEventId);
  if (storedIndex >= optimisticIndex) {
    clearOptimisticRoomReadMarker(room.roomId, optimisticReadMarkerEventId, userId);
    return {
      eventId: storedReadMarkerEventId,
      optimistic: false,
    };
  }

  return {
    eventId: optimisticReadMarkerEventId,
    optimistic: true,
  };
};

const isNotificationEvent = (event: MatrixEvent): boolean => {
  const eventType = event.getType();
  if (!NOTIFICATION_EVENT_TYPES.has(eventType)) return false;
  if (event.isRedacted()) return false;
  if (event.getRelation()?.rel_type === 'm.replace') return false;
  return true;
};

const roomHaveNotification = (room: Room): boolean => {
  const total = room.getUnreadNotificationCount(NotificationCountType.Total);
  const highlight = room.getUnreadNotificationCount(NotificationCountType.Highlight);
  return total > 0 || highlight > 0;
};

const getLiveTimelineUnreadState = (room: Room, userId?: string | null): LiveTimelineUnreadState => {
  if (!userId) {
    return {
      reliable: false,
      total: 0,
    };
  }

  const liveEvents = room.getLiveTimeline().getEvents();
  if (liveEvents.length === 0) {
    return {
      reliable: true,
      total: 0,
    };
  }

  const { eventId: readUpToId } = getRoomReadMarkerState(room, userId);
  if (!readUpToId) {
    return {
      reliable: false,
      total: 0,
    };
  }

  const readUpToIndex = getLiveTimelineEventIndex(room, readUpToId);
  if (readUpToIndex === -1) {
    return {
      reliable: false,
      total: 0,
    };
  }

  let total = 0;
  for (let index = readUpToIndex + 1; index < liveEvents.length; index += 1) {
    const event = liveEvents[index];
    if (!event || event.getSender() === userId) continue;
    if (isNotificationEvent(event)) total += 1;
  }

  return {
    reliable: true,
    total,
  };
};

const roomHaveUnread = (client: MatrixClient, room: Room): boolean => {
  const userId = client.getUserId();
  if (!userId) return false;

  const liveTimelineUnread = getLiveTimelineUnreadState(room, userId);
  if (liveTimelineUnread.reliable) return liveTimelineUnread.total > 0;

  const { eventId: readUpToId } = getRoomReadMarkerState(room, userId);
  const liveEvents = room.getLiveTimeline().getEvents();
  const readUpToIndex = getLiveTimelineEventIndex(room, readUpToId);

  if (readUpToId && readUpToIndex === -1) {
    return roomHaveNotification(room);
  }

  for (let index = liveEvents.length - 1; index >= 0; index -= 1) {
    const event = liveEvents[index];
    if (!event) return false;
    if (event.getId() === readUpToId) return false;
    if (event.getSender() === userId) continue;
    if (isNotificationEvent(event)) return true;
  }

  return false;
};

const getUnreadInfo = (client: MatrixClient, room: Room): { total: number; highlight: number } => {
  const total = room.getUnreadNotificationCount(NotificationCountType.Total);
  const highlight = room.getUnreadNotificationCount(NotificationCountType.Highlight);
  const userId = client.getUserId();
  const readMarkerState = getRoomReadMarkerState(room, userId);
  const liveTimelineUnread = getLiveTimelineUnreadState(room, userId);

  if (liveTimelineUnread.reliable) {
    return {
      highlight: Math.min(highlight, liveTimelineUnread.total),
      total: liveTimelineUnread.total,
    };
  }

  if (readMarkerState.optimistic && !roomHaveUnread(client, room)) {
    return {
      highlight: 0,
      total: 0,
    };
  }

  return {
    highlight,
    total: highlight > total ? highlight : total,
  };
};

const setAccountDataContent = async (
  client: MatrixClient,
  eventType: string,
  content: Record<string, unknown>
): Promise<void> => {
  await (
    client as unknown as {
      setAccountData: (type: string, content: Record<string, unknown>) => Promise<unknown>;
    }
  ).setAccountData(eventType, content);
};

const getSecretStorageApi = (client: MatrixClient): SecretStorageApi | undefined =>
  (client as unknown as { secretStorage?: SecretStorageApi }).secretStorage;

const getDefaultSecretStorageKey = async (
  client: MatrixClient
): Promise<{ keyId: string; keyInfo: SecretStorageKeyInfo } | undefined> => {
  const secretStorage = getSecretStorageApi(client);
  const keyId =
    (await secretStorage?.getDefaultKeyId?.().catch(() => null)) ??
    (getAccountDataContent(client, 'm.secret_storage.default_key')?.key as string | undefined);

  if (!keyId) return undefined;

  const keyTuple = await secretStorage?.getKey?.(keyId).catch(() => null);
  if (keyTuple?.[1]) {
    return { keyId: keyTuple[0], keyInfo: keyTuple[1] };
  }

  const keyInfo = getAccountDataContent(client, `m.secret_storage.key.${keyId}`);
  return keyInfo ? { keyId, keyInfo: keyInfo as SecretStorageKeyInfo } : undefined;
};

const cacheSecretStorageKeyFromInput = async (
  client: MatrixClient,
  input: string
): Promise<{ cached: boolean; source?: SecretStorageCacheSource }> => {
  const trimmed = input.trim();
  if (!trimmed) return { cached: false };

  const defaultKey = await getDefaultSecretStorageKey(client);
  if (!defaultKey) return { cached: false };

  try {
    const privateKey = decodeRecoveryKey(trimmed);
    secretStorageKeys.set(defaultKey.keyId, privateKey);
    return { cached: true, source: 'recovery-key' };
  } catch {
    // Not a Matrix recovery key; it may still be the user's security phrase.
  }

  const passphrase = defaultKey.keyInfo.passphrase;
  if (!passphrase?.salt || !passphrase.iterations) return { cached: false };

  const privateKey = await deriveRecoveryKeyFromPassphrase(
    trimmed,
    passphrase.salt,
    passphrase.iterations,
    passphrase.bits
  );
  secretStorageKeys.set(defaultKey.keyId, privateKey);
  return { cached: true, source: 'security-phrase' };
};

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
        `这个地址不像 Matrix API：${versionsUrl} 返回的是 ${contentType}。请填写真实 homeserver API 地址。`
      );
    }
  } catch (error) {
    throw matrixRequestError(error, baseUrl);
  }
};

const getEventType = (event: MatrixEvent): string => {
  const clearType = (event as unknown as { getClearType?: () => string | undefined }).getClearType?.();
  return clearType ?? event.getType();
};

const getEventContent = (event: MatrixEvent): Record<string, unknown> => {
  const clearContent = (
    event as unknown as { getClearContent?: () => Record<string, unknown> | undefined }
  ).getClearContent?.();
  return clearContent ?? (event.getContent() as Record<string, unknown>);
};

const getRelationType = (content: Record<string, unknown>): string | undefined => {
  const relation = content['m.relates_to'];
  if (!relation || typeof relation !== 'object') return undefined;
  return (relation as Record<string, unknown>).rel_type as string | undefined;
};

const suppressedRedactedRelationEventIds = new Set<string>();
const suppressedRedactedRelationEvents = new WeakSet<MatrixEvent>();
const watchedRelationRedactionEventIds = new Set<string>();

const suppressRedactedRelationEvent = (event: MatrixEvent): void => {
  suppressedRedactedRelationEvents.add(event);
  const eventId = event.getId();
  if (eventId) suppressedRedactedRelationEventIds.add(eventId);
};

const suppressRedactedRelationEventId = (eventId?: string): void => {
  if (eventId) suppressedRedactedRelationEventIds.add(eventId);
};

const watchRelationRedaction = (event: MatrixEvent): void => {
  const eventId = event.getId();
  if (eventId && watchedRelationRedactionEventIds.has(eventId)) return;
  if (eventId) watchedRelationRedactionEventIds.add(eventId);

  event.once(MatrixEventEvent.BeforeRedaction, (redactedEvent) => {
    suppressRedactedRelationEvent(redactedEvent);
    const redactedEventId = redactedEvent.getId();
    if (redactedEventId) watchedRelationRedactionEventIds.delete(redactedEventId);
  });
};

const isSuppressedRedactedRelationEvent = (event: MatrixEvent): boolean => {
  if (suppressedRedactedRelationEvents.has(event)) return true;
  const eventId = event.getId();
  return Boolean(eventId && suppressedRedactedRelationEventIds.has(eventId));
};

const getReplyEventId = (content: Record<string, unknown>): string | undefined => {
  const relation = content['m.relates_to'];
  if (!relation || typeof relation !== 'object') return undefined;

  const inReplyTo = (relation as Record<string, unknown>)['m.in_reply_to'];
  if (!inReplyTo || typeof inReplyTo !== 'object') return undefined;

  const eventId = (inReplyTo as Record<string, unknown>).event_id;
  return typeof eventId === 'string' ? eventId : undefined;
};

const trimReplyFallback = (body: string): string => {
  const match = body.match(/^> <.+?> .+\n(>.*\n)*?\n/m);
  if (!match) return body;
  return body.slice(match[0].length);
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const getPlainBody = (content: Record<string, unknown>): string => {
  const editedContent = content['m.new_content'];
  if (editedContent && typeof editedContent === 'object') {
    const editedBody = (editedContent as Record<string, unknown>).body;
    if (typeof editedBody === 'string') return trimReplyFallback(editedBody);
  }

  const body = content.body;
  if (typeof body === 'string') return trimReplyFallback(body);

  const name = content.name;
  if (typeof name === 'string') return name;

  return '';
};

const getEventById = (room: Room, eventId: string): MatrixEvent | undefined =>
  room.findEventById(eventId) ?? room.getLiveTimeline().getEvents().find((event) => event.getId() === eventId);

const getRoomPinnedEventIds = (room: Room): string[] => {
  const event = room.currentState?.getStateEvents('m.room.pinned_events', '');
  const content = event?.getContent() as Record<string, unknown> | undefined;
  const pinned = content?.pinned;
  return Array.isArray(pinned)
    ? pinned.filter((eventId): eventId is string => typeof eventId === 'string')
    : [];
};

const getReplyPreview = (
  client: MatrixClient,
  room: Room,
  content: Record<string, unknown>
): ChatReply | undefined => {
  const eventId = getReplyEventId(content);
  if (!eventId) return undefined;

  const replyEvent = getEventById(room, eventId);
  if (!replyEvent) {
    return {
      eventId,
      body: '回复了一条较早的消息',
    };
  }

  const sender = replyEvent.getSender() ?? undefined;
  const replyContent = getEventContent(replyEvent);
  return {
    eventId,
    senderId: sender,
    senderName: sender ? getMemberDisplayName(room, sender) : undefined,
    body: getPlainBody(replyContent) || '附件或状态消息',
  };
};

const getMemberDisplayName = (room: Room, userId?: string): string => {
  if (!userId) return '未知成员';
  const member = room.getMember(userId);
  return member?.rawDisplayName || userId;
};

const getMemberAvatarUrl = (
  client: MatrixClient,
  member: RoomMember | null | undefined,
  size = 96
): string | undefined => {
  const mxcUrl = member?.getMxcAvatarUrl();
  if (!mxcUrl) return undefined;
  return (
    (client as unknown as {
      mxcUrlToHttp: (
        mxc: string,
        width?: number,
        height?: number,
        resizeMethod?: string,
        allowDirectLinks?: boolean,
        allowRedirects?: boolean,
        useAuthentication?: boolean
      ) => string | null;
    }).mxcUrlToHttp(mxcUrl, size, size, 'crop', undefined, false, false) ?? undefined
  );
};

export const mxcToHttp = (
  client: MatrixClient,
  mxcUrl: unknown,
  width?: number,
  height?: number,
  useAuthentication = false
): string | undefined => {
  if (typeof mxcUrl !== 'string' || !mxcUrl.startsWith('mxc://')) return undefined;
  return (
    (client as unknown as {
      mxcUrlToHttp: (
        mxc: string,
        width?: number,
        height?: number,
        resizeMethod?: string,
        allowDirectLinks?: boolean,
        allowRedirects?: boolean,
        useAuthentication?: boolean
      ) => string | null;
    }).mxcUrlToHttp(
      mxcUrl,
      width,
      height,
      width || height ? 'scale' : undefined,
      false,
      useAuthentication ? true : false,
      useAuthentication
    ) ?? undefined
  );
};

const getEncryptedMediaFile = (value: unknown): EncryptedMediaFile | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const file = value as Record<string, unknown>;
  const key = file.key;
  const hashes = file.hashes;

  if (
    typeof file.url !== 'string' ||
    !file.url.startsWith('mxc://') ||
    !key ||
    typeof key !== 'object' ||
    typeof file.iv !== 'string'
  ) {
    return undefined;
  }

  return {
    url: file.url,
    key: key as EncryptedMediaFile['key'],
    iv: file.iv,
    hashes:
      hashes && typeof hashes === 'object'
        ? (hashes as Record<string, string>)
        : undefined,
    v: typeof file.v === 'string' ? file.v : undefined,
  };
};

const getAttachment = (
  client: MatrixClient,
  content: Record<string, unknown>
): ChatAttachment | undefined => {
  const msgType = content.msgtype;
  const infoRecord = typeof content.info === 'object' && content.info
    ? (content.info as Record<string, unknown>)
    : {};
  const encryptedFile = getEncryptedMediaFile(content.file);
  const mediaMxc = encryptedFile?.url ?? content.url;
  const name =
    typeof content.filename === 'string'
      ? content.filename
      : typeof content.body === 'string'
        ? content.body
        : undefined;
  const thumbnailInfo = typeof infoRecord.thumbnail_info === 'object' && infoRecord.thumbnail_info
    ? (infoRecord.thumbnail_info as Record<string, unknown>)
    : {};
  const thumbnailFile = getEncryptedMediaFile(infoRecord.thumbnail_file);
  const previewMxc = thumbnailFile?.url ?? infoRecord.thumbnail_url;
  const downloadUrl = mxcToHttp(client, mediaMxc);
  const authDownloadUrl = mxcToHttp(client, mediaMxc, undefined, undefined, true);
  const thumbnailUrl = previewMxc
    ? mxcToHttp(client, previewMxc, 640, 640)
    : encryptedFile
      ? downloadUrl
      : mxcToHttp(client, mediaMxc, 640, 640);
  const authThumbnailUrl = previewMxc
    ? mxcToHttp(client, previewMxc, 640, 640, true)
    : encryptedFile
      ? authDownloadUrl
      : mxcToHttp(client, mediaMxc, 640, 640, true);
  const mimeType = typeof infoRecord.mimetype === 'string' ? infoRecord.mimetype : undefined;
  const previewMimeType = typeof thumbnailInfo.mimetype === 'string' ? thumbnailInfo.mimetype : undefined;
  const previewResolvedMimeType = previewMimeType ?? (previewMxc ? (mimeType?.startsWith('image/') ? mimeType : undefined) : mimeType);
  const size = infoRecord.size;
  const duration = infoRecord.duration;
  const width = infoRecord.w;
  const height = infoRecord.h;
  const previewWidth = thumbnailInfo.w;
  const previewHeight = thumbnailInfo.h;

  if (msgType === MsgType.Image || msgType === 'm.image') {
    return {
      kind: 'image',
      mxcUrl: typeof mediaMxc === 'string' ? mediaMxc : undefined,
      url: thumbnailUrl ?? downloadUrl,
      authUrl: authThumbnailUrl ?? authDownloadUrl,
      previewEncryptedFile: thumbnailFile,
      previewMimeType: previewResolvedMimeType,
      downloadUrl,
      authDownloadUrl,
      encryptedFile,
      name,
      mimeType,
      size: typeof size === 'number' ? size : undefined,
      durationMs: typeof duration === 'number' ? duration : undefined,
      width: typeof width === 'number' ? width : typeof previewWidth === 'number' ? previewWidth : undefined,
      height: typeof height === 'number' ? height : typeof previewHeight === 'number' ? previewHeight : undefined,
    };
  }

  if (msgType === MsgType.Video || msgType === 'm.video') {
    return {
      kind: 'video',
      mxcUrl: typeof mediaMxc === 'string' ? mediaMxc : undefined,
      url: thumbnailUrl ?? downloadUrl,
      authUrl: authThumbnailUrl ?? authDownloadUrl,
      previewEncryptedFile: thumbnailFile,
      previewMimeType: previewResolvedMimeType,
      downloadUrl,
      authDownloadUrl,
      encryptedFile,
      name,
      mimeType,
      size: typeof size === 'number' ? size : undefined,
      durationMs: typeof duration === 'number' ? duration : undefined,
      width: typeof width === 'number' ? width : typeof previewWidth === 'number' ? previewWidth : undefined,
      height: typeof height === 'number' ? height : typeof previewHeight === 'number' ? previewHeight : undefined,
    };
  }

  if (msgType === MsgType.Audio || msgType === 'm.audio') {
    return {
      kind: 'audio',
      mxcUrl: typeof mediaMxc === 'string' ? mediaMxc : undefined,
      url: downloadUrl,
      authUrl: authDownloadUrl,
      downloadUrl,
      authDownloadUrl,
      encryptedFile,
      name,
      mimeType: typeof mimeType === 'string' ? mimeType : undefined,
      size: typeof size === 'number' ? size : undefined,
      durationMs: typeof duration === 'number' ? duration : undefined,
    };
  }

  if (msgType === MsgType.File || msgType === 'm.file') {
    return {
      kind: 'file',
      mxcUrl: typeof mediaMxc === 'string' ? mediaMxc : undefined,
      url: downloadUrl,
      authUrl: authDownloadUrl,
      downloadUrl,
      authDownloadUrl,
      encryptedFile,
      name,
      mimeType: typeof mimeType === 'string' ? mimeType : undefined,
      size: typeof size === 'number' ? size : undefined,
      durationMs: typeof duration === 'number' ? duration : undefined,
    };
  }

  return undefined;
};

const getEventReactions = (
  client: MatrixClient,
  room: Room,
  eventId: string
): ChatReaction[] => {
  try {
    const relations = (
      room.getUnfilteredTimelineSet() as unknown as {
        relations?: {
          getChildEventsForEvent?: (
            targetEventId: string,
            relationType: string,
            eventType: string
          ) => { getRelations: () => MatrixEvent[] } | undefined;
        };
      }
    ).relations?.getChildEventsForEvent?.(eventId, 'm.annotation', 'm.reaction');

    const counts = new Map<
      string,
      {
        count: number;
        reactedByMe: boolean;
        shortcode?: string;
        reactors: Map<string, MessageReadReceipt>;
        latestTimestamp: number;
      }
    >();
    const seenReactionIds = new Set<string>();

    relations?.getRelations().forEach((reaction) => {
      if (reaction.isRedacted?.()) return;

      const reactionId = reaction.getId();
      if (reactionId) {
        if (seenReactionIds.has(reactionId)) return;
        seenReactionIds.add(reactionId);
      }

      const content = getEventContent(reaction);
      const relation = content['m.relates_to'];
      if (!relation || typeof relation !== 'object') return;
      const key = (relation as Record<string, unknown>).key;
      if (typeof key !== 'string' || key.length === 0) return;
      const shortcode =
        typeof content.shortcode === 'string' && content.shortcode.trim()
          ? content.shortcode.trim()
          : undefined;
      const senderId = reaction.getSender();
      const senderMember = senderId ? room.getMember(senderId) : undefined;
      const senderTimestamp = reaction.getTs();

      const current = counts.get(key) ?? {
        count: 0,
        reactedByMe: false,
        shortcode,
        reactors: new Map<string, MessageReadReceipt>(),
        latestTimestamp: 0,
      };
      current.count += 1;
      current.reactedByMe = current.reactedByMe || reaction.getSender() === client.getUserId();
      current.shortcode ??= shortcode;
      current.latestTimestamp = Math.max(current.latestTimestamp, senderTimestamp);

      if (senderId && !current.reactors.has(senderId)) {
        current.reactors.set(senderId, {
          userId: senderId,
          name: getMemberDisplayName(room, senderId),
          avatarUrl: getMemberAvatarUrl(client, senderMember, 48),
          timestamp: senderTimestamp,
        });
      }

      counts.set(key, current);
    });

    return Array.from(counts.entries())
      .map(([key, value]) => ({
        key,
        shortcode: value.shortcode,
        count: value.count,
        reactedByMe: value.reactedByMe,
        latestTimestamp: value.latestTimestamp,
        reactors: Array.from(value.reactors.values()).sort((left, right) => {
          if (typeof left.timestamp === 'number' && typeof right.timestamp === 'number') {
            return right.timestamp - left.timestamp;
          }
          if (typeof left.timestamp === 'number') return -1;
          if (typeof right.timestamp === 'number') return 1;
          return left.name.localeCompare(right.name, 'zh-Hans-CN');
        }),
      }))
      .sort((left, right) => right.latestTimestamp - left.latestTimestamp || right.count - left.count)
      .map(({ latestTimestamp: _latestTimestamp, ...reaction }) => reaction);
  } catch {
    return [];
  }
};

const getReceiptTimestamp = (room: Room, userId: string): number | undefined => {
  const receipt = room.getReadReceiptForUserId(userId) as ReceiptWithTimestamp | null;
  if (typeof receipt?.data?.ts === 'number') return receipt.data.ts;
  if (typeof receipt?.ts === 'number') return receipt.ts;

  const unthreadedReceipt = room.getLastUnthreadedReceiptFor(userId) as
    | ReceiptWithTimestamp
    | undefined;
  if (typeof unthreadedReceipt?.data?.ts === 'number') return unthreadedReceipt.data.ts;
  if (typeof unthreadedReceipt?.ts === 'number') return unthreadedReceipt.ts;

  return undefined;
};

const getEventReadReceipts = (
  client: MatrixClient,
  room: Room,
  eventId: string
): MessageReadReceipt[] => {
  if (!eventId.startsWith('$')) return [];

  try {
    const event = room.findEventById(eventId);
    if (!event) return [];

    return room
      .getUsersReadUpTo(event)
      .filter((userId, index, userIds) => userIds.indexOf(userId) === index)
      .map((userId) => {
        const member = room.getMember(userId);
        return {
          userId,
          name: getMemberDisplayName(room, userId),
          avatarUrl: getMemberAvatarUrl(client, member, 48),
          timestamp: getReceiptTimestamp(room, userId),
        };
      })
      .sort((left, right) => {
        if (typeof left.timestamp === 'number' && typeof right.timestamp === 'number') {
          return right.timestamp - left.timestamp;
        }
        if (typeof left.timestamp === 'number') return -1;
        if (typeof right.timestamp === 'number') return 1;
        return left.name.localeCompare(right.name, 'zh-Hans-CN');
      });
  } catch {
    return [];
  }
};

const getOwnReactionEventId = (
  client: MatrixClient,
  room: Room,
  eventId: string,
  key: string
): string | undefined => {
  try {
    const relations = (
      room.getUnfilteredTimelineSet() as unknown as {
        relations?: {
          getChildEventsForEvent?: (
            targetEventId: string,
            relationType: string,
            eventType: string
          ) => { getRelations: () => MatrixEvent[] } | undefined;
        };
      }
    ).relations?.getChildEventsForEvent?.(eventId, 'm.annotation', 'm.reaction');

    const reaction = relations?.getRelations().find((event) => {
      if (event.getSender() !== client.getUserId()) return false;
      const content = getEventContent(event);
      const relation = content['m.relates_to'];
      if (!relation || typeof relation !== 'object') return false;
      return (relation as Record<string, unknown>).key === key;
    });

    return reaction?.getId();
  } catch {
    return undefined;
  }
};

const getLatestEditContent = (
  room: Room,
  eventId: string,
  eventType: string,
  sender?: string
): Record<string, unknown> | undefined => {
  try {
    const relations = (
      room.getUnfilteredTimelineSet() as unknown as {
        relations?: {
          getChildEventsForEvent?: (
            targetEventId: string,
            relationType: string,
            childEventType: string
          ) => { getRelations: () => MatrixEvent[] } | undefined;
        };
      }
    ).relations?.getChildEventsForEvent?.(eventId, 'm.replace', eventType);

    const latestEdit = relations
      ?.getRelations()
      .filter((editEvent) => !sender || editEvent.getSender() === sender)
      .sort((a, b) => b.getTs() - a.getTs())[0];

    const content = latestEdit ? getEventContent(latestEdit) : undefined;
    const newContent = content?.['m.new_content'];
    return newContent && typeof newContent === 'object'
      ? (newContent as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
};

const getFavoriteSourceMetadata = (
  client: MatrixClient,
  content: Record<string, unknown>
): FavoriteSourceMetadata | undefined => {
  const metadata = content['in.cinny.favorite'];
  if (!metadata || typeof metadata !== 'object') return undefined;

  const record = metadata as Record<string, unknown>;
  if (
    record.version !== 1 ||
    typeof record.sourceRoomId !== 'string' ||
    typeof record.sourceRoomName !== 'string' ||
    typeof record.sourceEventId !== 'string' ||
    typeof record.sourceSenderName !== 'string' ||
    typeof record.sourceTimestamp !== 'number' ||
    typeof record.favoritedAt !== 'number'
  ) {
    return undefined;
  }

  return {
    roomId: record.sourceRoomId,
    roomName: record.sourceRoomName,
    roomAvatarUrl: mxcToHttp(client, record.sourceRoomAvatarMxc, 96, 96),
    eventId: record.sourceEventId,
    senderId: typeof record.sourceSenderId === 'string' ? record.sourceSenderId : undefined,
    senderName: record.sourceSenderName,
    senderAvatarUrl: mxcToHttp(client, record.sourceSenderAvatarMxc, 72, 72),
    sourceTimestamp: record.sourceTimestamp,
    favoritedAt: record.favoritedAt,
  };
};

const describeMemberEvent = (event: MatrixEvent): string => {
  const content = getEventContent(event);
  const prevContent =
    (event as unknown as { getPrevContent?: () => Record<string, unknown> | undefined })
      .getPrevContent?.() ?? {};
  const membership = content.membership;
  const previousMembership = prevContent.membership;
  const name =
    typeof content.displayname === 'string'
      ? content.displayname
      : event.getStateKey() ?? event.getSender() ?? '成员';

  if (membership === 'join' && previousMembership !== 'join') return `${name} 加入了房间`;
  if (membership === 'leave') return `${name} 离开了房间`;
  if (membership === 'invite') return `${name} 收到邀请`;
  if (membership === 'ban') return `${name} 被移出房间`;
  return `${name} 更新了成员资料`;
};

const describeStateEvent = (event: MatrixEvent): string => {
  const content = getEventContent(event);
  const type = getEventType(event);

  if (type === 'm.room.name') {
    const name = typeof content.name === 'string' ? content.name : '未命名房间';
    return `房间名称改为 ${name}`;
  }

  if (type === 'm.room.topic') {
    const topic = typeof content.topic === 'string' ? content.topic : '';
    return topic ? `房间主题改为 ${topic}` : '房间主题已清空';
  }

  if (type === 'm.room.avatar') return '房间头像已更新';
  if (type === 'm.room.encryption') return '已开启端到端加密';
  if (type === 'm.room.create') return '房间已创建';

  return '房间状态已更新';
};

const eventToChatMessage = (
  client: MatrixClient,
  room: Room,
  event: MatrixEvent
): ChatMessage | undefined => {
  const id = event.getId();
  if (!id) return undefined;

  const eventType = getEventType(event);
  const content = getEventContent(event);
  const relationType = getRelationType(content);
  if (eventType === 'm.reaction' || relationType === 'm.replace' || relationType === 'm.annotation') {
    watchRelationRedaction(event);
    return undefined;
  }

  const pinnedEventIds = getRoomPinnedEventIds(room);
  const sender = event.getSender() ?? undefined;
  const latestEditContent = getLatestEditContent(room, id, eventType, sender);
  const displayContent = latestEditContent ?? content;
  const member = sender ? room.getMember(sender) : undefined;
  const baseMessage = {
    id,
    roomId: room.roomId,
    eventType,
    sender,
    senderName: sender ? getMemberDisplayName(room, sender) : undefined,
    senderAvatarUrl: getMemberAvatarUrl(client, member, 72),
    timestamp: event.getTs(),
    mine: sender === client.getUserId(),
    edited: Boolean(latestEditContent ?? content['m.new_content']),
    encrypted: event.isEncrypted?.() ?? eventType === 'm.room.encrypted',
    canEdit:
      sender === client.getUserId() &&
      eventType === 'm.room.message' &&
      (displayContent.msgtype === MsgType.Text || displayContent.msgtype === 'm.text') &&
      !event.isRedacted?.(),
    canRedact: sender === client.getUserId() && !event.isRedacted?.(),
    pinned: pinnedEventIds.includes(id),
    replyTo: getReplyPreview(client, room, content),
    reactions: getEventReactions(client, room, id),
    readReceipts: getEventReadReceipts(client, room, id),
    favoriteSource: getFavoriteSourceMetadata(client, content),
  };

  if (event.isRedacted?.()) {
    if (isSuppressedRedactedRelationEvent(event)) return undefined;

    return {
      ...baseMessage,
      kind: 'system',
      body: '这条消息已被撤回',
    };
  }

  if (eventType === 'm.room.member') {
    return {
      ...baseMessage,
      kind: 'system',
      body: describeMemberEvent(event),
    };
  }

  if (
    eventType === 'm.room.create' ||
    eventType === 'm.room.name' ||
    eventType === 'm.room.topic' ||
    eventType === 'm.room.avatar' ||
    eventType === 'm.room.encryption'
  ) {
    return {
      ...baseMessage,
      kind: 'system',
      body: describeStateEvent(event),
    };
  }

  if (eventType === 'm.sticker') {
    const stickerInfo =
      displayContent.info && typeof displayContent.info === 'object'
        ? (displayContent.info as Record<string, unknown>)
        : {};
    return {
      ...baseMessage,
      forwardContent: displayContent,
      kind: 'message',
      body: getPlainBody(displayContent) || '贴纸',
      attachment: {
        kind: 'image',
        url: mxcToHttp(client, displayContent.url, 420, 420),
        authUrl: mxcToHttp(client, displayContent.url, 420, 420, true),
        downloadUrl: mxcToHttp(client, displayContent.url),
        authDownloadUrl: mxcToHttp(client, displayContent.url, undefined, undefined, true),
        name: getPlainBody(displayContent) || '贴纸',
        mimeType: typeof stickerInfo.mimetype === 'string' ? stickerInfo.mimetype : undefined,
        width: typeof stickerInfo.w === 'number' ? stickerInfo.w : undefined,
        height: typeof stickerInfo.h === 'number' ? stickerInfo.h : undefined,
      },
    };
  }

  if (eventType === 'm.room.encrypted') {
    return {
      ...baseMessage,
      kind: 'message',
      body: '加密消息暂时无法解密，请确认设备验证和密钥备份状态。',
    };
  }

  if (eventType !== 'm.room.message') return undefined;

  const attachment = getAttachment(client, displayContent);
  const body = getPlainBody(displayContent);

  return {
    ...baseMessage,
    forwardContent: displayContent,
    kind: 'message',
    body: body || (attachment ? attachment.name ?? '附件' : '空消息'),
    attachment,
  };
};

const getTimelineMessages = (
  client: MatrixClient,
  room: Room,
  limit = DEFAULT_MESSAGE_LIMIT
): ChatMessage[] => {
  const events = room.getLiveTimeline().getEvents();
  return getTimelineEventsForChat(client, room, events, limit)
    .map((event) => eventToChatMessage(client, room, event))
    .filter((message): message is ChatMessage => Boolean(message));
};

const isRenderableOwnChatEvent = (client: MatrixClient, event: MatrixEvent): boolean => {
  if (event.getSender() !== client.getUserId()) return false;
  if (!event.getId() || event.isRedacted?.()) return false;

  const eventType = getEventType(event);
  const relationType = getRelationType(getEventContent(event));
  if (relationType === 'm.replace' || relationType === 'm.annotation') return false;

  return eventType === 'm.room.message' || eventType === 'm.room.encrypted';
};

const findLatestIndexAtOrBefore = (indices: number[], target: number): number | undefined => {
  let low = 0;
  let high = indices.length - 1;
  let result = -1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const value = indices[middle];
    if (value <= target) {
      result = value;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return result >= 0 ? result : undefined;
};

const getReadReceiptAnchorIndices = (
  client: MatrixClient,
  room: Room,
  events: MatrixEvent[]
): number[] => {
  const ownUserId = client.getUserId();
  if (!ownUserId || events.length === 0) return [];

  const ownMessageIndices: number[] = [];
  const eventIndexById = new Map<string, number>();

  events.forEach((event, index) => {
    const eventId = event.getId();
    if (eventId) eventIndexById.set(eventId, index);
    if (isRenderableOwnChatEvent(client, event)) {
      ownMessageIndices.push(index);
    }
  });

  if (ownMessageIndices.length === 0) return [];

  const anchorIndices = new Set<number>();

  room.getMembers().forEach((member) => {
    if (member.userId === ownUserId || member.membership !== 'join') return;

    const readUpToEventId =
      room.getEventReadUpTo(member.userId, true) ?? room.getEventReadUpTo(member.userId);
    if (!readUpToEventId) return;

    const readUpToIndex = eventIndexById.get(readUpToEventId);
    if (typeof readUpToIndex !== 'number') return;

    const anchorIndex = findLatestIndexAtOrBefore(ownMessageIndices, readUpToIndex);
    if (typeof anchorIndex === 'number') {
      anchorIndices.add(anchorIndex);
    }
  });

  return Array.from(anchorIndices).sort((left, right) => left - right);
};

const getTimelineEventsForChat = (
  client: MatrixClient,
  room: Room,
  events: MatrixEvent[],
  limit: number
): MatrixEvent[] => {
  if (events.length <= limit) return events;

  const baseStartIndex = Math.max(0, events.length - limit);
  const anchorIndices = getReadReceiptAnchorIndices(client, room, events).filter(
    (index) => index < baseStartIndex
  );

  if (anchorIndices.length === 0) {
    return events.slice(baseStartIndex);
  }

  const earliestAnchorIndex = anchorIndices[0];
  if (events.length - earliestAnchorIndex <= MAX_RECEIPT_CONTEXT_MESSAGE_COUNT) {
    return events.slice(earliestAnchorIndex);
  }

  const selectedIndices = new Set<number>();
  for (let index = baseStartIndex; index < events.length; index += 1) {
    selectedIndices.add(index);
  }
  anchorIndices.forEach((index) => selectedIndices.add(index));

  return events.filter((_event, index) => selectedIndices.has(index));
};

const getLastMessagePreview = (client: MatrixClient, room: Room): { text: string; ts: number } => {
  const events = room.getLiveTimeline().getEvents();

  for (let i = events.length - 1; i >= 0; i -= 1) {
    const message = eventToChatMessage(client, room, events[i]);
    if (message) {
      return {
        text:
          message.kind === 'system'
            ? message.body
            : `${message.mine ? '你' : message.senderName ?? ''}${message.mine ? '：' : message.senderName ? '：' : ''}${message.body}`,
        ts: message.timestamp,
      };
    }
  }

  return {
    text: room.getMyMembership() === 'invite' ? '等待你处理邀请' : '还没有消息',
    ts: 0,
  };
};

const getDirectRoomIds = (client: MatrixClient): Set<string> => {
  const content = getAccountDataContent(client, 'm.direct');
  const roomIds = new Set<string>();

  Object.values(content ?? {}).forEach((value) => {
    if (Array.isArray(value)) {
      value.forEach((roomId) => {
        if (typeof roomId === 'string') roomIds.add(roomId);
      });
    }
  });

  return roomIds;
};

const isDirectInvite = (room: Room, myUserId: string | null): boolean => {
  if (!myUserId) return false;
  const member = room.getMember(myUserId);
  return member?.events?.member?.getContent()?.is_direct === true;
};

const getRoomAvatarUrl = (client: MatrixClient, room: Room, direct: boolean): string | undefined => {
  const directAvatar = direct ? room.getAvatarFallbackMember()?.getMxcAvatarUrl() : undefined;
  const mxc = directAvatar ?? room.getMxcAvatarUrl();
  return mxcToHttp(client, mxc, 96, 96);
};

const getRoomMemberCount = (room: Room): number => {
  try {
    return room.getJoinedMemberCount();
  } catch {
    return 0;
  }
};

const getSpaceParentMap = (rooms: Room[]): Map<string, string[]> => {
  const parentMap = new Map<string, string[]>();

  rooms
    .filter((room) => room.isSpaceRoom())
    .forEach((spaceRoom) => {
      const childEvents =
        (spaceRoom.currentState?.getStateEvents('m.space.child') as MatrixEvent[] | undefined) ?? [];
      childEvents.forEach((event) => {
        const childRoomId = event.getStateKey?.();
        const content = event.getContent?.() as Record<string, unknown> | undefined;
        if (!childRoomId || content?.via === undefined) return;
        const current = parentMap.get(childRoomId) ?? [];
        if (!current.includes(spaceRoom.roomId)) {
          parentMap.set(childRoomId, current.concat(spaceRoom.roomId));
        }
      });
    });

  return parentMap;
};

type RoomPushRule = {
  rule_id?: string;
  actions?: unknown;
  conditions?: Array<Record<string, unknown>>;
  enabled?: boolean;
};

type RoomPushRules = {
  global?: Partial<Record<PushRuleKind, RoomPushRule[]>>;
};

const ROOM_NOTIFICATION_SOUND_ACTION = {
  set_tweak: TweakName.Sound,
  value: 'default',
} as const;

const getClientPushRules = (client: MatrixClient): RoomPushRules | undefined => {
  const clientRules = (client as unknown as { pushRules?: RoomPushRules }).pushRules;
  if (clientRules) return clientRules;
  return getAccountDataContent(client, 'm.push_rules') as RoomPushRules | undefined;
};

const getPushRuleSet = (
  pushRules: RoomPushRules | undefined,
  kind: PushRuleKind
): RoomPushRule[] => pushRules?.global?.[kind] ?? [];

const findRoomRule = (
  pushRules: RoomPushRules | undefined,
  kind: PushRuleKind,
  roomId: string
): RoomPushRule | undefined =>
  getPushRuleSet(pushRules, kind).find((rule) => rule.rule_id === roomId);

const isDontNotifyAction = (actions: unknown): boolean =>
  Array.isArray(actions) &&
  (actions.length === 0 || actions.includes(PushRuleActionName.DontNotify));

const isNotifyAction = (actions: unknown): boolean =>
  Array.isArray(actions) && actions.includes(PushRuleActionName.Notify);

const getRoomNotificationMode = (client: MatrixClient, roomId: string): RoomNotificationMode => {
  try {
    const pushRules = getClientPushRules(client);
    const overrideRule = findRoomRule(pushRules, PushRuleKind.Override, roomId);
    if (overrideRule?.enabled !== false && isDontNotifyAction(overrideRule?.actions)) {
      return 'mute';
    }

    const directRule = (client as unknown as {
      getRoomPushRule?: (scope: string, targetRoomId: string) => RoomPushRule | undefined;
    }).getRoomPushRule?.('global', roomId);
    const roomRule = directRule ?? findRoomRule(pushRules, PushRuleKind.RoomSpecific, roomId);

    if (roomRule?.enabled !== false && isDontNotifyAction(roomRule?.actions)) return 'mentions';
    if (roomRule?.enabled !== false && isNotifyAction(roomRule?.actions)) return 'all';
    return 'default';
  } catch {
    return 'default';
  }
};

const getFileInfo = (file: File): Record<string, unknown> => ({
  mimetype: file.type || 'application/octet-stream',
  size: file.size,
});

const roomToSummary = (
  client: MatrixClient,
  room: Room,
  directRoomIds: Set<string>,
  parentSpaceIds: string[] = []
): RoomSummary => {
  const membership = room.getMyMembership();
  const direct = directRoomIds.has(room.roomId) || isDirectInvite(room, client.getUserId());
  const lastMessage = getLastMessagePreview(client, room);
  const notificationMode = getRoomNotificationMode(client, room.roomId);
  const unreadInfo =
    membership === 'join'
      ? getUnreadInfo(client, room)
      : {
          total: room.getUnreadNotificationCount?.(NotificationCountType.Total) ?? 0,
          highlight: room.getUnreadNotificationCount?.(NotificationCountType.Highlight) ?? 0,
        };

  return {
    id: room.roomId,
    name: room.name || room.getCanonicalAlias() || ROOM_NAME_FALLBACK,
    canonicalAlias: room.getCanonicalAlias() ?? undefined,
    topic: room.currentState?.getStateEvents('m.room.topic', '')?.getContent()?.topic,
    avatarUrl: getRoomAvatarUrl(client, room, direct),
    parentSpaceIds,
    encrypted: room.hasEncryptionStateEvent(),
    notificationMode,
    muted: notificationMode === 'mute',
    direct,
    space: room.isSpaceRoom(),
    membership,
    unread: unreadInfo.total,
    highlight: unreadInfo.highlight,
    memberCount: getRoomMemberCount(room),
    lastMessage: lastMessage.text,
    lastTs: lastMessage.ts,
  };
};

const buildSnapshot = (client: MatrixClient): MatrixSnapshot => {
  const directRoomIds = getDirectRoomIds(client);
  const mxRooms = client.getRooms();
  const parentSpaceMap = getSpaceParentMap(mxRooms);
  const rooms = mxRooms
    .map((room) => roomToSummary(client, room, directRoomIds, parentSpaceMap.get(room.roomId) ?? []))
    .sort((a, b) => {
      if (a.membership === 'invite' && b.membership !== 'invite') return -1;
      if (b.membership === 'invite' && a.membership !== 'invite') return 1;
      return b.lastTs - a.lastTs || a.name.localeCompare(b.name, 'zh-Hans-CN');
    });

  return {
    version: ++matrixSnapshotVersion,
    rooms,
    totalUnread: rooms.reduce((count, room) => count + room.unread, 0),
    totalHighlights: rooms.reduce((count, room) => count + room.highlight, 0),
  };
};

const storeDirectRoom = async (
  client: MatrixClient,
  roomId: string,
  userId: string
): Promise<void> => {
  const content = getAccountDataContent(client, 'm.direct');
  const nextContent: Record<string, string[]> = {};

  Object.entries(content ?? {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      nextContent[key] = value.filter((id): id is string => typeof id === 'string');
    }
  });

  Object.keys(nextContent).forEach((key) => {
    nextContent[key] = nextContent[key].filter((id) => id !== roomId);
  });

  nextContent[userId] = Array.from(new Set([...(nextContent[userId] ?? []), roomId]));
  await setAccountDataContent(client, 'm.direct', nextContent);
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

export async function verifyStoredSession(session: StoredMatrixSession): Promise<void> {
  const client = createNativeMatrixClient({
    baseUrl: session.baseUrl,
    accessToken: session.accessToken,
    userId: session.userId,
    deviceId: session.deviceId,
  });

  try {
    const response = await client.whoami();
    if (response.user_id && response.user_id !== session.userId) {
      throw new Error('Stored session user does not match homeserver response.');
    }
  } catch (error) {
    throw matrixRequestError(error, session.baseUrl);
  }
}

export async function createMatrixRuntime(
  session: StoredMatrixSession,
  onSnapshotChanged: (snapshot: MatrixSnapshot) => void,
  onSyncStateChanged: (state: SyncState | null) => void
): Promise<MatrixRuntime> {
  const sessionStoreKey = getSessionStoreKey(session);
  const rustCryptoDatabasePrefix = `ioscinny-rust-crypto-${sessionStoreKey}`;
  const indexedDBStore = new IndexedDBStore({
    indexedDB: globalThis.indexedDB,
    localStorage: globalThis.localStorage,
    dbName: `ioscinny-sync-${sessionStoreKey}`,
  });
  const cryptoStore = new IndexedDBCryptoStore(
    globalThis.indexedDB,
    `ioscinny-crypto-${sessionStoreKey}`
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
  await client.initRustCrypto({
    cryptoDatabasePrefix: rustCryptoDatabasePrefix,
  });

  const refresh = () => onSnapshotChanged(buildSnapshot(client));
  const handleSync = (state: SyncState | null) => {
    onSyncStateChanged(state);
    refresh();
  };

  client.on(ClientEvent.Sync, handleSync);
  client.on(ClientEvent.AccountData, refresh);
  client.on(RoomEvent.Timeline, refresh);
  client.on(RoomEvent.TimelineReset, refresh);
  client.on(RoomEvent.LocalEchoUpdated, refresh);
  client.on(RoomEvent.AccountData, refresh);
  client.on(RoomEvent.Receipt, refresh);
  client.on(RoomEvent.MyMembership, refresh);

  await client.startClient({
    lazyLoadMembers: true,
  });
  refresh();

  return {
    client,
    stop: () => {
      client.removeListener(ClientEvent.Sync, handleSync);
      client.removeListener(ClientEvent.AccountData, refresh);
      client.removeListener(RoomEvent.Timeline, refresh);
      client.removeListener(RoomEvent.TimelineReset, refresh);
      client.removeListener(RoomEvent.LocalEchoUpdated, refresh);
      client.removeListener(RoomEvent.AccountData, refresh);
      client.removeListener(RoomEvent.Receipt, refresh);
      client.removeListener(RoomEvent.MyMembership, refresh);
      client.stopClient();
    },
  };
}

export function getMatrixSnapshot(client: MatrixClient): MatrixSnapshot {
  return buildSnapshot(client);
}

export function getRoomMessages(
  client: MatrixClient,
  roomId: string,
  query = '',
  limit?: number
): ChatMessage[] {
  const room = client.getRoom(roomId);
  if (!room) return [];

  const normalizedQuery = query.trim().toLowerCase();
  const loadedEventCount = room.getLiveTimeline().getEvents().length;
  const effectiveLimit =
    typeof limit === 'number' ? limit : Math.max(loadedEventCount, DEFAULT_MESSAGE_LIMIT);
  const messages = getTimelineMessages(client, room, effectiveLimit);
  if (!normalizedQuery) return messages;

  return messages.filter((message) =>
    `${message.senderName ?? ''} ${message.body}`.toLowerCase().includes(normalizedQuery)
  );
}

export function getRoomInlineReadReceiptStates(
  client: MatrixClient,
  roomId: string,
  messages: ChatMessage[]
): Map<string, InlineReadReceiptState> {
  const room = client.getRoom(roomId);
  if (!room || messages.length === 0) return new Map();

  const ownUserId = client.getUserId();
  if (!ownUserId) return new Map();

  const ownVisibleMessages = messages.filter(
    (message): message is ChatMessage & { sender: string } =>
      message.kind === 'message' && message.mine && typeof message.sender === 'string'
  );
  if (ownVisibleMessages.length === 0) return new Map();

  const timelineEvents = room.getLiveTimeline().getEvents();
  const timelineIndexByEventId = new Map<string, number>();

  timelineEvents.forEach((event, index) => {
    const eventId = event.getId();
    if (eventId) {
      timelineIndexByEventId.set(eventId, index);
    }
  });

  const visibleOwnTimelineEntries = ownVisibleMessages
    .map((message) => {
      const timelineIndex = timelineIndexByEventId.get(message.id);
      return typeof timelineIndex === 'number'
        ? {
            messageId: message.id,
            timelineIndex,
          }
        : undefined;
    })
    .filter((entry): entry is { messageId: string; timelineIndex: number } => Boolean(entry))
    .sort((left, right) => left.timelineIndex - right.timelineIndex);

  const statesByMessageId = new Map<string, InlineReadReceiptState>();
  const assignedUsers = new Set<string>();

  for (let index = visibleOwnTimelineEntries.length - 1; index >= 0; index -= 1) {
    const entry = visibleOwnTimelineEntries[index];
    const event = timelineEvents[entry.timelineIndex];
    if (!event) continue;

    const readers = Array.from(new Set(room.getUsersReadUpTo(event)))
      .filter((userId) => userId && userId !== ownUserId && !assignedUsers.has(userId))
      .map((userId, readerIndex) => {
        const member = room.getMember(userId);
        return {
          userId,
          name: getMemberDisplayName(room, userId),
          avatarUrl: getMemberAvatarUrl(client, member, 48),
          timestamp: getReceiptTimestamp(room, userId),
          readerIndex,
        };
      });

    if (readers.length === 0) continue;

    readers.sort((left, right) => {
      if (typeof left.timestamp === 'number' && typeof right.timestamp === 'number') {
        return right.timestamp - left.timestamp;
      }
      if (typeof left.timestamp === 'number') return -1;
      if (typeof right.timestamp === 'number') return 1;
      return left.readerIndex - right.readerIndex;
    });

    statesByMessageId.set(entry.messageId, {
      readReceipts: readers.map(({ readerIndex: _readerIndex, ...reader }) => reader),
      totalCount: readers.length,
    });

    readers.forEach((reader) => assignedUsers.add(reader.userId));
  }

  return statesByMessageId;
}

export function searchLocalMessages(
  client: MatrixClient,
  query: string,
  limit = 80
): LocalMessageSearchResult[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length < 2) return [];

  const snapshot = buildSnapshot(client);
  return snapshot.rooms
    .filter((room) => room.membership === 'join' && !room.space)
    .flatMap((room) => {
      const mxRoom = client.getRoom(room.id);
      if (!mxRoom) return [];
      return getTimelineMessages(client, mxRoom, 220)
        .filter((message) =>
          `${room.name} ${message.senderName ?? ''} ${message.body}`
            .toLowerCase()
            .includes(normalizedQuery)
        )
        .map((message) => ({ room, message }));
    })
    .sort((a, b) => b.message.timestamp - a.message.timestamp)
    .slice(0, limit);
}

export function getRoomMediaItems(client: MatrixClient, roomId: string): RoomMediaItem[] {
  const room = client.getRoom(roomId);
  if (!room) return [];

  return getTimelineMessages(client, room, 260)
    .filter((message) => message.attachment)
    .map((message) => ({
      messageId: message.id,
      roomId: message.roomId,
      kind: message.attachment!.kind,
      mxcUrl: message.attachment!.mxcUrl,
      url: message.attachment!.url,
      authUrl: message.attachment!.authUrl,
      previewEncryptedFile: message.attachment!.previewEncryptedFile,
      previewMimeType: message.attachment!.previewMimeType,
      downloadUrl: message.attachment!.downloadUrl,
      authDownloadUrl: message.attachment!.authDownloadUrl,
      encryptedFile: message.attachment!.encryptedFile,
      name: message.attachment!.name ?? message.body,
      mimeType: message.attachment!.mimeType,
      size: message.attachment!.size,
      durationMs: message.attachment!.durationMs,
      width: message.attachment!.width,
      height: message.attachment!.height,
      senderName: message.senderName,
      timestamp: message.timestamp,
    }))
    .reverse();
}

export function getPinnedMessages(client: MatrixClient, roomId: string): PinnedMessageSummary[] {
  const room = client.getRoom(roomId);
  if (!room) return [];

  return getRoomPinnedEventIds(room).map((eventId) => {
    const event = getEventById(room, eventId);
    const message = event ? eventToChatMessage(client, room, event) : undefined;

    if (message) {
      return {
        id: message.id,
        roomId,
        body: message.body,
        senderName: message.senderName,
        timestamp: message.timestamp,
        available: true,
      };
    }

    return {
      id: eventId,
      roomId,
      body: '这条置顶消息还没有同步到本地时间线',
      available: false,
    };
  });
}

export async function fetchRoomMessageById(
  client: MatrixClient,
  roomId: string,
  eventId: string
): Promise<ChatMessage | undefined> {
  const room = client.getRoom(roomId);
  if (!room) return undefined;

  const localEvent = getEventById(room, eventId);
  if (localEvent) {
    return eventToChatMessage(client, room, localEvent);
  }

  try {
    const remoteEvent = await client.fetchRoomEvent(roomId, eventId);
    if (!remoteEvent) return undefined;
    return eventToChatMessage(client, room, new MatrixEvent(remoteEvent));
  } catch {
    return undefined;
  }
}

const getUserPowerLevels = (room: Room): Record<string, unknown> => {
  const powerLevels =
    room.currentState?.getStateEvents('m.room.power_levels', '')?.getContent() ?? {};
  return typeof powerLevels.users === 'object' && powerLevels.users ? powerLevels.users : {};
};

const toRoomMemberSummary = (
  client: MatrixClient,
  member: RoomMember,
  userPowerLevels: Record<string, unknown>
): RoomMemberSummary => ({
  id: member.userId,
  name: member.rawDisplayName || member.userId,
  avatarUrl: getMemberAvatarUrl(client, member, 96),
  membership: member.membership,
  powerLevel:
    typeof (userPowerLevels as Record<string, unknown>)[member.userId] === 'number'
      ? ((userPowerLevels as Record<string, number>)[member.userId] as number)
      : 0,
});

export function getRoomMembers(client: MatrixClient, roomId: string): RoomMemberSummary[] {
  const room = client.getRoom(roomId);
  if (!room) return [];

  const userPowerLevels = getUserPowerLevels(room);

  return room
    .getJoinedMembers()
    .map((member) => toRoomMemberSummary(client, member, userPowerLevels))
    .sort(
      (a, b) => (b.powerLevel ?? 0) - (a.powerLevel ?? 0) || a.name.localeCompare(b.name, 'zh-Hans-CN')
    );
}

export async function loadRoomMembers(client: MatrixClient, roomId: string): Promise<RoomMemberSummary[]> {
  const room = client.getRoom(roomId);
  if (!room) return [];

  try {
    await room.loadMembersIfNeeded();
  } catch {
    return getRoomMembers(client, roomId);
  }

  const userPowerLevels = getUserPowerLevels(room);
  return room
    .getJoinedMembers()
    .map((member) => toRoomMemberSummary(client, member, userPowerLevels))
    .sort(
      (a, b) => (b.powerLevel ?? 0) - (a.powerLevel ?? 0) || a.name.localeCompare(b.name, 'zh-Hans-CN')
    );
}

const normalizeEmojiUsage = (
  imageUsage: unknown,
  packUsage: unknown
): CustomEmojiUsage[] => {
  const rawUsage = Array.isArray(imageUsage) && imageUsage.length > 0 ? imageUsage : packUsage;
  const usage = Array.isArray(rawUsage)
    ? rawUsage.filter((item): item is CustomEmojiUsage => item === 'emoticon' || item === 'sticker')
    : [];

  return usage.length > 0 ? Array.from(new Set(usage)) : ['emoticon', 'sticker'];
};

const CINNY_SYNC_SOURCE_PACK_ID = 'in.cinny.source_pack_id';

const filterSyncedPersonalPackImages = (
  content: Record<string, unknown> | undefined
): Record<string, unknown> | undefined => {
  if (!content) return undefined;

  const images =
    content.images && typeof content.images === 'object'
      ? (content.images as Record<string, Record<string, unknown> | undefined>)
      : undefined;

  if (!images) return content;

  const filteredImages = Object.fromEntries(
    Object.entries(images).filter(
      ([, image]) => !(image && typeof image[CINNY_SYNC_SOURCE_PACK_ID] === 'string')
    )
  );

  if (Object.keys(filteredImages).length === Object.keys(images).length) {
    return content;
  }

  if (Object.keys(filteredImages).length === 0) {
    const { images: _ignored, ...rest } = content;
    return rest;
  }

  return {
    ...content,
    images: filteredImages,
  };
};

const normalizeEditableEmojiUsageInput = (usage: CustomEmojiUsage[] | undefined): CustomEmojiUsage[] => {
  const normalized = Array.isArray(usage)
    ? usage.filter((item): item is CustomEmojiUsage => item === 'emoticon' || item === 'sticker')
    : [];

  return normalized.length > 0 ? Array.from(new Set(normalized)) : ['emoticon', 'sticker'];
};

const getPackRecord = (content: Record<string, unknown> | undefined): Record<string, unknown> =>
  content?.pack && typeof content.pack === 'object'
    ? { ...(content.pack as Record<string, unknown>) }
    : {};

const getPackImagesRecord = (
  content: Record<string, unknown> | undefined
): Record<string, Record<string, unknown> | undefined> =>
  content?.images && typeof content.images === 'object'
    ? { ...(content.images as Record<string, Record<string, unknown> | undefined>) }
    : {};

const getPackDisplayName = (
  content: Record<string, unknown> | undefined,
  fallbackPackName: string
): string => {
  const pack = getPackRecord(content);
  return typeof pack.display_name === 'string' && pack.display_name.trim()
    ? pack.display_name.trim()
    : fallbackPackName;
};

const getEditableUserPackContent = (client: MatrixClient): Record<string, unknown> =>
  filterSyncedPersonalPackImages(getAccountDataContent(client, 'im.ponies.user_emotes')) ?? {};

const getUserPackSyncedImages = (
  client: MatrixClient
): Record<string, Record<string, unknown> | undefined> => {
  const rawContent = getAccountDataContent(client, 'im.ponies.user_emotes');
  const rawImages = getPackImagesRecord(rawContent);

  return Object.fromEntries(
    Object.entries(rawImages).filter(
      ([, image]) => Boolean(image && typeof image[CINNY_SYNC_SOURCE_PACK_ID] === 'string')
    )
  );
};

const buildMergedUserPackContent = (
  client: MatrixClient,
  editableContent: Record<string, unknown>
): Record<string, unknown> => {
  const rawContent = getAccountDataContent(client, 'im.ponies.user_emotes') ?? {};
  const syncedImages = getUserPackSyncedImages(client);
  const editableImages = getPackImagesRecord(editableContent);
  const mergedImages = {
    ...syncedImages,
    ...editableImages,
  };
  const nextContent: Record<string, unknown> = {
    ...rawContent,
    ...editableContent,
  };

  if (Object.keys(mergedImages).length > 0) {
    nextContent.images = mergedImages;
  } else {
    delete nextContent.images;
  }

  return nextContent;
};

const getCinnyUserEmojiPackRoot = (client: MatrixClient): Record<string, unknown> =>
  getAccountDataContent(client, 'in.cinny.user_emoji_packs') ?? {};

const getCinnyUserEmojiPackMap = (
  client: MatrixClient
): Record<string, Record<string, unknown> | undefined> => {
  const root = getCinnyUserEmojiPackRoot(client);
  return root.packs && typeof root.packs === 'object'
    ? { ...(root.packs as Record<string, Record<string, unknown> | undefined>) }
    : {};
};

const normalizeCinnyUserEmojiPackOrder = (
  order: unknown,
  packs: Record<string, Record<string, unknown> | undefined>
): string[] => {
  const rawOrder = Array.isArray(order)
    ? order.filter((packId): packId is string => typeof packId === 'string' && packId.length > 0)
    : [];
  const availablePackIds = new Set(
    Object.keys(packs).filter((packId) => packId.length > 0 && packId !== 'user')
  );
  const normalizedOrder: string[] = [];

  rawOrder.forEach((packId) => {
    if (!availablePackIds.has(packId)) return;
    availablePackIds.delete(packId);
    normalizedOrder.push(packId);
  });

  availablePackIds.forEach((packId) => normalizedOrder.push(packId));
  return normalizedOrder;
};

const getCinnyUserEmojiPackOrder = (client: MatrixClient): string[] => {
  const root = getCinnyUserEmojiPackRoot(client);
  return normalizeCinnyUserEmojiPackOrder(root.order, getCinnyUserEmojiPackMap(client));
};

const saveEditableUserPackContent = async (
  client: MatrixClient,
  editableContent: Record<string, unknown>
): Promise<void> => {
  await setAccountDataContent(client, 'im.ponies.user_emotes', buildMergedUserPackContent(client, editableContent));
};

const saveCinnyUserEmojiPackRoot = async (
  client: MatrixClient,
  packs: Record<string, Record<string, unknown> | undefined>,
  order: string[]
): Promise<void> => {
  const currentRoot = getCinnyUserEmojiPackRoot(client);
  await setAccountDataContent(client, 'in.cinny.user_emoji_packs', {
    ...currentRoot,
    packs,
    order: normalizeCinnyUserEmojiPackOrder(order, packs),
  });
};

const buildCustomEmojiPack = (
  client: MatrixClient,
  packId: string,
  content: Record<string, unknown> | undefined,
  fallbackPackName: string,
  options: {
    isDefault: boolean;
    editable: boolean;
    deletable: boolean;
    orderable: boolean;
  }
): CustomEmojiPack => {
  const items = collectCustomEmojiPackItems(client, packId, content, fallbackPackName);

  return {
    id: packId,
    name: getPackDisplayName(content, fallbackPackName),
    usage: normalizeEmojiUsage(undefined, getPackRecord(content).usage),
    items,
    cover: items.find((item) => item.authUrl || item.url || item.authDownloadUrl || item.downloadUrl) ?? items[0],
    isDefault: options.isDefault,
    editable: options.editable,
    deletable: options.deletable,
    orderable: options.orderable,
  };
};

const stripFileExtension = (name: string): string => name.replace(/\.[^.]+$/, '');

const makeEmojiShortcodeBase = (value: string): string => {
  const normalized = stripFileExtension(value)
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}_-]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '');

  return normalized || `emoji-${Date.now().toString(36)}`;
};

const ensureUniqueEmojiShortcode = (
  images: Record<string, Record<string, unknown> | undefined>,
  preferred: string
): string => {
  const base = preferred || `emoji-${Date.now().toString(36)}`;
  let candidate = base;
  let suffix = 2;

  while (images[candidate]) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
};

const findEmojiShortcodeByMxcUrl = (
  images: Record<string, Record<string, unknown> | undefined>,
  mxcUrl: string
): string | undefined =>
  Object.entries(images).find(([, image]) => image?.url === mxcUrl)?.[0];

const createPersonalEmojiPackId = (): string =>
  `personal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const collectCustomEmojiPackItems = (
  client: MatrixClient,
  packId: string,
  content: Record<string, unknown> | undefined,
  fallbackPackName: string
): CustomEmojiItem[] => {
  if (!content) return [];

  const pack = content.pack && typeof content.pack === 'object'
    ? (content.pack as Record<string, unknown>)
    : {};
  const images =
    content.images && typeof content.images === 'object'
      ? (content.images as Record<string, Record<string, unknown> | undefined>)
      : {};
  const packName =
    typeof pack.display_name === 'string' && pack.display_name.trim()
      ? pack.display_name.trim()
      : fallbackPackName;

  return Object.entries(images).flatMap(([shortcode, image]) => {
    if (!image) return [];
    const mxcUrl = image.url;
    if (typeof mxcUrl !== 'string' || !mxcUrl.startsWith('mxc://')) return [];

    const info = image.info && typeof image.info === 'object'
      ? (image.info as Record<string, unknown>)
      : undefined;
    const body =
      typeof image.body === 'string' && image.body.trim()
        ? image.body.trim()
        : shortcode;

    return [
      {
        id: `${packId}:${shortcode}:${mxcUrl}`,
        packId,
        shortcode,
        body,
        packName,
        usage: normalizeEmojiUsage(image.usage, pack.usage),
        mxcUrl,
        url: mxcToHttp(client, mxcUrl, 256, 256),
        authUrl: mxcToHttp(client, mxcUrl, 256, 256, true),
        downloadUrl: mxcToHttp(client, mxcUrl),
        authDownloadUrl: mxcToHttp(client, mxcUrl, undefined, undefined, true),
        info,
      },
    ];
  });
};

export function getPersonalCustomEmojiPacks(client: MatrixClient): CustomEmojiPack[] {
  const packs: CustomEmojiPack[] = [];
  const defaultContent = getEditableUserPackContent(client);

  packs.push(
    buildCustomEmojiPack(client, 'user', defaultContent, '默认', {
      isDefault: true,
      editable: true,
      deletable: false,
      orderable: false,
    })
  );

  const customPacks = getCinnyUserEmojiPackMap(client);
  const packIds = getCinnyUserEmojiPackOrder(client);

  packIds.forEach((packId) => {
    packs.push(
      buildCustomEmojiPack(client, packId, customPacks[packId], packId, {
        isDefault: false,
        editable: true,
        deletable: true,
        orderable: true,
      })
    );
  });

  return packs;
}

export async function createCustomEmojiPack(
  client: MatrixClient,
  name: string,
  usage: CustomEmojiUsage[] = ['emoticon', 'sticker']
): Promise<string> {
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error('分类名称不能为空。');

  const packs = getCinnyUserEmojiPackMap(client);
  const order = getCinnyUserEmojiPackOrder(client);
  const packId = createPersonalEmojiPackId();

  packs[packId] = {
    pack: {
      display_name: trimmedName,
      usage: normalizeEditableEmojiUsageInput(usage),
    },
    images: {},
  };
  order.push(packId);

  await saveCinnyUserEmojiPackRoot(client, packs, order);
  return packId;
}

export async function updateCustomEmojiPack(
  client: MatrixClient,
  packId: string,
  updates: {
    name?: string;
    usage?: CustomEmojiUsage[];
  }
): Promise<void> {
  if (packId === 'user') {
    const editableContent = getEditableUserPackContent(client);
    const nextPack: Record<string, unknown> = {
      ...getPackRecord(editableContent),
      usage: normalizeEditableEmojiUsageInput(updates.usage),
    };

    if (typeof updates.name === 'string' && updates.name.trim()) {
      nextPack.display_name = updates.name.trim();
    }

    await saveEditableUserPackContent(client, {
      ...editableContent,
      pack: nextPack,
    });
    return;
  }

  const packs = getCinnyUserEmojiPackMap(client);
  const currentPack = packs[packId];
  if (!currentPack) throw new Error('没有找到这个分类。');

  const nextPackRecord: Record<string, unknown> = {
    ...getPackRecord(currentPack),
    usage: normalizeEditableEmojiUsageInput(updates.usage),
  };

  if (typeof updates.name === 'string') {
    const trimmedName = updates.name.trim();
    if (!trimmedName) throw new Error('分类名称不能为空。');
    nextPackRecord.display_name = trimmedName;
  }

  packs[packId] = {
    ...currentPack,
    pack: nextPackRecord,
  };

  await saveCinnyUserEmojiPackRoot(client, packs, getCinnyUserEmojiPackOrder(client));
}

export async function updateCustomEmojiPackItem(
  client: MatrixClient,
  packId: string,
  sourceShortcode: string,
  updates: {
    shortcode?: string;
    body?: string;
  }
): Promise<string> {
  const currentShortcode = sourceShortcode.trim();
  if (!currentShortcode) throw new Error('短码不能为空。');

  const nextShortcode =
    typeof updates.shortcode === 'string' ? updates.shortcode.trim() : currentShortcode;
  if (!nextShortcode) throw new Error('短码不能为空。');

  const resolveNextBody = (currentImage: Record<string, unknown>): string => {
    if (typeof updates.body === 'string') {
      return updates.body.trim() || nextShortcode;
    }

    return typeof currentImage.body === 'string' && currentImage.body.trim()
      ? currentImage.body.trim()
      : nextShortcode;
  };

  if (packId === 'user') {
    const editableContent = getEditableUserPackContent(client);
    const nextImages = getPackImagesRecord(editableContent);
    const currentImage = nextImages[currentShortcode];
    if (!currentImage) throw new Error('没有找到这个表情。');
    if (nextShortcode !== currentShortcode && nextImages[nextShortcode]) {
      throw new Error('短码已存在，请换一个新的短码。');
    }

    const nextImage: Record<string, unknown> = {
      ...currentImage,
      body: resolveNextBody(currentImage),
    };

    if (nextShortcode !== currentShortcode) {
      delete nextImages[currentShortcode];
    }
    nextImages[nextShortcode] = nextImage;

    await saveEditableUserPackContent(client, {
      ...editableContent,
      images: nextImages,
    });
    return nextShortcode;
  }

  const packs = getCinnyUserEmojiPackMap(client);
  const currentPack = packs[packId];
  if (!currentPack) throw new Error('没有找到这个分类。');

  const nextImages = getPackImagesRecord(currentPack);
  const currentImage = nextImages[currentShortcode];
  if (!currentImage) throw new Error('没有找到这个表情。');
  if (nextShortcode !== currentShortcode && nextImages[nextShortcode]) {
    throw new Error('短码已存在，请换一个新的短码。');
  }

  const nextImage: Record<string, unknown> = {
    ...currentImage,
    body: resolveNextBody(currentImage),
  };

  if (nextShortcode !== currentShortcode) {
    delete nextImages[currentShortcode];
  }
  nextImages[nextShortcode] = nextImage;

  packs[packId] = {
    ...currentPack,
    images: nextImages,
  };

  await saveCinnyUserEmojiPackRoot(client, packs, getCinnyUserEmojiPackOrder(client));
  return nextShortcode;
}

export async function deleteCustomEmojiPack(client: MatrixClient, packId: string): Promise<void> {
  if (packId === 'user') throw new Error('默认分类不能删除。');

  const packs = getCinnyUserEmojiPackMap(client);
  if (!packs[packId]) throw new Error('没有找到这个分类。');

  delete packs[packId];
  const nextOrder = getCinnyUserEmojiPackOrder(client).filter((id) => id !== packId);
  await saveCinnyUserEmojiPackRoot(client, packs, nextOrder);
}

export async function reorderCustomEmojiPack(
  client: MatrixClient,
  packId: string,
  direction: 'up' | 'down'
): Promise<void> {
  if (packId === 'user') return;

  const packs = getCinnyUserEmojiPackMap(client);
  const normalizedOrder = getCinnyUserEmojiPackOrder(client);
  const index = normalizedOrder.indexOf(packId);

  if (index === -1) return;

  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= normalizedOrder.length) return;

  [normalizedOrder[index], normalizedOrder[targetIndex]] = [
    normalizedOrder[targetIndex],
    normalizedOrder[index],
  ];

  await saveCinnyUserEmojiPackRoot(client, packs, normalizedOrder);
}

export async function uploadCustomEmojiPackFiles(
  client: MatrixClient,
  packId: string,
  files: File[]
): Promise<number> {
  const imageFiles = files.filter((file) => !file.type || file.type.startsWith('image/'));
  if (imageFiles.length === 0) throw new Error('请选择图片文件。');

  if (packId === 'user') {
    const editableContent = getEditableUserPackContent(client);
    const nextImages = getPackImagesRecord(editableContent);

    for (const file of imageFiles) {
      const upload = await client.uploadContent(file, {
        name: file.name,
        type: file.type || 'application/octet-stream',
        includeFilename: true,
      });
      const shortcode = ensureUniqueEmojiShortcode(nextImages, makeEmojiShortcodeBase(file.name));

      nextImages[shortcode] = {
        url: upload.content_uri,
        body: stripFileExtension(file.name) || shortcode,
        info: getFileInfo(file),
      };
    }

    await saveEditableUserPackContent(client, {
      ...editableContent,
      images: nextImages,
    });
    return imageFiles.length;
  }

  const packs = getCinnyUserEmojiPackMap(client);
  const currentPack = packs[packId];
  if (!currentPack) throw new Error('没有找到这个分类。');

  const nextImages = getPackImagesRecord(currentPack);

  for (const file of imageFiles) {
    const upload = await client.uploadContent(file, {
      name: file.name,
      type: file.type || 'application/octet-stream',
      includeFilename: true,
    });
    const shortcode = ensureUniqueEmojiShortcode(nextImages, makeEmojiShortcodeBase(file.name));

    nextImages[shortcode] = {
      url: upload.content_uri,
      body: stripFileExtension(file.name) || shortcode,
      info: getFileInfo(file),
    };
  }

  packs[packId] = {
    ...currentPack,
    images: nextImages,
  };

  await saveCinnyUserEmojiPackRoot(client, packs, getCinnyUserEmojiPackOrder(client));
  return imageFiles.length;
}

export async function addImageToDefaultCustomEmojiPack(
  client: MatrixClient,
  image: {
    mxcUrl: string;
    name?: string;
    body?: string;
    info?: Record<string, unknown>;
    usage?: CustomEmojiUsage[];
    preferredShortcode?: string;
  }
): Promise<string> {
  if (!image.mxcUrl.startsWith('mxc://')) {
    throw new Error('只能把 Matrix 媒体添加到默认表情包。');
  }

  const editableContent = getEditableUserPackContent(client);
  const editableImages = getPackImagesRecord(editableContent);
  const mergedImages = getPackImagesRecord(getAccountDataContent(client, 'im.ponies.user_emotes'));
  const normalizedUsage = normalizeEditableEmojiUsageInput(image.usage ?? ['emoticon']);
  const existingShortcode =
    findEmojiShortcodeByMxcUrl(editableImages, image.mxcUrl) ??
    findEmojiShortcodeByMxcUrl(mergedImages, image.mxcUrl);

  if (existingShortcode) {
    const existingImage = editableImages[existingShortcode] ?? mergedImages[existingShortcode];
    const currentUsage = normalizeEmojiUsage(existingImage?.usage, undefined);
    const mergedUsage = normalizeEditableEmojiUsageInput([...currentUsage, ...normalizedUsage]);

    if (mergedUsage.join('|') !== currentUsage.join('|')) {
      editableImages[existingShortcode] = {
        ...(existingImage ?? {}),
        url: image.mxcUrl,
        body:
          (typeof existingImage?.body === 'string' && existingImage.body.trim()) ||
          image.body?.trim() ||
          stripFileExtension(image.name ?? '') ||
          existingShortcode,
        info:
          existingImage?.info && typeof existingImage.info === 'object'
            ? existingImage.info
            : image.info,
        usage: mergedUsage,
      };

      await saveEditableUserPackContent(client, {
        ...editableContent,
        images: editableImages,
      });
    }

    return existingShortcode;
  }

  const shortcode = ensureUniqueEmojiShortcode(
    editableImages,
    makeEmojiShortcodeBase(image.preferredShortcode ?? image.name ?? image.body ?? 'emoji')
  );
  const nextImages: Record<string, Record<string, unknown> | undefined> = {
    [shortcode]: {
      url: image.mxcUrl,
      body: image.body?.trim() || stripFileExtension(image.name ?? '') || shortcode,
      info: image.info,
      usage: normalizedUsage,
    },
    ...editableImages,
  };

  await saveEditableUserPackContent(client, {
    ...editableContent,
    images: nextImages,
  });

  return shortcode;
}

export async function deleteCustomEmojiPackItems(
  client: MatrixClient,
  packId: string,
  shortcodes: string[]
): Promise<number> {
  const uniqueShortcodes = Array.from(new Set(shortcodes.filter((value) => value.trim())));
  if (uniqueShortcodes.length === 0) return 0;

  if (packId === 'user') {
    const editableContent = getEditableUserPackContent(client);
    const nextImages = getPackImagesRecord(editableContent);
    uniqueShortcodes.forEach((shortcode) => {
      delete nextImages[shortcode];
    });

    await saveEditableUserPackContent(client, {
      ...editableContent,
      images: nextImages,
    });
    return uniqueShortcodes.length;
  }

  const packs = getCinnyUserEmojiPackMap(client);
  const currentPack = packs[packId];
  if (!currentPack) throw new Error('没有找到这个分类。');

  const nextImages = getPackImagesRecord(currentPack);
  uniqueShortcodes.forEach((shortcode) => {
    delete nextImages[shortcode];
  });

  packs[packId] = {
    ...currentPack,
    images: nextImages,
  };

  await saveCinnyUserEmojiPackRoot(client, packs, getCinnyUserEmojiPackOrder(client));
  return uniqueShortcodes.length;
}

export async function moveCustomEmojiPackItems(
  client: MatrixClient,
  sourcePackId: string,
  targetPackId: string,
  shortcodes: string[]
): Promise<number> {
  if (sourcePackId === targetPackId) return 0;

  const uniqueShortcodes = Array.from(new Set(shortcodes.filter((value) => value.trim())));
  if (uniqueShortcodes.length === 0) return 0;

  const sourcePackContent =
    sourcePackId === 'user'
      ? getEditableUserPackContent(client)
      : getCinnyUserEmojiPackMap(client)[sourcePackId];
  const targetPackContent =
    targetPackId === 'user'
      ? getEditableUserPackContent(client)
      : getCinnyUserEmojiPackMap(client)[targetPackId];

  if (!sourcePackContent) throw new Error('没有找到来源分类。');
  if (!targetPackContent) throw new Error('没有找到目标分类。');

  const sourceImages = getPackImagesRecord(sourcePackContent);
  const targetImages = getPackImagesRecord(targetPackContent);
  let movedCount = 0;

  uniqueShortcodes.forEach((shortcode) => {
    const image = sourceImages[shortcode];
    if (!image) return;

    const targetShortcode = ensureUniqueEmojiShortcode(targetImages, shortcode);
    const nextImage = { ...image };
    delete nextImage.usage;
    targetImages[targetShortcode] = nextImage;
    delete sourceImages[shortcode];
    movedCount += 1;
  });

  if (movedCount === 0) return 0;

  if (sourcePackId === 'user') {
    await saveEditableUserPackContent(client, {
      ...getEditableUserPackContent(client),
      images: sourceImages,
    });
  }

  if (targetPackId === 'user') {
    await saveEditableUserPackContent(client, {
      ...getEditableUserPackContent(client),
      images: targetImages,
    });
  }

  if (sourcePackId !== 'user' || targetPackId !== 'user') {
    const packs = getCinnyUserEmojiPackMap(client);

    if (sourcePackId !== 'user') {
      const sourcePack = packs[sourcePackId];
      if (!sourcePack) throw new Error('没有找到来源分类。');
      packs[sourcePackId] = {
        ...sourcePack,
        images: sourceImages,
      };
    }

    if (targetPackId !== 'user') {
      const targetPack = packs[targetPackId];
      if (!targetPack) throw new Error('没有找到目标分类。');
      packs[targetPackId] = {
        ...targetPack,
        images: targetImages,
      };
    }

    await saveCinnyUserEmojiPackRoot(client, packs, getCinnyUserEmojiPackOrder(client));
  }

  return movedCount;
}

export function getCustomEmojiItems(client: MatrixClient, roomId?: string): CustomEmojiItem[] {
  const items: CustomEmojiItem[] = [];

  const userPack = filterSyncedPersonalPackImages(getAccountDataContent(client, 'im.ponies.user_emotes'));
  items.push(...collectCustomEmojiPackItems(client, 'user', userPack, '我的表情'));

  const customPacks = getCinnyUserEmojiPackMap(client);
  const packIds = getCinnyUserEmojiPackOrder(client);

  packIds.forEach((packId) => {
    items.push(...collectCustomEmojiPackItems(client, packId, customPacks[packId], packId));
  });

  const roomsToRead = new Set<string>();
  if (roomId) roomsToRead.add(roomId);

  const globalRooms = getAccountDataContent(client, 'im.ponies.emote_rooms')?.rooms;
  if (globalRooms && typeof globalRooms === 'object') {
    Object.keys(globalRooms).forEach((id) => roomsToRead.add(id));
  }

  client.getRooms().forEach((room) => {
    if (room.getMyMembership() === 'join') roomsToRead.add(room.roomId);
  });

  roomsToRead.forEach((id) => {
    const room = client.getRoom(id);
    const events =
      (room?.currentState?.getStateEvents('im.ponies.room_emotes') as MatrixEvent[] | undefined) ?? [];
    events.forEach((event) => {
      const stateKey = event.getStateKey() ?? '';
      const packId = event.getId() ?? `${id}:${stateKey}`;
      items.push(
        ...collectCustomEmojiPackItems(
          client,
          packId,
          event.getContent() as Record<string, unknown>,
          room?.name ?? '房间表情'
        )
      );
    });
  });

  const seen = new Set<string>();
  return items
    .filter((item) => {
      const key = `${item.packId}:${item.shortcode}:${item.mxcUrl}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_CUSTOM_EMOJI_ITEMS);
}

export function getCustomEmojiDebugSummary(
  client: MatrixClient,
  roomId?: string
): CustomEmojiDebugSummary {
  const rawUserPack = getAccountDataContent(client, 'im.ponies.user_emotes');
  const rawUserImages =
    rawUserPack?.images && typeof rawUserPack.images === 'object'
      ? (rawUserPack.images as Record<string, Record<string, unknown> | undefined>)
      : {};

  const defaultPackSyncedSourcePackIds = Array.from(
    new Set(
      Object.values(rawUserImages)
        .map((image) =>
          typeof image?.[CINNY_SYNC_SOURCE_PACK_ID] === 'string'
            ? image[CINNY_SYNC_SOURCE_PACK_ID]
            : undefined
        )
        .filter((packId): packId is string => typeof packId === 'string' && packId.length > 0)
    )
  ).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));

  const cinnyContent = getAccountDataContent(client, 'in.cinny.user_emoji_packs');
  const cinnyPacks = getCinnyUserEmojiPackMap(client);
  const cinnyOrder = normalizeCinnyUserEmojiPackOrder(cinnyContent?.order, cinnyPacks);
  const cinnyPackIds = cinnyOrder;

  const roomPackIds = new Set<string>();
  if (roomId) roomPackIds.add(roomId);

  const globalRooms = getAccountDataContent(client, 'im.ponies.emote_rooms')?.rooms;
  if (globalRooms && typeof globalRooms === 'object') {
    Object.keys(globalRooms).forEach((id) => roomPackIds.add(id));
  }

  client.getRooms().forEach((room) => {
    if (room.getMyMembership() === 'join') roomPackIds.add(room.roomId);
  });

  const dedupedItems = getCustomEmojiItems(client, roomId);
  const packSummaryMap = new Map<
    string,
    {
      packId: string;
      packName: string;
      total: number;
      emoticonCount: number;
      stickerCount: number;
    }
  >();

  dedupedItems.forEach((item) => {
    const summary = packSummaryMap.get(item.packId) ?? {
      packId: item.packId,
      packName: item.packName,
      total: 0,
      emoticonCount: 0,
      stickerCount: 0,
    };
    summary.total += 1;
    if (item.usage.includes('emoticon')) summary.emoticonCount += 1;
    if (item.usage.includes('sticker')) summary.stickerCount += 1;
    packSummaryMap.set(item.packId, summary);
  });

  return {
    defaultPackImageCount: Object.keys(rawUserImages).length,
    defaultPackSyncedImageCount: Object.values(rawUserImages).filter(
      (image) => typeof image?.[CINNY_SYNC_SOURCE_PACK_ID] === 'string'
    ).length,
    defaultPackLocalImageCount: Object.values(rawUserImages).filter(
      (image) => typeof image?.[CINNY_SYNC_SOURCE_PACK_ID] !== 'string'
    ).length,
    defaultPackSyncedSourcePackIds,
    cinnyRootKeys: cinnyContent ? Object.keys(cinnyContent).sort() : [],
    cinnyOrder,
    cinnyPackIds,
    cinnyPacks: cinnyPackIds.map((packId) => {
      const packContent = cinnyPacks[packId];
      const packMeta =
        packContent?.pack && typeof packContent.pack === 'object'
          ? (packContent.pack as Record<string, unknown>)
          : {};
      const images =
        packContent?.images && typeof packContent.images === 'object'
          ? (packContent.images as Record<string, unknown>)
          : {};
      return {
        packId,
        packName:
          typeof packMeta.display_name === 'string' && packMeta.display_name.trim()
            ? packMeta.display_name.trim()
            : packId,
        imageCount: Object.keys(images).length,
        sampleShortcodes: Object.keys(images).slice(0, 8),
      };
    }),
    roomPackCount: roomPackIds.size,
    dedupedPackSummaries: Array.from(packSummaryMap.values()).sort((a, b) =>
      a.packName.localeCompare(b.packName, 'zh-Hans-CN')
    ),
  };
}

export function getDirectRoomIdForUser(client: MatrixClient, userId: string): string | undefined {
  const content = getAccountDataContent(client, 'm.direct');
  const roomIds = content?.[userId];

  if (!Array.isArray(roomIds)) return undefined;

  return roomIds.find((roomId): roomId is string => {
    if (typeof roomId !== 'string') return false;
    const room = client.getRoom(roomId);
    const membership = room?.getMyMembership();
    return membership === 'join' || membership === 'invite';
  });
}

export async function sendTextMessage(
  client: MatrixClient,
  roomId: string,
  body: string,
  mentions: string[] = [],
  formattedBody?: string
): Promise<void> {
  const trimmed = body.trim();
  if (!trimmed) return;

  await client.sendMessage(roomId, {
    msgtype: MsgType.Text,
    body: trimmed,
    ...(formattedBody
      ? {
          format: 'org.matrix.custom.html',
          formatted_body: formattedBody,
        }
      : {}),
    ...(mentions.length > 0
      ? {
          'm.mentions': {
            user_ids: mentions,
          },
        }
      : {}),
  } as never);
}

const cloneForwardContent = (content: Record<string, unknown>): Record<string, unknown> =>
  JSON.parse(JSON.stringify(content)) as Record<string, unknown>;

const sanitizeForwardContent = (content: Record<string, unknown>): Record<string, unknown> => {
  const forwardedContent = cloneForwardContent(content);
  delete forwardedContent['m.relates_to'];
  delete forwardedContent['m.mentions'];
  return forwardedContent;
};

export async function forwardMessagesToRooms(
  client: MatrixClient,
  roomIds: string[],
  messages: ChatMessage[]
): Promise<void> {
  const sortedMessages = [...messages]
    .filter((message) => message.kind === 'message' && message.forwardContent)
    .sort((a, b) => a.timestamp - b.timestamp);

  for (const roomId of roomIds) {
    for (const message of sortedMessages) {
      const forwardedContent = sanitizeForwardContent(message.forwardContent!);

      if (message.eventType === 'm.sticker') {
        await client.sendEvent(roomId, 'm.sticker' as never, forwardedContent as never);
        continue;
      }

      if (message.eventType === 'm.room.message') {
        await client.sendMessage(roomId, forwardedContent as never);
        continue;
      }

      await client.sendEvent(roomId, message.eventType as never, forwardedContent as never);
    }
  }
}

const getCryptoApi = (client: MatrixClient) => {
  const crypto = client.getCrypto();
  if (!crypto) throw new Error('当前 Matrix 客户端还没有启用端到端加密。');
  return crypto as unknown as {
    isSecretStorageReady: () => Promise<boolean>;
    isCrossSigningReady: () => Promise<boolean>;
    getCrossSigningStatus: () => Promise<{
      publicKeysOnDevice: boolean;
      privateKeysInSecretStorage: boolean;
      privateKeysCachedLocally: {
        masterKey: boolean;
        selfSigningKey: boolean;
        userSigningKey: boolean;
      };
    }>;
    bootstrapCrossSigning: (opts: { setupNewCrossSigning?: boolean }) => Promise<void>;
    crossSignDevice: (deviceId: string) => Promise<void>;
    getUserDeviceInfo: (userIds: string[], downloadUncached?: boolean) => Promise<unknown>;
    userHasCrossSigningKeys: (userId?: string, downloadUncached?: boolean) => Promise<boolean>;
    getDeviceVerificationStatus: (
      userId: string,
      deviceId: string
    ) => Promise<{
      signedByOwner: boolean;
      crossSigningVerified: boolean;
      localVerified: boolean;
      isVerified: () => boolean;
    } | null>;
    setTrustCrossSignedDevices: (value: boolean) => void;
    getActiveSessionBackupVersion: () => Promise<string | null>;
    getKeyBackupInfo: () => Promise<{ version?: string } | null>;
    checkKeyBackupAndEnable: () => Promise<
      | {
          backupInfo?: { version?: string };
          trustInfo?: { trusted?: boolean; matchesDecryptionKey?: boolean };
        }
      | null
    >;
    loadSessionBackupPrivateKeyFromSecretStorage: () => Promise<void>;
    restoreKeyBackup: (opts?: {
      progressCallback?: (progress: KeyRestoreProgress) => void;
    }) => Promise<KeyRestoreResult>;
    restoreKeyBackupWithPassphrase: (
      passphrase: string,
      opts?: { progressCallback?: (progress: KeyRestoreProgress) => void }
    ) => Promise<KeyRestoreResult>;
  };
};

const hasAllPrivateCrossSigningKeys = (status: {
  privateKeysCachedLocally: {
    masterKey: boolean;
    selfSigningKey: boolean;
    userSigningKey: boolean;
  };
}): boolean =>
  status.privateKeysCachedLocally.masterKey &&
  status.privateKeysCachedLocally.selfSigningKey &&
  status.privateKeysCachedLocally.userSigningKey;

const getOwnDeviceVerificationSummary = async (
  client: MatrixClient,
  api: ReturnType<typeof getCryptoApi>
): Promise<
  Pick<
    CurrentDeviceVerificationResult,
    'currentDeviceVerified' | 'currentDeviceCrossSigned' | 'currentDeviceLocallyVerified'
  >
> => {
  const userId = client.getUserId();
  const deviceId = client.getDeviceId();
  if (!userId || !deviceId) return {};

  const status = await api.getDeviceVerificationStatus(userId, deviceId).catch(() => null);
  if (!status) return {};

  return {
    currentDeviceVerified: status.isVerified(),
    currentDeviceCrossSigned: status.crossSigningVerified || status.signedByOwner,
    currentDeviceLocallyVerified: status.localVerified,
  };
};

export async function getCryptoStatus(client: MatrixClient): Promise<CryptoStatus> {
  const crypto = client.getCrypto();
  if (!crypto) return { cryptoReady: false };

  const api = getCryptoApi(client);
  const userId = client.getUserId();
  const [secretStorageReady, activeBackupVersion, backupInfo, backupCheck, crossSigningReady, crossSigningStatus] =
    await Promise.allSettled([
      api.isSecretStorageReady(),
      api.getActiveSessionBackupVersion(),
      api.getKeyBackupInfo(),
      api.checkKeyBackupAndEnable(),
      api.isCrossSigningReady(),
      api
        .userHasCrossSigningKeys(userId ?? undefined, true)
        .catch(() => false)
        .then(() => api.getCrossSigningStatus()),
    ]);

  const checkedBackup = backupCheck.status === 'fulfilled' ? backupCheck.value : null;
  const serverBackup = backupInfo.status === 'fulfilled' ? backupInfo.value : null;
  const ownDeviceTrust = await getOwnDeviceVerificationSummary(client, api);

  return {
    cryptoReady: true,
    secretStorageReady:
      secretStorageReady.status === 'fulfilled' ? secretStorageReady.value : undefined,
    activeBackupVersion:
      activeBackupVersion.status === 'fulfilled' ? activeBackupVersion.value : undefined,
    backupVersion: checkedBackup?.backupInfo?.version ?? serverBackup?.version ?? null,
    backupTrusted: checkedBackup?.trustInfo?.trusted,
    backupMatchesDecryptionKey: checkedBackup?.trustInfo?.matchesDecryptionKey,
    crossSigningReady:
      crossSigningReady.status === 'fulfilled' ? crossSigningReady.value : undefined,
    crossSigningPrivateKeysInSecretStorage:
      crossSigningStatus.status === 'fulfilled'
        ? crossSigningStatus.value.privateKeysInSecretStorage
        : undefined,
    ...ownDeviceTrust,
  };
}

export async function verifyCurrentDeviceFromSecretStorage(
  client: MatrixClient
): Promise<CurrentDeviceVerificationResult> {
  const crypto = client.getCrypto();
  if (!crypto) {
    return {
      attempted: false,
      skippedReason: 'crypto-unavailable',
      crossSigningReady: false,
    };
  }

  const api = getCryptoApi(client);
  const userId = client.getUserId();
  const deviceId = client.getDeviceId();
  if (!userId || !deviceId) {
    return {
      attempted: false,
      skippedReason: 'missing-device-id',
      crossSigningReady: await api.isCrossSigningReady().catch(() => false),
    };
  }

  api.setTrustCrossSignedDevices(true);
  await api.userHasCrossSigningKeys(userId, true).catch(() => false);
  await api.getUserDeviceInfo([userId], true).catch(() => undefined);

  const crossSigningStatus = await api.getCrossSigningStatus();
  const privateKeysAvailable =
    crossSigningStatus.privateKeysInSecretStorage || hasAllPrivateCrossSigningKeys(crossSigningStatus);

  if (!privateKeysAvailable) {
    return {
      attempted: false,
      skippedReason: 'no-cross-signing-private-keys',
      crossSigningReady: await api.isCrossSigningReady().catch(() => false),
      crossSigningPrivateKeysInSecretStorage: crossSigningStatus.privateKeysInSecretStorage,
      ...(await getOwnDeviceVerificationSummary(client, api)),
    };
  }

  await api.bootstrapCrossSigning({ setupNewCrossSigning: false });
  await api.userHasCrossSigningKeys(userId, true).catch(() => false);
  await api.getUserDeviceInfo([userId], true).catch(() => undefined);

  const before = await getOwnDeviceVerificationSummary(client, api);
  let signedCurrentDevice = false;
  if (!before.currentDeviceCrossSigned) {
    await api.crossSignDevice(deviceId);
    signedCurrentDevice = true;
  }

  await api.getUserDeviceInfo([userId], true).catch(() => undefined);
  const after = await getOwnDeviceVerificationSummary(client, api);

  return {
    attempted: true,
    signedCurrentDevice,
    crossSigningReady: await api.isCrossSigningReady().catch(() => false),
    crossSigningPrivateKeysInSecretStorage: (await api.getCrossSigningStatus()).privateKeysInSecretStorage,
    ...after,
  };
}

export async function restoreKeyBackupFromSecretStorage(
  client: MatrixClient,
  onProgress?: (progress: KeyRestoreProgress) => void
): Promise<KeyRestoreResult> {
  const api = getCryptoApi(client);
  await api.loadSessionBackupPrivateKeyFromSecretStorage();
  return api.restoreKeyBackup({ progressCallback: onProgress });
}

export async function restoreKeyBackupWithPassphrase(
  client: MatrixClient,
  passphrase: string,
  onProgress?: (progress: KeyRestoreProgress) => void
): Promise<KeyRestoreResult> {
  const trimmed = passphrase.trim();
  if (!trimmed) throw new Error('请输入恢复密钥或密钥备份口令。');
  const api = getCryptoApi(client);
  let secretStorageError: unknown;

  const cachedSecretStorageKey = await cacheSecretStorageKeyFromInput(client, trimmed).catch((error) => {
    secretStorageError = error;
    return { cached: false as const };
  });

  if (cachedSecretStorageKey.cached) {
    try {
      await api.loadSessionBackupPrivateKeyFromSecretStorage();
      return await api.restoreKeyBackup({ progressCallback: onProgress });
    } catch (error) {
      secretStorageError = error;
    }
  }

  try {
    return await api.restoreKeyBackupWithPassphrase(trimmed, {
      progressCallback: onProgress,
    });
  } catch (backupError) {
    if (secretStorageError) {
      const storageMessage =
        secretStorageError instanceof Error ? secretStorageError.message : String(secretStorageError);
      const backupMessage =
        backupError instanceof Error ? backupError.message : String(backupError);
      throw new Error(
        `恢复失败：安全存储无法打开（${storageMessage}）；密钥备份口令也无法恢复（${backupMessage}）。`
      );
    }
    throw backupError;
  }
}

export async function sendEmoteMessage(
  client: MatrixClient,
  roomId: string,
  body: string
): Promise<void> {
  const trimmed = body.trim();
  if (!trimmed) return;

  await client.sendMessage(roomId, {
    msgtype: MsgType.Emote,
    body: trimmed,
  } as never);
}

export async function sendStickerMessage(
  client: MatrixClient,
  roomId: string,
  sticker: CustomEmojiItem
): Promise<void> {
  await client.sendEvent(
    roomId,
    'm.sticker' as never,
    {
      body: sticker.body || sticker.shortcode,
      url: sticker.mxcUrl,
      info: sticker.info ?? {},
    } as never
  );
}

const buildMatrixToEventHref = (roomId: string, eventId: string): string =>
  `https://matrix.to/#/${encodeURIComponent(roomId)}/${encodeURIComponent(eventId)}`;

const buildMatrixToUserHref = (userId: string): string =>
  `https://matrix.to/#/${encodeURIComponent(userId)}`;

const buildReplyFormattedBody = (
  roomId: string,
  replyTo: ChatReply,
  formattedBody: string
): string => {
  const senderLabel = escapeHtml(replyTo.senderName ?? replyTo.senderId ?? 'user');
  const senderHtml = replyTo.senderId
    ? `<a href="${escapeHtml(buildMatrixToUserHref(replyTo.senderId))}">${senderLabel}</a>`
    : senderLabel;
  const quotedHtml = escapeHtml(replyTo.body).replace(/\n/g, '<br>');

  return (
    `<mx-reply><blockquote><a href="${escapeHtml(
      buildMatrixToEventHref(roomId, replyTo.eventId)
    )}">In reply to</a> ${senderHtml}<br>${quotedHtml}</blockquote></mx-reply>` + formattedBody
  );
};

export async function sendReplyMessage(
  client: MatrixClient,
  roomId: string,
  replyTo: ChatReply,
  body: string,
  mentions: string[] = [],
  formattedBody?: string
): Promise<void> {
  const trimmed = body.trim();
  if (!trimmed) return;

  await client.sendMessage(roomId, {
    msgtype: MsgType.Text,
    body: trimmed,
    format: 'org.matrix.custom.html',
    formatted_body: buildReplyFormattedBody(
      roomId,
      replyTo,
      (formattedBody?.trim() || escapeHtml(trimmed)).replace(/\n/g, '<br>')
    ),
    ...(mentions.length > 0
      ? {
          'm.mentions': {
            user_ids: mentions,
          },
        }
      : {}),
    'm.relates_to': {
      'm.in_reply_to': {
        event_id: replyTo.eventId,
      },
    },
  } as never);
}

export async function editTextMessage(
  client: MatrixClient,
  roomId: string,
  eventId: string,
  body: string,
  mentions: string[] = [],
  formattedBody?: string
): Promise<void> {
  const trimmed = body.trim();
  if (!trimmed) return;

  await client.sendMessage(roomId, {
    msgtype: MsgType.Text,
    body: `* ${trimmed}`,
    ...(formattedBody
      ? {
          format: 'org.matrix.custom.html',
          formatted_body: `* ${formattedBody}`,
        }
      : {}),
    ...(mentions.length > 0
      ? {
          'm.mentions': {
            user_ids: mentions,
          },
        }
      : {}),
    'm.new_content': {
      msgtype: MsgType.Text,
      body: trimmed,
      ...(formattedBody
        ? {
            format: 'org.matrix.custom.html',
            formatted_body: formattedBody,
          }
        : {}),
      ...(mentions.length > 0
        ? {
            'm.mentions': {
              user_ids: mentions,
            },
          }
        : {}),
    },
    'm.relates_to': {
      rel_type: 'm.replace',
      event_id: eventId,
    },
  } as never);
}

export async function redactMessage(
  client: MatrixClient,
  roomId: string,
  eventId: string
): Promise<void> {
  await (client as unknown as {
    redactEvent: (targetRoomId: string, targetEventId: string) => Promise<unknown>;
  }).redactEvent(roomId, eventId);
}

export async function paginateRoomMessages(
  client: MatrixClient,
  roomId: string,
  limit = 40
): Promise<number> {
  const room = client.getRoom(roomId);
  if (!room) return 0;
  const beforeCount = room.getLiveTimeline().getEvents().length;
  await client.scrollback(room, limit);
  const afterCount = room.getLiveTimeline().getEvents().length;
  return Math.max(0, afterCount - beforeCount);
}

export async function updateTypingStatus(
  client: MatrixClient,
  roomId: string,
  typing: boolean
): Promise<void> {
  await (client as unknown as {
    setTyping: (targetRoomId: string, isTyping: boolean, timeoutMs?: number) => Promise<unknown>;
  }).setTyping(roomId, typing, typing ? 8000 : 0);
}

export async function setRoomMuted(
  client: MatrixClient,
  roomId: string,
  muted: boolean
): Promise<void> {
  await setRoomNotificationMode(client, roomId, muted ? 'mute' : 'default');
}

const getRoomNotificationPushRuleApi = (client: MatrixClient) =>
  client as unknown as {
    addPushRule: (
      scope: string,
      kind: PushRuleKind,
      ruleId: string,
      body: {
        actions: unknown[];
        conditions?: Array<Record<string, unknown>>;
      }
    ) => Promise<unknown>;
    deletePushRule: (scope: string, kind: PushRuleKind, ruleId: string) => Promise<unknown>;
    getPushRules?: () => Promise<RoomPushRules>;
  };

const refreshRoomNotificationPushRules = async (client: MatrixClient): Promise<void> => {
  const api = getRoomNotificationPushRuleApi(client);
  const nextRules = await api.getPushRules?.();
  if (nextRules) {
    (client as unknown as { pushRules?: RoomPushRules }).pushRules = nextRules;
  }
};

const deleteRoomNotificationRuleIfPresent = async (
  client: MatrixClient,
  pushRules: RoomPushRules | undefined,
  kind: PushRuleKind,
  roomId: string
): Promise<void> => {
  if (!findRoomRule(pushRules, kind, roomId)) return;
  await getRoomNotificationPushRuleApi(client).deletePushRule('global', kind, roomId);
};

export async function setRoomNotificationMode(
  client: MatrixClient,
  roomId: string,
  mode: RoomNotificationMode
): Promise<void> {
  const api = getRoomNotificationPushRuleApi(client);
  const pushRules = getClientPushRules(client);

  await deleteRoomNotificationRuleIfPresent(client, pushRules, PushRuleKind.Override, roomId);
  await deleteRoomNotificationRuleIfPresent(client, pushRules, PushRuleKind.RoomSpecific, roomId);

  if (mode === 'all') {
    await api.addPushRule('global', PushRuleKind.RoomSpecific, roomId, {
      actions: [PushRuleActionName.Notify, ROOM_NOTIFICATION_SOUND_ACTION],
    });
  } else if (mode === 'mentions') {
    await api.addPushRule('global', PushRuleKind.RoomSpecific, roomId, {
      actions: [PushRuleActionName.DontNotify],
    });
  } else if (mode === 'mute') {
    await api.addPushRule('global', PushRuleKind.Override, roomId, {
      actions: [PushRuleActionName.DontNotify],
      conditions: [
        {
          kind: ConditionKind.EventMatch,
          key: 'room_id',
          value: roomId,
        },
      ],
    });
  }

  await refreshRoomNotificationPushRules(client);
}

export async function setMessagePinned(
  client: MatrixClient,
  roomId: string,
  eventId: string,
  pinned: boolean
): Promise<void> {
  const room = client.getRoom(roomId);
  if (!room) return;

  const currentPinnedEventIds = getRoomPinnedEventIds(room);
  const nextPinnedEventIds = pinned
    ? Array.from(new Set([eventId, ...currentPinnedEventIds]))
    : currentPinnedEventIds.filter((id) => id !== eventId);

  await client.sendStateEvent(
    roomId,
    'm.room.pinned_events' as never,
    { pinned: nextPinnedEventIds } as never,
    ''
  );
}

export async function getOwnProfile(client: MatrixClient): Promise<OwnProfile> {
  const userId = client.getUserId() ?? '';
  const profile = await client.getProfileInfo(userId).catch(() => undefined);

  return {
    userId,
    displayName: profile?.displayname,
    avatarUrl: mxcToHttp(client, profile?.avatar_url, 128, 128),
  };
}

export function getExploreSources(client: MatrixClient): ExploreSource[] {
  const content = getAccountDataContent(client, 'in.cinny.explore_sources');
  const sourceItems = content?.sources;
  if (!Array.isArray(sourceItems)) return [];

  return sourceItems.reduce<ExploreSource[]>((sources, item) => {
    if (!item || typeof item !== 'object') return sources;

    const source = item as Record<string, unknown>;
    const id = trimOptionalText(source.id);
    if (!id || !isExploreSourceKind(source.kind)) return sources;

    const fallbackTimestamp = Date.now();

    try {
      const normalizedValue =
        source.kind === 'nav'
          ? normalizeOptionalText(source.value)
          : normalizeExploreSourceValue(source.kind, source.value);
      const title = trimOptionalText(source.title) ?? getDefaultExploreSourceTitle(source.kind, normalizedValue);

      sources.push({
        id,
        kind: source.kind,
        title,
        description: trimOptionalText(source.description),
        value: normalizedValue,
        createdAt: toTimestamp(source.createdAt, fallbackTimestamp),
        updatedAt: toTimestamp(source.updatedAt, fallbackTimestamp),
        webOpenMode:
          source.kind === 'web' && isExploreWebOpenMode(source.webOpenMode)
            ? source.webOpenMode
            : source.kind === 'web'
              ? 'auto'
              : undefined,
        webEmbedStatus:
          source.kind === 'web' && isExploreWebEmbedStatus(source.webEmbedStatus)
            ? source.webEmbedStatus
            : source.kind === 'web'
              ? 'unknown'
              : undefined,
        navSections:
          source.kind === 'nav'
            ? normalizeExploreNavSections(source.navSections) ?? []
            : undefined,
      });
    } catch {
      // Ignore malformed saved entries.
    }

    return sources;
  }, []);
}

export async function saveExploreSources(
  client: MatrixClient,
  sources: ExploreSource[]
): Promise<ExploreSource[]> {
  const serializedSources = sources.map((source) => ({
    id: source.id,
    kind: source.kind,
    title: source.title,
    ...(source.description ? { description: source.description } : {}),
    value: source.value,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
    ...(source.kind === 'web'
      ? {
          webOpenMode: source.webOpenMode ?? 'auto',
          webEmbedStatus: source.webEmbedStatus ?? 'unknown',
        }
      : {}),
    ...(source.kind === 'nav'
      ? {
          navSections: source.navSections ?? [],
        }
      : {}),
  }));

  await setAccountDataContent(client, 'in.cinny.explore_sources', {
    sources: serializedSources,
  });

  return getExploreSources(client);
}

export async function updateOwnAvatar(client: MatrixClient, file: File): Promise<void> {
  const upload = await client.uploadContent(file, {
    name: file.name,
    type: file.type || 'application/octet-stream',
    includeFilename: true,
  });

  await (client as unknown as { setAvatarUrl: (mxcUrl: string) => Promise<unknown> }).setAvatarUrl(
    upload.content_uri
  );
}

export async function updateOwnDisplayName(
  client: MatrixClient,
  displayName: string
): Promise<void> {
  const trimmed = displayName.trim();
  if (!trimmed) throw new Error('显示名不能为空。');
  await client.setDisplayName(trimmed);
}

export async function updateRoomAvatar(
  client: MatrixClient,
  roomId: string,
  file: File
): Promise<void> {
  const upload = await client.uploadContent(file, {
    name: file.name,
    type: file.type || 'application/octet-stream',
    includeFilename: true,
  });

  await client.sendStateEvent(
    roomId,
    'm.room.avatar' as never,
    {
      url: upload.content_uri,
      info: getFileInfo(file),
    } as never,
    ''
  );
}

export function getRoomTypingMembers(client: MatrixClient, roomId: string): string[] {
  const room = client.getRoom(roomId);
  if (!room) return [];

  const typingMembers =
    (room as unknown as { getTypingMembers?: () => RoomMember[] }).getTypingMembers?.() ?? [];

  return typingMembers
    .filter((member) => member.userId !== client.getUserId())
    .map((member) => member.rawDisplayName || member.userId);
}

export async function uploadFileMessage(
  client: MatrixClient,
  roomId: string,
  file: File
): Promise<void> {
  const upload = await client.uploadContent(file, {
    name: file.name,
    type: file.type || 'application/octet-stream',
    includeFilename: true,
  });

  const msgtype = file.type.startsWith('image/')
    ? MsgType.Image
    : file.type.startsWith('video/')
      ? MsgType.Video
      : file.type.startsWith('audio/')
        ? MsgType.Audio
        : MsgType.File;

  await client.sendMessage(roomId, {
    msgtype,
    body: file.name,
    filename: file.name,
    url: upload.content_uri,
    info: getFileInfo(file),
  } as never);
}

export async function sendReaction(
  client: MatrixClient,
  roomId: string,
  eventId: string,
  key: string,
  shortcode?: string
): Promise<void> {
  const room = client.getRoom(roomId);
  const ownReactionEventId = room ? getOwnReactionEventId(client, room, eventId, key) : undefined;

  if (ownReactionEventId) {
    suppressRedactedRelationEventId(ownReactionEventId);
    await (client as unknown as {
      redactEvent: (targetRoomId: string, targetEventId: string) => Promise<unknown>;
    }).redactEvent(roomId, ownReactionEventId);
    return;
  }

  await client.sendEvent(
    roomId,
    'm.reaction' as never,
    {
      'm.relates_to': {
        rel_type: 'm.annotation',
        event_id: eventId,
        key,
      },
      ...(shortcode ? { shortcode } : {}),
    } as never
  );
}

export async function markRoomRead(
  client: MatrixClient,
  roomId: string,
  options?: { sendReceipt?: boolean }
): Promise<void> {
  const room = client.getRoom(roomId);
  const events = room?.getLiveTimeline().getEvents() ?? [];
  const lastEvent = events[events.length - 1];
  const eventId = lastEvent?.getId();
  if (!room || !lastEvent || !eventId) return;

  const sendReceipt = options?.sendReceipt ?? true;
  setOptimisticRoomReadMarker(roomId, eventId, client.getUserId());

  const tasks: Array<Promise<unknown> | undefined> = [
    (client as unknown as {
      setRoomReadMarkers?: (
        targetRoomId: string,
        readEventId: string,
        readReceiptEvent?: MatrixEvent
      ) => Promise<unknown>;
    }).setRoomReadMarkers?.(roomId, eventId, sendReceipt ? lastEvent : undefined),
  ];

  if (sendReceipt) {
    tasks.push(
      (client as unknown as { sendReadReceipt?: (event: MatrixEvent) => Promise<unknown> })
        .sendReadReceipt?.(lastEvent)
    );
  }

  await Promise.allSettled(tasks);
}

export async function acceptInvite(client: MatrixClient, roomId: string): Promise<void> {
  await client.joinRoom(roomId);
}

export async function rejectInvite(client: MatrixClient, roomId: string): Promise<void> {
  await client.leave(roomId);
}

export async function leaveRoom(client: MatrixClient, roomId: string): Promise<void> {
  await client.leave(roomId);
}

export async function inviteUser(client: MatrixClient, roomId: string, userId: string): Promise<void> {
  const trimmed = userId.trim();
  if (!trimmed) return;
  await client.invite(roomId, trimmed);
}

export async function kickMember(
  client: MatrixClient,
  roomId: string,
  userId: string,
  reason = ''
): Promise<void> {
  await (client as unknown as {
    kick: (targetRoomId: string, targetUserId: string, kickReason?: string) => Promise<unknown>;
  }).kick(roomId, userId, reason.trim() || undefined);
}

export async function banMember(
  client: MatrixClient,
  roomId: string,
  userId: string,
  reason = ''
): Promise<void> {
  await (client as unknown as {
    ban: (targetRoomId: string, targetUserId: string, banReason?: string) => Promise<unknown>;
  }).ban(roomId, userId, reason.trim() || undefined);
}

export async function updateRoomProfile(
  client: MatrixClient,
  roomId: string,
  input: { name: string; topic: string }
): Promise<void> {
  const name = input.name.trim();
  const topic = input.topic.trim();

  if (name) {
    await client.sendStateEvent(roomId, 'm.room.name' as never, { name } as never, '');
  }

  await client.sendStateEvent(roomId, 'm.room.topic' as never, { topic } as never, '');
}

export async function joinRoom(client: MatrixClient, roomIdOrAlias: string): Promise<string> {
  const trimmed = roomIdOrAlias.trim();
  if (!trimmed) throw new Error('请输入房间 ID 或别名。');
  const room = await client.joinRoom(trimmed);
  return room.roomId;
}

export async function createGroupRoom(
  client: MatrixClient,
  input: { name: string; topic?: string; encrypted: boolean; publicRoom: boolean }
): Promise<string> {
  const initialState = input.encrypted
    ? [
        {
          type: 'm.room.encryption',
          state_key: '',
          content: {
            algorithm: 'm.megolm.v1.aes-sha2',
          },
        },
      ]
    : [];

  const response = await client.createRoom({
    name: input.name.trim() || '新房间',
    topic: input.topic?.trim() || undefined,
    preset: input.publicRoom ? 'public_chat' : 'private_chat',
    visibility: input.publicRoom ? 'public' : 'private',
    initial_state: initialState,
  } as never);

  return response.room_id;
}

export async function createDirectRoom(
  client: MatrixClient,
  input: { userId: string; encrypted: boolean }
): Promise<string> {
  const userId = input.userId.trim();
  if (!userId) throw new Error('请输入对方 Matrix ID。');

  const initialState = input.encrypted
    ? [
        {
          type: 'm.room.encryption',
          state_key: '',
          content: {
            algorithm: 'm.megolm.v1.aes-sha2',
          },
        },
      ]
    : [];

  const response = await client.createRoom({
    preset: 'trusted_private_chat',
    invite: [userId],
    is_direct: true,
    initial_state: initialState,
  } as never);

  await storeDirectRoom(client, response.room_id, userId).catch(() => undefined);
  return response.room_id;
}

export async function searchPublicRooms(
  client: MatrixClient,
  input: { server?: string; query?: string }
): Promise<PublicRoomSummary[]> {
  const response = await (client as unknown as {
    publicRooms: (options: {
      limit: number;
      server?: string;
      filter?: { generic_search_term?: string };
    }) => Promise<{ chunk?: Array<Record<string, unknown>> }>;
  }).publicRooms({
    limit: 40,
    server: input.server?.trim() || undefined,
    filter: input.query?.trim() ? { generic_search_term: input.query.trim() } : undefined,
  });

  return (response.chunk ?? []).map((room) => {
    const aliases = Array.isArray(room.aliases) ? room.aliases : [];
    const firstAlias = aliases.find((alias): alias is string => typeof alias === 'string');
    const canonicalAlias = typeof room.canonical_alias === 'string' ? room.canonical_alias : undefined;

    return {
      id: String(room.room_id ?? firstAlias ?? ''),
      alias: canonicalAlias ?? firstAlias,
      name:
        typeof room.name === 'string'
          ? room.name
          : canonicalAlias ?? firstAlias ?? '公开房间',
      topic: typeof room.topic === 'string' ? room.topic : undefined,
      avatarUrl: mxcToHttp(client, room.avatar_url, 96, 96),
      joinedMembers:
        typeof room.num_joined_members === 'number' ? room.num_joined_members : 0,
      worldReadable: room.world_readable === true,
    };
  });
}
