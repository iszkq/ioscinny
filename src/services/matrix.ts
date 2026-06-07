import {
  ClientEvent,
  createClient,
  IndexedDBCryptoStore,
  IndexedDBStore,
  MatrixClient,
  MatrixEvent,
  MsgType,
  Room,
  RoomEvent,
  RoomMember,
  SyncState,
} from 'matrix-js-sdk';

import { matrixFetch, matrixRequestError } from './nativeFetch';
import type { StoredMatrixSession } from './sessionStore';

export type LoginInput = {
  baseUrl: string;
  username: string;
  password: string;
};

export type RoomMembership = 'join' | 'invite' | 'leave' | 'ban' | 'knock' | string;

export type RoomSummary = {
  id: string;
  name: string;
  canonicalAlias?: string;
  topic?: string;
  avatarUrl?: string;
  encrypted: boolean;
  direct: boolean;
  space: boolean;
  membership: RoomMembership;
  unread: number;
  highlight: number;
  memberCount: number;
  lastMessage: string;
  lastTs: number;
};

export type ChatAttachment = {
  kind: 'image' | 'video' | 'audio' | 'file';
  url?: string;
  name?: string;
  mimeType?: string;
  size?: number;
};

export type ChatReaction = {
  key: string;
  count: number;
  reactedByMe: boolean;
};

export type ChatMessage = {
  id: string;
  roomId: string;
  eventType: string;
  kind: 'message' | 'system';
  sender?: string;
  senderName?: string;
  senderAvatarUrl?: string;
  body: string;
  timestamp: number;
  mine: boolean;
  edited: boolean;
  encrypted: boolean;
  attachment?: ChatAttachment;
  reactions: ChatReaction[];
};

export type RoomMemberSummary = {
  id: string;
  name: string;
  avatarUrl?: string;
  membership?: string;
  powerLevel?: number;
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

export type MatrixRuntime = {
  client: MatrixClient;
  stop: () => void;
};

type MatrixWellKnown = {
  'm.homeserver'?: {
    base_url?: string;
  };
};

type MatrixClientOptions = Parameters<typeof createClient>[0];

const ROOM_NAME_FALLBACK = '未命名房间';
const DEFAULT_MESSAGE_LIMIT = 140;

const normalizeBaseUrl = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed.replace(/\/+$/g, '');
  return `https://${trimmed.replace(/\/+$/g, '')}`;
};

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

const trimReplyFallback = (body: string): string => {
  const match = body.match(/^> <.+?> .+\n(>.*\n)*?\n/m);
  if (!match) return body;
  return body.slice(match[0].length);
};

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

const mxcToHttp = (
  client: MatrixClient,
  mxcUrl: unknown,
  width?: number,
  height?: number
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
    }).mxcUrlToHttp(mxcUrl, width, height, 'scale', undefined, false, false) ?? undefined
  );
};

const getAttachment = (
  client: MatrixClient,
  content: Record<string, unknown>
): ChatAttachment | undefined => {
  const msgType = content.msgtype;
  const info = typeof content.info === 'object' && content.info ? content.info : {};
  const name =
    typeof content.filename === 'string'
      ? content.filename
      : typeof content.body === 'string'
        ? content.body
        : undefined;
  const url = mxcToHttp(client, content.url, 980, 760);
  const mimeType = (info as Record<string, unknown>).mimetype;
  const size = (info as Record<string, unknown>).size;

  if (msgType === MsgType.Image || msgType === 'm.image') {
    return {
      kind: 'image',
      url,
      name,
      mimeType: typeof mimeType === 'string' ? mimeType : undefined,
      size: typeof size === 'number' ? size : undefined,
    };
  }

  if (msgType === MsgType.Video || msgType === 'm.video') {
    return {
      kind: 'video',
      url,
      name,
      mimeType: typeof mimeType === 'string' ? mimeType : undefined,
      size: typeof size === 'number' ? size : undefined,
    };
  }

  if (msgType === MsgType.Audio || msgType === 'm.audio') {
    return {
      kind: 'audio',
      url,
      name,
      mimeType: typeof mimeType === 'string' ? mimeType : undefined,
      size: typeof size === 'number' ? size : undefined,
    };
  }

  if (msgType === MsgType.File || msgType === 'm.file') {
    return {
      kind: 'file',
      url,
      name,
      mimeType: typeof mimeType === 'string' ? mimeType : undefined,
      size: typeof size === 'number' ? size : undefined,
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

    const counts = new Map<string, { count: number; reactedByMe: boolean }>();
    relations?.getRelations().forEach((reaction) => {
      const content = getEventContent(reaction);
      const relation = content['m.relates_to'];
      if (!relation || typeof relation !== 'object') return;
      const key = (relation as Record<string, unknown>).key;
      if (typeof key !== 'string' || key.length === 0) return;

      const current = counts.get(key) ?? { count: 0, reactedByMe: false };
      current.count += 1;
      current.reactedByMe = current.reactedByMe || reaction.getSender() === client.getUserId();
      counts.set(key, current);
    });

    return Array.from(counts.entries()).map(([key, value]) => ({
      key,
      count: value.count,
      reactedByMe: value.reactedByMe,
    }));
  } catch {
    return [];
  }
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
  if (relationType === 'm.replace' || relationType === 'm.annotation') return undefined;

  const sender = event.getSender() ?? undefined;
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
    edited: Boolean(content['m.new_content']),
    encrypted: event.isEncrypted?.() ?? eventType === 'm.room.encrypted',
    reactions: getEventReactions(client, room, id),
  };

  if (event.isRedacted?.()) {
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
    return {
      ...baseMessage,
      kind: 'message',
      body: getPlainBody(content) || '贴纸',
      attachment: {
        kind: 'image',
        url: mxcToHttp(client, content.url, 420, 420),
        name: getPlainBody(content) || '贴纸',
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

  const attachment = getAttachment(client, content);
  const body = getPlainBody(content);

  return {
    ...baseMessage,
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
  return events
    .slice(Math.max(0, events.length - limit))
    .map((event) => eventToChatMessage(client, room, event))
    .filter((message): message is ChatMessage => Boolean(message));
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
  const event = client.getAccountData('m.direct');
  const content = event?.getContent() as Record<string, unknown> | undefined;
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
    return room.getJoinedMembers().length;
  } catch {
    return 0;
  }
};

const roomToSummary = (
  client: MatrixClient,
  room: Room,
  directRoomIds: Set<string>
): RoomSummary => {
  const membership = room.getMyMembership();
  const direct = directRoomIds.has(room.roomId) || isDirectInvite(room, client.getUserId());
  const lastMessage = getLastMessagePreview(client, room);
  const unread = room.getUnreadNotificationCount?.() ?? 0;
  const highlight =
    (room as unknown as { getUnreadNotificationCount?: (type?: string) => number })
      .getUnreadNotificationCount?.('highlight') ?? 0;

  return {
    id: room.roomId,
    name: room.name || room.getCanonicalAlias() || ROOM_NAME_FALLBACK,
    canonicalAlias: room.getCanonicalAlias() ?? undefined,
    topic: room.currentState?.getStateEvents('m.room.topic', '')?.getContent()?.topic,
    avatarUrl: getRoomAvatarUrl(client, room, direct),
    encrypted: room.hasEncryptionStateEvent(),
    direct,
    space: room.isSpaceRoom(),
    membership,
    unread,
    highlight,
    memberCount: getRoomMemberCount(room),
    lastMessage: lastMessage.text,
    lastTs: lastMessage.ts,
  };
};

const buildSnapshot = (client: MatrixClient): MatrixSnapshot => {
  const directRoomIds = getDirectRoomIds(client);
  const rooms = client
    .getRooms()
    .map((room) => roomToSummary(client, room, directRoomIds))
    .sort((a, b) => {
      if (a.membership === 'invite' && b.membership !== 'invite') return -1;
      if (b.membership === 'invite' && a.membership !== 'invite') return 1;
      return b.lastTs - a.lastTs || a.name.localeCompare(b.name, 'zh-Hans-CN');
    });

  return {
    version: Date.now(),
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
  const event = client.getAccountData('m.direct');
  const content = event?.getContent() as Record<string, string[]> | undefined;
  const nextContent: Record<string, string[]> = structuredClone(content ?? {});

  Object.keys(nextContent).forEach((key) => {
    nextContent[key] = nextContent[key].filter((id) => id !== roomId);
  });

  nextContent[userId] = Array.from(new Set([...(nextContent[userId] ?? []), roomId]));
  await client.setAccountData('m.direct', nextContent);
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
  onSnapshotChanged: (snapshot: MatrixSnapshot) => void,
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

  const refresh = () => onSnapshotChanged(buildSnapshot(client));
  const handleSync = (state: SyncState | null) => {
    onSyncStateChanged(state);
    refresh();
  };

  client.on(ClientEvent.Sync, handleSync);
  client.on(RoomEvent.Timeline, refresh);
  client.on(RoomEvent.MyMembership, refresh);

  await client.startClient({
    lazyLoadMembers: true,
  });
  refresh();

  return {
    client,
    stop: () => {
      client.removeListener(ClientEvent.Sync, handleSync);
      client.removeListener(RoomEvent.Timeline, refresh);
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
  query = ''
): ChatMessage[] {
  const room = client.getRoom(roomId);
  if (!room) return [];

  const normalizedQuery = query.trim().toLowerCase();
  const messages = getTimelineMessages(client, room);
  if (!normalizedQuery) return messages;

  return messages.filter((message) =>
    `${message.senderName ?? ''} ${message.body}`.toLowerCase().includes(normalizedQuery)
  );
}

export function getRoomMembers(client: MatrixClient, roomId: string): RoomMemberSummary[] {
  const room = client.getRoom(roomId);
  if (!room) return [];

  const powerLevels =
    room.currentState?.getStateEvents('m.room.power_levels', '')?.getContent() ?? {};
  const userPowerLevels =
    typeof powerLevels.users === 'object' && powerLevels.users ? powerLevels.users : {};

  return room
    .getJoinedMembers()
    .map((member) => ({
      id: member.userId,
      name: member.rawDisplayName || member.userId,
      avatarUrl: getMemberAvatarUrl(client, member, 96),
      membership: member.membership,
      powerLevel:
        typeof (userPowerLevels as Record<string, unknown>)[member.userId] === 'number'
          ? ((userPowerLevels as Record<string, number>)[member.userId] as number)
          : 0,
    }))
    .sort((a, b) => b.powerLevel - a.powerLevel || a.name.localeCompare(b.name, 'zh-Hans-CN'));
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
    info: {
      mimetype: file.type || 'application/octet-stream',
      size: file.size,
    },
  } as never);
}

export async function sendReaction(
  client: MatrixClient,
  roomId: string,
  eventId: string,
  key: string
): Promise<void> {
  await client.sendEvent(
    roomId,
    'm.reaction' as never,
    {
      'm.relates_to': {
        rel_type: 'm.annotation',
        event_id: eventId,
        key,
      },
    } as never
  );
}

export async function markRoomRead(client: MatrixClient, roomId: string): Promise<void> {
  const room = client.getRoom(roomId);
  const events = room?.getLiveTimeline().getEvents() ?? [];
  const lastEvent = events[events.length - 1];
  const eventId = lastEvent?.getId();
  if (!room || !lastEvent || !eventId) return;

  await Promise.allSettled([
    (client as unknown as {
      setRoomReadMarkers?: (targetRoomId: string, readEventId: string, event: MatrixEvent) => Promise<unknown>;
    }).setRoomReadMarkers?.(roomId, eventId, lastEvent),
    (client as unknown as { sendReadReceipt?: (event: MatrixEvent) => Promise<unknown> })
      .sendReadReceipt?.(lastEvent),
  ]);
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
