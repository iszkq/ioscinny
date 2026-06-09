import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Keyboard as CapacitorKeyboard } from '@capacitor/keyboard';
import {
  Archive,
  AtSign,
  Ban,
  Bell,
  CalendarDays,
  Camera,
  Check,
  CheckSquare2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Compass,
  Copy,
  DoorOpen,
  Edit3,
  Eye,
  FileUp,
  FolderOpen,
  Forward,
  Globe2,
  Hash,
  History,
  Image as ImageIcon,
  Info,
  Keyboard as KeyboardIcon,
  KeyRound,
  Link2,
  Lock,
  LogOut,
  MessageCircle,
  MessageSquarePlus,
  Mic,
  Moon,
  Pause,
  Pin,
  PinOff,
  Play,
  Plus,
  Reply,
  RotateCcw,
  RotateCw,
  Search,
  Send,
  Server,
  Settings,
  Shield,
  SmilePlus,
  Sparkles,
  Star,
  Square,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  Video,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { ClientEvent, MatrixClient, MatrixEvent, RoomEvent, SyncState } from 'matrix-js-sdk';
import { HttpApiEvent } from 'matrix-js-sdk/lib/http-api/interface.js';
import {
  CSSProperties,
  ChangeEvent,
  Fragment,
  FormEvent,
  KeyboardEvent,
  MutableRefObject,
  MouseEvent as ReactMouseEvent,
  memo,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  TouchEvent as ReactTouchEvent,
  WheelEvent as ReactWheelEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  acceptInvite,
  addImageToDefaultCustomEmojiPack,
  banMember,
  ChatAttachment,
  ChatReply,
  ChatMessage,
  CustomEmojiItem,
  CustomEmojiPack,
  CustomEmojiUsage,
  CryptoStatus,
  createCustomEmojiPack,
  createDirectRoom,
  createGroupRoom,
  createMatrixRuntime,
  CurrentDeviceVerificationResult,
  deleteCustomEmojiPack,
  deleteCustomEmojiPackItems,
  editTextMessage,
  ensureRoomEventInLiveTimeline,
  ExploreNavCard,
  ExploreNavSection,
  ExploreSource,
  ExploreSourceKind,
  fetchRoomMessageById,
  forwardMessagesToRooms,
  getCustomEmojiDebugSummary,
  getCustomEmojiItems,
  getCryptoStatus,
  getDirectRoomIdForUser,
  getExploreSources,
  getMatrixSnapshot,
  getOwnProfile,
  getPersonalCustomEmojiPacks,
  getPinnedMessages,
  getRoomInlineReadReceiptStates,
  getRoomMediaItems,
  getRoomMembers,
  loadRoomMembers,
  getRoomMessages,
  getRoomTypingMembers,
  InlineReadReceiptState,
  inviteUser,
  joinRoom,
  kickMember,
  leaveRoom,
  loadRoomMessageContext,
  loginWithPassword,
  markRoomRead,
  MatrixSnapshot,
  MessageReadReceipt,
  OwnProfile,
  paginateRoomMessages,
  PinnedMessageSummary,
  PublicRoomSummary,
  redactMessage,
  rejectInvite,
  reorderCustomEmojiPack,
  retryPendingMessage,
  RoomNotificationMode,
  RoomMediaItem,
  RoomMemberSummary,
  RoomSummary,
  searchPublicRooms,
  searchLocalMessages,
  EncryptedMediaFile,
  saveExploreSources,
  sendEmoteMessage,
  sendReplyMessage,
  sendReaction,
  sendStickerMessage,
  sendTextMessage,
  setMessagePinned,
  setRoomNotificationMode,
  verifyCurrentDeviceFromSecretStorage,
  restoreKeyBackupFromSecretStorage,
  restoreKeyBackupWithPassphrase,
  moveCustomEmojiPackItems,
  mxcToHttp,
  hydratePinnedMessages,
  updateCustomEmojiPack,
  updateCustomEmojiPackItem,
  updateOwnAvatar,
  updateOwnDisplayName,
  updateRoomAvatar,
  updateRoomProfile,
  updateTypingStatus,
  uploadCustomEmojiPackFiles,
  uploadFileMessage,
  verifyStoredSession,
} from './services/matrix';
import {
  clearStoredSession,
  loadStoredSession,
  saveStoredSession,
  StoredMatrixSession,
} from './services/sessionStore';
import { getCachedMediaUrl, peekCachedMediaUrl, storeCachedMediaBlob } from './services/mediaCache';
import { mediaFetch } from './services/nativeFetch';
import {
  AUDIO_TRANSCRIPTION_ACCOUNT_DATA_EVENT_TYPE,
  AIHUBMIX_AUDIO_TRANSCRIPTION_MAX_FILE_SIZE,
  AIHUBMIX_AUDIO_TRANSCRIPTION_MODEL,
  applyAudioTranscriptionSettingsAccountData,
  AudioTranscriptionResult,
  AudioTranscriptionSegment,
  AudioTranscriptionSettings,
  defaultAudioTranscriptionSettings,
  getAudioTranscriptionSettingsAccountDataSignature,
  getSyncedAudioTranscriptionSettings,
  hasAihubmixAudioTranscription,
  isDefaultAudioTranscriptionSettings,
  loadAudioTranscriptionSettings,
  normalizeAudioTranscriptionSettings,
  saveSyncedAudioTranscriptionSettings,
  saveAudioTranscriptionSettings,
  transcribeAudioWithAihubmix,
} from './services/audioTranscription';

type BootState = 'booting' | 'signedOut' | 'connecting' | 'signedIn' | 'error';
type PrimaryView = 'home' | 'direct' | 'rooms' | 'spaces' | 'invites' | 'favorites' | 'explore' | 'settings';
type RoomListView = Exclude<PrimaryView, 'explore' | 'settings'>;
type RoomFilter = 'all' | 'spaces' | 'unread' | 'mentions';
type MobilePane = 'list' | 'chat';
type Sheet =
  | 'new'
  | 'roomInfo'
  | 'security'
  | 'emojiManager'
  | { type: 'messageInfo'; message: ChatMessage }
  | { type: 'readReceipts'; message: ChatMessage; inlineState?: InlineReadReceiptState }
  | { type: 'forward'; messages: ChatMessage[] }
  | { type: 'userProfile'; member: RoomMemberSummary }
  | undefined;
type ComposerMode =
  | { type: 'normal' }
  | { type: 'reply'; message: ChatMessage }
  | { type: 'edit'; message: ChatMessage };
type FocusedTimelineContext = {
  roomId: string;
  eventId: string;
  messages: ChatMessage[];
};
type CreateFormState = {
  mode: 'direct' | 'group' | 'join';
  userId: string;
  roomName: string;
  topic: string;
  roomIdOrAlias: string;
  encrypted: boolean;
  publicRoom: boolean;
};
type AppearanceMode = 'light' | 'dark';
type DensityMode = 'comfortable' | 'compact';
const MIN_READ_RECEIPT_AVATAR_COUNT = 1;
const MAX_READ_RECEIPT_AVATAR_COUNT = 50;
type AppPreferences = {
  appearance: AppearanceMode;
  density: DensityMode;
  readReceiptAvatarCount: number;
  sendReadReceipts: boolean;
};
type AudioTranscriptionState = {
  status: 'loading' | 'success' | 'error';
  text?: string;
  detail?: string;
  error?: string;
};
type ResumeState = {
  activeView: PrimaryView;
  mobilePane: MobilePane;
  selectedRoomId?: string;
  updatedAt: number;
};
type PendingNativeCaptureIntent = {
  kind: 'photo' | 'video';
  startedAt: number;
};
type ExploreSourceEditorDraft = {
  kind: ExploreSourceKind;
  title: string;
  value: string;
  description: string;
};
type ExploreNavCardEditorDraft = {
  title: string;
  url: string;
  description: string;
  iconUrl: string;
  tags: string;
};
type ExploreEditorSheet =
  | { type: 'createSource'; initialKind?: ExploreSourceKind }
  | { type: 'editSource'; source: ExploreSource }
  | { type: 'createSection'; sourceId: string }
  | { type: 'editSection'; sourceId: string; section: ExploreNavSection }
  | { type: 'createCard'; sourceId: string; section: ExploreNavSection }
  | { type: 'editCard'; sourceId: string; section: ExploreNavSection; card: ExploreNavCard };
type ExploreDeleteIntent =
  | { type: 'source'; source: ExploreSource }
  | { type: 'section'; sourceId: string; section: ExploreNavSection }
  | { type: 'card'; sourceId: string; sectionId: string; card: ExploreNavCard };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives?: number;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  onnomatch?: (() => void) | null;
  start: (audioTrack?: MediaStreamTrack) => void;
  stop: () => void;
  abort?: () => void;
};
type BrowserAudioTranscriptionSupport = {
  supported: boolean;
  reason?: string;
};
type StoredFavoriteMessageSnapshot = {
  roomId: string;
  roomName: string;
  roomAvatarUrl?: string;
  roomDirect: boolean;
  roomSpace: boolean;
  roomEncrypted: boolean;
  roomMemberCount: number;
  capturedAt: number;
  message: ChatMessage;
};

const defaultHomeserver = 'https://mtx01.cc';
const favoriteRoomsKey = 'ioscinny.favoriteRooms';
const favoriteMessagesKey = 'ioscinny.favoriteMessages';
const favoriteMessageSnapshotsKey = 'ioscinny.favoriteMessageSnapshots';
const customEmojiSnapshotKey = 'ioscinny.customEmojiItems';
const appPreferencesKey = 'ioscinny.preferences';
const resumeStateKey = 'ioscinny.resumeState';
const pendingNativeCaptureIntentKey = 'ioscinny.pendingNativeCaptureIntent';
const roomDraftsKey = 'ioscinny.roomDrafts';
const exploreServerSourcesKey = 'ioscinny.exploreServers';
const PENDING_NATIVE_CAPTURE_INTENT_MAX_AGE_MS = 10 * 60 * 1000;
const MAX_AUDIO_TRANSCRIPTION_DURATION_SEC = 5 * 60;
const BROWSER_AUDIO_TRANSCRIPTION_SEGMENT_DURATION_SEC = 20;
const BROWSER_AUDIO_TRANSCRIPTION_SEGMENT_COOLDOWN_MS = 150;
const MAX_BROWSER_AUDIO_TRANSCRIPTION_DURATION_SEC = 60;
const AIHUBMIX_AUDIO_TRANSCRIPTION_SEGMENT_DURATION_SEC = 75;
const AIHUBMIX_AUDIO_TRANSCRIPTION_SEGMENT_COOLDOWN_MS = 120;
const AIHUBMIX_CHUNKING_MIN_DURATION_SEC = 90;
const MAX_RECOGNITION_RESTARTS_PER_SEGMENT = 2;
const MAX_CUSTOM_EMOJI_SNAPSHOT_ITEMS = 4096;
const roomNotificationOptions: RoomNotificationMode[] = ['default', 'all', 'mentions', 'mute'];
const roomNotificationLabels: Record<RoomNotificationMode, string> = {
  default: '默认',
  all: '所有消息',
  mentions: '提及与关键词',
  mute: '静音',
};
const roomNotificationNotices: Record<RoomNotificationMode, string> = {
  default: '已跟随账号默认通知',
  all: '已提醒所有消息',
  mentions: '已仅提醒提及与关键词',
  mute: '已静音',
};
const quickReactionOptions = ['👍', '❤️', '😀', '🎉', '😖', '✅'];
const composerEmojiOptions = [
  '😺',
  '😀',
  '😅',
  '😉',
  '😆',
  '😄',
  '👍',
  '🙌',
  '👌',
  '✨',
  '✅',
  '🎉',
  '❤️',
  '🥹',
  '🌈',
  '😖',
  '👏',
  '🥰',
  '🤔',
  '📷',
  '🎵',
  '📝',
  '📎',
  '🌟',
];
const systemEmojiGroups = [
  {
    id: 'faces',
    name: '笑脸',
    items: ['😺', '😸', '😀', '😃', '😊', '😉', '😁', '😚', '😽', '😆', '😎', '🤭'],
  },
  {
    id: 'gestures',
    name: '手势',
    items: ['👍', '👎', '👌', '🙌', '🙏', '✌️', '👏', '🤝', '💪', '🫶', '🤟', '😖'],
  },
  {
    id: 'hearts',
    name: '心情',
    items: ['❤️', '💓', '💕', '🥹', '💖', '💗', '💘', '🫶', '💞', '💝', '❣️', '💔'],
  },
  {
    id: 'life',
    name: '日常',
    items: ['✨', '✅', '🌙', '☀️', '🎵', '🐾', '🎉', '🎁', '📷', '📍', '🧩', '☕'],
  },
];
const customEmojiUsageOrder: CustomEmojiUsage[] = ['emoticon', 'sticker'];
const customEmojiUsageLabels: Record<CustomEmojiUsage, string> = {
  emoticon: '表情',
  sticker: '贴纸',
};

const normalizeCustomEmojiUsage = (usage: CustomEmojiUsage[]): CustomEmojiUsage[] => {
  const unique = new Set(usage);
  const normalized = customEmojiUsageOrder.filter((item) => unique.has(item));
  return normalized.length > 0 ? normalized : ['emoticon', 'sticker'];
};

const toggleCustomEmojiUsageValue = (
  usage: CustomEmojiUsage[],
  nextValue: CustomEmojiUsage
): CustomEmojiUsage[] => {
  const normalized = normalizeCustomEmojiUsage(usage);
  if (normalized.includes(nextValue)) {
    const next = normalized.filter((item) => item !== nextValue);
    return next.length > 0 ? next : normalized;
  }
  return normalizeCustomEmojiUsage(normalized.concat(nextValue));
};

const formatCustomEmojiUsage = (usage: CustomEmojiUsage[]): string =>
  normalizeCustomEmojiUsage(usage)
    .map((item) => customEmojiUsageLabels[item])
    .join(' / ');

const reorderOrderableEmojiPacks = (
  packs: CustomEmojiPack[],
  packId: string,
  direction: 'up' | 'down'
): CustomEmojiPack[] => {
  const orderablePacks = packs.filter((pack) => pack.orderable);
  const currentIndex = orderablePacks.findIndex((pack) => pack.id === packId);
  if (currentIndex === -1) return packs;

  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= orderablePacks.length) return packs;

  const nextOrderablePacks = orderablePacks.slice();
  [nextOrderablePacks[currentIndex], nextOrderablePacks[targetIndex]] = [
    nextOrderablePacks[targetIndex],
    nextOrderablePacks[currentIndex],
  ];

  let nextOrderableIndex = 0;
  return packs.map((pack) => (pack.orderable ? nextOrderablePacks[nextOrderableIndex++] : pack));
};

const bottomPrimaryViews: PrimaryView[] = ['home', 'direct', 'rooms', 'settings'];
const primaryViewValues: PrimaryView[] = [
  'home',
  'direct',
  'rooms',
  'spaces',
  'invites',
  'favorites',
  'explore',
  'settings',
];
const mobilePaneValues: MobilePane[] = ['list', 'chat'];
const roomFilterLabels: Record<RoomFilter, string> = {
  all: '全部',
  spaces: '空间',
  unread: '未读',
  mentions: '提及',
};

const clampReadReceiptAvatarCount = (value: number | undefined): number => {
  if (!Number.isFinite(value)) return 7;
  return Math.max(
    MIN_READ_RECEIPT_AVATAR_COUNT,
    Math.min(MAX_READ_RECEIPT_AVATAR_COUNT, Math.trunc(value ?? 7))
  );
};

const getEffectiveMessageReadReceipts = (
  message: ChatMessage,
  inlineReadReceiptState?: InlineReadReceiptState
): MessageReadReceipt[] =>
  message.mine && inlineReadReceiptState ? inlineReadReceiptState.readReceipts : message.readReceipts;

const getOwnMessageReadReceiptSummary = (
  message: ChatMessage,
  members: RoomMemberSummary[],
  readReceipts: MessageReadReceipt[] = message.readReceipts
): {
  totalCount: number;
  readCount: number;
  unreadCount: number;
  unreadMembers: RoomMemberSummary[];
} | undefined => {
  if (!message.mine || !message.sender) return undefined;

  const audience = members.filter(
    (member) => member.id !== message.sender && member.membership !== 'leave' && member.membership !== 'ban'
  );
  if (audience.length === 0) return undefined;

  const readUserIds = new Set(readReceipts.map((receipt) => receipt.userId));
  const unreadMembers = audience.filter((member) => !readUserIds.has(member.id));

  return {
    totalCount: audience.length,
    readCount: audience.length - unreadMembers.length,
    unreadCount: unreadMembers.length,
    unreadMembers,
  };
};

const formatOwnMessageReadReceiptSummary = (
  summary: { totalCount: number; readCount: number; unreadCount: number }
): string =>
  summary.totalCount === 1
    ? summary.readCount > 0
      ? '已读'
      : '未读'
    : summary.readCount > 0
      ? `已读 ${summary.readCount}`
      : '未读';

const getReadReceiptStatusText = (
  message: ChatMessage,
  ownReadReceiptSummary?: { totalCount: number; readCount: number; unreadCount: number }
): string => {
  if (ownReadReceiptSummary) {
    return formatOwnMessageReadReceiptSummary(ownReadReceiptSummary);
  }

  return message.readReceipts.length > 0 ? '已有已读回执' : '暂无已读回执';
};

const emptySnapshot: MatrixSnapshot = {
  version: 0,
  rooms: [],
  totalUnread: 0,
  totalHighlights: 0,
};

const viewLabels: Record<PrimaryView, string> = {
  home: '主页',
  direct: '私聊',
  rooms: '群组',
  spaces: '空间',
  invites: '邀请',
  favorites: '收藏',
  explore: '探索',
  settings: '设置',
};

const syncLabel = (state: SyncState | null): string => {
  switch (state) {
    case SyncState.Prepared:
      return '已同步';
    case SyncState.Syncing:
      return '同步';
    case SyncState.Reconnecting:
      return '重连';
    case SyncState.Error:
      return '同步错误';
    case SyncState.Stopped:
      return '已停止';
    default:
      return '等待同步';
  }
};

const matrixSyncReadyStates = new Set<SyncState>([SyncState.Prepared, SyncState.Syncing]);
const matrixSyncRetryStates = new Set<SyncState>([
  SyncState.Error,
  SyncState.Reconnecting,
  SyncState.Stopped,
]);
const matrixConnectionStaleMs = 45_000;

const getMessageSendStatusLabel = (message: Pick<ChatMessage, 'sendStatus'>): string | undefined => {
  switch (message.sendStatus) {
    case 'encrypting':
      return '加密中';
    case 'queued':
      return '排队中';
    case 'sending':
      return '发送中';
    case 'failed':
      return '未发出';
    default:
      return undefined;
  }
};

const viewIcon = (view: PrimaryView): ReactNode => {
  switch (view) {
    case 'home':
      return <MessageCircle size={20} />;
    case 'direct':
      return <AtSign size={20} />;
    case 'rooms':
      return <Hash size={20} />;
    case 'spaces':
      return <Archive size={20} />;
    case 'invites':
      return <Bell size={20} />;
    case 'favorites':
      return <Star size={20} />;
    case 'explore':
      return <Compass size={20} />;
    case 'settings':
      return <Settings size={20} />;
    default:
      return <Circle size={20} />;
  }
};

const roomNotificationIcon = (mode: RoomNotificationMode, size = 16): ReactNode => {
  if (mode === 'mentions') return <AtSign size={size} />;
  if (mode === 'mute') return <VolumeX size={size} />;
  return <Bell size={size} />;
};

const formatTime = (ts: number): string => {
  if (!ts) return '';
  const date = new Date(ts);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
};

const formatMessageTime = (ts: number): string => {
  if (!ts) return '';

  const date = new Date(ts);
  const now = new Date();
  const timeLabel = date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  if (date.toDateString() === now.toDateString()) {
    return timeLabel;
  }

  const dateLabel = date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  });

  return `${dateLabel} ${timeLabel}`;
};

const formatFullTime = (ts: number): string =>
  ts
    ? new Date(ts).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '';

const getDayKey = (ts: number): string => new Date(ts).toDateString();

const formatDateSeparator = (ts: number): string => {
  const date = new Date(ts);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return '今天';
  if (date.toDateString() === yesterday.toDateString()) return '昨天';

  return date.toLocaleDateString('zh-CN', {
    year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
};

const fallbackCopyTextToClipboard = (text: string): boolean => {
  if (typeof document === 'undefined') return false;

  const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
  const selection = window.getSelection();
  const savedRanges =
    selection && selection.rangeCount > 0
      ? Array.from({ length: selection.rangeCount }, (_, index) => selection.getRangeAt(index).cloneRange())
      : [];
  const textarea = document.createElement('textarea');

  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.setAttribute('aria-hidden', 'true');
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '-9999px';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  textarea.style.fontSize = '16px';

  document.body.appendChild(textarea);
  textarea.focus({ preventScroll: true });
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  }

  document.body.removeChild(textarea);

  if (selection) {
    selection.removeAllRanges();
    savedRanges.forEach((range) => selection.addRange(range));
  }
  activeElement?.focus({ preventScroll: true });

  return copied;
};

const copyTextToClipboard = async (text: string): Promise<boolean> => {
  const value = text ?? '';

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Fall through to legacy copy handling for iOS WebView / insecure contexts.
    }
  }

  return fallbackCopyTextToClipboard(value);
};

const getReadableMessageBody = (body: string): string => {
  if (/Unable to decrypt|DecryptionError/i.test(body)) {
    return '无法解密 · 需要恢复密钥或完成设备验证';
  }
  return body;
};

const richTextAllowedRawTagPattern = /<\/?(?:u|b|strong|i|em|s|strike|del|code|br)\s*\/?>/gi;
const richTextAllowedTags = new Set([
  'a',
  'blockquote',
  'br',
  'code',
  'del',
  'em',
  'i',
  'li',
  'ol',
  'p',
  'pre',
  's',
  'strike',
  'strong',
  'u',
  'ul',
]);
const richTextAllowedProtocols = new Set(['http:', 'https:', 'mailto:', 'matrix:']);
const autoLinkTextPattern = /(?:https?:\/\/|mailto:|www\.)[^\s<]+/gi;
const mentionBoundaryPattern = /[\s()[\]{}<>"'`,.!?;:]/;

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const createPlaceholderStore = (prefix: string) => {
  const values: string[] = [];
  return {
    push(value: string): string {
      const token = `[[${prefix}_${values.length}]]`;
      values.push(value);
      return token;
    },
    restore(input: string): string {
      return input.replace(new RegExp(`\\[\\[${prefix}_(\\d+)\\]\\]`, 'g'), (_, index: string) => values[Number(index)] ?? '');
    },
  };
};

const getFormattedBodyFromContent = (content?: Record<string, unknown>): string | undefined => {
  if (!content) return undefined;

  const editedContent = content['m.new_content'];
  if (editedContent && typeof editedContent === 'object') {
    const editedFormattedBody = getFormattedBodyFromContent(editedContent as Record<string, unknown>);
    if (editedFormattedBody) return editedFormattedBody;
  }

  const formattedBody = content.formatted_body;
  return content.format === 'org.matrix.custom.html' && typeof formattedBody === 'string' && formattedBody.trim()
    ? formattedBody
    : undefined;
};

const buildMatrixUserHref = (userId: string): string => `https://matrix.to/#/${encodeURIComponent(userId)}`;

const getMemberMentionLabel = (member: Pick<RoomMemberSummary, 'id' | 'name'>): string => {
  const displayName = member.name.trim();
  if (!displayName) return member.id;
  return displayName.startsWith('@') ? displayName : `@${displayName}`;
};

const isMentionBoundary = (char?: string): boolean => !char || mentionBoundaryPattern.test(char);

const extractMatrixUserIdFromHref = (href?: string): string | undefined => {
  if (!href) return undefined;

  try {
    const url = new URL(href, window.location.origin);
    if (url.protocol === 'matrix:') {
      const target = decodeURIComponent(`${url.pathname}${url.search}`.replace(/^\/+/, ''));
      const directMatch = target.match(/(^|\/)(@[^/?#]+:[^/?#]+)/);
      if (directMatch) return directMatch[2];
      const userMatch = target.match(/^u\/([^/?#]+)/);
      if (userMatch) {
        const decodedUser = decodeURIComponent(userMatch[1]);
        return decodedUser.startsWith('@') ? decodedUser : `@${decodedUser}`;
      }
      return undefined;
    }

    if (url.hostname === 'matrix.to') {
      const decodedHash = decodeURIComponent(url.hash.replace(/^#\/?/, ''));
      const userMatch = decodedHash.match(/^(@[^/?#]+:[^/?#]+)/);
      if (userMatch) return userMatch[1];
    }
  } catch {
    return undefined;
  }

  return undefined;
};

const findMentionMatches = (
  value: string,
  members: RoomMemberSummary[]
): Array<{ start: number; end: number; member: RoomMemberSummary }> => {
  const candidates: Array<{ start: number; end: number; member: RoomMemberSummary }> = [];

  members.forEach((member) => {
    if (!member.id) return;

    let searchFrom = 0;
    while (searchFrom < value.length) {
      const start = value.indexOf(member.id, searchFrom);
      if (start < 0) break;

      const end = start + member.id.length;
      if (isMentionBoundary(value[start - 1]) && isMentionBoundary(value[end])) {
        candidates.push({ start, end, member });
      }

      searchFrom = end;
    }
  });

  candidates.sort((left, right) => left.start - right.start || right.end - left.end);

  const matches: Array<{ start: number; end: number; member: RoomMemberSummary }> = [];
  let lastEnd = -1;

  candidates.forEach((candidate) => {
    if (candidate.start < lastEnd) return;
    matches.push(candidate);
    lastEnd = candidate.end;
  });

  return matches;
};

const renderMentionAnchor = (member: Pick<RoomMemberSummary, 'id' | 'name'>): string =>
  `<a href="${escapeHtml(buildMatrixUserHref(member.id))}" class="message-mention" data-mention-user-id="${escapeHtml(
    member.id
  )}">${escapeHtml(getMemberMentionLabel(member))}</a>`;

const getSafeRichTextHref = (href: string): string | undefined => {
  const trimmedHref = href.trim();
  if (!trimmedHref || trimmedHref.startsWith('#')) return undefined;

  try {
    const url = new URL(trimmedHref, window.location.origin);
    return richTextAllowedProtocols.has(url.protocol) ? url.toString() : undefined;
  } catch {
    return undefined;
  }
};

const getSafeRichTextImageSrc = (
  src: string,
  client?: MatrixClient,
  accessToken?: string
): string | undefined => {
  const trimmedSrc = src.trim();
  if (!trimmedSrc) return undefined;

  if (trimmedSrc.startsWith('mxc://')) {
    if (!client) return undefined;

    const authThumb = withAccessToken(mxcToHttp(client, trimmedSrc, 64, 64, true), accessToken);
    const plainThumb = mxcToHttp(client, trimmedSrc, 64, 64);
    const authFull = withAccessToken(mxcToHttp(client, trimmedSrc, undefined, undefined, true), accessToken);
    const plainFull = mxcToHttp(client, trimmedSrc);
    return authThumb ?? plainThumb ?? authFull ?? plainFull;
  }

  if (isMatrixMediaUrl(trimmedSrc)) {
    const authenticatedSrc = withAccessToken(toAuthenticatedMediaUrl(trimmedSrc), accessToken);
    const plainTokenSrc = withAccessToken(toUnauthenticatedMediaUrl(trimmedSrc) ?? trimmedSrc, accessToken);
    const publicSrc = toUnauthenticatedMediaUrl(trimmedSrc) ?? trimmedSrc;
    return authenticatedSrc ?? plainTokenSrc ?? publicSrc;
  }

  try {
    const url = new URL(trimmedSrc, window.location.origin);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
};

const splitTrailingLinkPunctuation = (value: string): { link: string; trailing: string } => {
  let link = value;
  let trailing = '';

  const countChar = (source: string, char: string): number =>
    Array.from(source).filter((item) => item === char).length;

  while (link.length > 0) {
    const lastChar = link.at(-1);
    if (!lastChar) break;

    if (/[.,!?;:]/.test(lastChar)) {
      trailing = `${lastChar}${trailing}`;
      link = link.slice(0, -1);
      continue;
    }

    if (lastChar === ')' && countChar(link, ')') > countChar(link, '(')) {
      trailing = `${lastChar}${trailing}`;
      link = link.slice(0, -1);
      continue;
    }

    if (lastChar === ']' && countChar(link, ']') > countChar(link, '[')) {
      trailing = `${lastChar}${trailing}`;
      link = link.slice(0, -1);
      continue;
    }

    if (lastChar === '}' && countChar(link, '}') > countChar(link, '{')) {
      trailing = `${lastChar}${trailing}`;
      link = link.slice(0, -1);
      continue;
    }

    break;
  }

  return { link, trailing };
};

const linkifyRichTextText = (value: string, members: RoomMemberSummary[] = []): string => {
  if (!value) return '';

  const decorations: Array<
    | {
        kind: 'link';
        start: number;
        end: number;
        html: string;
      }
    | {
        kind: 'mention';
        start: number;
        end: number;
        html: string;
      }
  > = [];

  findMentionMatches(value, members).forEach((match) => {
    decorations.push({
      kind: 'mention',
      start: match.start,
      end: match.end,
      html: renderMentionAnchor(match.member),
    });
  });

  for (const match of value.matchAll(autoLinkTextPattern)) {
    const rawMatch = match[0];
    const start = match.index ?? 0;
    const { link, trailing } = splitTrailingLinkPunctuation(rawMatch);
    const safeHref = getSafeRichTextHref(link.startsWith('www.') ? `https://${link}` : link);

    if (!safeHref) continue;

    decorations.push({
      kind: 'link',
      start,
      end: start + rawMatch.length,
      html: `<a href="${escapeHtml(safeHref)}" target="_blank" rel="noreferrer noopener">${escapeHtml(
        link
      )}</a>${escapeHtml(trailing)}`,
    });
  }

  decorations.sort((left, right) => {
    if (left.start !== right.start) return left.start - right.start;
    if (left.kind !== right.kind) return left.kind === 'link' ? -1 : 1;
    return right.end - left.end;
  });

  let html = '';
  let cursor = 0;
  let hasDecoration = false;

  decorations.forEach((decoration) => {
    if (decoration.start < cursor) return;
    html += escapeHtml(value.slice(cursor, decoration.start));
    html += decoration.html;
    cursor = decoration.end;
    hasDecoration = true;
  });

  if (!hasDecoration) {
    return escapeHtml(value);
  }

  html += escapeHtml(value.slice(cursor));
  return html;
};

const sanitizeRichTextHtml = (
  html: string,
  members: RoomMemberSummary[] = [],
  client?: MatrixClient,
  accessToken?: string
): string => {
  const parser = new DOMParser();
  const document = parser.parseFromString(`<body>${html}</body>`, 'text/html');
  const membersById = new Map(members.map((member) => [member.id, member]));

  const sanitizeNode = (node: Node, allowAutoLink = true): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? '';
      return allowAutoLink ? linkifyRichTextText(text, members) : escapeHtml(text);
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const element = node as HTMLElement;
    const tag = element.tagName.toLowerCase();

    if (tag === 'mx-reply') return '';

    const childAllowsAutoLink = tag !== 'a' && tag !== 'code' && tag !== 'pre';

    const children = Array.from(element.childNodes)
      .map((child) => sanitizeNode(child, childAllowsAutoLink))
      .join('');

    if (tag === 'img') {
      const isMatrixEmoticon =
        element.hasAttribute('data-mx-emoticon') || element.getAttribute('data-mx-emoticon') === 'true';
      if (!isMatrixEmoticon) return '';

      const rawAlt = element.getAttribute('alt')?.trim() ?? '';
      const rawTitle = element.getAttribute('title')?.trim() ?? '';
      const fallbackText = rawAlt || rawTitle;
      const safeSrc = getSafeRichTextImageSrc(element.getAttribute('src') ?? '', client, accessToken);
      if (!safeSrc) {
        return fallbackText ? escapeHtml(fallbackText) : '';
      }

      const rawSrc = (element.getAttribute('src') ?? '').trim();
      const safeCacheKey = rawSrc.startsWith('mxc://') ? safeSrc : rawSrc || safeSrc;
      const safeFallbackSrc = rawSrc.startsWith('mxc://')
        ? (client
            ? mxcToHttp(client, rawSrc, undefined, undefined, true) ?? mxcToHttp(client, rawSrc)
            : undefined) ??
          safeSrc
        : safeSrc;

      return `<img class="message-inline-emoji" src="${escapeHtml(safeSrc)}" data-media-cache-key="${escapeHtml(
        safeCacheKey
      )}" data-media-src="${escapeHtml(safeSrc)}" data-media-fallback-src="${escapeHtml(
        safeFallbackSrc ?? safeSrc
      )}" alt="${escapeHtml(
        rawAlt || rawTitle || '表情'
      )}" title="${escapeHtml(rawTitle || rawAlt || '表情')}" loading="lazy" decoding="async" draggable="false">`;
    }

    if (!richTextAllowedTags.has(tag)) return children;
    if (tag === 'br') return '<br>';
    if (tag === 'a') {
      const href = element.getAttribute('href');
      const safeHref = href ? getSafeRichTextHref(href) : undefined;
      if (!safeHref) return children;

      const mentionedUserId = extractMatrixUserIdFromHref(safeHref);
      if (mentionedUserId) {
        const member = membersById.get(mentionedUserId) ?? {
          id: mentionedUserId,
          name: children.replace(/<[^>]+>/g, '').trim() || mentionedUserId,
        };
        return renderMentionAnchor(member);
      }

      return `<a href="${escapeHtml(safeHref)}" target="_blank" rel="noreferrer noopener">${children || escapeHtml(
        safeHref
      )}</a>`;
    }

    return `<${tag}>${children}</${tag}>`;
  };

  return Array.from(document.body.childNodes)
    .map((node) => sanitizeNode(node))
    .join('');
};

const markdownishToHtml = (
  body: string,
  members: RoomMemberSummary[] = [],
  client?: MatrixClient,
  accessToken?: string
): string => {
  const normalizedBody = getReadableMessageBody(body).replace(/\r\n?/g, '\n');
  const codePlaceholders = createPlaceholderStore('RT_CODE');
  const rawTagPlaceholders = createPlaceholderStore('RT_TAG');

  const bodyWithCodePlaceholders = normalizedBody.replace(/`([^`\n]+)`/g, (_, content: string) =>
    codePlaceholders.push(`<code>${escapeHtml(content)}</code>`)
  );
  const bodyWithRawTagPlaceholders = bodyWithCodePlaceholders.replace(richTextAllowedRawTagPattern, (match) =>
    rawTagPlaceholders.push(match)
  );

  let html = escapeHtml(bodyWithRawTagPlaceholders);
  html = html.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, (_match, label: string, href: string) =>
    `<a href="${escapeHtml(href)}">${label}</a>`
  );
  html = html.replace(/\*\*([^\s*](?:.*?[^\s*])?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/~~([^\s~](?:.*?[^\s~])?)~~/g, '<del>$1</del>');
  html = html.replace(/(^|[^*])\*([^\s*](?:.*?[^\s*])?)\*(?!\*)/g, '$1<em>$2</em>');
  html = rawTagPlaceholders.restore(html);
  html = codePlaceholders.restore(html);
  html = html.replace(/\n/g, '<br>');

  return sanitizeRichTextHtml(html, members, client, accessToken);
};

const getMessageBodyHtml = (
  message: Pick<ChatMessage, 'body' | 'forwardContent'>,
  members: RoomMemberSummary[] = [],
  client?: MatrixClient,
  accessToken?: string
): string => {
  const formattedBody = getFormattedBodyFromContent(message.forwardContent);
  return formattedBody
    ? sanitizeRichTextHtml(formattedBody, members, client, accessToken)
    : markdownishToHtml(message.body, members, client, accessToken);
};

const isForwardableMessage = (message: ChatMessage): boolean =>
  message.kind === 'message' && Boolean(message.forwardContent);

const getReadableKeyRestoreError = (err: unknown): string => {
  const message = err instanceof Error ? err.message : String(err);
  if (/getSecretStorageKey callback/i.test(message)) {
    return '当前客户端暂时不能直接弹出安全存储密钥输入框，请在下面输入恢复密钥或备份口令后再继续恢复。';
  }
  if (/No backup|backup/i.test(message) && /not/i.test(message)) {
    return '当前账号没有可用的服务端密钥备份，或这台设备还没有信任该备份';
  }
  return message;
};

const getCurrentDeviceVerificationCopy = (result: CurrentDeviceVerificationResult): string => {
  if (result.currentDeviceCrossSigned) {
    return result.signedCurrentDevice ? '当前设备已用恢复密钥完成交叉签名' : '当前设备已完成交叉签名';
  }

  if (result.currentDeviceVerified) {
    return '当前设备仅在本机被信任；其它客户端仍可能显示未验证，需要交叉签名后才会同步可信状态';
  }

  if (result.skippedReason === 'no-cross-signing-private-keys') {
    return '当前设备仍未验证：安全存储里没有可用的交叉签名私钥，需要从另一台已验证设备发起设备验证';
  }

  if (result.skippedReason === 'missing-device-id') {
    return '当前设备仍未验证：客户端没有读取到本机设备 ID';
  }

  if (result.skippedReason === 'crypto-unavailable') {
    return '当前设备仍未验证：端到端加密还没有启用';
  }

  return '当前设备验证状态未改变，请稍后刷新其它设备的会话列表';
};

const getReadableSpeechError = (code?: string): string => {
  if (code === 'not-allowed' || code === 'service-not-allowed' || code === 'NotAllowedError' || code === 'SecurityError') {
    return '语音听写被浏览器拒绝了。请确认当前站点允许麦克风 / 语音识别；iOS WebView 真机需要接入原生 Speech Recognition 权限';
  }
  if (code === 'audio-capture' || code === 'NotFoundError') return '没有读取到麦克风输入，请检查系统麦克风权限';
  if (code === 'network' && Capacitor.getPlatform() === 'ios') {
    return '当前 IPA 里的浏览器识别不可用，请在设置里配置 AIHubMix 云端转写。';
  }
  if (code === 'network') return '浏览器语音识别服务连接失败。请稍后重试，或在设置里配置 AIHubMix 云端转写。';
  if (code === 'no-speech') return '没有识别到语音内容。';
  return code ? `语音听写失败：${code}` : '语音听写失败';
};

const getReadableLoginError = (err: unknown): string => {
  const message = err instanceof Error ? err.message : String(err);
  const data = isRecord(err) && isRecord(err.data) ? err.data : undefined;
  const errcode =
    (isRecord(err) && typeof err.errcode === 'string' ? err.errcode : undefined) ??
    (typeof data?.errcode === 'string' ? data.errcode : undefined);

  if (/invalid username\/password/i.test(message)) {
    return '用户名或密码错误，请重新输入。';
  }
  if (errcode === 'M_FORBIDDEN') {
    return '用户名或密码错误，请重新输入。';
  }
  if (errcode === 'M_USER_DEACTIVATED') {
    return '当前账号已被停用，请联系服务器管理员。';
  }
  if (errcode === 'M_LIMIT_EXCEEDED') {
    return '登录过于频繁，请稍后再试。';
  }

  return message;
};

const audioRecorderMimeCandidates = [
  'audio/mp4',
  'audio/webm;codecs=opus',
  'audio/ogg;codecs=opus',
  'audio/webm',
  'audio/ogg',
];

const getSupportedAudioRecorderMimeType = (): string | undefined => {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return undefined;
  }
  return audioRecorderMimeCandidates.find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
};

const extensionFromAudioMimeType = (mimeType: string): string => {
  if (/mp4|aac/i.test(mimeType)) return 'm4a';
  if (/ogg|opus/i.test(mimeType)) return 'ogg';
  return 'webm';
};

const formatDuration = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const totalSeconds = Math.round(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const rest = totalSeconds % 60;
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
};

const unsupportedAuthenticatedMediaOrigins = new Set<string>();

const isAuthenticatedMediaPath = (pathname: string): boolean =>
  pathname.startsWith('/_matrix/client/v1/media/');

const isMatrixMediaUrl = (src?: string): boolean => {
  if (!src) return false;

  try {
    const pathname = new URL(src).pathname;
    return pathname.startsWith('/_matrix/media/') || isAuthenticatedMediaPath(pathname);
  } catch {
    return false;
  }
};

const markAuthenticatedMediaUnsupported = (src: string, status: number) => {
  if (![404, 405, 501].includes(status)) return;

  try {
    const url = new URL(src);
    if (!isAuthenticatedMediaPath(url.pathname)) return;
    unsupportedAuthenticatedMediaOrigins.add(url.origin);
  } catch {
    // Ignore malformed URLs while probing fallbacks.
  }
};

const toAuthenticatedMediaUrl = (src?: string): string | undefined => {
  if (!src) return undefined;
  try {
    const url = new URL(src);
    if (unsupportedAuthenticatedMediaOrigins.has(url.origin)) return undefined;
    if (url.pathname.startsWith('/_matrix/client/v1/media/')) return url.href;
    if (!url.pathname.startsWith('/_matrix/media/v3/')) return undefined;
    url.pathname = url.pathname.replace('/_matrix/media/v3/', '/_matrix/client/v1/media/');
    url.searchParams.set('allow_redirect', 'true');
    return url.href;
  } catch {
    return undefined;
  }
};

const toUnauthenticatedMediaUrl = (src?: string): string | undefined => {
  if (!src) return undefined;

  try {
    const url = new URL(src);
    if (url.pathname.startsWith('/_matrix/media/v3/')) return url.href;
    if (!isAuthenticatedMediaPath(url.pathname)) return undefined;
    url.pathname = url.pathname.replace('/_matrix/client/v1/media/', '/_matrix/media/v3/');
    url.searchParams.delete('access_token');
    return url.href;
  } catch {
    return undefined;
  }
};

const withAccessToken = (src?: string, accessToken?: string): string | undefined => {
  if (!src || !accessToken) return undefined;
  try {
    const url = new URL(src);
    url.searchParams.set('access_token', accessToken);
    return url.href;
  } catch {
    return undefined;
  }
};

const getImmediateMediaDisplaySrc = (
  src?: string,
  accessToken?: string,
  fallbackSrc?: string
): string | undefined => {
  const authenticatedSrc = accessToken ? toAuthenticatedMediaUrl(src) : undefined;
  const authenticatedFallbackSrc = accessToken ? toAuthenticatedMediaUrl(fallbackSrc) : undefined;
  const plainSrc = toUnauthenticatedMediaUrl(src) ?? src;
  const plainFallbackSrc = toUnauthenticatedMediaUrl(fallbackSrc) ?? fallbackSrc;
  const authTokenSrc = withAccessToken(authenticatedSrc, accessToken);
  const authTokenFallbackSrc = withAccessToken(authenticatedFallbackSrc, accessToken);
  const plainTokenSrc = withAccessToken(plainSrc, accessToken);
  const plainTokenFallbackSrc = withAccessToken(plainFallbackSrc, accessToken);

  return (
    authTokenFallbackSrc ??
    plainTokenFallbackSrc ??
    authTokenSrc ??
    plainTokenSrc ??
    plainFallbackSrc ??
    plainSrc
  );
};

const deriveMatrixMediaDownloadUrl = (src?: string): string | undefined => {
  if (!src) return undefined;

  try {
    const url = new URL(src);
    if (url.pathname.includes('/_matrix/client/v1/media/thumbnail/')) {
      url.pathname = url.pathname.replace('/_matrix/client/v1/media/thumbnail/', '/_matrix/client/v1/media/download/');
    } else if (url.pathname.includes('/_matrix/media/v3/thumbnail/')) {
      url.pathname = url.pathname.replace('/_matrix/media/v3/thumbnail/', '/_matrix/media/v3/download/');
    } else {
      return undefined;
    }

    url.searchParams.delete('width');
    url.searchParams.delete('height');
    url.searchParams.delete('method');
    return url.href;
  } catch {
    return undefined;
  }
};

type MediaCandidate = {
  src?: string;
  fallbackSrc?: string;
  encryptedFile?: EncryptedMediaFile;
  mimeType?: string;
};

const createMediaCandidateKey = (candidate: MediaCandidate): string =>
  [
    candidate.src,
    candidate.fallbackSrc,
    candidate.encryptedFile?.url,
    candidate.encryptedFile?.iv,
    candidate.mimeType,
  ].join('|');

const dedupeMediaCandidates = (candidates: MediaCandidate[]): MediaCandidate[] => {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    if (!candidate.src && !candidate.fallbackSrc) return false;
    const key = createMediaCandidateKey(candidate);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const buildMatrixMediaRetrySrcs = (...sources: Array<string | undefined>): string[] => {
  const retrySources: string[] = [];

  sources.forEach((source) => {
    const derived = deriveMatrixMediaDownloadUrl(source);
    if (derived && !retrySources.includes(derived) && !sources.includes(derived)) {
      retrySources.push(derived);
    }
  });

  return retrySources;
};

const buildMediaRetryCandidates = (
  candidate: MediaCandidate
): MediaCandidate[] =>
  buildMatrixMediaRetrySrcs(candidate.src, candidate.fallbackSrc).map((retrySrc) => ({
    src: retrySrc,
    fallbackSrc: candidate.fallbackSrc,
    encryptedFile: candidate.encryptedFile,
    mimeType: candidate.mimeType,
  }));

const getPreviewEncryptedFile = (attachment?: ChatAttachment): EncryptedMediaFile | undefined => {
  if (!attachment) return undefined;
  if (attachment.previewEncryptedFile) return attachment.previewEncryptedFile;
  if (!attachment.encryptedFile) return undefined;

  const previewPrimarySrc = attachment.authUrl ?? attachment.url;
  const fullPrimarySrc =
    attachment.authDownloadUrl ?? attachment.downloadUrl ?? attachment.authUrl ?? attachment.url;
  const previewFallbackSrc = attachment.url;
  const fullFallbackSrc = attachment.downloadUrl ?? attachment.url;
  const previewUsesOriginalAsset =
    previewPrimarySrc === fullPrimarySrc || previewFallbackSrc === fullFallbackSrc;

  return previewUsesOriginalAsset ? attachment.encryptedFile : undefined;
};

const isHttpLikeUrl = (value: string): boolean => /^https?:\/\//i.test(value);

const canPreviewRoomMediaItem = (item: RoomMediaItem): boolean =>
  Boolean(item.authDownloadUrl ?? item.authUrl ?? item.downloadUrl ?? item.url);

const getNavigableRoomMediaItems = (
  items: RoomMediaItem[],
  kind: RoomMediaItem['kind']
): RoomMediaItem[] =>
  [...items]
    .filter((item) => item.kind === kind && canPreviewRoomMediaItem(item))
    .sort((left, right) => left.timestamp - right.timestamp || left.messageId.localeCompare(right.messageId));

const buildCustomEmojiInfoFromMedia = (media: {
  mimeType?: string;
  width?: number;
  height?: number;
  size?: number;
}): Record<string, unknown> | undefined => {
  const info: Record<string, unknown> = {};
  if (media.mimeType) info.mimetype = media.mimeType;
  if (typeof media.width === 'number') info.w = media.width;
  if (typeof media.height === 'number') info.h = media.height;
  if (typeof media.size === 'number') info.size = media.size;
  return Object.keys(info).length > 0 ? info : undefined;
};

const decodeUnpaddedBase64 = (value: string): Uint8Array => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = `${normalized}${'='.repeat((4 - (normalized.length % 4)) % 4)}`;
  const binary = window.atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const encodeUnpaddedBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const decryptEncryptedMediaBlob = async (
  encryptedBlob: Blob,
  encryptedFile: EncryptedMediaFile,
  mimeType?: string
): Promise<Blob> => {
  if (!window.crypto?.subtle) {
    throw new Error('当前环境缺少 WebCrypto，无法解密这个附件。');
  }

  const encryptedBuffer = await encryptedBlob.arrayBuffer();
  const expectedHash = encryptedFile.hashes?.sha256;
  if (expectedHash) {
    const digest = new Uint8Array(await window.crypto.subtle.digest('SHA-256', encryptedBuffer));
    const actualHash = encodeUnpaddedBase64(digest);
    if (actualHash !== expectedHash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')) {
      throw new Error('加密附件校验失败，文件可能已损坏或下载不完整');
    }
  }

  const counter = decodeUnpaddedBase64(encryptedFile.iv);
  if (counter.byteLength !== 16) {
    throw new Error('加密附件的 IV 无效，无法解密。');
  }
  const counterView = new Uint8Array(counter.buffer.slice(counter.byteOffset, counter.byteOffset + counter.byteLength));

  const key = await window.crypto.subtle.importKey(
    'jwk',
    encryptedFile.key,
    { name: 'AES-CTR' },
    false,
    ['decrypt']
  );
  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-CTR', counter: counterView as unknown as BufferSource, length: 64 },
    key,
    encryptedBuffer
  );

  return new Blob([decrypted], { type: mimeType || 'application/octet-stream' });
};

const fetchMediaBlob = async (
  src?: string,
  accessToken?: string,
  fallbackSrc?: string,
  encryptedFile?: EncryptedMediaFile,
  mimeType?: string
): Promise<Blob> => {
  const authenticatedSrc = accessToken ? toAuthenticatedMediaUrl(src) : undefined;
  const authenticatedFallbackSrc = accessToken ? toAuthenticatedMediaUrl(fallbackSrc) : undefined;
  const plainSrc = toUnauthenticatedMediaUrl(src) ?? src;
  const plainFallbackSrc = toUnauthenticatedMediaUrl(fallbackSrc) ?? fallbackSrc;
  const authTokenSrc = withAccessToken(authenticatedSrc, accessToken);
  const authTokenFallbackSrc = withAccessToken(authenticatedFallbackSrc, accessToken);
  const plainTokenSrc = withAccessToken(plainSrc, accessToken);
  const plainTokenFallbackSrc = withAccessToken(plainFallbackSrc, accessToken);
  const candidates: Array<{ url: string; headers?: HeadersInit }> = [];
  const pushCandidate = (url?: string, headers?: HeadersInit) => {
    if (!url || candidates.some((candidate) => candidate.url === url)) return;
    candidates.push({ url, headers });
  };

  if (authenticatedSrc && accessToken) {
    pushCandidate(authenticatedSrc, { Authorization: `Bearer ${accessToken}` });
    pushCandidate(authTokenSrc);
  }
  pushCandidate(plainTokenSrc);
  pushCandidate(plainSrc);

  if (authenticatedFallbackSrc && accessToken) {
    pushCandidate(authenticatedFallbackSrc, { Authorization: `Bearer ${accessToken}` });
    pushCandidate(authTokenFallbackSrc);
  }
  pushCandidate(plainTokenFallbackSrc);
  pushCandidate(plainFallbackSrc);

  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      const response = await mediaFetch(candidate.url, { headers: candidate.headers });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      return encryptedFile
        ? decryptEncryptedMediaBlob(blob, encryptedFile, mimeType)
        : mimeType && blob.type !== mimeType
          ? new Blob([blob], { type: mimeType })
          : blob;
    } catch (error) {
      if (error instanceof Error) {
        const match = /HTTP\s+(\d+)/i.exec(error.message);
        if (match) {
          markAuthenticatedMediaUnsupported(candidate.url, Number(match[1]));
        }
      }
      lastError = error;
    }
  }

  throw new Error(
    `媒体无法读取：${lastError instanceof Error ? lastError.message : '媒体地址不可访问'}`
  );
};

const pendingMediaBlobRequests = new Map<string, Promise<Blob>>();

const fetchMediaBlobDeduped = async (
  cacheKey: string | undefined,
  load: () => Promise<Blob>
): Promise<Blob> => {
  if (!cacheKey) return load();

  const pending = pendingMediaBlobRequests.get(cacheKey);
  if (pending) return pending;

  const nextRequest = load().finally(() => {
    if (pendingMediaBlobRequests.get(cacheKey) === nextRequest) {
      pendingMediaBlobRequests.delete(cacheKey);
    }
  });
  pendingMediaBlobRequests.set(cacheKey, nextRequest);
  return nextRequest;
};

type MediaWarmTarget = {
  cacheKey: string;
  src?: string;
  fallbackSrc?: string;
  accessToken?: string;
  encryptedFile?: EncryptedMediaFile;
  mimeType?: string;
};

const buildAvatarThumbnailUrl = (
  client: MatrixClient,
  mxcUrl: unknown,
  size: number
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
    }).mxcUrlToHttp(mxcUrl, size, size, 'crop', undefined, false, false) ?? undefined
  );
};

const dedupeMediaWarmTargets = (targets: MediaWarmTarget[]): MediaWarmTarget[] => {
  const seen = new Set<string>();
  return targets.filter((target) => {
    if (!target.cacheKey || (!target.src && !target.fallbackSrc) || seen.has(target.cacheKey)) {
      return false;
    }
    seen.add(target.cacheKey);
    return true;
  });
};

const warmMediaCacheEntry = async ({
  cacheKey,
  src,
  fallbackSrc,
  accessToken,
  encryptedFile,
  mimeType,
}: MediaWarmTarget): Promise<boolean> => {
  const primarySrc = src ?? fallbackSrc;
  if (!cacheKey || !primarySrc) return false;
  if (peekCachedMediaUrl(cacheKey)) return true;

  const cachedUrl = await getCachedMediaUrl(cacheKey, mimeType, primarySrc);
  if (cachedUrl) return true;

  try {
    const blob = await fetchMediaBlobDeduped(cacheKey, () =>
      fetchMediaBlob(primarySrc, accessToken, fallbackSrc, encryptedFile, mimeType)
    );
    const storedUrl = await storeCachedMediaBlob(cacheKey, blob, mimeType ?? blob.type, primarySrc);
    return Boolean(storedUrl || peekCachedMediaUrl(cacheKey));
  } catch {
    return false;
  }
};

const runConcurrentTasks = async <T,>(
  items: T[],
  limit: number,
  task: (item: T, index: number) => Promise<void>,
  shouldStop?: () => boolean
): Promise<void> => {
  if (items.length === 0) return;

  let nextIndex = 0;
  const workerCount = Math.min(Math.max(limit, 1), items.length);

  await Promise.allSettled(
    Array.from({ length: workerCount }, async () => {
      while (!shouldStop?.()) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        if (currentIndex >= items.length) return;
        await task(items[currentIndex], currentIndex);
      }
    })
  );
};

const useAuthenticatedMediaState = (
  src?: string,
  accessToken?: string,
  fallbackSrc?: string,
  encryptedFile?: EncryptedMediaFile,
  mimeType?: string
): { resolvedSrc?: string; loading: boolean; failed: boolean } => {
  const encryptedFileSignature = encryptedFile
    ? `${encryptedFile.url}|${encryptedFile.iv}|${encryptedFile.hashes?.sha256 ?? ''}`
    : '';
  const immediateDisplaySrc = getImmediateMediaDisplaySrc(src, accessToken, fallbackSrc);
  const deferNativePlaybackSrc =
    Capacitor.isNativePlatform() && (mimeType?.startsWith('audio/') || mimeType?.startsWith('video/'));
  const [state, setState] = useState<{ resolvedSrc?: string; loading: boolean; failed: boolean }>(() => ({
    resolvedSrc: encryptedFile || deferNativePlaybackSrc ? undefined : immediateDisplaySrc ?? fallbackSrc,
    loading: Boolean(src && (encryptedFile || deferNativePlaybackSrc)),
    failed: false,
  }));

  useEffect(() => {
    let objectUrl: string | undefined;
    let cancelled = false;
    const cacheKey = encryptedFile?.url ?? src ?? fallbackSrc;
    const plainSrc = toUnauthenticatedMediaUrl(src) ?? src;
    const plainFallbackSrc = toUnauthenticatedMediaUrl(fallbackSrc) ?? fallbackSrc;
    const nextImmediateDisplaySrc = getImmediateMediaDisplaySrc(src, accessToken, fallbackSrc);

    if (!src) {
      setState({
        resolvedSrc: deferNativePlaybackSrc ? undefined : nextImmediateDisplaySrc,
        loading: false,
        failed: deferNativePlaybackSrc ? false : !nextImmediateDisplaySrc,
      });
      return undefined;
    }

    const authenticatedSrc = accessToken ? toAuthenticatedMediaUrl(src) : undefined;
    const needsProtectedFetch = Boolean(
      encryptedFile ||
      (accessToken && (isMatrixMediaUrl(src) || isMatrixMediaUrl(fallbackSrc) || Boolean(authenticatedSrc)))
    );
    const requestSrc = authenticatedSrc ?? plainSrc;
    const tokenSrc = withAccessToken(plainSrc, accessToken);
    const memoryCachedSrc = peekCachedMediaUrl(cacheKey);

    if (!needsProtectedFetch) {
      setState({ resolvedSrc: requestSrc, loading: false, failed: false });
      return undefined;
    }

    if (memoryCachedSrc) {
      setState({ resolvedSrc: memoryCachedSrc, loading: false, failed: false });
      return undefined;
    }

    setState({
      resolvedSrc: deferNativePlaybackSrc ? undefined : nextImmediateDisplaySrc,
      loading: true,
      failed: false,
    });

    void (async () => {
      try {
        const cachedSrc = cacheKey ? await getCachedMediaUrl(cacheKey, mimeType, src) : undefined;
        if (cachedSrc) {
          if (!cancelled) {
            setState({ resolvedSrc: cachedSrc, loading: false, failed: false });
          }
          return;
        }

        const blob = await fetchMediaBlobDeduped(cacheKey, () =>
          fetchMediaBlob(src, accessToken, fallbackSrc, encryptedFile, mimeType)
        );
        const cachedUrl = cacheKey
          ? await storeCachedMediaBlob(cacheKey, blob, mimeType ?? blob.type, src)
          : undefined;

        if (cachedUrl) {
          if (!cancelled) {
            setState({ resolvedSrc: cachedUrl, loading: false, failed: false });
          }
          return;
        }

        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) {
          setState({ resolvedSrc: objectUrl, loading: false, failed: false });
        }
      } catch {
        if (!cancelled) {
          setState({
            resolvedSrc: nextImmediateDisplaySrc,
            loading: false,
            failed: !nextImmediateDisplaySrc,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [accessToken, deferNativePlaybackSrc, encryptedFileSignature, fallbackSrc, mimeType, src]);

  return state;
};

const useResolvedMediaCandidateList = (
  candidates: MediaCandidate[],
  accessToken?: string
): { resolvedSrc?: string; loading: boolean; failed: boolean; onRenderedError: () => void } => {
  const normalizedCandidates = useMemo(() => dedupeMediaCandidates(candidates), [candidates]);
  const candidateSignature = useMemo(
    () => normalizedCandidates.map((candidate) => createMediaCandidateKey(candidate)).join('||'),
    [normalizedCandidates]
  );
  const resolutionSignature = `${candidateSignature}|${accessToken ?? ''}`;
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [renderFailed, setRenderFailed] = useState(false);

  useEffect(() => {
    setCandidateIndex(0);
    setRenderFailed(false);
  }, [resolutionSignature]);

  const currentCandidate = normalizedCandidates[candidateIndex];
  const mediaState = useAuthenticatedMediaState(
    currentCandidate?.src,
    accessToken,
    currentCandidate?.fallbackSrc,
    currentCandidate?.encryptedFile,
    currentCandidate?.mimeType
  );
  const hasNextCandidate = candidateIndex < normalizedCandidates.length - 1;

  const advanceCandidate = useCallback(() => {
    setRenderFailed(false);
    setCandidateIndex((current) => Math.min(current + 1, Math.max(normalizedCandidates.length - 1, 0)));
  }, [normalizedCandidates.length]);

  useEffect(() => {
    if (mediaState.failed && hasNextCandidate) {
      advanceCandidate();
    }
  }, [advanceCandidate, hasNextCandidate, mediaState.failed]);

  const onRenderedError = useCallback(() => {
    if (hasNextCandidate) {
      advanceCandidate();
      return;
    }

    setRenderFailed(true);
  }, [advanceCandidate, hasNextCandidate]);

  if (!currentCandidate) {
    return { resolvedSrc: undefined, loading: false, failed: true, onRenderedError };
  }

  return {
    resolvedSrc: renderFailed ? undefined : mediaState.resolvedSrc,
    loading: mediaState.loading,
    failed: renderFailed || (mediaState.failed && !hasNextCandidate),
    onRenderedError,
  };
};

const useAuthenticatedMediaUrl = (
  src?: string,
  accessToken?: string,
  fallbackSrc?: string,
  encryptedFile?: EncryptedMediaFile,
  mimeType?: string
): string | undefined => {
  const { resolvedSrc } = useAuthenticatedMediaState(src, accessToken, fallbackSrc, encryptedFile, mimeType);
  return resolvedSrc;
};

const useDeferredMediaActivation = (
  enabled: boolean,
  signature: string
): { hostRef: MutableRefObject<HTMLSpanElement | null>; active: boolean } => {
  const hostRef = useRef<HTMLSpanElement | null>(null);
  const [active, setActive] = useState(!enabled);

  useEffect(() => {
    setActive(!enabled);
  }, [enabled, signature]);

  useEffect(() => {
    if (!enabled || active) return undefined;

    const host = hostRef.current;
    if (!host || typeof window === 'undefined' || typeof window.IntersectionObserver === 'undefined') {
      setActive(true);
      return undefined;
    }

    const observer = new window.IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting || entry.intersectionRatio > 0)) {
          setActive(true);
          observer.disconnect();
        }
      },
      { rootMargin: '220px' }
    );

    observer.observe(host);
    return () => observer.disconnect();
  }, [active, enabled, signature]);

  return { hostRef, active };
};

const cjkCharacterPattern = /[\u3400-\u9fff]/;
const transcriptSentenceEndingPattern = /[。！？!?]$/;
const transcriptPunctuationPattern = /[，。！？；：、,.!?;:]/;
const transcriptConnectorPattern =
  /^(但是|然后|所以|因为|如果|后来|结果|另外|不过|其实|而且|并且|同时|接着|最后|现在|那么|就是)/;

const normalizeTranscriptSpacing = (value = ''): string => {
  let nextValue = value
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();

  for (let index = 0; index < 3; index += 1) {
    const previousValue = nextValue;
    nextValue = nextValue
      .replace(/([\u3400-\u9fff])\s+([\u3400-\u9fff])/g, '$1$2')
      .replace(/\s+([，。！？；：、])/g, '$1')
      .replace(/([（《“‘【])\s+/g, '$1')
      .replace(/\s+([）》。！？；：、】”’])/g, '$1');
    if (nextValue === previousValue) break;
  }

  return nextValue;
};

const normalizeTranscriptPunctuation = (value = ''): string =>
  normalizeTranscriptSpacing(value)
    .replace(/,/g, '，')
    .replace(/;/g, '；')
    .replace(/:/g, '：')
    .replace(/\?/g, '？')
    .replace(/!/g, '！')
    .replace(/\.{3,}/g, '……')
    .replace(/。{2,}/g, '。')
    .replace(/，{2,}/g, '，')
    .replace(/！{2,}/g, '！')
    .replace(/？{2,}/g, '？');

const combineTranscript = (leftText = '', rightText = ''): string => {
  const leftValue = normalizeTranscriptSpacing(leftText);
  const rightValue = normalizeTranscriptSpacing(rightText);
  if (!leftValue) return rightValue;
  if (!rightValue) return leftValue;

  const shouldJoinWithoutSpace =
    cjkCharacterPattern.test(leftValue[leftValue.length - 1] ?? '') &&
    cjkCharacterPattern.test(rightValue[0] ?? '');
  const shouldJoinDirectly = shouldJoinWithoutSpace || /^[，。！？；：、]/.test(rightValue);

  return `${leftValue}${shouldJoinDirectly ? '' : ' '}${rightValue}`.trim();
};

const ensureTranscriptSentenceEnding = (value: string): string => {
  if (!value) return value;
  if (transcriptSentenceEndingPattern.test(value)) return value;
  return `${value}${cjkCharacterPattern.test(value) ? '。' : '.'}`;
};

const splitPlainTranscriptIntoSentences = (value: string): string[] => {
  if (!value) return [];

  const sentences: string[] = [];
  let cursor = 0;
  const targetLength = 22;
  const maxLength = 34;

  while (cursor < value.length) {
    const remaining = value.length - cursor;
    if (remaining <= 18) {
      const tail = value.slice(cursor).trim();
      if (tail) sentences.push(tail);
      break;
    }

    let breakIndex = Math.min(value.length, cursor + maxLength);
    let fallbackIndex = -1;

    for (let index = cursor + 10; index < Math.min(value.length, cursor + maxLength); index += 1) {
      const currentChar = value[index];
      const nextSlice = value.slice(index).trimStart();
      if (index - cursor >= targetLength && transcriptConnectorPattern.test(nextSlice)) {
        breakIndex = index;
        fallbackIndex = index;
        break;
      }
      if (/[吧吗啊呀呢啦嘛么呗哇]/.test(currentChar ?? '')) {
        fallbackIndex = index + 1;
      }
      if (index - cursor >= targetLength && /[的地得了着过]/.test(currentChar ?? '')) {
        fallbackIndex = index + 1;
      }
    }

    if (fallbackIndex > cursor && fallbackIndex < breakIndex) {
      breakIndex = fallbackIndex;
    }

    const sentence = value.slice(cursor, breakIndex).trim();
    if (sentence) sentences.push(sentence);
    cursor = breakIndex;
  }

  return sentences;
};

const formatTranscriptParagraph = (value: string): string => {
  const normalized = normalizeTranscriptPunctuation(value);
  if (!normalized) return '';

  if (transcriptSentenceEndingPattern.test(normalized) || /[。！？]/.test(normalized)) {
    return ensureTranscriptSentenceEnding(normalized);
  }

  if (transcriptPunctuationPattern.test(normalized)) {
    const clauses = normalized.split(/[，；：、]/).map((clause) => clause.trim()).filter(Boolean);
    if (clauses.length > 1) {
      return clauses
        .map((clause, index) => `${clause}${index === clauses.length - 1 ? '。' : index % 2 === 0 ? '，' : '。'}`)
        .join('');
    }
    return ensureTranscriptSentenceEnding(normalized);
  }

  const sentences = splitPlainTranscriptIntoSentences(normalized);
  return sentences
    .map((sentence, index) => `${sentence}${index === sentences.length - 1 ? '。' : index % 2 === 0 ? '，' : '。'}`)
    .join('');
};

const groupTranscriptSegments = (segments: AudioTranscriptionSegment[]): string[] => {
  const paragraphs: string[] = [];
  let paragraph = '';
  let previousEnd: number | undefined;

  segments.forEach((segment) => {
    const text = normalizeTranscriptSpacing(segment.text);
    if (!text) return;

    const gap =
      typeof previousEnd === 'number' && typeof segment.start === 'number'
        ? segment.start - previousEnd
        : 0;
    const shouldBreak = Boolean(paragraph) && (gap >= 1.2 || paragraph.length >= 48);

    if (shouldBreak) {
      paragraphs.push(paragraph);
      paragraph = text;
    } else {
      paragraph = combineTranscript(paragraph, text);
    }

    previousEnd = typeof segment.end === 'number' ? segment.end : previousEnd;
  });

  if (paragraph) paragraphs.push(paragraph);
  return paragraphs;
};

const formatTranscriptionForDisplay = (
  text = '',
  segments?: AudioTranscriptionSegment[]
): string => {
  const paragraphSources =
    segments && segments.length > 0
      ? groupTranscriptSegments(segments)
      : normalizeTranscriptSpacing(text)
          .split(/\n+/)
          .map((paragraph) => paragraph.trim())
          .filter(Boolean);

  const paragraphs = paragraphSources
    .map((paragraph) => formatTranscriptParagraph(paragraph))
    .filter(Boolean);

  if (paragraphs.length > 0) {
    return paragraphs.join('\n\n');
  }

  return formatTranscriptParagraph(text);
};

const getBrowserAudioTranscriptionSupport = (): BrowserAudioTranscriptionSupport => {
  if (Capacitor.getPlatform() === 'ios') {
    return {
      supported: false,
      reason: 'iOS WebView 里没有浏览器语音识别兜底，请先配置 AIHubMix 云端转写。',
    };
  }

  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      supported: false,
      reason: '当前环境没有可用的浏览器语音识别能力，请先配置 AIHubMix 云端转写。',
    };
  }

  const userAgent = navigator.userAgent || '';
  const isChromeLike = /\b(?:Chrome|Chromium)\/\d+/i.test(userAgent);
  const isUnsupportedShell = /\b(?:Edg|OPR|Electron|DuckDuckGo|YaBrowser|QQBrowser|UCBrowser|SamsungBrowser)\b/i
    .test(userAgent);

  if (!isChromeLike || isUnsupportedShell) {
    return {
      supported: false,
      reason: 'Web 预览里的历史语音本地转写目前只建议在桌面 Chrome 使用；当前环境请优先配置 AIHubMix 云端转写。',
    };
  }

  const SpeechRecognitionCtor =
    (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;
  const AudioContextCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!SpeechRecognitionCtor || !AudioContextCtor) {
    return {
      supported: false,
      reason: '当前 Chrome 环境缺少历史语音识别所需能力，请先配置 AIHubMix 云端转写。',
    };
  }

  return {
    supported: true,
    reason: `浏览器本地转写仅建议用于 ${MAX_BROWSER_AUDIO_TRANSCRIPTION_DURATION_SEC} 秒内的短语音`,
  };
};

const createAudioBufferSegment = (
  audioContext: AudioContext,
  audioBuffer: AudioBuffer,
  startSecond: number,
  endSecond: number,
  options?: { mono?: boolean }
): AudioBuffer => {
  const startFrame = Math.max(0, Math.floor(startSecond * audioBuffer.sampleRate));
  const endFrame = Math.min(audioBuffer.length, Math.ceil(endSecond * audioBuffer.sampleRate));
  const frameLength = Math.max(1, endFrame - startFrame);
  const mono = Boolean(options?.mono);
  const segment = audioContext.createBuffer(
    mono ? 1 : audioBuffer.numberOfChannels,
    frameLength,
    audioBuffer.sampleRate
  );

  if (mono) {
    const targetChannelData = segment.getChannelData(0);
    const channelCount = Math.max(audioBuffer.numberOfChannels, 1);

    for (let channel = 0; channel < channelCount; channel += 1) {
      const sourceChannelData = audioBuffer.getChannelData(channel);
      for (let frame = 0; frame < frameLength; frame += 1) {
        targetChannelData[frame] += (sourceChannelData[startFrame + frame] ?? 0) / channelCount;
      }
    }

    return segment;
  }

  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel += 1) {
    segment.getChannelData(channel).set(
      audioBuffer.getChannelData(channel).subarray(startFrame, endFrame)
    );
  }

  return segment;
};

const wait = (durationMs: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  });

const encodeAudioBufferAsWav = (audioBuffer: AudioBuffer): Blob => {
  const channelCount = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const frameCount = audioBuffer.length;
  const bytesPerSample = 2;
  const blockAlign = channelCount * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const wavBuffer = new ArrayBuffer(44 + frameCount * blockAlign);
  const view = new DataView(wavBuffer);
  const channels = Array.from({ length: channelCount }, (_, channelIndex) =>
    audioBuffer.getChannelData(channelIndex)
  );

  const writeAscii = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + frameCount * blockAlign, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeAscii(36, 'data');
  view.setUint32(40, frameCount * blockAlign, true);

  let offset = 44;
  for (let frame = 0; frame < frameCount; frame += 1) {
    for (let channel = 0; channel < channelCount; channel += 1) {
      const sample = Math.max(-1, Math.min(1, channels[channel][frame] ?? 0));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([wavBuffer], { type: 'audio/wav' });
};

const transcribeAudioSegmentInBrowser = async (
  audioContext: AudioContext,
  audioBuffer: AudioBuffer,
  onProgress: (text: string) => void
): Promise<string> => {
  const SpeechRecognitionCtor =
    (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;

  if (!SpeechRecognitionCtor) {
    throw new Error('当前浏览器不支持历史语音转文字；请改用支持语音识别的浏览器，或在设置里配置 AIHubMix 云端转写。');
  }

  const destination = audioContext.createMediaStreamDestination();
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(destination);

  const track = destination.stream.getAudioTracks()[0];
  if (!track) throw new Error('当前浏览器无法读取音频轨道。');

  return new Promise<string>((resolve, reject) => {
    const recognition = new SpeechRecognitionCtor();
    let settled = false;
    let sourceStarted = false;
    let sourceEnded = false;
    let finishedBySource = false;
    let restartCount = 0;
    let settledText = '';
    let sessionFinalText = '';
    let sessionPartialText = '';
    let lastError: Error | undefined;
    let fatalError = false;

    const visibleText = () =>
      combineTranscript(settledText, combineTranscript(sessionFinalText, sessionPartialText));

    const cleanup = () => {
      if (settled) return;
      settled = true;
      try {
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        recognition.onnomatch = null;
        recognition.abort?.();
      } catch {
        // Ignore cleanup failures.
      }
      try {
        if (sourceStarted && !sourceEnded) source.stop(0);
      } catch {
        // Ignore stop failures.
      }
      try {
        source.disconnect();
        destination.disconnect();
      } catch {
        // Ignore disconnect failures.
      }
      destination.stream.getTracks().forEach((item) => item.stop());
    };

    const finish = () => {
      const text = visibleText();
      cleanup();
      if (text) resolve(text);
      else reject(lastError ?? new Error('没有识别到可转写的语音内容。'));
    };

    const startRecognition = () => {
      recognition.start(track);
    };

    recognition.lang = 'zh-CN';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      let nextFinal = '';
      let nextPartial = '';
      for (let index = 0; index < event.results.length; index += 1) {
        const text = event.results[index][0]?.transcript?.trim() ?? '';
        if (!text) continue;
        if (event.results[index].isFinal) nextFinal = combineTranscript(nextFinal, text);
        else nextPartial = combineTranscript(nextPartial, text);
      }
      sessionFinalText = nextFinal;
      sessionPartialText = nextPartial;
      onProgress(visibleText());
    };
    recognition.onerror = (event) => {
      if (event.error === 'aborted' && finishedBySource) return;
      lastError = new Error(event.error ? getReadableSpeechError(event.error) : '语音转文字失败。');
      fatalError = ['audio-capture', 'language-not-supported', 'network', 'not-allowed', 'service-not-allowed']
        .includes(event.error ?? '');
    };
    recognition.onnomatch = () => {
      lastError = new Error('没有识别到可转写的语音内容。');
    };
    recognition.onend = () => {
      if (settled) return;
      settledText = combineTranscript(settledText, sessionFinalText);
      sessionFinalText = '';
      sessionPartialText = '';

      if (!finishedBySource && !fatalError && restartCount < MAX_RECOGNITION_RESTARTS_PER_SEGMENT) {
        restartCount += 1;
        try {
          startRecognition();
          return;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('语音转文字失败。');
        }
      }
      finish();
    };
    source.onended = () => {
      sourceEnded = true;
      finishedBySource = true;
      try {
        recognition.stop();
      } catch {
        finish();
      }
    };

    try {
      startRecognition();
      source.start(0);
      sourceStarted = true;
    } catch (error) {
      cleanup();
      reject(error instanceof Error ? error : new Error('当前浏览器不支持把历史音频交给语音识别。'));
    }
  });
};

const transcribeAudioWithAihubmixAdaptive = async (
  settings: AudioTranscriptionSettings,
  blob: Blob,
  options: {
    durationMs?: number;
    filename?: string;
    mimeType?: string;
    onProgress?: (text: string, detail: string) => void;
  } = {}
): Promise<AudioTranscriptionResult & { detail: string }> => {
  const durationSec =
    typeof options.durationMs === 'number' && Number.isFinite(options.durationMs)
      ? options.durationMs / 1000
      : undefined;
  const shouldChunk =
    blob.size > AIHUBMIX_AUDIO_TRANSCRIPTION_MAX_FILE_SIZE ||
    Boolean(durationSec && durationSec > AIHUBMIX_CHUNKING_MIN_DURATION_SEC);

  if (!shouldChunk) {
    const result = await transcribeAudioWithAihubmix(settings, blob, {
      model: AIHUBMIX_AUDIO_TRANSCRIPTION_MODEL,
      language: 'zh',
      temperature: 0.2,
      filename: options.filename ?? 'voice-message.webm',
      mimeType: options.mimeType,
    });

    return {
      ...result,
      detail: `AIHubMix · ${AIHUBMIX_AUDIO_TRANSCRIPTION_MODEL}`,
    };
  }

  const AudioContextCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextCtor) {
    if (blob.size <= AIHUBMIX_AUDIO_TRANSCRIPTION_MAX_FILE_SIZE) {
      const result = await transcribeAudioWithAihubmix(settings, blob, {
        model: AIHUBMIX_AUDIO_TRANSCRIPTION_MODEL,
        language: 'zh',
        temperature: 0.2,
        filename: options.filename ?? 'voice-message.webm',
        mimeType: options.mimeType,
      });

      return {
        ...result,
        detail: `AIHubMix · ${AIHUBMIX_AUDIO_TRANSCRIPTION_MODEL}`,
      };
    }

    throw new Error('当前环境无法解析长语音分段，请在支持音频解码的浏览器中重试，或缩短音频后再转写。');
  }

  const audioContext = new AudioContextCtor();
  try {
    if (audioContext.state === 'suspended') {
      await audioContext.resume().catch(() => undefined);
    }

    const decodedAudio = await audioContext.decodeAudioData((await blob.arrayBuffer()).slice(0));
    if (!Number.isFinite(decodedAudio.duration) || decodedAudio.duration <= 0) {
      throw new Error('无法解析这条语音。');
    }

    const totalSegments = Math.max(
      1,
      Math.ceil(decodedAudio.duration / AIHUBMIX_AUDIO_TRANSCRIPTION_SEGMENT_DURATION_SEC)
    );
    let transcript = '';
    const transcriptSegments: AudioTranscriptionSegment[] = [];

    for (let segmentIndex = 0; segmentIndex < totalSegments; segmentIndex += 1) {
      const startSecond = segmentIndex * AIHUBMIX_AUDIO_TRANSCRIPTION_SEGMENT_DURATION_SEC;
      const endSecond = Math.min(
        decodedAudio.duration,
        startSecond + AIHUBMIX_AUDIO_TRANSCRIPTION_SEGMENT_DURATION_SEC
      );
      const detail = `AIHubMix 正在转写第 ${segmentIndex + 1}/${totalSegments} 段...`;
      options.onProgress?.(formatTranscriptionForDisplay(transcript, transcriptSegments), detail);

      const segment = createAudioBufferSegment(audioContext, decodedAudio, startSecond, endSecond, {
        mono: true,
      });
      const wavBlob = encodeAudioBufferAsWav(segment);
      const segmentResult = await transcribeAudioWithAihubmix(settings, wavBlob, {
        model: AIHUBMIX_AUDIO_TRANSCRIPTION_MODEL,
        language: 'zh',
        temperature: 0.2,
        filename: `${(options.filename ?? 'voice-message').replace(/\.[^.]+$/, '')}-${segmentIndex + 1}.wav`,
        mimeType: 'audio/wav',
      });

      transcript = combineTranscript(transcript, segmentResult.text);
      if (segmentResult.segments && segmentResult.segments.length > 0) {
        transcriptSegments.push(
          ...segmentResult.segments.map((item) => ({
            start: typeof item.start === 'number' ? item.start + startSecond : startSecond,
            end: typeof item.end === 'number' ? item.end + startSecond : endSecond,
            text: item.text,
          }))
        );
      } else if (segmentResult.text) {
        transcriptSegments.push({
          start: startSecond,
          end: endSecond,
          text: segmentResult.text,
        });
      }
      options.onProgress?.(formatTranscriptionForDisplay(transcript, transcriptSegments), detail);

      if (segmentIndex + 1 < totalSegments) {
        await wait(AIHUBMIX_AUDIO_TRANSCRIPTION_SEGMENT_COOLDOWN_MS);
      }
    }

    if (!transcript) {
      throw new Error('语音转写结果为空，请稍后再试。');
    }

    return {
      text: transcript,
      segments: transcriptSegments,
      detail: `AIHubMix · ${AIHUBMIX_AUDIO_TRANSCRIPTION_MODEL} · ${totalSegments} 段`,
    };
  } catch (error) {
    if (blob.size <= AIHUBMIX_AUDIO_TRANSCRIPTION_MAX_FILE_SIZE) {
      const result = await transcribeAudioWithAihubmix(settings, blob, {
        model: AIHUBMIX_AUDIO_TRANSCRIPTION_MODEL,
        language: 'zh',
        temperature: 0.2,
        filename: options.filename ?? 'voice-message.webm',
        mimeType: options.mimeType,
      });

      return {
        ...result,
        detail: `AIHubMix · ${AIHUBMIX_AUDIO_TRANSCRIPTION_MODEL}`,
      };
    }

    throw error instanceof Error ? error : new Error('语音转写失败，请稍后再试。');
  } finally {
    await audioContext.close().catch(() => undefined);
  }
};

const transcribeAudioBlobInBrowser = async (
  blob: Blob,
  onProgress?: (text: string, detail: string) => void
): Promise<AudioTranscriptionResult> => {
  const support = getBrowserAudioTranscriptionSupport();
  if (!support.supported) {
    throw new Error(
      support.reason ?? '当前环境没有可用的浏览器语音识别能力，请先配置 AIHubMix 云端转写。'
    );
  }

  const AudioContextCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextCtor) {
    throw new Error('当前浏览器不支持历史语音转文字；请改用支持语音识别的浏览器，或在设置里配置 AIHubMix 云端转写。');
  }

  const audioContext = new AudioContextCtor();
  try {
    if (audioContext.state === 'suspended') {
      await audioContext.resume().catch(() => undefined);
    }

    const audioBuffer = await audioContext.decodeAudioData((await blob.arrayBuffer()).slice(0));
    if (!Number.isFinite(audioBuffer.duration) || audioBuffer.duration <= 0) {
      throw new Error('无法解析这条语音。');
    }
    if (audioBuffer.duration > MAX_AUDIO_TRANSCRIPTION_DURATION_SEC) {
      throw new Error('当前版本最长支持 5 分钟内的语音转文字。');
    }
    if (audioBuffer.duration > MAX_BROWSER_AUDIO_TRANSCRIPTION_DURATION_SEC) {
      throw new Error(
        `浏览器本地转写目前只建议用于 ${MAX_BROWSER_AUDIO_TRANSCRIPTION_DURATION_SEC} 秒内的短语音；较长语音请改用 AIHubMix 云端转写。`
      );
    }

    const totalSegments = Math.max(
      1,
      Math.ceil(audioBuffer.duration / BROWSER_AUDIO_TRANSCRIPTION_SEGMENT_DURATION_SEC)
    );
    let transcript = '';
    const transcriptSegments: AudioTranscriptionSegment[] = [];

    for (let segmentIndex = 0; segmentIndex < totalSegments; segmentIndex += 1) {
      const startSecond = segmentIndex * BROWSER_AUDIO_TRANSCRIPTION_SEGMENT_DURATION_SEC;
      const endSecond = Math.min(
        audioBuffer.duration,
        startSecond + BROWSER_AUDIO_TRANSCRIPTION_SEGMENT_DURATION_SEC
      );
      const detail = `正在识别第 ${segmentIndex + 1}/${totalSegments} 段`;
      const segment = createAudioBufferSegment(audioContext, audioBuffer, startSecond, endSecond);

      onProgress?.(formatTranscriptionForDisplay(transcript, transcriptSegments), detail);
      try {
        const segmentText = await transcribeAudioSegmentInBrowser(audioContext, segment, (partialText) => {
          onProgress?.(
            formatTranscriptionForDisplay(combineTranscript(transcript, partialText), transcriptSegments),
            detail
          );
        });
        transcript = combineTranscript(transcript, segmentText);
        transcriptSegments.push({
          start: startSecond,
          end: endSecond,
          text: segmentText,
        });
        onProgress?.(formatTranscriptionForDisplay(transcript, transcriptSegments), detail);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!/没有识别/.test(message)) throw error;
      }

      if (segmentIndex + 1 < totalSegments) {
        await wait(BROWSER_AUDIO_TRANSCRIPTION_SEGMENT_COOLDOWN_MS);
      }
    }

    if (!transcript) throw new Error('没有识别到可转写的语音内容。');
    return {
      text: transcript,
      segments: transcriptSegments,
    };
  } finally {
    await audioContext.close().catch(() => undefined);
  }
};

const canTranscribeAudioInBrowser = (): boolean => {
  return getBrowserAudioTranscriptionSupport().supported;
};

const getAudioTranscriptionSupportLabel = (settings: AudioTranscriptionSettings): string => {
  if (hasAihubmixAudioTranscription(settings)) {
    return `已启用 AIHubMix 云端转写 · ${AIHUBMIX_AUDIO_TRANSCRIPTION_MODEL}`;
  }

  return getBrowserAudioTranscriptionSupport().reason ??
    '当前环境没有可用的语音转文字能力，请先配置 AIHubMix 云端转写。';
};

const loadStringArray = (key: string): string[] => {
  try {
    const value = window.localStorage.getItem(key);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
};

const saveStringArray = (key: string, value: string[]) => {
  window.localStorage.setItem(key, JSON.stringify(Array.from(new Set(value))));
};

const loadFavoriteMessages = (): Record<string, string[]> => {
  try {
    const value = window.localStorage.getItem(favoriteMessagesKey);
    const parsed = value ? JSON.parse(value) : {};
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string[]>) : {};
  } catch {
    return {};
  }
};

const saveFavoriteMessages = (value: Record<string, string[]>) => {
  window.localStorage.setItem(favoriteMessagesKey, JSON.stringify(value));
};

const loadFavoriteMessageSnapshots = (): Record<string, StoredFavoriteMessageSnapshot> => {
  try {
    const value = window.localStorage.getItem(favoriteMessageSnapshotsKey);
    const parsed = value ? JSON.parse(value) : {};
    if (!parsed || typeof parsed !== 'object') return {};

    return Object.fromEntries(
      Object.entries(parsed).filter(([, item]) => {
        if (!item || typeof item !== 'object') return false;
        const record = item as Partial<StoredFavoriteMessageSnapshot>;
        return (
          typeof record.roomId === 'string' &&
          typeof record.roomName === 'string' &&
          typeof record.capturedAt === 'number' &&
          record.message &&
          typeof record.message === 'object'
        );
      })
    ) as Record<string, StoredFavoriteMessageSnapshot>;
  } catch {
    return {};
  }
};

const saveFavoriteMessageSnapshots = (value: Record<string, StoredFavoriteMessageSnapshot>) => {
  window.localStorage.setItem(favoriteMessageSnapshotsKey, JSON.stringify(value));
};

const loadCustomEmojiSnapshot = (): CustomEmojiItem[] => {
  try {
    const value = window.localStorage.getItem(customEmojiSnapshotKey);
    const parsed = value ? JSON.parse(value) : [];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => {
        if (!item || typeof item !== 'object') return undefined;
        const record = item as Partial<CustomEmojiItem>;
        const usage = Array.isArray(record.usage)
          ? record.usage.filter(
              (entry): entry is CustomEmojiUsage => entry === 'emoticon' || entry === 'sticker'
            )
          : [];
        if (
          typeof record.id !== 'string' ||
          typeof record.packId !== 'string' ||
          typeof record.shortcode !== 'string' ||
          typeof record.body !== 'string' ||
          typeof record.packName !== 'string' ||
          typeof record.mxcUrl !== 'string'
        ) {
          return undefined;
        }

        return {
          ...record,
          usage: usage.length > 0 ? usage : ['emoticon', 'sticker'],
        } as CustomEmojiItem;
      })
      .filter((item): item is CustomEmojiItem => Boolean(item))
      .slice(0, MAX_CUSTOM_EMOJI_SNAPSHOT_ITEMS);
  } catch {
    return [];
  }
};

const saveCustomEmojiSnapshot = (items: CustomEmojiItem[]) => {
  if (items.length === 0) {
    window.localStorage.removeItem(customEmojiSnapshotKey);
    return;
  }
  window.localStorage.setItem(
    customEmojiSnapshotKey,
    JSON.stringify(items.slice(0, MAX_CUSTOM_EMOJI_SNAPSHOT_ITEMS))
  );
};

const clearCustomEmojiSnapshot = () => {
  window.localStorage.removeItem(customEmojiSnapshotKey);
};

const getFavoriteSnapshotKey = (roomId: string, eventId: string): string => `${roomId}|${eventId}`;

const cloneFavoriteSnapshotMessage = (message: ChatMessage): ChatMessage => {
  try {
    return typeof structuredClone === 'function'
      ? structuredClone(message)
      : (JSON.parse(JSON.stringify(message)) as ChatMessage);
  } catch {
    return {
      ...message,
      attachment: message.attachment ? { ...message.attachment } : undefined,
      replyTo: message.replyTo ? { ...message.replyTo } : undefined,
      reactions: message.reactions.map((reaction) => ({
        ...reaction,
        reactors: reaction.reactors.map((reactor) => ({ ...reactor })),
      })),
      readReceipts: message.readReceipts.map((receipt) => ({ ...receipt })),
      favoriteSource: message.favoriteSource ? { ...message.favoriteSource } : undefined,
      forwardContent: message.forwardContent ? { ...message.forwardContent } : undefined,
    };
  }
};

const buildStoredFavoriteMessageSnapshot = (
  message: ChatMessage,
  room?: RoomSummary
): StoredFavoriteMessageSnapshot => ({
  roomId: room?.id ?? message.roomId,
  roomName: room?.name ?? message.favoriteSource?.roomName ?? '未知房间',
  roomAvatarUrl: room?.avatarUrl ?? message.favoriteSource?.roomAvatarUrl,
  roomDirect: room?.direct ?? false,
  roomSpace: room?.space ?? false,
  roomEncrypted: room?.encrypted ?? message.encrypted,
  roomMemberCount: room?.memberCount ?? 0,
  capturedAt: Date.now(),
  message: cloneFavoriteSnapshotMessage(message),
});

const buildFavoriteSnapshotRoomSummary = (snapshot: StoredFavoriteMessageSnapshot): RoomSummary => ({
  id: snapshot.roomId,
  name: snapshot.roomName,
  canonicalAlias: undefined,
  topic: undefined,
  avatarUrl: snapshot.roomAvatarUrl,
  parentSpaceIds: [],
  encrypted: snapshot.roomEncrypted,
  notificationMode: 'default',
  muted: false,
  direct: snapshot.roomDirect,
  space: snapshot.roomSpace,
  membership: 'join',
  unread: 0,
  highlight: 0,
  memberCount: snapshot.roomMemberCount,
  lastMessage: getReadableMessageBody(snapshot.message.body || snapshot.message.attachment?.name || '附件消息'),
  lastTs: snapshot.message.timestamp,
});

const loadRoomDrafts = (): Record<string, string> => {
  try {
    const value = window.localStorage.getItem(roomDraftsKey);
    const parsed = value ? JSON.parse(value) : {};
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
};

const saveRoomDrafts = (value: Record<string, string>) => {
  window.localStorage.setItem(roomDraftsKey, JSON.stringify(value));
};

const loadPreferences = (): AppPreferences => {
  try {
    const value = window.localStorage.getItem(appPreferencesKey);
    const parsed = value ? (JSON.parse(value) as Partial<AppPreferences>) : {};
    return {
      appearance: parsed.appearance === 'dark' ? 'dark' : 'light',
      density: parsed.density === 'compact' ? 'compact' : 'comfortable',
      readReceiptAvatarCount: clampReadReceiptAvatarCount(parsed.readReceiptAvatarCount),
      sendReadReceipts: parsed.sendReadReceipts !== false,
    };
  } catch {
    return {
      appearance: 'light',
      density: 'comfortable',
      readReceiptAvatarCount: 7,
      sendReadReceipts: true,
    };
  }
};

const savePreferences = (value: AppPreferences) => {
  window.localStorage.setItem(appPreferencesKey, JSON.stringify(value));
};

const isPrimaryView = (value: unknown): value is PrimaryView =>
  typeof value === 'string' && primaryViewValues.includes(value as PrimaryView);

const isMobilePane = (value: unknown): value is MobilePane =>
  typeof value === 'string' && mobilePaneValues.includes(value as MobilePane);

const loadResumeState = (): ResumeState => {
  try {
    const value = window.localStorage.getItem(resumeStateKey);
    const parsed = value ? (JSON.parse(value) as Partial<ResumeState>) : undefined;
    const selectedRoomId = typeof parsed?.selectedRoomId === 'string' ? parsed.selectedRoomId : undefined;
    return {
      activeView: isPrimaryView(parsed?.activeView) ? parsed.activeView : 'home',
      mobilePane: isMobilePane(parsed?.mobilePane) ? parsed.mobilePane : selectedRoomId ? 'chat' : 'list',
      selectedRoomId,
      updatedAt: typeof parsed?.updatedAt === 'number' ? parsed.updatedAt : 0,
    };
  } catch {
    return {
      activeView: 'home',
      mobilePane: 'list',
      selectedRoomId: undefined,
      updatedAt: 0,
    };
  }
};

const saveResumeState = (value: ResumeState) => {
  window.localStorage.setItem(resumeStateKey, JSON.stringify(value));
};

const clearResumeState = () => {
  window.localStorage.removeItem(resumeStateKey);
};

const loadPendingNativeCaptureIntent = (): PendingNativeCaptureIntent | undefined => {
  try {
    const value = window.localStorage.getItem(pendingNativeCaptureIntentKey);
    const parsed = value ? (JSON.parse(value) as Partial<PendingNativeCaptureIntent>) : undefined;
    if (!parsed || (parsed.kind !== 'photo' && parsed.kind !== 'video')) return undefined;
    if (
      typeof parsed.startedAt !== 'number' ||
      Date.now() - parsed.startedAt > PENDING_NATIVE_CAPTURE_INTENT_MAX_AGE_MS
    ) {
      window.localStorage.removeItem(pendingNativeCaptureIntentKey);
      return undefined;
    }
    return {
      kind: parsed.kind,
      startedAt: parsed.startedAt,
    };
  } catch {
    return undefined;
  }
};

const savePendingNativeCaptureIntent = (value: PendingNativeCaptureIntent) => {
  window.localStorage.setItem(pendingNativeCaptureIntentKey, JSON.stringify(value));
};

const clearPendingNativeCaptureIntent = () => {
  window.localStorage.removeItem(pendingNativeCaptureIntentKey);
};

const initials = (name: string): string => {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  if (trimmed.startsWith('@')) return trimmed.slice(1, 3).toUpperCase();
  return Array.from(trimmed).slice(0, 2).join('').toUpperCase();
};

const normalizeUserId = (value: string, fallbackServer?: string): string => {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith('@') || !fallbackServer) return trimmed;
  return `@${trimmed}:${fallbackServer}`;
};

const normalizeServerName = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return url.host;
  } catch {
    return trimmed.replace(/^https?:\/\//i, '').replace(/\/.*$/g, '').replace(/:+$/g, '');
  }
};

const createLocalId = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const trimToUndefined = (value: string): string | undefined => {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const parseExploreTagDraft = (value: string): string[] | undefined => {
  const tags = value
    .split(/[,\n，]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
  return tags.length > 0 ? Array.from(new Set(tags)) : undefined;
};

const createEmptyExploreSourceDraft = (
  kind: ExploreSourceKind = 'nav'
): ExploreSourceEditorDraft => ({
  kind,
  title: '',
  value: '',
  description: '',
});

const toExploreSourceDraft = (source: ExploreSource): ExploreSourceEditorDraft => ({
  kind: source.kind,
  title: source.title,
  value: source.kind === 'nav' ? source.value || source.title : source.value,
  description: source.description ?? '',
});

const createEmptyExploreCardDraft = (): ExploreNavCardEditorDraft => ({
  title: '',
  url: '',
  description: '',
  iconUrl: '',
  tags: '',
});

const toExploreCardDraft = (card: ExploreNavCard): ExploreNavCardEditorDraft => ({
  title: card.title,
  url: card.url,
  description: card.description ?? '',
  iconUrl: card.iconUrl ?? '',
  tags: card.tags?.join(', ') ?? '',
});

const getCinnyFavoritesRoomId = (client: MatrixClient | undefined, rooms: RoomSummary[]): string | undefined => {
  const accountData = (client as unknown as {
    getAccountData?: (eventType: string) => { getContent?: () => unknown } | undefined;
  })?.getAccountData?.('in.cinny.favorites');
  const content = accountData?.getContent?.();
  const accountRoomId =
    content && typeof content === 'object' && typeof (content as Record<string, unknown>).roomId === 'string'
      ? String((content as Record<string, unknown>).roomId).trim()
      : '';

  if (accountRoomId && rooms.some((room) => room.id === accountRoomId && room.membership === 'join')) {
    return accountRoomId;
  }

  return rooms.find((room) => room.membership === 'join' && room.name.trim() === '我的收藏')?.id;
};

const serverFromUserId = (userId?: string): string | undefined => userId?.split(':')[1];

const extractMentionUserIds = (body: string, members: RoomMemberSummary[]): string[] =>
  Array.from(new Set(findMentionMatches(body, members).map((match) => match.member.id)));

const getTrailingMentionQuery = (value: string): string | undefined => {
  const match = value.match(/(?:^|\s)@([^\s@:]{0,32})$/);
  return match ? match[1].toLowerCase() : undefined;
};

const buildMatrixPermalink = (room: Pick<RoomSummary, 'id' | 'canonicalAlias'>, eventId?: string): string => {
  const roomPart = encodeURIComponent(room.canonicalAlias ?? room.id);
  const eventPart = eventId ? `/${encodeURIComponent(eventId)}` : '';
  return `https://matrix.to/#/${roomPart}${eventPart}`;
};

const buildUserPermalink = (userId: string): string => buildMatrixUserHref(userId);

const localPartFromUserId = (userId?: string): string | undefined => {
  if (!userId) return undefined;
  const withoutSigil = userId.startsWith('@') ? userId.slice(1) : userId;
  return withoutSigil.split(':')[0] || undefined;
};

const memberRoleLabel = (powerLevel = 0): string => {
  if (powerLevel >= 100) return '管理员';
  if (powerLevel >= 50) return '版主';
  if (powerLevel > 0) return `权限 ${powerLevel}`;
  return '成员';
};

const memberMembershipLabel = (membership?: string): string => {
  if (membership === 'join') return '已加入';
  if (membership === 'invite') return '已邀请';
  if (membership === 'leave') return '已离开';
  if (membership === 'ban') return '已封禁';
  if (membership === 'knock') return '正在敲门';
  return membership || '未知';
};

type EmojiTrayTab = 'emoji' | 'sticker';

type EmojiCollection =
  | {
      id: string;
      name: string;
      kind: 'unicode';
      items: string[];
    }
  | {
      id: string;
      name: string;
      kind: 'pack';
      items: CustomEmojiItem[];
      cover?: CustomEmojiItem;
    };

const compactMediaEdgePx = 320;
const timelinePinnedThresholdPx = 84;
const scrollToLatestThresholdPx = 180;
const previewSnapToFitZoomThreshold = 1.05;
const previewMaxZoom = 4;
const previewToolbarZoomFactor = 1.12;
const previewWheelZoomSensitivity = 0.0012;
const iosEdgeBackGestureZonePx = 28;
const iosBackGestureTriggerPx = 72;
const iosBackGestureVisualDistancePx = 120;
const composerCollapsedMinHeightPx = 42;
const composerCollapsedMaxHeightPx = 96;
const composerAttachmentInputIds = {
  file: 'composer-attachment-file',
  image: 'composer-attachment-image',
  video: 'composer-attachment-video',
  cameraImage: 'composer-attachment-camera-image',
  cameraVideo: 'composer-attachment-camera-video',
  audioCapture: 'composer-attachment-audio-capture',
} as const;

const isCompactMediaAsset = (width?: number, height?: number): boolean =>
  typeof width === 'number' &&
  typeof height === 'number' &&
  Math.max(width, height) <= compactMediaEdgePx;

const isStickerLikeMessage = (message: ChatMessage): boolean =>
  message.eventType === 'm.sticker' ||
  (message.attachment?.kind === 'image' &&
    isCompactMediaAsset(message.attachment.width, message.attachment.height));

function ExpandComposerIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false">
      <path
        d="M7 3H3v4M13 3h4v4M3 13v4h4M17 13v4h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const expiredSessionMessage = '当前登录已失效，请重新登录';
const invalidSessionErrorPattern = /M_UNKNOWN_TOKEN|Token is not active|Unknown token/i;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isUnauthorizedStatus = (value: unknown): boolean => value === 401 || value === '401';

const isMatrixSessionExpiredError = (error: unknown): boolean => {
  if (typeof error === 'string') {
    return invalidSessionErrorPattern.test(error);
  }

  if (error instanceof Error && invalidSessionErrorPattern.test(error.message)) {
    return true;
  }

  if (!isRecord(error)) {
    return false;
  }

  if (error.errcode === 'M_UNKNOWN_TOKEN') {
    return true;
  }

  const data = isRecord(error.data) ? error.data : undefined;

  if (data?.errcode === 'M_UNKNOWN_TOKEN') {
    return true;
  }

  if (invalidSessionErrorPattern.test(String(error.message ?? ''))) {
    return true;
  }

  if (invalidSessionErrorPattern.test(String(data?.error ?? data?.message ?? ''))) {
    return true;
  }

  return [
    error.httpStatus,
    error.statusCode,
    error.status,
    data?.httpStatus,
    data?.statusCode,
    data?.status,
  ].some(isUnauthorizedStatus);
};

export function App() {
  const initialResumeStateRef = useRef<ResumeState>();
  if (!initialResumeStateRef.current) {
    initialResumeStateRef.current = loadResumeState();
  }
  const initialResumeState = initialResumeStateRef.current;
  const runtimeStopRef = useRef<(() => void) | undefined>();
  const runtimeSessionCleanupRef = useRef<(() => void) | undefined>();
  const sessionExpiryHandledRef = useRef(false);
  const speechRecognitionRef = useRef<SpeechRecognitionLike | undefined>();
  const mediaRecorderRef = useRef<MediaRecorder | undefined>();
  const mediaRecorderStreamRef = useRef<MediaStream | undefined>();
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | undefined>(undefined);
  const recordingCancelledRef = useRef(false);
  const audioCaptureInputRef = useRef<HTMLInputElement | null>(null);
  const composerInputRef = useRef<HTMLTextAreaElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const emojiTrayRef = useRef<HTMLDivElement | null>(null);
  const emojiToggleButtonRef = useRef<HTMLButtonElement | null>(null);
  const loadingOlderRef = useRef(false);
  const autoScrollToBottomRef = useRef(true);
  const composerBottomLockRef = useRef(false);
  const suppressAutoLoadOlderRef = useRef(false);
  const initialRoomScrollRoomIdRef = useRef<string>();
  const initialRoomScrollFrameRef = useRef<number>();
  const initialRoomScrollSettleTimeoutRef = useRef<number>();
  const pinnedTimelineFrameRef = useRef<number>();
  const pinnedTimelineSettleTimeoutRef = useRef<number>();
  const paginationAnchorRef = useRef<
    {
      roomId: string;
      scrollTop: number;
      scrollHeight: number;
      messageId?: string;
      messageOffsetTop?: number;
      stabilizationFrames: number;
      animationFrameId?: number;
    } | undefined
  >(undefined);
  const sheetRef = useRef<Sheet>(undefined);
  const mobilePaneRef = useRef<MobilePane>(initialResumeState.mobilePane);
  const previewMediaRef = useRef<RoomMediaItem | undefined>(undefined);
  const activeViewRef = useRef<PrimaryView>(initialResumeState.activeView);
  const previousActiveViewRef = useRef<PrimaryView>(initialResumeState.activeView);
  const appFrameRef = useRef<HTMLElement | null>(null);
  const iosEdgeBackGestureRef = useRef<
    | {
        identifier: number;
        startX: number;
        startY: number;
        engaged: boolean;
      }
    | undefined
  >(undefined);
  const iosEdgeBackResetTimeoutRef = useRef<number | undefined>(undefined);
  const autoReadKeyRef = useRef<string>();
  const typingTimeoutRef = useRef<number | undefined>(undefined);
  const typingActiveRef = useRef(false);
  const roomDraftCommitTimeoutRef = useRef<number | undefined>(undefined);
  const pendingRoomDraftCommitRef = useRef<{ roomId: string; value: string }>();
  const warmedMediaKeysRef = useRef<Set<string>>(new Set());
  const warmedMemberAvatarRoomIdsRef = useRef<Set<string>>(new Set());
  const lastMatrixActivityAtRef = useRef(Date.now());
  const syncStateRef = useRef<SyncState | null>(null);
  const matrixReconnectInFlightRef = useRef(false);
  const [bootState, setBootState] = useState<BootState>('booting');
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [session, setSession] = useState<StoredMatrixSession>();
  const [client, setClient] = useState<MatrixClient>();
  const [snapshot, setSnapshot] = useState<MatrixSnapshot>(emptySnapshot);
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [connectionTick, setConnectionTick] = useState(0);
  const [selectedRoomId, setSelectedRoomId] = useState<string | undefined>(() => initialResumeState.selectedRoomId);
  const [activeView, setActiveView] = useState<PrimaryView>(() => initialResumeState.activeView);
  const [mobilePane, setMobilePane] = useState<MobilePane>(() => initialResumeState.mobilePane);
  const [sheet, setSheet] = useState<Sheet>();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [roomQuery, setRoomQuery] = useState('');
  const [roomFilter, setRoomFilter] = useState<RoomFilter>('all');
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>();
  const [messageQuery, setMessageQuery] = useState('');
  const [messageSearchOpen, setMessageSearchOpen] = useState(false);
  const [messageDraft, setMessageDraft] = useState('');
  const [composerExpanded, setComposerExpanded] = useState(false);
  const [composerTextareaHeight, setComposerTextareaHeight] = useState(composerCollapsedMinHeightPx);
  const [composerCanExpand, setComposerCanExpand] = useState(false);
  const [composerMode, setComposerMode] = useState<ComposerMode>({ type: 'normal' });
  const [attachmentPickerOpen, setAttachmentPickerOpen] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string>();
  const [editingMessageDraft, setEditingMessageDraft] = useState('');
  const [savingInlineEdit, setSavingInlineEdit] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [voiceRecordingMs, setVoiceRecordingMs] = useState(0);
  const [recordingCancelled, setRecordingCancelled] = useState(false);
  const [selectedRoomReceiptTick, setSelectedRoomReceiptTick] = useState(0);
  const [showScrollToLatest, setShowScrollToLatest] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [deviceName, setDeviceName] = useState('iPhone');
  const [favoriteRoomIds, setFavoriteRoomIds] = useState<string[]>(() => loadStringArray(favoriteRoomsKey));
  const [favoriteMessageIds, setFavoriteMessageIds] = useState<Record<string, string[]>>(
    () => loadFavoriteMessages()
  );
  const [favoriteMessageSnapshots, setFavoriteMessageSnapshots] = useState<
    Record<string, StoredFavoriteMessageSnapshot>
  >(() => loadFavoriteMessageSnapshots());
  const [roomDrafts, setRoomDrafts] = useState<Record<string, string>>(() => loadRoomDrafts());
  const [preferences, setPreferences] = useState<AppPreferences>(() => loadPreferences());
  const [audioTranscriptionSettings, setAudioTranscriptionSettings] = useState<AudioTranscriptionSettings>(() =>
    loadAudioTranscriptionSettings()
  );
  const [exploreServers, setExploreServers] = useState<string[]>(() => loadStringArray(exploreServerSourcesKey));
  const [exploreSources, setExploreSources] = useState<ExploreSource[]>([]);
  const [selectedExploreSourceId, setSelectedExploreSourceId] = useState<string>();
  const [ownProfile, setOwnProfile] = useState<OwnProfile>();
  const [profileForm, setProfileForm] = useState({ displayName: '' });
  const [roomMembers, setRoomMembers] = useState<RoomMemberSummary[]>([]);
  const [typingMembers, setTypingMembers] = useState<string[]>([]);
  const [roomMediaItems, setRoomMediaItems] = useState<RoomMediaItem[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessageSummary[]>([]);
  const [customEmojiItems, setCustomEmojiItems] = useState<CustomEmojiItem[]>(() => loadCustomEmojiSnapshot());
  const [audioTranscriptions, setAudioTranscriptions] = useState<Record<string, AudioTranscriptionState>>({});
  const [previewMedia, setPreviewMedia] = useState<RoomMediaItem>();
  const [cryptoStatus, setCryptoStatus] = useState<CryptoStatus>({ cryptoReady: false });
  const [cryptoStatusReady, setCryptoStatusReady] = useState(false);
  const [pendingNativeCaptureIntent, setPendingNativeCaptureIntent] = useState<PendingNativeCaptureIntent | undefined>(
    () => loadPendingNativeCaptureIntent()
  );
  const [recoveryPassphrase, setRecoveryPassphrase] = useState('');
  const [keyRestoreProgress, setKeyRestoreProgress] = useState('');
  const [keyRestoreMessage, setKeyRestoreMessage] = useState<{ type: 'success' | 'error'; text: string }>();
  const [pendingScrollEventId, setPendingScrollEventId] = useState<string>();
  const [highlightedMessageId, setHighlightedMessageId] = useState<string>();
  const [focusedTimelineContext, setFocusedTimelineContext] = useState<FocusedTimelineContext>();
  const [roomProfileForm, setRoomProfileForm] = useState({ name: '', topic: '' });
  const [publicRooms, setPublicRooms] = useState<PublicRoomSummary[]>([]);
  const [publicSearch, setPublicSearch] = useState({ server: '', query: '' });
  const [publicLoading, setPublicLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({
    baseUrl: defaultHomeserver,
    username: '',
    password: '',
  });
  const [createForm, setCreateForm] = useState<CreateFormState>({
    mode: 'direct',
    userId: '',
    roomName: '',
    topic: '',
    roomIdOrAlias: '',
    encrypted: true,
    publicRoom: false,
  });
  const audioTranscriptionSettingsRef = useRef(audioTranscriptionSettings);
  const audioTranscriptionRemoteSignatureRef = useRef<string>();
  const audioTranscriptionApplyingRemoteSignatureRef = useRef<string>();
  const audioTranscriptionPendingSaveSignatureRef = useRef<string>();
  const audioTranscriptionHydratedRef = useRef(false);
  const pendingNativeCaptureNoticeShownRef = useRef(false);

  const currentUserServer = serverFromUserId(session?.userId);
  const isIosPlatform = Capacitor.getPlatform() === 'ios';
  const selectedExploreSource = useMemo(
    () => exploreSources.find((source) => source.id === selectedExploreSourceId) ?? exploreSources[0],
    [exploreSources, selectedExploreSourceId]
  );

  const clearIosEdgeBackResetTimeout = useCallback(() => {
    if (typeof iosEdgeBackResetTimeoutRef.current === 'number') {
      window.clearTimeout(iosEdgeBackResetTimeoutRef.current);
      iosEdgeBackResetTimeoutRef.current = undefined;
    }
  }, []);

  const setIosEdgeBackVisual = useCallback(
    (deltaX: number, active: boolean) => {
      const frame = appFrameRef.current;
      if (!frame) return;

      const progress = Math.max(0, Math.min(deltaX / iosBackGestureVisualDistancePx, 1));
      frame.dataset.edgeBackActive = active ? 'true' : 'false';
      frame.style.setProperty('--ios-edge-back-shift', `${Math.round(progress * 26)}px`);
      frame.style.setProperty('--ios-edge-back-radius', `${Math.round(progress * 18)}px`);
    },
    []
  );

  const resetIosEdgeBackVisual = useCallback(() => {
    const frame = appFrameRef.current;
    if (!frame) return;
    frame.dataset.edgeBackActive = 'false';
    frame.style.setProperty('--ios-edge-back-shift', '0px');
    frame.style.setProperty('--ios-edge-back-radius', '0px');
  }, []);

  const canPerformEdgeBackNavigation = useCallback(() => {
    if (previewMediaRef.current) return true;
    if (sheetRef.current) return true;
    if (mobilePaneRef.current === 'chat') return true;
    return activeViewRef.current !== 'home';
  }, []);

  const performEdgeBackNavigation = useCallback(() => {
    if (previewMediaRef.current) {
      setPreviewMedia(undefined);
      return true;
    }
    if (sheetRef.current) {
      setSheet(undefined);
      return true;
    }
    if (mobilePaneRef.current === 'chat') {
      setMobilePane('list');
      return true;
    }
    if (activeViewRef.current !== 'home') {
      const previousView = previousActiveViewRef.current;
      setActiveView(previousView !== activeViewRef.current ? previousView : 'home');
      setMobilePane('list');
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    sheetRef.current = sheet;
  }, [sheet]);

  useEffect(() => {
    mobilePaneRef.current = mobilePane;
  }, [mobilePane]);

  useEffect(() => {
    previewMediaRef.current = previewMedia;
  }, [previewMedia]);

  useEffect(() => {
    warmedMediaKeysRef.current.clear();
    warmedMemberAvatarRoomIdsRef.current.clear();
  }, [client]);

  useEffect(() => {
    syncStateRef.current = syncState;
  }, [syncState]);

  useEffect(() => {
    if (!client) return undefined;

    const interval = window.setInterval(() => {
      setConnectionTick((current) => current + 1);
    }, 15_000);

    return () => window.clearInterval(interval);
  }, [client]);

  useEffect(() => {
    if (activeViewRef.current !== activeView) {
      previousActiveViewRef.current = activeViewRef.current;
      activeViewRef.current = activeView;
    }
  }, [activeView]);

  useEffect(() => {
    const persistedSelectedRoomId =
      activeView === 'explore' || activeView === 'settings' ? undefined : selectedRoomId;
    saveResumeState({
      activeView,
      mobilePane: persistedSelectedRoomId ? mobilePane : 'list',
      selectedRoomId: persistedSelectedRoomId,
      updatedAt: Date.now(),
    });
  }, [activeView, mobilePane, selectedRoomId]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      if (roomDraftCommitTimeoutRef.current) {
        window.clearTimeout(roomDraftCommitTimeoutRef.current);
      }
      clearIosEdgeBackResetTimeout();
      resetIosEdgeBackVisual();
      speechRecognitionRef.current?.stop();
    };
  }, [clearIosEdgeBackResetTimeout, resetIosEdgeBackVisual]);

  const markMatrixActivity = useCallback(() => {
    lastMatrixActivityAtRef.current = Date.now();
  }, []);

  const clearPendingNativeCapture = useCallback(() => {
    clearPendingNativeCaptureIntent();
    setPendingNativeCaptureIntent(undefined);
  }, []);

  const preparePendingNativeCapture = useCallback((kind: PendingNativeCaptureIntent['kind']) => {
    const intent = {
      kind,
      startedAt: Date.now(),
    } satisfies PendingNativeCaptureIntent;
    savePendingNativeCaptureIntent(intent);
    setPendingNativeCaptureIntent(intent);
  }, []);

  const stopRuntime = useCallback(() => {
    runtimeSessionCleanupRef.current?.();
    runtimeSessionCleanupRef.current = undefined;
    runtimeStopRef.current?.();
    runtimeStopRef.current = undefined;
    setClient(undefined);
    setSnapshot(emptySnapshot);
    setSyncState(null);
    setSelectedRoomId(undefined);
    setRoomMembers([]);
    setTypingMembers([]);
    setRoomMediaItems([]);
    setPinnedMessages([]);
    setCryptoStatus({ cryptoReady: false });
    setCryptoStatusReady(false);
    setCustomEmojiItems((current) => (current.length > 0 ? current : loadCustomEmojiSnapshot()));
    setAudioTranscriptions({});
    setSelectionMode(false);
    setSelectedMessageIds([]);
    setPendingScrollEventId(undefined);
    setHighlightedMessageId(undefined);
    matrixReconnectInFlightRef.current = false;
  }, []);

  const refreshSnapshot = useCallback(
    (mx = client) => {
      if (!mx) return;
      setSnapshot(getMatrixSnapshot(mx));
    },
    [client]
  );

  const refreshCustomEmojiState = useCallback(
    (mx = client) => {
      setCustomEmojiItems(mx ? getCustomEmojiItems(mx, selectedRoomId) : []);
    },
    [client, selectedRoomId]
  );

  const handleSessionExpired = useCallback(
    async (error?: unknown, expiredSession?: StoredMatrixSession) => {
      if (sessionExpiryHandledRef.current) {
        return;
      }

      sessionExpiryHandledRef.current = true;
      stopRuntime();
      await clearStoredSession().catch(() => undefined);
      setSession(undefined);
      setBootState('signedOut');
      setNotice(undefined);
      setError(expiredSessionMessage);
      setLoginForm((current) => ({
        ...current,
        baseUrl: expiredSession?.baseUrl ?? current.baseUrl,
        username: expiredSession?.userId ?? current.username,
        password: '',
      }));

      if (!isMatrixSessionExpiredError(error) && error instanceof Error) {
        console.warn('Session expired fallback triggered by unexpected error', error);
      }
    },
    [stopRuntime]
  );

  const syncCustomEmojiState = useCallback(
    (mx = client) => {
      refreshSnapshot(mx);
      refreshCustomEmojiState(mx);
    },
    [client, refreshCustomEmojiState, refreshSnapshot]
  );

  const refreshCryptoStatus = useCallback(async (mx?: MatrixClient) => {
    if (!mx) {
      setCryptoStatus({ cryptoReady: false });
      setCryptoStatusReady(false);
      return;
    }
    try {
      setCryptoStatus(await getCryptoStatus(mx));
    } catch {
      setCryptoStatus({ cryptoReady: Boolean(mx.getCrypto()) });
    } finally {
      setCryptoStatusReady(true);
    }
  }, []);

  const connectSession = useCallback(
    async (nextSession: StoredMatrixSession) => {
      sessionExpiryHandledRef.current = false;
      stopRuntime();
      setCryptoStatusReady(false);
      setBootState('connecting');
      setError(undefined);

      try {
        await verifyStoredSession(nextSession);
        const runtime = await createMatrixRuntime(nextSession, setSnapshot, setSyncState, markMatrixActivity);

        const handleRuntimeLoggedOut = (err: Error) => {
          void handleSessionExpired(err, nextSession);
        };
        const handleRuntimeUnexpectedError = (err: Error) => {
          if (!isMatrixSessionExpiredError(err)) {
            return;
          }

          void handleSessionExpired(err, nextSession);
        };
        const handleRuntimeSyncError = (
          state: SyncState | null,
          _prevState: SyncState | null,
          data?: { error?: Error | string }
        ) => {
          if (state !== SyncState.Error || !isMatrixSessionExpiredError(data?.error)) {
            return;
          }

          void handleSessionExpired(data?.error, nextSession);
        };

        runtime.client.on(HttpApiEvent.SessionLoggedOut, handleRuntimeLoggedOut);
        runtime.client.on(ClientEvent.SyncUnexpectedError, handleRuntimeUnexpectedError);
        runtime.client.on(ClientEvent.Sync, handleRuntimeSyncError);
        runtimeSessionCleanupRef.current = () => {
          runtime.client.removeListener(HttpApiEvent.SessionLoggedOut, handleRuntimeLoggedOut);
          runtime.client.removeListener(ClientEvent.SyncUnexpectedError, handleRuntimeUnexpectedError);
          runtime.client.removeListener(ClientEvent.Sync, handleRuntimeSyncError);
        };

        runtimeStopRef.current = runtime.stop;
        setClient(runtime.client);
        setSession(nextSession);
        setBootState('signedIn');
        markMatrixActivity();
        void refreshCryptoStatus(runtime.client);
      } catch (err) {
        if (isMatrixSessionExpiredError(err)) {
          await handleSessionExpired(err, nextSession);
          return;
        }

        setError(err instanceof Error ? err.message : String(err));
        setBootState('error');
      }
    },
    [handleSessionExpired, markMatrixActivity, refreshCryptoStatus, stopRuntime]
  );

  const isMatrixConnectionHealthy = useCallback((): boolean => {
    if (!client) return false;
    if (!matrixSyncReadyStates.has(syncStateRef.current ?? SyncState.Stopped)) return false;
    return Date.now() - lastMatrixActivityAtRef.current < matrixConnectionStaleMs;
  }, [client]);

  const attemptMatrixRecovery = useCallback(
    (reason: 'manual' | 'resume' | 'online' = 'manual') => {
      if (!client || !session || bootState !== 'signedIn') return;
      if (matrixReconnectInFlightRef.current) return;

      const retryTriggered = client.retryImmediately();
      if (retryTriggered) {
        if (reason === 'manual') {
          setNotice('正在恢复 Matrix 连接');
        }
        return;
      }

      matrixReconnectInFlightRef.current = true;
      if (reason === 'manual') {
        setNotice('正在重新连接 Matrix');
      }
      void connectSession(session).finally(() => {
        matrixReconnectInFlightRef.current = false;
      });
    },
    [bootState, client, connectSession, session]
  );

  useEffect(() => {
    let mounted = true;

    void Device.getInfo()
      .then((info) => {
        if (mounted && info.model) setDeviceName(info.model);
      })
      .catch(() => undefined);

    void loadStoredSession()
      .then((storedSession) => {
        if (!mounted) return;
        if (storedSession) {
          void connectSession(storedSession);
        } else {
          setBootState('signedOut');
        }
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : String(err));
        setBootState('error');
      });

    const backButton = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      if (performEdgeBackNavigation()) return;
      if (canGoBack) {
        window.history.back();
      }
    });

    return () => {
      mounted = false;
      stopRuntime();
      void backButton.then((listener) => listener.remove());
    };
  }, [connectSession, performEdgeBackNavigation, stopRuntime]);

  useEffect(() => {
    if (!client || !session || bootState !== 'signedIn') return undefined;

    const recoverIfNeeded = (reason: 'resume' | 'online') => {
      if (isMatrixConnectionHealthy()) return;
      attemptMatrixRecovery(reason);
    };

    const appStateListener = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) return;
      recoverIfNeeded('resume');
    });
    const resumeListener = CapacitorApp.addListener('resume', () => {
      recoverIfNeeded('resume');
    });
    const handleOnline = () => recoverIfNeeded('online');

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
      void appStateListener.then((listener) => listener.remove());
      void resumeListener.then((listener) => listener.remove());
    };
  }, [attemptMatrixRecovery, bootState, client, isMatrixConnectionHealthy, session]);

  useEffect(() => {
    if (!pendingNativeCaptureIntent) {
      pendingNativeCaptureNoticeShownRef.current = false;
      return;
    }
    if (bootState !== 'signedIn' || pendingNativeCaptureNoticeShownRef.current) return;

    pendingNativeCaptureNoticeShownRef.current = true;
    setNotice(
      pendingNativeCaptureIntent.kind === 'video'
        ? '已从系统录像返回，正在恢复同步、加密与本地媒体缓存'
        : '已从系统相机返回，正在恢复同步、加密与本地媒体缓存'
    );

    const timeoutId = window.setTimeout(() => {
      clearPendingNativeCapture();
      pendingNativeCaptureNoticeShownRef.current = false;
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [bootState, clearPendingNativeCapture, pendingNativeCaptureIntent]);

  const handleAudioTranscriptionSettingsChange = useCallback(
    (value: AudioTranscriptionSettings) => {
      setAudioTranscriptionSettings((current) => {
        const normalized = normalizeAudioTranscriptionSettings(value);
        if (
          normalized.apiKey === current.apiKey &&
          normalized.baseUrl === current.baseUrl
        ) {
          return current;
        }

        return {
          ...normalized,
          updatedAt: Date.now(),
        };
      });
    },
    []
  );

  useEffect(() => {
    if (!client) {
      audioTranscriptionRemoteSignatureRef.current = undefined;
      audioTranscriptionApplyingRemoteSignatureRef.current = undefined;
      audioTranscriptionPendingSaveSignatureRef.current = undefined;
      audioTranscriptionHydratedRef.current = false;
      return;
    }

    const applyAccountData = (content?: ReturnType<typeof getSyncedAudioTranscriptionSettings>) => {
      const remoteSignature = content
        ? getAudioTranscriptionSettingsAccountDataSignature(content)
        : undefined;
      audioTranscriptionRemoteSignatureRef.current = remoteSignature;

      const currentSettings = audioTranscriptionSettingsRef.current;
      const nextSettings = applyAudioTranscriptionSettingsAccountData(currentSettings, content);
      const currentSignature = getAudioTranscriptionSettingsAccountDataSignature(currentSettings);
      const nextSignature = getAudioTranscriptionSettingsAccountDataSignature(nextSettings);

      if (nextSignature !== currentSignature) {
        audioTranscriptionApplyingRemoteSignatureRef.current =
          remoteSignature ?? nextSignature;
        setAudioTranscriptionSettings(nextSettings);
        return;
      }

      audioTranscriptionApplyingRemoteSignatureRef.current = undefined;
      audioTranscriptionHydratedRef.current = true;
    };

    applyAccountData(getSyncedAudioTranscriptionSettings(client));

    const handleAccountData = (event: MatrixEvent) => {
      if (event.getType() !== AUDIO_TRANSCRIPTION_ACCOUNT_DATA_EVENT_TYPE) {
        return;
      }

      applyAccountData(event.getContent() as ReturnType<typeof getSyncedAudioTranscriptionSettings>);
    };

    client.on(ClientEvent.AccountData, handleAccountData);
    return () => {
      client.removeListener(ClientEvent.AccountData, handleAccountData);
    };
  }, [client]);

  useEffect(() => {
    if (
      !client ||
      !audioTranscriptionHydratedRef.current ||
      audioTranscriptionApplyingRemoteSignatureRef.current
    ) {
      return;
    }

    const signature = getAudioTranscriptionSettingsAccountDataSignature(
      audioTranscriptionSettings
    );
    if (
      signature === audioTranscriptionRemoteSignatureRef.current ||
      signature === audioTranscriptionPendingSaveSignatureRef.current
    ) {
      return;
    }

    if (
      !audioTranscriptionRemoteSignatureRef.current &&
      isDefaultAudioTranscriptionSettings(audioTranscriptionSettings)
    ) {
      return;
    }

    audioTranscriptionPendingSaveSignatureRef.current = signature;

    void saveSyncedAudioTranscriptionSettings(client, audioTranscriptionSettings)
      .then(() => {
        audioTranscriptionRemoteSignatureRef.current = signature;
      })
      .catch(() => undefined)
      .finally(() => {
        if (audioTranscriptionPendingSaveSignatureRef.current === signature) {
          audioTranscriptionPendingSaveSignatureRef.current = undefined;
        }
      });
  }, [audioTranscriptionSettings, client]);

  const roomBuckets = useMemo<Record<RoomListView, RoomSummary[]>>(() => {
    const joined = snapshot.rooms.filter((room) => room.membership === 'join');
    const invites = snapshot.rooms.filter((room) => room.membership === 'invite');
    const nonSpace = joined.filter((room) => !room.space);
    return {
      home: nonSpace,
      direct: nonSpace.filter((room) => room.direct),
      rooms: nonSpace.filter((room) => !room.direct),
      spaces: joined.filter((room) => room.space),
      invites,
      favorites: joined.filter((room) => favoriteRoomIds.includes(room.id)),
    };
  }, [favoriteRoomIds, snapshot.rooms]);

  const visibleRooms = useMemo(() => {
    if (activeView === 'explore' || activeView === 'settings') return [];
    const baseSource = roomBuckets[activeView as RoomListView] ?? roomBuckets.home;
    const source =
      activeView === 'rooms' && roomFilter === 'spaces'
        ? selectedSpaceId
          ? roomBuckets.rooms.filter((room) => room.parentSpaceIds.includes(selectedSpaceId))
          : roomBuckets.spaces
        : baseSource;
    const filteredByMode = source.filter((room) => {
      if (roomFilter === 'unread') return room.unread > 0;
      if (roomFilter === 'mentions') return room.highlight > 0;
      return true;
    });
    const query = roomQuery.trim().toLowerCase();
    if (!query) return filteredByMode;
    return filteredByMode.filter((room) =>
      `${room.name} ${room.topic ?? ''} ${room.canonicalAlias ?? ''}`.toLowerCase().includes(query)
    );
  }, [activeView, roomBuckets, roomFilter, roomQuery, selectedSpaceId]);

  const roomFilterCounts = useMemo<Record<RoomFilter, number>>(() => {
    if (activeView === 'explore' || activeView === 'settings') {
      return { all: 0, spaces: 0, unread: 0, mentions: 0 };
    }

    const source = roomBuckets[activeView as RoomListView] ?? roomBuckets.home;
    return {
      all: source.length,
      spaces: activeView === 'rooms' ? roomBuckets.spaces.length : 0,
      unread: source.filter((room) => room.unread > 0).length,
      mentions: source.filter((room) => room.highlight > 0).length,
    };
  }, [activeView, roomBuckets]);

  const roomFilterOptions = useMemo<RoomFilter[]>(
    () => (activeView === 'rooms' ? ['all', 'spaces', 'unread', 'mentions'] : ['all', 'unread', 'mentions']),
    [activeView]
  );

  const selectedRoom = useMemo(
    () => snapshot.rooms.find((room) => room.id === selectedRoomId),
    [selectedRoomId, snapshot.rooms]
  );

  const selectedSpace = useMemo(
    () => snapshot.rooms.find((room) => room.id === selectedSpaceId && room.space),
    [selectedSpaceId, snapshot.rooms]
  );

  const roomAvatarWarmSignature = useMemo(
    () =>
      snapshot.rooms
        .map((room) => `${room.id}:${room.avatarUrl ?? ''}`)
        .join('|'),
    [snapshot.rooms]
  );

  const joinedRoomWarmSignature = useMemo(
    () =>
      snapshot.rooms
        .filter((room) => room.membership === 'join')
        .map((room) => room.id)
        .join('|'),
    [snapshot.rooms]
  );

  const matrixConnectionHealthy = useMemo(
    () => isMatrixConnectionHealthy(),
    [connectionTick, isMatrixConnectionHealthy, snapshot.version, syncState]
  );

  const matrixConnectionBanner = useMemo(() => {
    if (!client || bootState !== 'signedIn') return undefined;
    if (syncState == null) return undefined;

    if (!matrixConnectionHealthy) {
      return {
        tone: 'danger' as const,
        text: `Matrix 连接异常，当前消息可能只停留在本地。点这里立即恢复连接`,
      };
    }

    if (matrixSyncRetryStates.has(syncState ?? SyncState.Stopped)) {
      return {
        tone: syncState === SyncState.Reconnecting ? ('warning' as const) : ('danger' as const),
        text: `Matrix ${syncLabel(syncState)}中，新的消息可能会延迟送达。点这里立即恢复连接`,
      };
    }

    return undefined;
  }, [bootState, client, matrixConnectionHealthy, syncState]);

  useEffect(() => {
    if (!client || !session || bootState !== 'signedIn' || syncState == null) return undefined;
    if (typeof navigator !== 'undefined' && 'onLine' in navigator && navigator.onLine === false) {
      return undefined;
    }
    if (matrixConnectionHealthy && !matrixSyncRetryStates.has(syncState)) return undefined;

    const timeoutId = window.setTimeout(() => {
      attemptMatrixRecovery('online');
    }, matrixConnectionHealthy ? 2500 : 1200);

    return () => window.clearTimeout(timeoutId);
  }, [attemptMatrixRecovery, bootState, client, matrixConnectionHealthy, session, syncState]);

  const selectedRoomMatchesActiveView = useMemo(() => {
    if (!selectedRoom) return false;

    if (activeView === 'home') {
      return selectedRoom.membership === 'join' && !selectedRoom.space;
    }

    if (activeView === 'direct') {
      return selectedRoom.membership === 'join' && !selectedRoom.space && selectedRoom.direct;
    }

    if (activeView === 'rooms') {
      if (roomFilter === 'spaces') {
        if (!selectedSpaceId) return false;
        return (
          selectedRoom.membership === 'join' &&
          !selectedRoom.space &&
          !selectedRoom.direct &&
          selectedRoom.parentSpaceIds.includes(selectedSpaceId)
        );
      }

      return selectedRoom.membership === 'join' && !selectedRoom.space && !selectedRoom.direct;
    }

    if (activeView === 'spaces') {
      return selectedRoom.membership === 'join' && selectedRoom.space;
    }

    if (activeView === 'invites') {
      return selectedRoom.membership === 'invite';
    }

    if (activeView === 'favorites') {
      return selectedRoom.membership === 'join' && favoriteRoomIds.includes(selectedRoom.id);
    }

    return false;
  }, [activeView, favoriteRoomIds, roomFilter, selectedRoom, selectedSpaceId]);

  const activeTimelineContext = useMemo(
    () =>
      selectedRoomId && !messageQuery.trim() && focusedTimelineContext?.roomId === selectedRoomId
        ? focusedTimelineContext
        : undefined,
    [focusedTimelineContext, messageQuery, selectedRoomId]
  );

  const selectedRoomMessages = useMemo(() => {
    if (!client || !selectedRoomId) return [];
    if (activeTimelineContext) return activeTimelineContext.messages;
    return getRoomMessages(client, selectedRoomId, messageQuery);
  }, [activeTimelineContext, client, messageQuery, selectedRoomId, snapshot.version]);

  const selectedRoomInlineReadReceiptStates = useMemo(
    () =>
      client && selectedRoomId
        ? getRoomInlineReadReceiptStates(client, selectedRoomId, selectedRoomMessages)
        : new Map<string, InlineReadReceiptState>(),
    [client, selectedRoomId, selectedRoomMessages, selectedRoomReceiptTick]
  );

  const selectedForwardMessages = useMemo(
    () =>
      selectedRoomMessages.filter(
        (message) => selectedMessageIds.includes(message.id) && isForwardableMessage(message)
      ),
    [selectedMessageIds, selectedRoomMessages]
  );

  const selectedRoomPendingSendCount = useMemo(
    () =>
      selectedRoomMessages.filter(
        (message) =>
          message.mine &&
          (message.sendStatus === 'sending' ||
            message.sendStatus === 'queued' ||
            message.sendStatus === 'encrypting')
      ).length,
    [selectedRoomMessages]
  );

  const selectedRoomFailedSendCount = useMemo(
    () => selectedRoomMessages.filter((message) => message.mine && message.sendStatus === 'failed').length,
    [selectedRoomMessages]
  );

  const messageInfoMessage = useMemo(() => {
    if (!client || typeof sheet !== 'object' || !sheet || sheet.type !== 'messageInfo') {
      return undefined;
    }

    return (
      getRoomMessages(client, sheet.message.roomId).find((message) => message.id === sheet.message.id) ??
      sheet.message
    );
  }, [client, sheet, snapshot.version]);

  const messageInfoRoom = useMemo(
    () =>
      messageInfoMessage
        ? snapshot.rooms.find((room) => room.id === messageInfoMessage.roomId)
        : undefined,
    [messageInfoMessage, snapshot.rooms]
  );
  const readReceiptMessage = useMemo(() => {
    if (!client || typeof sheet !== 'object' || !sheet || sheet.type !== 'readReceipts') {
      return undefined;
    }

    return (
      getRoomMessages(client, sheet.message.roomId).find((message) => message.id === sheet.message.id) ??
      sheet.message
    );
  }, [client, sheet, snapshot.version]);
  const readReceiptInlineState = useMemo(() => {
    if (!client || !readReceiptMessage || typeof sheet !== 'object' || !sheet || sheet.type !== 'readReceipts') {
      return undefined;
    }

    return (
      getRoomInlineReadReceiptStates(client, readReceiptMessage.roomId, getRoomMessages(client, readReceiptMessage.roomId)).get(
        readReceiptMessage.id
      ) ?? sheet.inlineState
    );
  }, [client, readReceiptMessage, selectedRoomReceiptTick, sheet, snapshot.version]);

  const userProfileMember = useMemo(() => {
    if (typeof sheet !== 'object' || !sheet || sheet.type !== 'userProfile') {
      return undefined;
    }

    return roomMembers.find((member) => member.id === sheet.member.id) ?? sheet.member;
  }, [roomMembers, sheet]);

  const getMessageSenderMember = useCallback(
    (message: ChatMessage): RoomMemberSummary | undefined => {
      if (!message.sender) return undefined;
      return (
        roomMembers.find((member) => member.id === message.sender) ?? {
          id: message.sender,
          name: message.senderName ?? message.sender,
          avatarUrl: message.senderAvatarUrl,
          powerLevel: 0,
        }
      );
    },
    [roomMembers]
  );

  const openUserProfile = useCallback((member: RoomMemberSummary) => {
    setSheet({ type: 'userProfile', member });
  }, []);

  const handleOpenMessageSenderProfile = useCallback(
    (message: ChatMessage) => {
      const member = getMessageSenderMember(message);
      if (member) openUserProfile(member);
    },
    [getMessageSenderMember, openUserProfile]
  );

  const mentionSuggestions = useMemo(() => {
    if (composerMode.type !== 'normal') return [];
    const query = getTrailingMentionQuery(messageDraft);
    if (query === undefined) return [];

    return roomMembers
      .filter((member) => member.id !== session?.userId)
      .filter((member) =>
        query
          ? `${member.name} ${member.id}`.toLowerCase().includes(query)
          : true
      )
      .slice(0, 6);
  }, [composerMode.type, messageDraft, roomMembers, session?.userId]);

  const cinnyFavoritesRoomId = useMemo(
    () => getCinnyFavoritesRoomId(client, snapshot.rooms),
    [client, snapshot.rooms, snapshot.version]
  );

  const favoriteMessageItems = useMemo(() => {
    if (!client) return [];

    const localItems = Object.entries(favoriteMessageIds)
      .flatMap(([roomId, ids]) => {
        const room = snapshot.rooms.find((item) => item.id === roomId);
        const messagesById = new Map(getRoomMessages(client, roomId).map((message) => [message.id, message]));

        return ids.flatMap((id) => {
          const storedSnapshot = favoriteMessageSnapshots[getFavoriteSnapshotKey(roomId, id)];
          const fallbackRoom = room ?? (storedSnapshot ? buildFavoriteSnapshotRoomSummary(storedSnapshot) : undefined);
          const liveMessage = messagesById.get(id);
          if (liveMessage && fallbackRoom) {
            return [{ room: fallbackRoom, message: liveMessage }];
          }

          if (!storedSnapshot) return [];

          return [{ room: fallbackRoom ?? buildFavoriteSnapshotRoomSummary(storedSnapshot), message: storedSnapshot.message }];
        });
      });

    const cinnyFavoritesRoom = cinnyFavoritesRoomId
      ? snapshot.rooms.find((room) => room.id === cinnyFavoritesRoomId)
      : undefined;
    const serverItems = cinnyFavoritesRoomId && cinnyFavoritesRoom
      ? getRoomMessages(client, cinnyFavoritesRoomId)
          .filter((message) => message.kind === 'message')
          .map((message) => {
            const sourceRoom = message.favoriteSource
              ? snapshot.rooms.find((room) => room.id === message.favoriteSource?.roomId)
              : undefined;
            return { room: sourceRoom ?? cinnyFavoritesRoom, message };
          })
      : [];
    const seen = new Set<string>();

    return [...localItems, ...serverItems]
      .filter(({ message }) => {
        const key = `${message.favoriteSource?.roomId ?? message.roomId}|${message.favoriteSource?.eventId ?? message.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => (b.message.favoriteSource?.favoritedAt ?? b.message.timestamp) - (a.message.favoriteSource?.favoritedAt ?? a.message.timestamp));
  }, [cinnyFavoritesRoomId, client, favoriteMessageIds, favoriteMessageSnapshots, snapshot.rooms, snapshot.version]);

  useEffect(() => {
    if (!client) return;

    setFavoriteMessageSnapshots((current) => {
      let changed = false;
      const nextSnapshots = { ...current };

      Object.entries(favoriteMessageIds).forEach(([roomId, ids]) => {
        const room = snapshot.rooms.find((item) => item.id === roomId);
        const messagesById = new Map(getRoomMessages(client, roomId).map((message) => [message.id, message]));

        ids.forEach((id) => {
          const snapshotKey = getFavoriteSnapshotKey(roomId, id);
          if (nextSnapshots[snapshotKey]) return;

          const liveMessage = messagesById.get(id);
          if (!liveMessage) return;

          nextSnapshots[snapshotKey] = buildStoredFavoriteMessageSnapshot(liveMessage, room);
          changed = true;
        });
      });

      return changed ? nextSnapshots : current;
    });
  }, [client, favoriteMessageIds, snapshot.rooms, snapshot.version]);

  const localSearchResults = useMemo(() => {
    if (!client || roomQuery.trim().length < 2 || activeView === 'explore' || activeView === 'settings') {
      return [];
    }
    return searchLocalMessages(client, roomQuery, 50);
  }, [activeView, client, roomQuery, snapshot.version]);

  const unreadByView = useMemo(
    () => ({
      home: roomBuckets.home.reduce((count, room) => count + room.unread, 0),
      direct: roomBuckets.direct.reduce((count, room) => count + room.unread, 0),
      rooms: roomBuckets.rooms.reduce((count, room) => count + room.unread, 0),
      spaces: roomBuckets.spaces.reduce((count, room) => count + room.unread, 0),
      invites: roomBuckets.invites.length,
      favorites: roomBuckets.favorites.reduce((count, room) => count + room.unread, 0),
      explore: 0,
      settings: 0,
    }),
    [roomBuckets]
  );

  useEffect(() => {
    if (activeView === 'explore' || activeView === 'settings') {
      setSelectedRoomId(undefined);
      return;
    }

    if (activeView === 'rooms' && roomFilter === 'spaces') {
      if (selectedRoomId && selectedRoomMatchesActiveView) return;
      setSelectedRoomId(undefined);
      return;
    }

    if (selectedRoomId && selectedRoomMatchesActiveView) return;
    setSelectedRoomId(visibleRooms[0]?.id);
  }, [activeView, roomFilter, selectedRoomId, selectedRoomMatchesActiveView, visibleRooms]);

  useEffect(() => {
    setRoomFilter('all');
    setSelectedSpaceId(undefined);
  }, [activeView]);

  useEffect(() => {
    if (activeView !== 'rooms' && roomFilter === 'spaces') {
      setRoomFilter('all');
    }
    if (roomFilter !== 'spaces') {
      setSelectedSpaceId(undefined);
    }
  }, [activeView, roomFilter]);

  useEffect(() => {
    setSelectionMode(false);
    setSelectedMessageIds([]);
    setComposerExpanded(false);
  }, [selectedRoomId]);

  useEffect(() => {
    if (!focusedTimelineContext || !selectedRoomId || focusedTimelineContext.roomId === selectedRoomId) return;
    setFocusedTimelineContext(undefined);
  }, [focusedTimelineContext, selectedRoomId]);

  useEffect(() => {
    if (!messageQuery.trim()) return;
    setFocusedTimelineContext(undefined);
  }, [messageQuery]);

  useEffect(() => {
    if (!client || !selectedRoomId) {
      setRoomMembers([]);
      setTypingMembers([]);
      setRoomMediaItems([]);
      setPinnedMessages([]);
      refreshCustomEmojiState(client);
      return;
    }
    setRoomMembers(getRoomMembers(client, selectedRoomId));
    setRoomMediaItems(getRoomMediaItems(client, selectedRoomId));
    setPinnedMessages(getPinnedMessages(client, selectedRoomId));
    refreshCustomEmojiState(client);
  }, [client, refreshCustomEmojiState, selectedRoomId, snapshot.version]);

  useEffect(() => {
    if (!client || !selectedRoomId) return undefined;

    const unresolvedPinnedMessages = pinnedMessages.filter(
      (message) => !message.available && typeof message.timestamp !== 'number'
    );
    if (unresolvedPinnedMessages.length === 0) return undefined;

    let cancelled = false;

    void hydratePinnedMessages(client, selectedRoomId, pinnedMessages).then((messages) => {
      if (cancelled) return;
      setPinnedMessages(messages);
    });

    return () => {
      cancelled = true;
    };
  }, [client, pinnedMessages, selectedRoomId]);

  useEffect(() => {
    if (!client || !selectedRoomId) return undefined;

    let cancelled = false;

    void loadRoomMembers(client, selectedRoomId).then((members) => {
      if (cancelled) return;
      setRoomMembers(members);
    });

    return () => {
      cancelled = true;
    };
  }, [client, selectedRoomId]);

  useEffect(() => {
    if (!isIosPlatform || !client || !session?.accessToken) return undefined;

    let cancelled = false;
    const accessToken = session.accessToken;

    const avatarTargets: MediaWarmTarget[] = [
      ...(ownProfile?.avatarUrl
        ? [
            {
              cacheKey: ownProfile.avatarUrl,
              src: ownProfile.avatarUrl,
              fallbackSrc: ownProfile.avatarUrl,
              accessToken,
            },
          ]
        : []),
      ...snapshot.rooms.flatMap((room) =>
        room.avatarUrl
          ? [
              {
                cacheKey: room.avatarUrl,
                src: room.avatarUrl,
                fallbackSrc: room.avatarUrl,
                accessToken,
              },
            ]
          : []
      ),
    ];

    const emojiTargets = customEmojiItems.flatMap<MediaWarmTarget>((item) => {
      const infoRecord = isRecord(item.info) ? item.info : undefined;
      const mimeType = typeof infoRecord?.mimetype === 'string' ? infoRecord.mimetype : undefined;
      const thumbAuthUrl = mxcToHttp(client, item.mxcUrl, 48, 48, true);
      const thumbUrl = mxcToHttp(client, item.mxcUrl, 48, 48);
      const fullAuthUrl = mxcToHttp(client, item.mxcUrl, undefined, undefined, true);
      const fullUrl = mxcToHttp(client, item.mxcUrl);

      return [
        {
          cacheKey: item.authUrl ?? item.url ?? item.mxcUrl,
          src: item.authUrl ?? item.url,
          fallbackSrc: item.downloadUrl ?? item.url,
          accessToken,
          mimeType,
        },
        {
          cacheKey: thumbAuthUrl ?? thumbUrl ?? `${item.mxcUrl}#thumb`,
          src: thumbAuthUrl ?? thumbUrl,
          fallbackSrc: thumbUrl ?? thumbAuthUrl,
          accessToken,
          mimeType,
        },
        {
          cacheKey: fullAuthUrl ?? fullUrl ?? item.downloadUrl ?? `${item.mxcUrl}#full`,
          src: fullAuthUrl ?? fullUrl,
          fallbackSrc: fullUrl ?? fullAuthUrl ?? item.downloadUrl,
          accessToken,
          mimeType,
        },
      ];
    });

    const targets = dedupeMediaWarmTargets([...avatarTargets, ...emojiTargets]).filter(
      (target) => !warmedMediaKeysRef.current.has(target.cacheKey)
    );

    if (targets.length === 0) return undefined;

    void runConcurrentTasks(
      targets,
      2,
      async (target) => {
        if (cancelled || warmedMediaKeysRef.current.has(target.cacheKey)) return;
        const warmed = await warmMediaCacheEntry(target);
        if (warmed) {
          warmedMediaKeysRef.current.add(target.cacheKey);
        }
      },
      () => cancelled
    );

    return () => {
      cancelled = true;
    };
  }, [client, customEmojiItems, isIosPlatform, ownProfile?.avatarUrl, roomAvatarWarmSignature, session?.accessToken]);

  useEffect(() => {
    if (!isIosPlatform || !client || !session?.accessToken) return undefined;

    let cancelled = false;
    const accessToken = session.accessToken;
    const joinedRooms = client
      .getRooms()
      .filter(
        (room) => room.getMyMembership() === 'join' && !warmedMemberAvatarRoomIdsRef.current.has(room.roomId)
      );

    if (joinedRooms.length === 0) return undefined;

    void runConcurrentTasks(
      joinedRooms,
      1,
      async (room) => {
        if (cancelled || warmedMemberAvatarRoomIdsRef.current.has(room.roomId)) return;

        try {
          await room.loadMembersIfNeeded();
        } catch {
          // Fall back to the currently known member list so we still warm what is available.
        }

        if (cancelled) return;

        const targets = dedupeMediaWarmTargets(
          room.getJoinedMembers().flatMap<MediaWarmTarget>((member) => {
            const avatarMxc = member.getMxcAvatarUrl();
            if (!avatarMxc) return [];

            return [48, 72, 96].flatMap((size) => {
              const avatarUrl = buildAvatarThumbnailUrl(client, avatarMxc, size);
              if (!avatarUrl) return [];
              return [
                {
                  cacheKey: avatarUrl,
                  src: avatarUrl,
                  fallbackSrc: avatarUrl,
                  accessToken,
                },
              ];
            });
          })
        ).filter((target) => !warmedMediaKeysRef.current.has(target.cacheKey));

        await runConcurrentTasks(
          targets,
          2,
          async (target) => {
            if (cancelled || warmedMediaKeysRef.current.has(target.cacheKey)) return;
            const warmed = await warmMediaCacheEntry(target);
            if (warmed) {
              warmedMediaKeysRef.current.add(target.cacheKey);
            }
          },
          () => cancelled
        );

        if (!cancelled) {
          warmedMemberAvatarRoomIdsRef.current.add(room.roomId);
        }
      },
      () => cancelled
    );

    return () => {
      cancelled = true;
    };
  }, [client, isIosPlatform, joinedRoomWarmSignature, session?.accessToken]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const debugTarget = globalThis as typeof globalThis & {
      __ioscinnyEmojiDebug?: unknown;
    };

    const summary = client
      ? getCustomEmojiDebugSummary(client, selectedRoomId)
      : undefined;

    debugTarget.__ioscinnyEmojiDebug = summary;
    document.body?.setAttribute('data-emoji-pack-ids', summary?.cinnyPackIds.join('|') ?? '');
    document.body?.setAttribute('data-emoji-pack-count', String(summary?.cinnyPackIds.length ?? 0));
    document.body?.setAttribute(
      'data-emoji-default-synced-count',
      String(summary?.defaultPackSyncedImageCount ?? 0)
    );
    document.body?.setAttribute(
      'data-emoji-deduped-packs',
      summary
        ? summary.dedupedPackSummaries
            .map((item) => `${item.packId}:${item.emoticonCount}/${item.stickerCount}`)
            .join('|')
        : ''
    );
  }, [client, selectedRoomId]);

  useEffect(() => {
    if (!client) return;
    void refreshCryptoStatus(client);
  }, [client, refreshCryptoStatus, snapshot.version]);

  useEffect(() => {
    setExploreSources(client ? getExploreSources(client) : []);
  }, [client, snapshot.version]);

  useEffect(() => {
    if (exploreSources.length === 0) {
      setSelectedExploreSourceId(undefined);
      return;
    }

    setSelectedExploreSourceId((current) => {
      if (current && exploreSources.some((source) => source.id === current)) return current;
      return (exploreSources.find((source) => source.kind === 'nav') ?? exploreSources[0]).id;
    });
  }, [exploreSources]);

  useEffect(() => {
    if (selectedExploreSource?.kind !== 'server') return;
    if (publicSearch.server.trim() === selectedExploreSource.value) return;

    setPublicSearch((current) => ({
      ...current,
      server: selectedExploreSource.value,
    }));
  }, [publicSearch.server, selectedExploreSource?.id, selectedExploreSource?.kind, selectedExploreSource?.value]);

  useEffect(() => {
    if (!client || !session) return;

    void getOwnProfile(client).then((profile) => {
      setOwnProfile(profile);
      setProfileForm({ displayName: profile.displayName ?? profile.userId });
    });
  }, [client, session?.userId]);

  useLayoutEffect(() => {
    if (!selectedRoom) {
      autoScrollToBottomRef.current = true;
      suppressAutoLoadOlderRef.current = false;
      initialRoomScrollRoomIdRef.current = undefined;
      if (typeof initialRoomScrollFrameRef.current === 'number') {
        window.cancelAnimationFrame(initialRoomScrollFrameRef.current);
        initialRoomScrollFrameRef.current = undefined;
      }
      if (typeof initialRoomScrollSettleTimeoutRef.current === 'number') {
        window.clearTimeout(initialRoomScrollSettleTimeoutRef.current);
        initialRoomScrollSettleTimeoutRef.current = undefined;
      }
      const paginationAnchorFrameId = paginationAnchorRef.current?.animationFrameId;
      if (typeof paginationAnchorFrameId === 'number') {
        window.cancelAnimationFrame(paginationAnchorFrameId);
      }
      paginationAnchorRef.current = undefined;
      return;
    }

    autoScrollToBottomRef.current = true;
    suppressAutoLoadOlderRef.current = true;
    initialRoomScrollRoomIdRef.current = selectedRoom.id;
    if (typeof initialRoomScrollFrameRef.current === 'number') {
      window.cancelAnimationFrame(initialRoomScrollFrameRef.current);
      initialRoomScrollFrameRef.current = undefined;
    }
    if (typeof initialRoomScrollSettleTimeoutRef.current === 'number') {
      window.clearTimeout(initialRoomScrollSettleTimeoutRef.current);
      initialRoomScrollSettleTimeoutRef.current = undefined;
    }
    const paginationAnchorFrameId = paginationAnchorRef.current?.animationFrameId;
    if (typeof paginationAnchorFrameId === 'number') {
      window.cancelAnimationFrame(paginationAnchorFrameId);
    }
    paginationAnchorRef.current = undefined;
  }, [selectedRoom?.id]);

  useEffect(() => {
    if (!selectedRoom) {
      setRoomProfileForm({ name: '', topic: '' });
      setComposerMode({ type: 'normal' });
      setMessageDraft('');
      setComposerExpanded(false);
      setEmojiOpen(false);
      setShowScrollToLatest(false);
      composerBottomLockRef.current = false;
      return;
    }

    setRoomProfileForm({
      name: selectedRoom.name,
      topic: selectedRoom.topic ?? '',
    });
    setComposerMode({ type: 'normal' });
    setMessageDraft(roomDrafts[selectedRoom.id] ?? '');
    setComposerExpanded(false);
    setEmojiOpen(false);
    setShowScrollToLatest(false);
    composerBottomLockRef.current = false;
  }, [selectedRoom?.id]);

  const measureComposerTextarea = useCallback(() => {
    const textarea = composerInputRef.current;
    if (!textarea) return;

    const previousHeight = textarea.style.height;
    textarea.style.height = 'auto';
    const measuredHeight = textarea.scrollHeight;
    textarea.style.height = previousHeight;

    const nextHeight = Math.max(composerCollapsedMinHeightPx, measuredHeight);
    setComposerTextareaHeight((current) => (current === nextHeight ? current : nextHeight));
    setComposerCanExpand(measuredHeight > composerCollapsedMaxHeightPx + 4);
  }, []);

  useLayoutEffect(() => {
    measureComposerTextarea();
  }, [composerExpanded, measureComposerTextarea, messageDraft, selectedRoomId]);


  useEffect(() => {
    if (!client || !selectedRoomId) return undefined;

    const refreshTyping = () => setTypingMembers(getRoomTypingMembers(client, selectedRoomId));
    refreshTyping();
    const interval = window.setInterval(refreshTyping, 2500);
    return () => window.clearInterval(interval);
  }, [client, selectedRoomId, snapshot.version]);

  useEffect(() => {
    if (!client || !selectedRoomId) return undefined;

    const room = client.getRoom(selectedRoomId);
    if (!room) return undefined;

    const handleReceiptRefresh = (_event?: MatrixEvent, eventRoom?: { roomId?: string }) => {
      if (eventRoom?.roomId && eventRoom.roomId !== selectedRoomId) return;
      setSelectedRoomReceiptTick((current) => current + 1);
    };

    room.on(RoomEvent.Receipt, handleReceiptRefresh);
    room.on(RoomEvent.LocalEchoUpdated, handleReceiptRefresh);
    return () => {
      room.removeListener(RoomEvent.Receipt, handleReceiptRefresh);
      room.removeListener(RoomEvent.LocalEchoUpdated, handleReceiptRefresh);
    };
  }, [client, selectedRoomId]);

  useEffect(() => {
    if (!emojiOpen) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (emojiTrayRef.current?.contains(target)) return;
      if (emojiToggleButtonRef.current?.contains(target)) return;

      setEmojiOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [emojiOpen]);

  useEffect(() => {
    if (!client || !selectedRoomId || !selectedRoom || selectedRoom.membership !== 'join') return undefined;

    const room = client.getRoom(selectedRoomId);
    const latestEvent = room?.getLiveTimeline().getEvents().at(-1);
    const latestEventId = latestEvent?.getId();
    if (!latestEventId) return undefined;

    const showingChatPane = mobilePane === 'chat' || window.innerWidth >= 960;
    if (!showingChatPane) return undefined;

    const nextKey = `${selectedRoomId}:${latestEventId}:${preferences.sendReadReceipts ? 'public' : 'private'}`;
    if (selectedRoom.unread === 0 && autoReadKeyRef.current === nextKey) return undefined;

    const timeout = window.setTimeout(() => {
      autoReadKeyRef.current = nextKey;
      void markRoomRead(client, selectedRoomId, { sendReceipt: preferences.sendReadReceipts }).finally(() => {
        setSnapshot(getMatrixSnapshot(client));
      });
    }, 280);

    return () => window.clearTimeout(timeout);
  }, [
    client,
    mobilePane,
    preferences.sendReadReceipts,
    selectedRoom,
    selectedRoomId,
  ]);

  const restorePaginationAnchor = useCallback((roomId: string) => {
    const timeline = timelineRef.current;
    const anchor = paginationAnchorRef.current;
    if (!timeline || !anchor || anchor.roomId !== roomId) return false;

    if (anchor.messageId) {
      const anchoredMessage = timeline.querySelector<HTMLElement>(
        `[data-message-id="${CSS.escape(anchor.messageId)}"]`
      );
      if (anchoredMessage) {
        const timelineTop = timeline.getBoundingClientRect().top;
        const currentOffsetTop = anchoredMessage.getBoundingClientRect().top - timelineTop;
        const expectedOffsetTop = anchor.messageOffsetTop ?? currentOffsetTop;
        timeline.scrollTop += currentOffsetTop - expectedOffsetTop;
        return true;
      }
    }

    timeline.scrollTop = anchor.scrollTop + (timeline.scrollHeight - anchor.scrollHeight);
    return true;
  }, []);

  const schedulePaginationAnchorStabilization = useCallback(
    (roomId: string) => {
      const anchor = paginationAnchorRef.current;
      if (!anchor || anchor.roomId !== roomId || typeof anchor.animationFrameId === 'number') {
        return;
      }

      const step = () => {
        const currentAnchor = paginationAnchorRef.current;
        if (!currentAnchor || currentAnchor.roomId !== roomId) return;

        currentAnchor.animationFrameId = undefined;
        restorePaginationAnchor(roomId);
        currentAnchor.stabilizationFrames -= 1;

        if (currentAnchor.stabilizationFrames <= 0) {
          paginationAnchorRef.current = undefined;
          return;
        }

        currentAnchor.animationFrameId = window.requestAnimationFrame(step);
      };

      anchor.animationFrameId = window.requestAnimationFrame(step);
    },
    [restorePaginationAnchor]
  );

  const settleInitialRoomScroll = useCallback(
    (roomId: string) => {
      if (typeof initialRoomScrollFrameRef.current === 'number') {
        window.cancelAnimationFrame(initialRoomScrollFrameRef.current);
        initialRoomScrollFrameRef.current = undefined;
      }
      if (typeof initialRoomScrollSettleTimeoutRef.current === 'number') {
        window.clearTimeout(initialRoomScrollSettleTimeoutRef.current);
        initialRoomScrollSettleTimeoutRef.current = undefined;
      }

      const timeline = timelineRef.current;
      if (
        !timeline ||
        selectedRoomId !== roomId ||
        pendingScrollEventId ||
        paginationAnchorRef.current
      ) {
        return;
      }

      timeline.scrollTop = timeline.scrollHeight;
      autoScrollToBottomRef.current = true;
      setShowScrollToLatest(false);

      initialRoomScrollFrameRef.current = window.requestAnimationFrame(() => {
        const currentTimeline = timelineRef.current;
        if (
          !currentTimeline ||
          selectedRoomId !== roomId ||
          pendingScrollEventId ||
          paginationAnchorRef.current
        ) {
          initialRoomScrollFrameRef.current = undefined;
          return;
        }

        currentTimeline.scrollTop = currentTimeline.scrollHeight;
        initialRoomScrollFrameRef.current = undefined;
      });

      initialRoomScrollSettleTimeoutRef.current = window.setTimeout(() => {
        const currentTimeline = timelineRef.current;
        if (
          !currentTimeline ||
          selectedRoomId !== roomId ||
          pendingScrollEventId ||
          paginationAnchorRef.current
        ) {
          initialRoomScrollSettleTimeoutRef.current = undefined;
          return;
        }

        currentTimeline.scrollTop = currentTimeline.scrollHeight;
        if (initialRoomScrollRoomIdRef.current === roomId) {
          initialRoomScrollRoomIdRef.current = undefined;
        }
        suppressAutoLoadOlderRef.current = false;
        initialRoomScrollSettleTimeoutRef.current = undefined;
      }, 140);
    },
    [pendingScrollEventId, selectedRoomId]
  );

  useLayoutEffect(() => {
    if (!selectedRoomId || initialRoomScrollRoomIdRef.current !== selectedRoomId) return;
    settleInitialRoomScroll(selectedRoomId);
  }, [selectedRoomId, selectedRoomMessages.length, settleInitialRoomScroll]);

  const settlePinnedTimelineBottom = useCallback(() => {
    const timeline = timelineRef.current;
    if (!timeline || activeTimelineContext || pendingScrollEventId || paginationAnchorRef.current) return;

    autoScrollToBottomRef.current = true;
    setShowScrollToLatest(false);
    timeline.scrollTop = timeline.scrollHeight;

    if (typeof pinnedTimelineFrameRef.current === 'number') {
      window.cancelAnimationFrame(pinnedTimelineFrameRef.current);
    }
    pinnedTimelineFrameRef.current = window.requestAnimationFrame(() => {
      const currentTimeline = timelineRef.current;
      if (!currentTimeline || (!autoScrollToBottomRef.current && !composerBottomLockRef.current)) {
        pinnedTimelineFrameRef.current = undefined;
        return;
      }

      currentTimeline.scrollTop = currentTimeline.scrollHeight;
      pinnedTimelineFrameRef.current = undefined;
    });

    if (typeof pinnedTimelineSettleTimeoutRef.current === 'number') {
      window.clearTimeout(pinnedTimelineSettleTimeoutRef.current);
    }
    pinnedTimelineSettleTimeoutRef.current = window.setTimeout(() => {
      const currentTimeline = timelineRef.current;
      if (!currentTimeline || (!autoScrollToBottomRef.current && !composerBottomLockRef.current)) {
        pinnedTimelineSettleTimeoutRef.current = undefined;
        return;
      }

      currentTimeline.scrollTop = currentTimeline.scrollHeight;
      composerBottomLockRef.current = false;
      suppressAutoLoadOlderRef.current = false;
      pinnedTimelineSettleTimeoutRef.current = undefined;
    }, 180);
  }, [activeTimelineContext, pendingScrollEventId]);

  useLayoutEffect(() => {
    const handleResize = () => {
      window.requestAnimationFrame(() => {
        measureComposerTextarea();
        if (autoScrollToBottomRef.current || composerBottomLockRef.current) {
          settlePinnedTimelineBottom();
        }
      });
    };

    window.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('resize', handleResize);
    };
  }, [measureComposerTextarea, settlePinnedTimelineBottom]);

  useLayoutEffect(() => {
    if (!composerBottomLockRef.current) return;
    settlePinnedTimelineBottom();
  }, [composerExpanded, emojiOpen, settlePinnedTimelineBottom]);

  useLayoutEffect(() => {
    const anchor = paginationAnchorRef.current;
    if (!selectedRoomId || !anchor || anchor.roomId !== selectedRoomId) return;

    restorePaginationAnchor(selectedRoomId);
    schedulePaginationAnchorStabilization(selectedRoomId);
  }, [
    restorePaginationAnchor,
    schedulePaginationAnchorStabilization,
    selectedRoomId,
    selectedRoomMessages.length,
    snapshot.version,
  ]);

  useLayoutEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline || !selectedRoomId || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      const anchor = paginationAnchorRef.current;
      if (anchor?.roomId === selectedRoomId) {
        restorePaginationAnchor(selectedRoomId);
        schedulePaginationAnchorStabilization(selectedRoomId);
        return;
      }

      if (initialRoomScrollRoomIdRef.current === selectedRoomId) {
        settleInitialRoomScroll(selectedRoomId);
        return;
      }

      if (autoScrollToBottomRef.current || composerBottomLockRef.current) {
        settlePinnedTimelineBottom();
      }
    });

    observer.observe(timeline);
    return () => {
      observer.disconnect();
      if (typeof pinnedTimelineFrameRef.current === 'number') {
        window.cancelAnimationFrame(pinnedTimelineFrameRef.current);
        pinnedTimelineFrameRef.current = undefined;
      }
      if (typeof pinnedTimelineSettleTimeoutRef.current === 'number') {
        window.clearTimeout(pinnedTimelineSettleTimeoutRef.current);
        pinnedTimelineSettleTimeoutRef.current = undefined;
      }
    };
  }, [
    restorePaginationAnchor,
    schedulePaginationAnchorStabilization,
    selectedRoomId,
    settlePinnedTimelineBottom,
    settleInitialRoomScroll,
  ]);

  const scrollTimelineToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const timeline = timelineRef.current;
    if (!timeline) return;

    autoScrollToBottomRef.current = true;
    setShowScrollToLatest(false);
    timeline.scrollTo({
      top: timeline.scrollHeight,
      behavior,
    });
    window.requestAnimationFrame(() => {
      suppressAutoLoadOlderRef.current = false;
    });
  }, []);

  const handleReturnToLatestTimeline = useCallback(() => {
    setFocusedTimelineContext(undefined);
    setPendingScrollEventId(undefined);
    setHighlightedMessageId(undefined);
    autoScrollToBottomRef.current = true;
    setShowScrollToLatest(false);
    window.requestAnimationFrame(() => scrollTimelineToBottom('auto'));
  }, [scrollTimelineToBottom]);

  useEffect(() => {
    const timeline = timelineRef.current;
    if (activeTimelineContext) return;
    if (!timeline || pendingScrollEventId || paginationAnchorRef.current) return;
    if (!autoScrollToBottomRef.current) return;
    if (initialRoomScrollRoomIdRef.current === selectedRoomId) return;

    scrollTimelineToBottom(selectedRoomMessages.length > 0 ? 'smooth' : 'auto');
  }, [activeTimelineContext, pendingScrollEventId, scrollTimelineToBottom, selectedRoomId, selectedRoomMessages.length]);

  useEffect(() => {
    if (!pendingScrollEventId) return;

    const target = timelineRef.current?.querySelector<HTMLElement>(
      `[data-message-id="${CSS.escape(pendingScrollEventId)}"]`
    );
    if (!target) {
      setNotice('目标消息还没有同步到本地时间线，可以先加载更早消息');
      setPendingScrollEventId(undefined);
      return;
    }

    target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    if (typeof initialRoomScrollFrameRef.current === 'number') {
      window.cancelAnimationFrame(initialRoomScrollFrameRef.current);
      initialRoomScrollFrameRef.current = undefined;
    }
    if (typeof initialRoomScrollSettleTimeoutRef.current === 'number') {
      window.clearTimeout(initialRoomScrollSettleTimeoutRef.current);
      initialRoomScrollSettleTimeoutRef.current = undefined;
    }
    initialRoomScrollRoomIdRef.current = undefined;
    suppressAutoLoadOlderRef.current = false;
    setHighlightedMessageId(pendingScrollEventId);
    const timeout = window.setTimeout(() => setHighlightedMessageId(undefined), 1800);
    setPendingScrollEventId(undefined);
    return () => window.clearTimeout(timeout);
  }, [pendingScrollEventId, selectedRoomMessages.length]);

  useEffect(() => {
    return () => {
      if (typeof initialRoomScrollFrameRef.current === 'number') {
        window.cancelAnimationFrame(initialRoomScrollFrameRef.current);
      }
      if (typeof initialRoomScrollSettleTimeoutRef.current === 'number') {
        window.clearTimeout(initialRoomScrollSettleTimeoutRef.current);
      }
      const paginationAnchorFrameId = paginationAnchorRef.current?.animationFrameId;
      if (typeof paginationAnchorFrameId === 'number') {
        window.cancelAnimationFrame(paginationAnchorFrameId);
      }
    };
  }, []);

  useEffect(() => {
    if (!editingMessageId) return;
    if (selectedRoomMessages.some((message) => message.id === editingMessageId)) return;
    setEditingMessageId(undefined);
    setEditingMessageDraft('');
    setSavingInlineEdit(false);
  }, [editingMessageId, selectedRoomMessages]);

  useEffect(() => {
    saveStringArray(favoriteRoomsKey, favoriteRoomIds);
  }, [favoriteRoomIds]);

  useEffect(() => {
    saveFavoriteMessages(favoriteMessageIds);
  }, [favoriteMessageIds]);

  useEffect(() => {
    saveFavoriteMessageSnapshots(favoriteMessageSnapshots);
  }, [favoriteMessageSnapshots]);

  useEffect(() => {
    saveRoomDrafts(roomDrafts);
  }, [roomDrafts]);

  useEffect(() => {
    savePreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    saveAudioTranscriptionSettings(audioTranscriptionSettings);
  }, [audioTranscriptionSettings]);

  useEffect(() => {
    audioTranscriptionSettingsRef.current = audioTranscriptionSettings;

    const applyingSignature = audioTranscriptionApplyingRemoteSignatureRef.current;
    if (
      applyingSignature &&
      getAudioTranscriptionSettingsAccountDataSignature(audioTranscriptionSettings) ===
        applyingSignature
    ) {
      audioTranscriptionApplyingRemoteSignatureRef.current = undefined;
      audioTranscriptionHydratedRef.current = true;
    }
  }, [audioTranscriptionSettings]);

  useEffect(() => {
    saveStringArray(exploreServerSourcesKey, exploreServers);
  }, [exploreServers]);

  useEffect(() => {
    saveCustomEmojiSnapshot(customEmojiItems);
  }, [customEmojiItems]);

  const runAction = async (action: () => Promise<void>, success?: string) => {
    setError(undefined);
    try {
      await action();
      await Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
      refreshSnapshot();
      if (success) setNotice(success);
    } catch (err) {
      if (isMatrixSessionExpiredError(err)) {
        await handleSessionExpired(err, session);
        return;
      }

      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const commitRoomDraftPreview = useCallback((roomId: string, value: string) => {
    setRoomDrafts((current) => {
      const currentValue = current[roomId] ?? '';
      if (currentValue === value) return current;

      const next = { ...current };
      if (value) {
        next[roomId] = value;
      } else {
        delete next[roomId];
      }
      return next;
    });
  }, []);

  const clearPendingRoomDraftCommit = useCallback(() => {
    if (typeof roomDraftCommitTimeoutRef.current === 'number') {
      window.clearTimeout(roomDraftCommitTimeoutRef.current);
      roomDraftCommitTimeoutRef.current = undefined;
    }
    pendingRoomDraftCommitRef.current = undefined;
  }, []);

  const scheduleRoomDraftPreviewCommit = useCallback(
    (roomId: string, value: string) => {
      clearPendingRoomDraftCommit();
      pendingRoomDraftCommitRef.current = { roomId, value };
      roomDraftCommitTimeoutRef.current = window.setTimeout(() => {
        const pending = pendingRoomDraftCommitRef.current;
        roomDraftCommitTimeoutRef.current = undefined;
        pendingRoomDraftCommitRef.current = undefined;
        if (!pending) return;
        commitRoomDraftPreview(pending.roomId, pending.value);
      }, 180);
    },
    [clearPendingRoomDraftCommit, commitRoomDraftPreview]
  );

  const ensureMatrixReadyForOutgoing = useCallback(
    (actionLabel = '发送消息'): boolean => {
      if (matrixConnectionHealthy && matrixSyncReadyStates.has(syncState ?? SyncState.Stopped)) {
        return true;
      }

      setError(`Matrix 连接还没有恢复，${actionLabel}现在只会停留在本地。我先帮你恢复连接。`);
      attemptMatrixRecovery('manual');
      return false;
    },
    [attemptMatrixRecovery, matrixConnectionHealthy, syncState]
  );

  const handleLogin = async (evt: FormEvent<HTMLFormElement>) => {
    evt.preventDefault();

    if (!loginForm.baseUrl.trim()) {
      setBootState('signedOut');
      setError('请输入 Homeserver 地址。');
      return;
    }
    if (!loginForm.username.trim()) {
      setBootState('signedOut');
      setError('请输入用户名或 Matrix ID。');
      return;
    }
    if (!loginForm.password.trim()) {
      setBootState('signedOut');
      setError('请输入密码。');
      return;
    }

    setBootState('connecting');
    setError(undefined);

    try {
      const nextSession = await loginWithPassword(loginForm);
      await saveStoredSession(nextSession);
      await Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
      await connectSession(nextSession);
    } catch (err) {
      setError(getReadableLoginError(err));
      setBootState('error');
    }
  };

  const handleLogout = async () => {
    sessionExpiryHandledRef.current = false;
    stopRuntime();
    await clearStoredSession();
    clearCustomEmojiSnapshot();
    clearResumeState();
    clearPendingNativeCapture();
    setSession(undefined);
    setCustomEmojiItems([]);
    setActiveView('home');
    setMobilePane('list');
    setBootState('signedOut');
  };

  const handleSelectRoom = (roomId: string, options?: { preserveFocusedContext?: boolean }) => {
    const room = snapshot.rooms.find((item) => item.id === roomId);
    if (activeView === 'rooms' && roomFilter === 'spaces' && !selectedSpaceId && room?.space) {
      setSelectedSpaceId(room.id);
      setSelectedRoomId(undefined);
      setRoomQuery('');
      setMobilePane('list');
      return;
    }

    if (!options?.preserveFocusedContext) {
      setFocusedTimelineContext(undefined);
    }
    setSelectedRoomId(roomId);
    setMobilePane('chat');
    setMessageQuery('');
    setMessageSearchOpen(false);
    setComposerMode({ type: 'normal' });
    setEditingMessageId(undefined);
    setEditingMessageDraft('');
    setSavingInlineEdit(false);
  };

  const executeSlashCommand = async (body: string): Promise<boolean> => {
    if (!client || !selectedRoom || composerMode.type !== 'normal' || !body.startsWith('/')) {
      return false;
    }

    const [command, ...args] = body.trim().split(/\s+/);
    const rest = args.join(' ').trim();

    switch (command.toLowerCase()) {
      case '/me':
        await sendEmoteMessage(client, selectedRoom.id, rest);
        return true;
      case '/join': {
        const roomId = await joinRoom(client, rest);
        setSelectedRoomId(roomId);
        setActiveView('rooms');
        setMobilePane('chat');
        return true;
      }
      case '/invite':
        await inviteUser(client, selectedRoom.id, normalizeUserId(rest, currentUserServer));
        setNotice('邀请已发送');
        return true;
      case '/topic':
        await updateRoomProfile(client, selectedRoom.id, {
          name: selectedRoom.name,
          topic: rest,
        });
        setRoomProfileForm((current) => ({ ...current, topic: rest }));
        return true;
      case '/shrug':
        await sendTextMessage(client, selectedRoom.id, `${rest ? `${rest} ` : ''}¯\\_(ツ)_/¯`);
        return true;
      default:
        return false;
    }
  };

  const handleSendMessage = async (evt?: FormEvent<HTMLFormElement>) => {
    evt?.preventDefault();
    if (!client || !selectedRoom || sending || !messageDraft.trim()) return;
    if (!ensureMatrixReadyForOutgoing('发送消息')) return;
    clearPendingRoomDraftCommit();

    const body = messageDraft;
    setMessageDraft('');
    setSending(true);
    try {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = undefined;
      }
      await updateTypingStatus(client, selectedRoom.id, false).catch(() => undefined);

      if (await executeSlashCommand(body)) {
        // Command handled.
      } else if (composerMode.type === 'edit') {
        const mentions = extractMentionUserIds(body, roomMembers);
        await editTextMessage(
          client,
          selectedRoom.id,
          composerMode.message.id,
          body,
          mentions,
          mentions.length > 0 ? markdownishToHtml(body, roomMembers) : undefined
        );
      } else if (composerMode.type === 'reply') {
        const mentions = extractMentionUserIds(body, roomMembers);
        const replyTo: ChatReply = {
          eventId: composerMode.message.id,
          senderId: composerMode.message.sender,
          senderName: composerMode.message.senderName ?? composerMode.message.sender,
          body: composerMode.message.body,
        };
        await sendReplyMessage(
          client,
          selectedRoom.id,
          replyTo,
          body,
          mentions,
          markdownishToHtml(body, roomMembers)
        );
      } else {
        const mentions = extractMentionUserIds(body, roomMembers);
        await sendTextMessage(
          client,
          selectedRoom.id,
          body,
          mentions,
          mentions.length > 0 ? markdownishToHtml(body, roomMembers) : undefined
        );
      }

      setComposerMode({ type: 'normal' });
      setFocusedTimelineContext(undefined);
      setComposerExpanded(false);
      setEmojiOpen(false);
      setRoomDrafts((current) => {
        const next = { ...current };
        delete next[selectedRoom.id];
        return next;
      });
      await Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
      refreshSnapshot();
    } catch (err) {
      setMessageDraft(body);
      setRoomDrafts((current) => ({ ...current, [selectedRoom.id]: body }));

      if (isMatrixSessionExpiredError(err)) {
        await handleSessionExpired(err, session);
        return;
      }

      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  };

  const handleRetryPendingMessage = async (message: ChatMessage) => {
    if (!client) return;

    setError(undefined);
    try {
      await retryPendingMessage(client, message.roomId, message.id);
      markMatrixActivity();
      attemptMatrixRecovery('manual');
      setNotice('已重新尝试发送这条消息');
      refreshSnapshot(client);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleRetryAllFailedSelectedRoomMessages = async () => {
    if (!client || selectedRoomFailedSendCount === 0) return;

    setError(undefined);
    try {
      for (const message of selectedRoomMessages) {
        if (!message.mine || message.sendStatus !== 'failed') continue;
        await retryPendingMessage(client, message.roomId, message.id);
      }
      attemptMatrixRecovery('manual');
      setNotice(`已重新尝试发送 ${selectedRoomFailedSendCount} 条未发出的消息`);
      refreshSnapshot(client);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleComposerKeyDown = (evt: KeyboardEvent<HTMLTextAreaElement>) => {
    if (evt.key === 'Enter' && !evt.shiftKey) {
      evt.preventDefault();
      void handleSendMessage();
    }
  };

  const focusComposerInput = useCallback(() => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const input = composerInputRef.current;
        if (!input) return;
        input.focus();
        const length = input.value.length;
        input.setSelectionRange(length, length);
      });
    });
  }, []);

  const hideComposerKeyboard = useCallback(() => {
    composerInputRef.current?.blur();
    void CapacitorKeyboard.hide().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!composerExpanded) return;
    focusComposerInput();
  }, [composerExpanded, focusComposerInput]);

  const requestComposerBottomLock = useCallback(() => {
    const timeline = timelineRef.current;
    if (!timeline) {
      composerBottomLockRef.current = false;
      return false;
    }

    const distanceToBottom = Math.max(
      0,
      timeline.scrollHeight - (timeline.scrollTop + timeline.clientHeight)
    );
    const shouldStick = distanceToBottom < timelinePinnedThresholdPx;
    composerBottomLockRef.current = shouldStick;
    if (shouldStick) {
      autoScrollToBottomRef.current = true;
      setShowScrollToLatest(false);
    }
    return shouldStick;
  }, []);

  const handleExpandComposer = useCallback(() => {
    if (!composerCanExpand) return;
    requestComposerBottomLock();
    setEmojiOpen(false);
    setComposerExpanded(true);
  }, [composerCanExpand, requestComposerBottomLock]);

  const handleCollapseComposer = useCallback(() => {
    requestComposerBottomLock();
    setComposerExpanded(false);
    focusComposerInput();
  }, [focusComposerInput, requestComposerBottomLock]);

  const handleToggleComposerEmojiTray = useCallback(() => {
    if (selectedRoom?.membership !== 'join') return;
    requestComposerBottomLock();

    if (emojiOpen) {
      setEmojiOpen(false);
      focusComposerInput();
      return;
    }

    setEmojiOpen(true);
    hideComposerKeyboard();
  }, [
    emojiOpen,
    focusComposerInput,
    hideComposerKeyboard,
    requestComposerBottomLock,
    selectedRoom?.membership,
  ]);

  const handleDraftChange = (value: string) => {
    setMessageDraft(value);
    if (selectedRoom && composerMode.type === 'normal') {
      scheduleRoomDraftPreviewCommit(selectedRoom.id, value);
    }
    if (!client || !selectedRoom || selectedRoom.membership !== 'join') return;

    const nextTypingActive = Boolean(value.trim());
    if (nextTypingActive !== typingActiveRef.current) {
      typingActiveRef.current = nextTypingActive;
      void updateTypingStatus(client, selectedRoom.id, nextTypingActive).catch(() => undefined);
    }
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    if (!nextTypingActive) return;
    typingTimeoutRef.current = window.setTimeout(() => {
      typingTimeoutRef.current = undefined;
      if (client && selectedRoom && typingActiveRef.current) {
        typingActiveRef.current = false;
        void updateTypingStatus(client, selectedRoom.id, false).catch(() => undefined);
      }
    }, 5000);
  };

  const handleLoadOlder = async () => {
    if (!client || !selectedRoom || loadingOlder) return;
    setError(undefined);
    setLoadingOlder(true);
    try {
      const addedCount = await paginateRoomMessages(client, selectedRoom.id);
      refreshSnapshot(client);
      if (addedCount > 0) {
        setNotice(`已加载 ${addedCount} 条更早消息`);
      } else {
        setNotice('已经没有更早消息了');
      }
    } catch (err) {
      if (isMatrixSessionExpiredError(err)) {
        await handleSessionExpired(err, session);
        return;
      }

      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingOlder(false);
    }
  };

  const loadOlderMessages = useCallback(async () => {
    if (!client || !selectedRoom || loadingOlderRef.current || messageQuery.trim()) return;

    const timeline = timelineRef.current;
    if (timeline) {
      const timelineTop = timeline.getBoundingClientRect().top;
      const visibleMessages = Array.from(
        timeline.querySelectorAll<HTMLElement>('[data-message-id]')
      ).filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.bottom > timelineTop + 4;
      });
      const visibleAnchorMessage =
        visibleMessages.find((element) => element.getBoundingClientRect().top >= timelineTop + 4) ??
        visibleMessages[0];
      const anchorOffsetTop = visibleAnchorMessage
        ? Math.max(0, visibleAnchorMessage.getBoundingClientRect().top - timelineTop)
        : undefined;
      paginationAnchorRef.current = {
        roomId: selectedRoom.id,
        scrollTop: timeline.scrollTop,
        scrollHeight: timeline.scrollHeight,
        messageId: visibleAnchorMessage?.dataset.messageId,
        messageOffsetTop: anchorOffsetTop,
        stabilizationFrames: 12,
      };
    }

    loadingOlderRef.current = true;
    setLoadingOlder(true);
    autoScrollToBottomRef.current = false;

    try {
      const addedCount = await paginateRoomMessages(client, selectedRoom.id);
      refreshSnapshot(client);
      if (addedCount === 0) {
        setNotice('已经没有更早消息了');
      }
    } catch (err) {
      const paginationAnchorFrameId = paginationAnchorRef.current?.animationFrameId;
      if (typeof paginationAnchorFrameId === 'number') {
        window.cancelAnimationFrame(paginationAnchorFrameId);
      }
      paginationAnchorRef.current = undefined;

      if (isMatrixSessionExpiredError(err)) {
        await handleSessionExpired(err, session);
        return;
      }

      setError(err instanceof Error ? err.message : String(err));
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  }, [client, messageQuery, refreshSnapshot, selectedRoom]);

  const handleTimelineScroll = useCallback(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;

    const distanceToBottom = Math.max(0, timeline.scrollHeight - (timeline.scrollTop + timeline.clientHeight));
    const pinnedToBottom = distanceToBottom < timelinePinnedThresholdPx;
    if (!(suppressAutoLoadOlderRef.current && autoScrollToBottomRef.current && !pinnedToBottom)) {
      autoScrollToBottomRef.current = pinnedToBottom;
    }
    setShowScrollToLatest(distanceToBottom > scrollToLatestThresholdPx);

    const allowAutoLoadOlder = !isIosPlatform && window.innerWidth >= 960;
    if (
      allowAutoLoadOlder &&
      timeline.scrollTop <= 20 &&
      !activeTimelineContext &&
      !loadingOlderRef.current &&
      !messageQuery.trim() &&
      !suppressAutoLoadOlderRef.current
    ) {
      void loadOlderMessages();
    }
  }, [activeTimelineContext, isIosPlatform, loadOlderMessages, messageQuery]);

  const handleCopyMessage = async (message: ChatMessage) => {
    const copied = await copyTextToClipboard(
      getReadableMessageBody(message.body || message.attachment?.name || '')
    );
    if (copied) {
      setNotice('消息已复制');
      return;
    }

    setError('当前环境没有拿到剪贴板写入权限，请检查系统复制权限后重试。');
  };

  const handleCopyMessageLink = async (message: ChatMessage) => {
    const room = snapshot.rooms.find((item) => item.id === message.roomId);
    if (!room) return;
    const copied = await copyTextToClipboard(buildMatrixPermalink(room, message.id));
    if (copied) {
      setNotice('消息链接已复制');
      return;
    }

    setError('当前环境没有拿到剪贴板写入权限，请检查系统复制权限后重试。');
  };

  const handleCopyRoomLink = async (room: RoomSummary) => {
    const copied = await copyTextToClipboard(buildMatrixPermalink(room));
    if (copied) {
      setNotice('房间链接已复制');
      return;
    }

    setError('当前环境没有拿到剪贴板写入权限，请检查系统复制权限后重试。');
  };

  const handleSetRoomNotificationMode = async (
    room: RoomSummary,
    mode: RoomNotificationMode
  ) => {
    if (!client || room.notificationMode === mode) return;
    await runAction(
      () => setRoomNotificationMode(client, room.id, mode),
      roomNotificationNotices[mode]
    );
  };

  const handleTogglePinMessage = async (message: ChatMessage) => {
    if (!client) return;
    await runAction(
      () => setMessagePinned(client, message.roomId, message.id, !message.pinned),
      message.pinned ? '已取消置顶' : '已置顶消息'
    );
  };

  const handleOpenRoomEvent = useCallback(
    async (roomId: string, eventId: string) => {
      if (!client) return;

      autoScrollToBottomRef.current = false;
      setShowScrollToLatest(false);
      setError(undefined);

      const contextualMessage =
        roomId === selectedRoomId ? selectedRoomMessages.find((message) => message.id === eventId) : undefined;
      if (contextualMessage) {
        if (roomId !== selectedRoomId) {
          handleSelectRoom(roomId, { preserveFocusedContext: true });
        }
        setPendingScrollEventId(eventId);
        return;
      }

      const liveMessage = getRoomMessages(client, roomId).find((message) => message.id === eventId);
      if (liveMessage) {
        setFocusedTimelineContext(undefined);
        if (roomId !== selectedRoomId) {
          handleSelectRoom(roomId, { preserveFocusedContext: true });
        }
        setPendingScrollEventId(eventId);
        return;
      }

      const foundInLiveTimeline = await ensureRoomEventInLiveTimeline(client, roomId, eventId);
      refreshSnapshot(client);

      if (foundInLiveTimeline) {
        setFocusedTimelineContext(undefined);
        if (roomId !== selectedRoomId) {
          handleSelectRoom(roomId, { preserveFocusedContext: true });
        }
        setPendingScrollEventId(eventId);
        return;
      }

      const contextMessages = await loadRoomMessageContext(client, roomId, eventId);
      if (contextMessages.length > 0) {
        setFocusedTimelineContext({
          roomId,
          eventId,
          messages: contextMessages,
        });
        if (roomId !== selectedRoomId) {
          handleSelectRoom(roomId, { preserveFocusedContext: true });
        }
        setNotice('已定位到原消息附近');
        setPendingScrollEventId(eventId);
        return;
      }

      const remoteMessage = await fetchRoomMessageById(client, roomId, eventId);
      if (!remoteMessage) {
        setError('暂时还没有拿到这条消息，稍后再试。');
        return;
      }

      if (roomId !== selectedRoomId) {
        handleSelectRoom(roomId, { preserveFocusedContext: true });
      }
      setSheet({ type: 'messageInfo', message: remoteMessage });
    },
    [client, handleSelectRoom, refreshSnapshot, selectedRoomId, selectedRoomMessages]
  );

  const handleOpenPinnedMessage = useCallback(
    async (roomId: string, eventId: string) => {
      await handleOpenRoomEvent(roomId, eventId);
    },
    [handleOpenRoomEvent]
  );

  const handleOpenMessageInfo = (message: ChatMessage) => {
    setSheet({ type: 'messageInfo', message });
  };

  const handleOpenReadReceipts = (message: ChatMessage, inlineState?: InlineReadReceiptState) => {
    setSheet({ type: 'readReceipts', message, inlineState });
  };

  const handleEditMessage = (message: ChatMessage) => {
    setComposerMode({ type: 'normal' });
    setEditingMessageId(message.id);
    setEditingMessageDraft(message.body);
    setSavingInlineEdit(false);
    setSheet(undefined);
  };

  const handleCancelInlineEdit = () => {
    if (savingInlineEdit) return;
    setEditingMessageId(undefined);
    setEditingMessageDraft('');
  };

  const handleSaveInlineEdit = async (message: ChatMessage) => {
    if (!client || savingInlineEdit) return;

    const body = editingMessageDraft;
    if (!body.trim()) return;

    setError(undefined);
    setSavingInlineEdit(true);

    try {
      const mentions = extractMentionUserIds(body, roomMembers);
      await editTextMessage(
        client,
        message.roomId,
        message.id,
        body,
        mentions,
        mentions.length > 0 ? markdownishToHtml(body, roomMembers) : undefined
      );
      await Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
      refreshSnapshot();
      setEditingMessageId(undefined);
      setEditingMessageDraft('');
      setNotice('消息已编辑');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingInlineEdit(false);
    }
  };

  const handleRedactMessage = async (message: ChatMessage) => {
    if (!client) return;
    await runAction(() => redactMessage(client, message.roomId, message.id), '消息已撤回');
    setSheet(undefined);
  };

  const handleFileSelected = async (evt: ChangeEvent<HTMLInputElement>) => {
    const triggeredByNativeCapture =
      evt.target.id === composerAttachmentInputIds.cameraImage ||
      evt.target.id === composerAttachmentInputIds.cameraVideo;
    const file = evt.target.files?.[0];
    evt.target.value = '';
    if (triggeredByNativeCapture) {
      clearPendingNativeCapture();
    }
    setAttachmentPickerOpen(false);
    if (!client || !selectedRoom || !file) return;

    await runAction(
      () => uploadFileMessage(client, selectedRoom.id, file),
      `已发送附件：${file.name}`
    );
  };

  const handleAudioCaptureSelected = async (evt: ChangeEvent<HTMLInputElement>) => {
    const file = evt.target.files?.[0];
    evt.target.value = '';
    if (!client || !selectedRoom || !file) return;

    const normalizedFile = file.type.startsWith('audio/')
      ? file
      : new File([file], file.name || `voice-${Date.now()}.m4a`, {
          type: file.type || 'audio/mp4',
        });

    await runAction(
      () => uploadFileMessage(client, selectedRoom.id, normalizedFile),
      `已发送语音：${normalizedFile.name}`
    );
  };

  const openNativeAudioCapture = () => {
    const input = audioCaptureInputRef.current;
    if (!input) {
      setError('当前真机包还没有准备好系统录音入口。');
      return;
    }
    setNotice('将使用系统录音入口选择或录制语音');
    input.click();
  };

  const handlePreviewAttachment = (message: ChatMessage) => {
    if (!message.attachment) return;
    setPreviewMedia({
      messageId: message.id,
      roomId: message.roomId,
      kind: message.attachment.kind,
      mxcUrl: message.attachment.mxcUrl,
      url: message.attachment.url,
      authUrl: message.attachment.authUrl,
      previewEncryptedFile: message.attachment.previewEncryptedFile,
      previewMimeType: message.attachment.previewMimeType,
      downloadUrl: message.attachment.downloadUrl,
      authDownloadUrl: message.attachment.authDownloadUrl,
      encryptedFile: message.attachment.encryptedFile,
      name: message.attachment.name ?? message.body,
      mimeType: message.attachment.mimeType,
      size: message.attachment.size,
      durationMs: message.attachment.durationMs,
      width: message.attachment.width,
      height: message.attachment.height,
      senderName: message.senderName,
      timestamp: message.timestamp,
    });
  };

  const addImageToDefaultEmojiPack = useCallback(
    async (image: {
      mxcUrl?: string;
      name?: string;
      body?: string;
      mimeType?: string;
      width?: number;
      height?: number;
      size?: number;
    }) => {
      if (!client) return;
      if (!image.mxcUrl) {
        setError('这张图片当前没有可写入表情包的原始地址。');
        return;
      }
      const { mxcUrl } = image;

      await runAction(async () => {
        const shortcode = await addImageToDefaultCustomEmojiPack(client, {
          mxcUrl,
          name: image.name,
          body: image.body,
          info: buildCustomEmojiInfoFromMedia(image),
          usage: ['emoticon', 'sticker'],
          preferredShortcode: image.name ?? image.body,
        });
        syncCustomEmojiState(client);
        setNotice(`已加入默认表情和贴纸 :${shortcode}:`);
      });
    },
    [client, runAction, syncCustomEmojiState]
  );

  const handleAddMessageImageToEmoji = useCallback(
    (message: ChatMessage) => {
      const attachment = message.attachment;
      if (!attachment || attachment.kind !== 'image') return;

      void addImageToDefaultEmojiPack({
        mxcUrl: attachment.mxcUrl,
        name: attachment.name ?? message.body,
        body: attachment.name ?? message.body,
        mimeType: attachment.mimeType,
        width: attachment.width,
        height: attachment.height,
        size: attachment.size,
      });
    },
    [addImageToDefaultEmojiPack]
  );

  const handleAddPreviewImageToEmoji = useCallback(
    (media: RoomMediaItem) => {
      if (media.kind !== 'image') return;

      void addImageToDefaultEmojiPack({
        mxcUrl: media.mxcUrl,
        name: media.name,
        body: media.name,
        mimeType: media.mimeType,
        width: media.width,
        height: media.height,
        size: media.size,
      });
    },
    [addImageToDefaultEmojiPack]
  );

  const handleRequestPreviewNavigation = useCallback(
    async (direction: 'prev' | 'next', media: RoomMediaItem): Promise<RoomMediaItem | undefined> => {
      if (!client) return undefined;

      const mediaLabel =
        media.kind === 'image' ? '图片' : media.kind === 'video' ? '视频' : '附件';
      const currentItems =
        media.roomId === selectedRoomId ? roomMediaItems : getRoomMediaItems(client, media.roomId);
      const previewableItems = getNavigableRoomMediaItems(currentItems, media.kind);
      const currentIndex = previewableItems.findIndex((item) => item.messageId === media.messageId);
      const step = direction === 'prev' ? -1 : 1;

      if (currentIndex >= 0) {
        const adjacentItem = previewableItems[currentIndex + step];
        if (adjacentItem) {
          return adjacentItem;
        }
      }

      if (direction === 'next') {
        setNotice(`已经是最新${mediaLabel}了`);
        return undefined;
      }

      const oldestLoadedId = previewableItems[0]?.messageId;

      try {
        await paginateRoomMessages(client, media.roomId);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return undefined;
      }

      const refreshedItems = getRoomMediaItems(client, media.roomId);
      if (media.roomId === selectedRoomId) {
        setRoomMediaItems(refreshedItems);
      }
      refreshSnapshot(client);

      const refreshedPreviewableItems = getNavigableRoomMediaItems(refreshedItems, media.kind);
      const refreshedIndex = refreshedPreviewableItems.findIndex((item) => item.messageId === media.messageId);
      if (refreshedIndex > 0) {
        return refreshedPreviewableItems[refreshedIndex - 1];
      }

      const loadedDifferentRange =
        Boolean(oldestLoadedId) && refreshedPreviewableItems[0]?.messageId !== oldestLoadedId;
      setNotice(
        loadedDifferentRange
          ? `已加载更早消息，但这段里没有更多${mediaLabel}`
          : `更早消息里暂时没有更多${mediaLabel}`
      );
      return undefined;
    },
    [client, refreshSnapshot, roomMediaItems, selectedRoomId]
  );

  const cancelMessageSelection = () => {
    setSelectionMode(false);
    setSelectedMessageIds([]);
  };

  const startForwardSelection = (message: ChatMessage) => {
    if (!isForwardableMessage(message)) {
      setError('这条消息当前没有可转发的明文内容');
      return;
    }
    setSheet(undefined);
    setSelectionMode(true);
    setSelectedMessageIds([message.id]);
  };

  const toggleMessageSelection = (message: ChatMessage) => {
    if (!isForwardableMessage(message)) return;
    setSelectedMessageIds((current) =>
      current.includes(message.id)
        ? current.filter((id) => id !== message.id)
        : current.concat(message.id)
    );
  };

  const openForwardSheet = (messages: ChatMessage[]) => {
    const forwardableMessages = messages.filter(isForwardableMessage);
    if (forwardableMessages.length === 0) {
      setError('请至少选择一条可以转发的消息');
      return;
    }
    setSheet({ type: 'forward', messages: forwardableMessages });
  };

  const handleForwardMessages = async (messages: ChatMessage[], targetRoomIds: string[]) => {
    if (!client) return;
    const targetRooms = targetRoomIds
      .map((roomId) => snapshot.rooms.find((room) => room.id === roomId))
      .filter((room): room is RoomSummary => Boolean(room && room.membership === 'join'));
    const forwardableMessages = messages.filter(isForwardableMessage);

    if (targetRooms.length === 0) {
      setError('请选择至少一个已经加入的转发目标');
      return;
    }
    if (forwardableMessages.length === 0) {
      setError('请至少选择一条可以转发的消息');
      return;
    }

    await runAction(async () => {
      await forwardMessagesToRooms(
        client,
        targetRooms.map((room) => room.id),
        forwardableMessages
      );
      setSheet(undefined);
      cancelMessageSelection();
      if (targetRooms.length === 1) {
        const [targetRoom] = targetRooms;
        setSelectedRoomId(targetRoom.id);
        setActiveView(targetRoom.direct ? 'direct' : 'rooms');
        setMobilePane('chat');
      }
    }, `已转发 ${forwardableMessages.length} 条消息到 ${targetRooms.length} 个会话`);
  };

  const handleInsertEmoji = (emoji: string) => {
    const nextDraft = `${messageDraft}${emoji}`;
    handleDraftChange(nextDraft);
  };

  const handlePickCustomEmoji = async (item: CustomEmojiItem, sourceTab?: EmojiTrayTab) => {
    if (!client || !selectedRoom || selectedRoom.membership !== 'join') return;
    const effectiveSourceTab =
      sourceTab ??
      (item.usage.includes('emoticon') ? 'emoji' : item.usage.includes('sticker') ? 'sticker' : 'emoji');

    if (effectiveSourceTab === 'sticker') {
      if (!ensureMatrixReadyForOutgoing('发送贴纸')) return;
      await runAction(
        async () => {
          await sendStickerMessage(client, selectedRoom.id, item);
          setEmojiOpen(false);
        },
        `已发送贴纸：${item.body || item.shortcode}`
      );
      return;
    }

    handleInsertEmoji(`:${item.shortcode}:`);
  };

  const handleToggleVoiceInput = () => {
    if (listening) {
      speechRecognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const SpeechRecognitionCtor =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setError('当前浏览器不支持系统语音听写；在 iOS Safari/WebView 支持时会自动启用');
      return;
    }

    const baseDraft = messageDraft;
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'zh-CN';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? '')
        .join('')
        .trim();
      if (!transcript) return;
      handleDraftChange(`${baseDraft}${baseDraft && !baseDraft.endsWith(' ') ? ' ' : ''}${transcript}`);
    };
    recognition.onerror = (event) => {
      setListening(false);
      setError(getReadableSpeechError(event.error));
    };
    recognition.onend = () => setListening(false);
    speechRecognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  const clearRecordingTimer = () => {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = undefined;
    }
  };

  const resetRecordingState = () => {
    clearRecordingTimer();
    setVoiceRecording(false);
    setVoiceRecordingMs(0);
    mediaRecorderRef.current = undefined;
    mediaRecorderStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaRecorderStreamRef.current = undefined;
  };

  const startVoiceRecording = async () => {
    if (!client || !selectedRoom || selectedRoom.membership !== 'join') return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      if (Capacitor.isNativePlatform()) {
        openNativeAudioCapture();
        return;
      }
      setError('当前环境不支持录制语音；Web 预览需要浏览器支持 MediaRecorder。');
      return;
    }

    if (listening) {
      speechRecognitionRef.current?.stop();
      setListening(false);
    }

    try {
      const targetRoomId = selectedRoom.id;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedAudioRecorderMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const startedAt = Date.now();

      recordingChunksRef.current = [];
      recordingCancelledRef.current = false;
      setRecordingCancelled(false);
      mediaRecorderRef.current = recorder;
      mediaRecorderStreamRef.current = stream;

      recorder.ondataavailable = (evt) => {
        if (evt.data.size > 0) recordingChunksRef.current.push(evt.data);
      };
      recorder.onerror = () => {
        setError('录音失败，请检查麦克风权限');
        resetRecordingState();
      };
      recorder.onstop = () => {
        const cancelled = recordingCancelledRef.current;
        const chunks = recordingChunksRef.current;
        const effectiveMimeType = recorder.mimeType || mimeType || 'audio/webm';
        recordingChunksRef.current = [];
        resetRecordingState();

        if (cancelled) {
          setNotice('已取消语音录');
          return;
        }
        if (chunks.length === 0) {
          setError('没有录到可发送的语音');
          return;
        }

        const extension = extensionFromAudioMimeType(effectiveMimeType);
        const blob = new Blob(chunks, { type: effectiveMimeType });
        const file = new File([blob], `voice-${new Date().toISOString().replace(/[:.]/g, '-')}.${extension}`, {
          type: effectiveMimeType,
        });

        void runAction(
          () => uploadFileMessage(client, targetRoomId, file),
          `已发送语音：${formatDuration(Math.max(1, Math.round((Date.now() - startedAt) / 1000)))}`
        );
      };

      recorder.start(250);
      setVoiceRecording(true);
      setVoiceRecordingMs(0);
      recordingTimerRef.current = window.setInterval(() => {
        setVoiceRecordingMs(Date.now() - startedAt);
      }, 250);
    } catch (err) {
      resetRecordingState();
      if (Capacitor.isNativePlatform()) {
        openNativeAudioCapture();
        return;
      }
      setError(err instanceof Error ? getReadableSpeechError((err as { name?: string }).name) : String(err));
    }
  };

  const stopVoiceRecording = (send = true) => {
    const recorder = mediaRecorderRef.current;
    recordingCancelledRef.current = !send;
    setRecordingCancelled(!send);
    if (!recorder || recorder.state === 'inactive') {
      resetRecordingState();
      return;
    }
    recorder.stop();
  };

  const handleToggleVoiceRecording = () => {
    if (voiceRecording) return;
    void startVoiceRecording();
  };

  useEffect(() => () => {
    clearRecordingTimer();
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = null;
      recorder.stop();
    }
    mediaRecorderStreamRef.current?.getTracks().forEach((track) => track.stop());
    speechRecognitionRef.current?.stop();
  }, []);

  const handleTranscribeAudio = async (message: ChatMessage) => {
    const src = message.attachment?.authDownloadUrl ?? message.attachment?.authUrl ?? message.attachment?.url;
    const fallbackSrc = message.attachment?.downloadUrl ?? message.attachment?.url;
    if (!src) {
      setAudioTranscriptions((current) => ({
        ...current,
        [message.id]: { status: 'error', error: '这条音频没有可读取的媒体地址' },
      }));
      return;
    }

    setAudioTranscriptions((current) => ({
      ...current,
      [message.id]: { status: 'loading', text: current[message.id]?.text },
    }));

    try {
      const blob = await fetchMediaBlob(
        src,
        session?.accessToken,
        fallbackSrc,
        message.attachment?.encryptedFile,
        message.attachment?.mimeType
      );
      const useAihubmix = hasAihubmixAudioTranscription(audioTranscriptionSettings);
      const result = useAihubmix
        ? await (async () => {
            setAudioTranscriptions((current) => ({
              ...current,
              [message.id]: {
                status: 'loading',
                text: current[message.id]?.text,
                detail: '正在准备 AIHubMix 云端转写...',
              },
            }));

            const result = await transcribeAudioWithAihubmixAdaptive(audioTranscriptionSettings, blob, {
              durationMs: message.attachment?.durationMs,
              filename: message.attachment?.name ?? 'voice-message.webm',
              mimeType: message.attachment?.mimeType,
              onProgress: (partialText, detail) => {
                setAudioTranscriptions((current) => ({
                  ...current,
                  [message.id]: {
                    status: 'loading',
                    text: partialText || current[message.id]?.text,
                    detail,
                  },
                }));
              },
            });

            return result;
          })()
        : {
            ...(await transcribeAudioBlobInBrowser(blob, (partialText, detail) => {
              setAudioTranscriptions((current) => ({
                ...current,
                [message.id]: {
                  status: 'loading',
                  text: partialText || current[message.id]?.text,
                  detail,
                },
              }));
            })),
            detail: '浏览器本地转写 · 短语音兜底',
          };
      const displayText = formatTranscriptionForDisplay(result.text, result.segments);
      setAudioTranscriptions((current) => ({
        ...current,
        [message.id]: {
          status: 'success',
          text: displayText || result.text,
          detail: result.detail,
        },
      }));
    } catch (err) {
      setAudioTranscriptions((current) => ({
        ...current,
        [message.id]: {
          status: 'error',
          text: current[message.id]?.text,
          error: err instanceof Error ? err.message : String(err),
        },
      }));
    }
  };

  const runCurrentDeviceVerification = async () => {
    if (!client) return undefined;
    const result = await verifyCurrentDeviceFromSecretStorage(client);
    await refreshCryptoStatus(client);
    refreshSnapshot(client);
    return result;
  };

  const handleVerifyCurrentDevice = async () => {
    if (!client) return;
    setKeyRestoreProgress('正在验证当前设备...');
    setKeyRestoreMessage(undefined);
    setError(undefined);
    try {
      const result = await runCurrentDeviceVerification();
      const message = result
        ? getCurrentDeviceVerificationCopy(result)
        : '当前设备验证状态未改变';
      setKeyRestoreProgress('');
      setKeyRestoreMessage({
        type: result?.currentDeviceVerified ? 'success' : 'error',
        text: message,
      });
      if (result?.currentDeviceVerified) {
        setNotice(message);
      } else {
        setError(message);
      }
    } catch (err) {
      setKeyRestoreProgress('');
      const message = getReadableKeyRestoreError(err);
      setKeyRestoreMessage({ type: 'error', text: message });
      setError(message);
    }
  };

  const handleRestoreFromSecretStorage = async () => {
    if (!client) return;
    setKeyRestoreProgress('正在从安全存储读取密钥备份...');
    setKeyRestoreMessage(undefined);
    setError(undefined);
    try {
      const result = await restoreKeyBackupFromSecretStorage(client, (progress) => {
        setKeyRestoreProgress(
          `正在恢复密钥 ${progress.successes ?? 0}/${progress.total ?? '?'}`
        );
      });
      setKeyRestoreProgress('正在验证当前设备...');
      const verificationResult = await runCurrentDeviceVerification().catch(() => undefined);
      const verificationCopy = verificationResult
        ? `；${getCurrentDeviceVerificationCopy(verificationResult)}`
        : '；当前设备验证未完成，请稍后手动点“验证当前设备”';
      const message = `密钥恢复完成：导入 ${result.imported}/${result.total}${verificationCopy}`;
      setNotice(message);
      setKeyRestoreMessage({
        type: 'success',
        text: message,
      });
      setKeyRestoreProgress('');
    } catch (err) {
      setKeyRestoreProgress('');
      const message = getReadableKeyRestoreError(err);
      setKeyRestoreMessage({ type: 'error', text: message });
      setError(message);
    }
  };

  const handleRestoreWithPassphrase = async () => {
    if (!client) return;
    setKeyRestoreProgress('正在使用恢复密钥读取备份...');
    setKeyRestoreMessage(undefined);
    setError(undefined);
    try {
      const result = await restoreKeyBackupWithPassphrase(client, recoveryPassphrase, (progress) => {
        setKeyRestoreProgress(
          `正在恢复密钥 ${progress.successes ?? 0}/${progress.total ?? '?'}`
        );
      });
      setKeyRestoreProgress('正在验证当前设备...');
      const verificationResult = await runCurrentDeviceVerification().catch(() => undefined);
      const verificationCopy = verificationResult
        ? `；${getCurrentDeviceVerificationCopy(verificationResult)}`
        : '；当前设备验证未完成，请稍后手动点“验证当前设备”';
      const message = `密钥恢复完成：导入 ${result.imported}/${result.total}${verificationCopy}`;
      setNotice(message);
      setKeyRestoreMessage({
        type: 'success',
        text: message,
      });
      setRecoveryPassphrase('');
      setKeyRestoreProgress('');
    } catch (err) {
      setKeyRestoreProgress('');
      const message = getReadableKeyRestoreError(err);
      setKeyRestoreMessage({ type: 'error', text: message });
      setError(message);
    }
  };

  const handleCreateSubmit = async (evt: FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
    if (!client) return;

    await runAction(async () => {
      let roomId = '';
      if (createForm.mode === 'direct') {
        roomId = await createDirectRoom(client, {
          userId: normalizeUserId(createForm.userId, currentUserServer),
          encrypted: createForm.encrypted,
        });
      } else if (createForm.mode === 'group') {
        roomId = await createGroupRoom(client, {
          name: createForm.roomName,
          topic: createForm.topic,
          encrypted: createForm.encrypted,
          publicRoom: createForm.publicRoom,
        });
      } else {
        roomId = await joinRoom(client, createForm.roomIdOrAlias);
      }

      setSelectedRoomId(roomId);
      setActiveView(createForm.mode === 'direct' ? 'direct' : 'rooms');
      setMobilePane('chat');
      setSheet(undefined);
      setCreateForm((current) => ({
        ...current,
        userId: '',
        roomName: '',
        topic: '',
        roomIdOrAlias: '',
      }));
    }, '瀹屾垚');
  };

  const handleInviteSubmit = async (evt: FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
    if (!client || !selectedRoom) return;
    const formElement = evt.currentTarget;
    const form = new FormData(formElement);
    const userId = normalizeUserId(String(form.get('userId') ?? ''), currentUserServer);

    await runAction(() => inviteUser(client, selectedRoom.id, userId), '邀请已发送');
    formElement.reset();
  };

  const handleRoomProfileSubmit = async (evt: FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
    if (!client || !selectedRoom) return;
    await runAction(
      () => updateRoomProfile(client, selectedRoom.id, roomProfileForm),
      '房间资料已更新'
    );
  };

  const handleMentionMember = (member: RoomMemberSummary) => {
    const mention = `${member.id} `;
    const nextDraft =
      messageDraft.endsWith(' ') || messageDraft.length === 0
        ? `${messageDraft}${mention}`
        : `${messageDraft} ${mention}`;
    handleDraftChange(nextDraft);
    setSheet(undefined);
    setMobilePane('chat');
    focusComposerInput();
  };

  const handleMentionMessageSender = useCallback(
    (message: ChatMessage) => {
      const member = getMessageSenderMember(message);
      if (member) handleMentionMember(member);
    },
    [getMessageSenderMember, handleMentionMember]
  );

  const handlePickMentionSuggestion = (member: RoomMemberSummary) => {
    const nextDraft = messageDraft.match(/(?:^|\s)@[^\s@:]{0,32}$/)
      ? messageDraft.replace(/(^|\s)@[^\s@:]{0,32}$/, `$1${member.id} `)
      : `${messageDraft}${messageDraft.endsWith(' ') || !messageDraft ? '' : ' '}${member.id} `;

    handleDraftChange(nextDraft);
  };

  const handleCopyMember = async (member: RoomMemberSummary) => {
    const copied = await copyTextToClipboard(member.id);
    if (copied) {
      setNotice('成员 ID 已复制');
      return;
    }

    setError('当前环境没有拿到剪贴板写入权限，请检查系统复制权限后重试。');
  };

  const handleCopyMemberLink = async (member: RoomMemberSummary) => {
    const copied = await copyTextToClipboard(buildUserPermalink(member.id));
    if (copied) {
      setNotice('用户链接已复制');
      return;
    }

    setError('当前环境没有拿到剪贴板写入权限，请检查系统复制权限后重试。');
  };

  const handleDirectMember = async (member: RoomMemberSummary) => {
    if (!client) return;
    if (member.id === session?.userId) {
      setNotice('这是你自己的账号');
      return;
    }

    await runAction(async () => {
      const existingRoomId = getDirectRoomIdForUser(client, member.id);
      const roomId =
        existingRoomId ??
        (await createDirectRoom(client, {
          userId: member.id,
          encrypted: selectedRoom?.encrypted ?? true,
        }));

      setSelectedRoomId(roomId);
      setActiveView('direct');
      setSheet(undefined);
      setMobilePane('chat');
    }, '已打开私聊');
  };

  const handleKickMember = async (member: RoomMemberSummary) => {
    if (!client || !selectedRoom) return;
    if (!window.confirm(`确定要把 ${member.name} 移出这个房间吗？`)) return;

    await runAction(
      () => kickMember(client, selectedRoom.id, member.id, 'Removed by room moderator'),
      '已移出成员'
    );
  };

  const handleBanMember = async (member: RoomMemberSummary) => {
    if (!client || !selectedRoom) return;
    if (!window.confirm(`确定要封禁 ${member.name} 吗？对方将不能重新加入。`)) return;

    await runAction(
      () => banMember(client, selectedRoom.id, member.id, 'Banned by room moderator'),
      '已封禁成员'
    );
  };

  const toggleFavoriteRoom = (roomId: string) => {
    setFavoriteRoomIds((current) =>
      current.includes(roomId) ? current.filter((id) => id !== roomId) : [...current, roomId]
    );
  };

  const toggleFavoriteMessage = (message: ChatMessage) => {
    const currentlyFavorite = favoriteMessageIds[message.roomId]?.includes(message.id) ?? false;
    const room = snapshot.rooms.find((item) => item.id === message.roomId);
    const snapshotKey = getFavoriteSnapshotKey(message.roomId, message.id);

    setFavoriteMessageIds((current) => {
      const roomFavorites = current[message.roomId] ?? [];
      const nextRoomFavorites = currentlyFavorite
        ? roomFavorites.filter((id) => id !== message.id)
        : [...roomFavorites, message.id];
      return {
        ...current,
        [message.roomId]: nextRoomFavorites,
      };
    });

    setFavoriteMessageSnapshots((current) => {
      if (currentlyFavorite) {
        const nextSnapshots = { ...current };
        delete nextSnapshots[snapshotKey];
        return nextSnapshots;
      }

      return {
        ...current,
        [snapshotKey]: buildStoredFavoriteMessageSnapshot(message, room),
      };
    });
  };

  const handleAddExploreServer = (server: string) => {
    const normalized = normalizeServerName(server);
    if (!normalized) return;
    setExploreServers((current) => [normalized, ...current.filter((item) => item !== normalized)].slice(0, 12));
    const nextSearch = { ...publicSearch, server: normalized };
    setPublicSearch(nextSearch);
    void handlePublicSearch(undefined, nextSearch);
  };

  const handleRemoveExploreServer = (server: string) => {
    setExploreServers((current) => current.filter((item) => item !== server));
  };

  const commitExploreSources = useCallback(
    async (
      updater: (current: ExploreSource[]) => { sources: ExploreSource[]; selectedSourceId?: string },
      success: string
    ): Promise<boolean> => {
      if (!client) return false;

      setError(undefined);
      try {
        const nextState = updater(exploreSources);
        const savedSources = await saveExploreSources(client, nextState.sources);
        setExploreSources(savedSources);
        if (nextState.selectedSourceId !== undefined) {
          setSelectedExploreSourceId(nextState.selectedSourceId);
        }
        refreshSnapshot(client);
        await Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
        setNotice(success);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return false;
      }
    },
    [client, exploreSources, refreshSnapshot]
  );

  const handleCreateExploreSource = useCallback(
    async (draft: ExploreSourceEditorDraft): Promise<boolean> => {
      const sourceId = createLocalId('source');
      const now = Date.now();
      const trimmedTitle = draft.title.trim();
      const nextSource: ExploreSource = {
        id: sourceId,
        kind: draft.kind,
        title: trimmedTitle,
        description: trimToUndefined(draft.description),
        value:
          draft.kind === 'nav'
            ? draft.value.trim() || trimmedTitle
            : draft.value.trim(),
        createdAt: now,
        updatedAt: now,
        ...(draft.kind === 'nav' ? { navSections: [] } : {}),
        ...(draft.kind === 'web'
          ? {
              webOpenMode: 'auto' as const,
              webEmbedStatus: 'unknown' as const,
            }
          : {}),
      };

      return commitExploreSources(
        (current) => ({
          sources: [nextSource, ...current],
          selectedSourceId: sourceId,
        }),
        '已添加探索来源'
      );
    },
    [commitExploreSources]
  );

  const handleUpdateExploreSource = useCallback(
    async (sourceId: string, draft: ExploreSourceEditorDraft): Promise<boolean> =>
      commitExploreSources(
        (current) => ({
          sources: current.map((source) =>
            source.id !== sourceId
              ? source
              : {
                  ...source,
                  title: draft.title.trim(),
                  description: trimToUndefined(draft.description),
                  value:
                    source.kind === 'nav'
                      ? draft.value.trim() || draft.title.trim()
                      : draft.value.trim(),
                  updatedAt: Date.now(),
                }
          ),
          selectedSourceId: sourceId,
        }),
        '已更新探索来源'
      ),
    [commitExploreSources]
  );

  const handleDeleteExploreSource = useCallback(
    async (sourceId: string): Promise<boolean> =>
      commitExploreSources((current) => {
        const remainingSources = current.filter((source) => source.id !== sourceId);
        const nextSelectedSource =
          selectedExploreSourceId === sourceId
            ? (remainingSources.find((source) => source.kind === 'nav') ?? remainingSources[0])?.id
            : selectedExploreSourceId;
        return {
          sources: remainingSources,
          selectedSourceId: nextSelectedSource,
        };
      }, '已删除探索来源'),
    [commitExploreSources, selectedExploreSourceId]
  );

  const handleCreateExploreSection = useCallback(
    async (sourceId: string, title: string): Promise<boolean> => {
      const sectionId = createLocalId('section');
      return commitExploreSources(
        (current) => ({
          sources: current.map((source) =>
            source.id !== sourceId || source.kind !== 'nav'
              ? source
              : {
                  ...source,
                  updatedAt: Date.now(),
                  navSections: [
                    ...(source.navSections ?? []),
                    {
                      id: sectionId,
                      title: title.trim(),
                      cards: [],
                    },
                  ],
                }
          ),
          selectedSourceId: sourceId,
        }),
        '已添加分组'
      );
    },
    [commitExploreSources]
  );

  const handleUpdateExploreSection = useCallback(
    async (sourceId: string, sectionId: string, title: string): Promise<boolean> =>
      commitExploreSources(
        (current) => ({
          sources: current.map((source) =>
            source.id !== sourceId || source.kind !== 'nav'
              ? source
              : {
                  ...source,
                  updatedAt: Date.now(),
                  navSections: (source.navSections ?? []).map((section) =>
                    section.id === sectionId ? { ...section, title: title.trim() } : section
                  ),
                }
          ),
          selectedSourceId: sourceId,
        }),
        '已更新分组'
      ),
    [commitExploreSources]
  );

  const handleDeleteExploreSection = useCallback(
    async (sourceId: string, sectionId: string): Promise<boolean> =>
      commitExploreSources(
        (current) => ({
          sources: current.map((source) =>
            source.id !== sourceId || source.kind !== 'nav'
              ? source
              : {
                  ...source,
                  updatedAt: Date.now(),
                  navSections: (source.navSections ?? []).filter((section) => section.id !== sectionId),
                }
          ),
          selectedSourceId: sourceId,
        }),
        '已删除分组'
      ),
    [commitExploreSources]
  );

  const handleCreateExploreCard = useCallback(
    async (sourceId: string, sectionId: string, draft: ExploreNavCardEditorDraft): Promise<boolean> => {
      const cardId = createLocalId('card');
      const nextCard: ExploreNavCard = {
        id: cardId,
        title: draft.title.trim(),
        url: draft.url.trim(),
        description: trimToUndefined(draft.description),
        iconUrl: trimToUndefined(draft.iconUrl),
        tags: parseExploreTagDraft(draft.tags),
      };

      return commitExploreSources(
        (current) => ({
          sources: current.map((source) =>
            source.id !== sourceId || source.kind !== 'nav'
              ? source
              : {
                  ...source,
                  updatedAt: Date.now(),
                  navSections: (source.navSections ?? []).map((section) =>
                    section.id !== sectionId
                      ? section
                      : {
                          ...section,
                          cards: [...section.cards, nextCard],
                        }
                  ),
                }
          ),
          selectedSourceId: sourceId,
        }),
        '已创建卡片'
      );
    },
    [commitExploreSources]
  );

  const handleUpdateExploreCard = useCallback(
    async (
      sourceId: string,
      sectionId: string,
      cardId: string,
      draft: ExploreNavCardEditorDraft
    ): Promise<boolean> =>
      commitExploreSources(
        (current) => ({
          sources: current.map((source) =>
            source.id !== sourceId || source.kind !== 'nav'
              ? source
              : {
                  ...source,
                  updatedAt: Date.now(),
                  navSections: (source.navSections ?? []).map((section) =>
                    section.id !== sectionId
                      ? section
                      : {
                          ...section,
                          cards: section.cards.map((card) =>
                            card.id !== cardId
                              ? card
                              : {
                                  ...card,
                                  title: draft.title.trim(),
                                  url: draft.url.trim(),
                                  description: trimToUndefined(draft.description),
                                  iconUrl: trimToUndefined(draft.iconUrl),
                                  tags: parseExploreTagDraft(draft.tags),
                                }
                          ),
                        }
                  ),
                }
          ),
          selectedSourceId: sourceId,
        }),
        '已更新卡片'
      ),
    [commitExploreSources]
  );

  const handleDeleteExploreCard = useCallback(
    async (sourceId: string, sectionId: string, cardId: string): Promise<boolean> =>
      commitExploreSources(
        (current) => ({
          sources: current.map((source) =>
            source.id !== sourceId || source.kind !== 'nav'
              ? source
              : {
                  ...source,
                  updatedAt: Date.now(),
                  navSections: (source.navSections ?? []).map((section) =>
                    section.id !== sectionId
                      ? section
                      : {
                          ...section,
                          cards: section.cards.filter((card) => card.id !== cardId),
                        }
                  ),
                }
          ),
          selectedSourceId: sourceId,
        }),
        '已删除卡片'
      ),
    [commitExploreSources]
  );

  const handlePublicSearch = async (
    evt?: FormEvent<HTMLFormElement>,
    overrideSearch?: { server: string; query: string }
  ) => {
    evt?.preventDefault();
    if (!client) return;

    setPublicLoading(true);
    setError(undefined);
    try {
      const rooms = await searchPublicRooms(client, overrideSearch ?? publicSearch);
      setPublicRooms(rooms);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPublicLoading(false);
    }
  };

  const handleProfileSubmit = async (evt: FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
    if (!client) return;
    await runAction(async () => {
      await updateOwnDisplayName(client, profileForm.displayName);
      const profile = await getOwnProfile(client);
      setOwnProfile(profile);
      setProfileForm({ displayName: profile.displayName ?? profile.userId });
    }, '个人资料已更新');
  };

  const handleProfileAvatarSelected = async (file: File) => {
    if (!client) return;
    await runAction(async () => {
      await updateOwnAvatar(client, file);
      const profile = await getOwnProfile(client);
      setOwnProfile(profile);
    }, '头像已更新');
  };

  const handleRoomAvatarSelected = async (file: File) => {
    if (!client || !selectedRoom) return;
    await runAction(() => updateRoomAvatar(client, selectedRoom.id, file), '房间头像已更新新');
  };

  const handlePreviewMemberAvatar = (member: RoomMemberSummary) => {
    if (!selectedRoom || !member.avatarUrl) return;
    setPreviewMedia({
      messageId: `member-avatar-${member.id}`,
      roomId: selectedRoom.id,
      kind: 'image',
      url: member.avatarUrl,
      authUrl: member.avatarUrl,
      name: `${member.name} 的头像`,
      senderName: member.name,
      timestamp: Date.now(),
    });
  };

  const favoriteMessageCount = favoriteMessageItems.length;
  const renderedSelectedRoomMessages = useMemo(
    () =>
      selectedRoomMessages.map((message, index) => {
        const previousMessage = selectedRoomMessages[index - 1];
        const showDateSeparator =
          !previousMessage || getDayKey(previousMessage.timestamp) !== getDayKey(message.timestamp);

        return (
          <Fragment key={message.id}>
            {showDateSeparator && <TimelineDateSeparator timestamp={message.timestamp} />}
            <MessageBubble
              client={client}
              message={message}
              favorite={favoriteMessageIds[message.roomId]?.includes(message.id) ?? false}
              highlighted={message.id === highlightedMessageId}
              selectionMode={selectionMode}
              selected={selectedMessageIds.includes(message.id)}
              forwardable={isForwardableMessage(message)}
              mediaAccessToken={session?.accessToken}
              customEmojiItems={customEmojiItems}
              members={roomMembers}
              currentUserProfile={ownProfile}
              readReceiptAvatarCount={preferences.readReceiptAvatarCount}
              inlineReadReceiptState={selectedRoomInlineReadReceiptStates.get(message.id)}
              audioTranscription={audioTranscriptions[message.id]}
              onToggleSelection={() => toggleMessageSelection(message)}
              onFavorite={() => toggleFavoriteMessage(message)}
              onReply={() => {
                setComposerMode({ type: 'reply', message });
                setMessageDraft('');
              }}
              onOpenReply={(eventId) => void handleOpenRoomEvent(message.roomId, eventId)}
              onInfo={() => handleOpenMessageInfo(message)}
              onEdit={() => handleEditMessage(message)}
              onRedact={() => handleRedactMessage(message)}
              onCopy={() => handleCopyMessage(message)}
              onCopyLink={() => handleCopyMessageLink(message)}
              onTogglePin={() => handleTogglePinMessage(message)}
              onForward={() => startForwardSelection(message)}
              onRetrySend={() => void handleRetryPendingMessage(message)}
              onPreviewAttachment={() => handlePreviewAttachment(message)}
              onAddImageToEmoji={() => handleAddMessageImageToEmoji(message)}
              onTranscribeAudio={() => handleTranscribeAudio(message)}
              onOpenUserProfile={() => handleOpenMessageSenderProfile(message)}
              onOpenMentionMember={openUserProfile}
              onMentionSender={() => handleMentionMessageSender(message)}
              onOpenReadReceipts={() =>
                handleOpenReadReceipts(message, selectedRoomInlineReadReceiptStates.get(message.id))
              }
              editing={editingMessageId === message.id}
              editingDraft={editingMessageId === message.id ? editingMessageDraft : ''}
              savingEdit={savingInlineEdit && editingMessageId === message.id}
              onEditingDraftChange={setEditingMessageDraft}
              onCancelEdit={handleCancelInlineEdit}
              onSaveEdit={() => handleSaveInlineEdit(message)}
              onReact={(key, shortcode) =>
                client &&
                runAction(
                  () => sendReaction(client, message.roomId, message.id, key, shortcode),
                  '已更新回应'
                )
              }
            />
          </Fragment>
        );
      }),
    [
      audioTranscriptions,
      client,
      customEmojiItems,
      editingMessageDraft,
      editingMessageId,
      favoriteMessageIds,
      handleAddMessageImageToEmoji,
      handleCancelInlineEdit,
      handleCopyMessage,
      handleCopyMessageLink,
      handleEditMessage,
      handleOpenMessageInfo,
      handleOpenRoomEvent,
      handleOpenMessageSenderProfile,
      handleOpenReadReceipts,
      handlePreviewAttachment,
      handleRedactMessage,
      handleRetryPendingMessage,
      handleSaveInlineEdit,
      handleTogglePinMessage,
      handleTranscribeAudio,
      highlightedMessageId,
      handleMentionMessageSender,
      openUserProfile,
      ownProfile,
      preferences.readReceiptAvatarCount,
      roomMembers,
      runAction,
      savingInlineEdit,
      selectedMessageIds,
      selectedRoomInlineReadReceiptStates,
      selectedRoomMessages,
      selectionMode,
      session?.accessToken,
      startForwardSelection,
      toggleFavoriteMessage,
      toggleMessageSelection,
    ]
  );

  const bootLoadingLabel = pendingNativeCaptureIntent
    ? pendingNativeCaptureIntent.kind === 'video'
      ? '正在从系统录像返回并恢复本地会话'
      : '正在从系统相机返回并恢复本地会话'
    : '正在恢复本地会话';
  const connectingLoadingLabel = pendingNativeCaptureIntent
    ? '正在恢复 Matrix 同步、加密与本地媒体缓存'
    : '正在连接 Matrix 与加密存储';

  if (bootState === 'booting') {
    return <LoadingScreen label={bootLoadingLabel} />;
  }

  if (bootState === 'signedOut' || (bootState === 'error' && !session)) {
    return (
      <main className="auth-screen">
        <section className="auth-panel">
          <div className="auth-brand">
            <div className="brand-mark">
              <Sparkles size={30} />
            </div>
            <div>
              <p className="eyebrow">Starfire iOS</p>
              <h1>登录 Matrix</h1>
            </div>
          </div>

          <form className="login-form" onSubmit={handleLogin}>
            <label>
              Homeserver
              <input
                value={loginForm.baseUrl}
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                onChange={(evt) =>
                  setLoginForm((current) => ({ ...current, baseUrl: evt.target.value }))
                }
              />
            </label>
            <label>
              用户名或 Matrix ID
              <input
                value={loginForm.username}
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="@user:server 或 user"
                onChange={(evt) =>
                  setLoginForm((current) => ({ ...current, username: evt.target.value }))
                }
              />
            </label>
            <label>
              密码
              <input
                value={loginForm.password}
                type="password"
                autoComplete="current-password"
                onChange={(evt) =>
                  setLoginForm((current) => ({ ...current, password: evt.target.value }))
                }
              />
            </label>

            {error && <button className="message-box danger" type="button" onClick={() => setError(undefined)}>{error}</button>}

            <button className="primary-button" type="submit">
              <Lock size={18} />
              登录
            </button>
          </form>
        </section>
      </main>
    );
  }

  if (bootState === 'connecting') {
    return <LoadingScreen label={connectingLoadingLabel} />;
  }

  const showPaneSearch = activeView !== 'explore' && activeView !== 'settings' && activeView !== 'favorites';
  const showPaneCreate =
    activeView !== 'favorites' &&
    activeView !== 'invites' &&
    activeView !== 'explore' &&
    activeView !== 'settings';
  const showPaneActions = showPaneSearch || showPaneCreate;
  const showCollapsedExpandButton = composerCanExpand && !composerExpanded;
  const showInlineComposerMic = !composerExpanded && !voiceRecording && !messageDraft.trim();
  const composerSideRailClassName = [
    'composer-side-rail',
    showCollapsedExpandButton ? 'has-expand' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const composerInputShellClassName = [
    'composer-input-shell',
    showInlineComposerMic ? 'has-mic' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const handleAppTouchStart = (event: ReactTouchEvent<HTMLElement>) => {
    if (!isIosPlatform || window.innerWidth >= 960) return;
    if (event.touches.length !== 1 || !canPerformEdgeBackNavigation()) return;

    const touch = event.touches[0];
    if (!touch || touch.clientX > iosEdgeBackGestureZonePx) return;

    clearIosEdgeBackResetTimeout();
    resetIosEdgeBackVisual();
    iosEdgeBackGestureRef.current = {
      identifier: touch.identifier,
      startX: touch.clientX,
      startY: touch.clientY,
      engaged: false,
    };
  };

  const handleAppTouchMove = (event: ReactTouchEvent<HTMLElement>) => {
    const gesture = iosEdgeBackGestureRef.current;
    if (!gesture) return;

    const touch = Array.from(event.touches).find((item) => item.identifier === gesture.identifier);
    if (!touch) {
      iosEdgeBackGestureRef.current = undefined;
      resetIosEdgeBackVisual();
      return;
    }

    const deltaX = touch.clientX - gesture.startX;
    const deltaY = touch.clientY - gesture.startY;
    if (deltaX <= 0) return;
    if (Math.abs(deltaY) > Math.abs(deltaX) * 1.15 && Math.abs(deltaY) > 14) {
      iosEdgeBackGestureRef.current = undefined;
      resetIosEdgeBackVisual();
      return;
    }
    if (deltaX < 14 && !gesture.engaged) return;

    gesture.engaged = true;
    setIosEdgeBackVisual(deltaX, true);
    event.preventDefault();
  };

  const handleAppTouchEnd = (event: ReactTouchEvent<HTMLElement>) => {
    const gesture = iosEdgeBackGestureRef.current;
    iosEdgeBackGestureRef.current = undefined;
    if (!gesture) return;

    const touch = Array.from(event.changedTouches).find((item) => item.identifier === gesture.identifier);
    if (!touch) return;

    const deltaX = touch.clientX - gesture.startX;
    const deltaY = touch.clientY - gesture.startY;
    if (deltaX >= iosBackGestureTriggerPx && Math.abs(deltaX) > Math.abs(deltaY) * 1.1) {
      event.preventDefault();
      setIosEdgeBackVisual(deltaX, false);
      performEdgeBackNavigation();
      clearIosEdgeBackResetTimeout();
      iosEdgeBackResetTimeoutRef.current = window.setTimeout(() => {
        iosEdgeBackResetTimeoutRef.current = undefined;
        resetIosEdgeBackVisual();
      }, 120);
      return;
    }

    resetIosEdgeBackVisual();
  };

  return (
    <main
      ref={appFrameRef}
      className={`app-frame mobile-${mobilePane} theme-${preferences.appearance} density-${preferences.density}`}
      onTouchStart={handleAppTouchStart}
      onTouchMove={handleAppTouchMove}
      onTouchEnd={handleAppTouchEnd}
      onTouchCancel={() => {
        iosEdgeBackGestureRef.current = undefined;
        clearIosEdgeBackResetTimeout();
        resetIosEdgeBackVisual();
      }}
    >
      <aside className="rail">
        <div className="rail-brand">
          <Sparkles size={22} />
        </div>
        <nav className="rail-nav" aria-label="主导航">
          {(['home', 'direct', 'rooms', 'invites', 'favorites', 'explore', 'settings'] as PrimaryView[]).map(
            (view) => (
              <button
                key={view}
                className={activeView === view ? 'rail-button active' : 'rail-button'}
                onClick={() => {
                  setActiveView(view);
                  setMobilePane('list');
                }}
                aria-label={viewLabels[view]}
              >
                {viewIcon(view)}
                {unreadByView[view] > 0 && <span className="rail-badge">{unreadByView[view]}</span>}
              </button>
            )
          )}
        </nav>
      </aside>

      <section className="room-pane">
        {showPaneActions && (
          <div className="pane-actions">
            {showPaneSearch && (
              <label className="search-field">
                <Search size={17} />
                <input
                  value={roomQuery}
                  placeholder="搜索会话、别名、主题"
                  onChange={(evt) => setRoomQuery(evt.target.value)}
                />
              </label>
            )}
            {showPaneCreate && (
              <button className="icon-button strong" onClick={() => setSheet('new')} aria-label="新建">
                <Plus size={20} />
              </button>
            )}
          </div>
        )}

        {showPaneSearch && (
          <>
            <RoomFilterBar
              value={roomFilter}
              counts={roomFilterCounts}
              options={roomFilterOptions}
              onChange={setRoomFilter}
            />
            <div className="room-list-stack">
              {activeView === 'rooms' && roomFilter === 'spaces' && selectedSpace && (
                <button className="space-breadcrumb" type="button" onClick={() => setSelectedSpaceId(undefined)}>
                  <ChevronLeft size={16} />
                  <span>
                    <strong>{selectedSpace.name}</strong>
                    <small>返回空间列表</small>
                  </span>
                </button>
              )}
              <MemoRoomList
                rooms={visibleRooms}
                selectedRoomId={selectedRoomId}
                favoriteRoomIds={favoriteRoomIds}
                roomDrafts={roomDrafts}
                mediaAccessToken={session?.accessToken}
                onSelectRoom={handleSelectRoom}
                onAccept={(roomId) =>
                  client && runAction(() => acceptInvite(client, roomId), '已加入房间')
                }
                onReject={(roomId) =>
                  client && runAction(() => rejectInvite(client, roomId), '已拒绝邀请')
                }
                onSetNotificationMode={(room, mode) => void handleSetRoomNotificationMode(room, mode)}
              />
              {localSearchResults.length > 0 && (
                <LocalSearchDigest
                  results={localSearchResults}
                  mediaAccessToken={session?.accessToken}
                  onOpen={(roomId, eventId) => void handleOpenRoomEvent(roomId, eventId)}
                />
              )}
            </div>
          </>
        )}

        {activeView === 'favorites' && (
          <FavoritesPanel
            rooms={roomBuckets.favorites}
            messages={favoriteMessageItems}
            favoriteMessageIds={favoriteMessageIds}
            roomDrafts={roomDrafts}
            mediaAccessToken={session?.accessToken}
            onOpenRoom={(roomId) => {
              const room = snapshot.rooms.find((item) => item.id === roomId);
              handleSelectRoom(roomId);
              setActiveView(room?.direct ? 'direct' : 'rooms');
            }}
            onCopyMessage={(message) => void handleCopyMessage(message)}
            onPreviewAttachment={handlePreviewAttachment}
            onToggleRoom={toggleFavoriteRoom}
            onToggleMessage={(message) => toggleFavoriteMessage(message)}
            onCreate={() => setSheet('new')}
            onExplore={() => setActiveView('explore')}
          />
        )}

        {activeView === 'explore' && (
          <ExplorePanel
            sources={exploreSources}
            selectedSourceId={selectedExploreSource?.id}
            publicSearch={publicSearch}
            publicRooms={publicRooms}
            publicLoading={publicLoading}
            currentServer={currentUserServer}
            joinedRooms={snapshot.rooms.filter((room) => room.membership === 'join')}
            customServers={exploreServers}
            mediaAccessToken={session?.accessToken}
            onSelectSource={setSelectedExploreSourceId}
            onChange={setPublicSearch}
            onSearch={handlePublicSearch}
            onCreateSource={handleCreateExploreSource}
            onUpdateSource={handleUpdateExploreSource}
            onDeleteSource={handleDeleteExploreSource}
            onCreateSection={handleCreateExploreSection}
            onUpdateSection={handleUpdateExploreSection}
            onDeleteSection={handleDeleteExploreSection}
            onCreateCard={handleCreateExploreCard}
            onUpdateCard={handleUpdateExploreCard}
            onDeleteCard={handleDeleteExploreCard}
            onPickServer={(server) => {
              const nextSearch = { ...publicSearch, server };
              setPublicSearch(nextSearch);
              void handlePublicSearch(undefined, nextSearch);
            }}
            onAddServer={handleAddExploreServer}
            onRemoveServer={handleRemoveExploreServer}
            onOpenJoined={(roomId) => {
              setSelectedRoomId(roomId);
              setActiveView('rooms');
              setMobilePane('chat');
            }}
            onJoin={(roomIdOrAlias) =>
              client &&
              runAction(async () => {
                const roomId = await joinRoom(client, roomIdOrAlias);
                setSelectedRoomId(roomId);
                setActiveView('rooms');
                setMobilePane('chat');
              }, '已加入公开房间')
            }
          />
        )}

        {activeView === 'settings' && (
          <SettingsPanel
            session={session}
            snapshot={snapshot}
            favoriteMessageCount={favoriteMessageCount}
            customEmojiCount={customEmojiItems.length}
            exploreSourceCount={exploreSources.length}
            onLogout={handleLogout}
            ownProfile={ownProfile}
            profileForm={profileForm}
            preferences={preferences}
            audioTranscriptionSettings={audioTranscriptionSettings}
            audioTranscriptionSupportLabel={getAudioTranscriptionSupportLabel(audioTranscriptionSettings)}
            cryptoStatus={cryptoStatus}
            cryptoStatusReady={cryptoStatusReady}
            mediaAccessToken={session?.accessToken}
            onProfileChange={setProfileForm}
            onProfileSubmit={handleProfileSubmit}
            onAvatarSelected={handleProfileAvatarSelected}
            onPreferencesChange={setPreferences}
            onAudioTranscriptionSettingsChange={handleAudioTranscriptionSettingsChange}
            onOpenSecurity={() => setSheet('security')}
            onOpenEmojiManager={() => setSheet('emojiManager')}
            onOpenFavorites={() => {
              setActiveView('favorites');
              setMobilePane('list');
            }}
            onOpenInvites={() => {
              setActiveView('invites');
              setMobilePane('list');
            }}
            onOpenExplore={() => {
              setActiveView('explore');
              setMobilePane('list');
            }}
            onClearLocal={() => {
              window.localStorage.removeItem(favoriteRoomsKey);
              window.localStorage.removeItem(favoriteMessagesKey);
              window.localStorage.removeItem(favoriteMessageSnapshotsKey);
              clearCustomEmojiSnapshot();
              setFavoriteRoomIds([]);
              setFavoriteMessageIds({});
              setFavoriteMessageSnapshots({});
              setCustomEmojiItems([]);
              setNotice('本地偏好已清');
            }}
          />
        )}
      </section>

      <section className="chat-pane">
        {activeView === 'settings' ? (
          <SettingsHero onLogout={handleLogout} session={session} />
        ) : activeView === 'explore' && !selectedRoom ? (
          <ExploreHero />
        ) : selectedRoom ? (
          <>
            <header className="chat-header">
              <button className="mobile-back" onClick={() => setMobilePane('list')} aria-label="返回">
                <ChevronLeft size={22} />
              </button>
              <div className="chat-title">
                <h2>{selectedRoom.name}</h2>
                <span>
                  {selectedRoom.direct ? '私聊' : selectedRoom.space ? '空间' : '群组'} · {selectedRoom.memberCount} 人
                  {selectedRoom.encrypted ? ' · E2EE' : ''}
                </span>
              </div>
              <div className="chat-header-actions">
                <button
                  className={messageSearchOpen || messageQuery.trim() ? 'icon-button active' : 'icon-button'}
                  onClick={() => {
                    if (messageSearchOpen || messageQuery.trim()) {
                      setMessageQuery('');
                      setMessageSearchOpen(false);
                      return;
                    }
                    setMessageSearchOpen(true);
                  }}
                  aria-label="搜索房间消息"
                >
                  <Search size={19} />
                </button>
                <button
                  className={favoriteRoomIds.includes(selectedRoom.id) ? 'icon-button active' : 'icon-button'}
                  onClick={() => toggleFavoriteRoom(selectedRoom.id)}
                  aria-label="收藏房间"
                >
                  <Star size={19} />
                </button>
                <button
                  className={cryptoStatusReady && !cryptoStatus.cryptoReady ? 'icon-button warning' : 'icon-button'}
                  onClick={() => setSheet('security')}
                  aria-label="加密与密钥恢复"
                >
                  <KeyRound size={19} />
                </button>
                <button className="icon-button" onClick={() => setSheet('roomInfo')} aria-label="房间信息">
                  <Info size={19} />
                </button>
              </div>
            </header>

            {(messageSearchOpen || messageQuery.trim()) && (
              <div className="chat-tools">
              <label className="search-field slim">
                <Search size={16} />
                <input
                  autoFocus
                  value={messageQuery}
                  placeholder="在当前房间搜索消息"
                  onChange={(evt) => setMessageQuery(evt.target.value)}
                />
              </label>
              <button
                className="tool-button"
                onClick={() =>
                  client &&
                  runAction(async () => {
                    await markRoomRead(client, selectedRoom.id, {
                      sendReceipt: preferences.sendReadReceipts,
                    });
                    setSnapshot(getMatrixSnapshot(client));
                  }, '已标记为已读')
                }
              >
                <Check size={16} />
                已读
              </button>
              </div>
            )}

            <div className="chat-status-stack">
              {pinnedMessages.length > 0 && (
                <PinnedBar
                  items={pinnedMessages}
                  onOpen={(eventId) => void handleOpenPinnedMessage(selectedRoom.id, eventId)}
                  onOpenAll={() => setSheet('roomInfo')}
                />
              )}
              {matrixConnectionBanner && (
                <button
                  className={`message-box ${matrixConnectionBanner.tone} inline`}
                  type="button"
                  onClick={() => attemptMatrixRecovery('manual')}
                >
                  {matrixConnectionBanner.text}
                </button>
              )}
              {selectedRoomPendingSendCount > 0 && !matrixConnectionBanner && (
                <div className="message-box warning inline">
                  有 {selectedRoomPendingSendCount} 条消息正在等待发送
                </div>
              )}
              {selectedRoomFailedSendCount > 0 && (
                <button
                  className="message-box danger inline"
                  type="button"
                  onClick={() => void handleRetryAllFailedSelectedRoomMessages()}
                >
                  有 {selectedRoomFailedSendCount} 条消息还没真正发出去，点这里重试
                </button>
              )}
              {error && <button className="message-box danger inline" type="button" onClick={() => setError(undefined)}>{error}</button>}
            </div>

            {selectionMode && (
              <div className="selection-toolbar">
                <span>
                  <strong>{selectedForwardMessages.length}</strong>
                  条消息已选                </span>
                <div>
                  <button type="button" className="secondary-button compact" onClick={cancelMessageSelection}>
                    <X size={16} />
                    取消
                  </button>
                  <button
                    type="button"
                    className="primary-button compact"
                    onClick={() => openForwardSheet(selectedForwardMessages)}
                    disabled={selectedForwardMessages.length === 0}
                  >
                    <Forward size={16} />
                    转发
                  </button>
                </div>
              </div>
            )}

            <div className="timeline-shell">
              <div
                key={selectedRoom.id}
                className="timeline"
                ref={timelineRef}
                onScroll={handleTimelineScroll}
              >
                {activeTimelineContext ? (
                  <div className="timeline-context-banner">
                    <span>正在查看原消息附近</span>
                    <button type="button" onClick={handleReturnToLatestTimeline}>
                      返回最新
                    </button>
                  </div>
                ) : (
                  <button className="load-older" onClick={() => void loadOlderMessages()} disabled={loadingOlder}>
                    <History size={15} />
                    {loadingOlder ? '加载中...' : '加载更早消息'}
                  </button>
                )}
                {selectedRoomMessages.length === 0 ? (
                  <EmptyState
                    icon={<MessageCircle size={30} />}
                    title={messageQuery ? '没有匹配消息' : '这里还没有消息'}
                    copy={messageQuery ? '换一个关键词试试。' : '发出第一条消息，或者等待同步更多历史记录。'}
                  />
                ) : (
                  renderedSelectedRoomMessages
                )}
              </div>
              {showScrollToLatest && selectedRoomMessages.length > 0 && !activeTimelineContext && (
                <button
                  className="scroll-to-latest-button"
                  type="button"
                  onClick={handleReturnToLatestTimeline}
                  aria-label="回到底部最新消息"
                >
                  <ChevronDown size={20} />
                </button>
              )}
            </div>

            <form className={composerExpanded ? 'composer expanded' : 'composer'} onSubmit={handleSendMessage}>
              {typingMembers.length > 0 && (
                <div className="typing-line">
                  {typingMembers.slice(0, 3).join('')} 正在输入
                </div>
              )}
              {composerMode.type === 'normal' && messageDraft.startsWith('/') && (
                <div className="command-hint">
                  支持 /me /join /invite /topic /shrug
                </div>
              )}
              {composerMode.type !== 'normal' && (
                <div className="composer-context">
                  <span>
                    {composerMode.type === 'edit' ? '编辑消息' : `回复 ${composerMode.message.senderName ?? '消息'}`}
                    <small>{getReadableMessageBody(composerMode.message.body)}</small>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setComposerMode({ type: 'normal' });
                      setMessageDraft('');
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
              {voiceRecording && (
                <div className="recording-line">
                  <Mic size={16} />
                  <span>
                    正在录音
                    <strong>{formatDuration(voiceRecordingMs / 1000)}</strong>
                    <em>{recordingCancelled ? '正在取消' : '点发送后会把语音直接发出'}</em>
                  </span>
                  <div className="recording-line-actions">
                    <button type="button" onClick={() => stopVoiceRecording(false)} aria-label="取消录音">
                      <X size={16} />
                    </button>
                    <button type="button" className="send" onClick={() => stopVoiceRecording(true)} aria-label="发送语">
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              )}
              {listening && (
                <div className="voice-input-line">
                  <MessageCircle size={16} />
                  <span>正在语音听写，识别结果会直接进入输入框</span>
                  <button type="button" onClick={handleToggleVoiceInput} aria-label="停止语音听写">
                    <X size={16} />
                  </button>
                </div>
              )}
              {mentionSuggestions.length > 0 && (
                <MentionSuggestions
                  members={mentionSuggestions}
                  mediaAccessToken={session?.accessToken}
                  onPick={handlePickMentionSuggestion}
                />
              )}
              {composerExpanded && (
                <div className="composer-expanded-topbar">
                  <button
                    className="composer-collapse-button"
                    type="button"
                    onClick={handleCollapseComposer}
                    aria-label="收起大输入框"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
              )}
              <input
                id={composerAttachmentInputIds.file}
                className="attachment-picker-input"
                type="file"
                aria-hidden="true"
                tabIndex={-1}
                onChange={handleFileSelected}
              />
              <input
                id={composerAttachmentInputIds.image}
                className="attachment-picker-input"
                type="file"
                accept="image/*"
                aria-hidden="true"
                tabIndex={-1}
                onChange={handleFileSelected}
              />
              <input
                id={composerAttachmentInputIds.video}
                className="attachment-picker-input"
                type="file"
                accept="video/*"
                aria-hidden="true"
                tabIndex={-1}
                onChange={handleFileSelected}
              />
              <input
                id={composerAttachmentInputIds.cameraImage}
                className="attachment-picker-input"
                type="file"
                accept="image/*"
                capture="environment"
                aria-hidden="true"
                tabIndex={-1}
                onChange={handleFileSelected}
              />
              <input
                id={composerAttachmentInputIds.cameraVideo}
                className="attachment-picker-input"
                type="file"
                accept="video/*"
                capture="environment"
                aria-hidden="true"
                tabIndex={-1}
                onChange={handleFileSelected}
              />
              <input
                id={composerAttachmentInputIds.audioCapture}
                ref={audioCaptureInputRef}
                className="attachment-picker-input"
                type="file"
                accept="audio/*"
                capture="user"
                aria-hidden="true"
                tabIndex={-1}
                onChange={handleAudioCaptureSelected}
              />
              <div className="composer-input-row">
                <div className={composerSideRailClassName}>
                  {showCollapsedExpandButton && (
                    <button
                      className="composer-expand-button"
                      type="button"
                      onClick={handleExpandComposer}
                      aria-label="展开大输入框"
                      aria-expanded={composerExpanded}
                    >
                      <ExpandComposerIcon />
                    </button>
                  )}
                  <div className="composer-tools" aria-label="输入工具">
                    <button
                      className="icon-button"
                      type="button"
                      onClick={() => setAttachmentPickerOpen(true)}
                      aria-label="发送附件"
                      disabled={selectedRoom.membership !== 'join'}
                    >
                      <FileUp size={19} />
                    </button>
                    <button
                      ref={emojiToggleButtonRef}
                      className={emojiOpen ? 'icon-button active' : 'icon-button'}
                      type="button"
                      onClick={handleToggleComposerEmojiTray}
                      aria-label={emojiOpen ? '切换到键盘输入' : '打开表情托盘'}
                      disabled={selectedRoom.membership !== 'join'}
                    >
                      {emojiOpen ? <KeyboardIcon size={19} /> : <SmilePlus size={19} />}
                    </button>
                  </div>
                </div>
                <div className={composerInputShellClassName}>
                  <textarea
                    ref={composerInputRef}
                    value={messageDraft}
                    rows={1}
                    style={{ height: `${composerTextareaHeight}px` }}
                    enterKeyHint="send"
                    placeholder={selectedRoom.membership === 'join' ? '输入消息' : '需要先加入房间'}
                    disabled={selectedRoom.membership !== 'join'}
                    onFocus={() => {
                      requestComposerBottomLock();
                      if (emojiOpen) {
                        setEmojiOpen(false);
                      }
                    }}
                    onKeyDown={handleComposerKeyDown}
                    onChange={(evt) => handleDraftChange(evt.target.value)}
                  />
                  {showInlineComposerMic && (
                    <div className="composer-inline-actions">
                      <button
                        className="composer-inline-mic"
                        type="button"
                        onClick={handleToggleVoiceRecording}
                        aria-label="录制语音"
                        disabled={selectedRoom.membership !== 'join'}
                      >
                        <Mic size={18} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {emojiOpen && selectedRoom.membership === 'join' && (
                <div className="emoji-tray-shell" ref={emojiTrayRef}>
                  <EnhancedEmojiTray
                    emojis={composerEmojiOptions}
                    customItems={customEmojiItems}
                    accessToken={session?.accessToken}
                    onPick={handleInsertEmoji}
                    onPickCustom={handlePickCustomEmoji}
                  />
                </div>
              )}
            </form>
          </>
        ) : (
          <WelcomePanel
            totalRooms={roomBuckets.home.length}
            totalUnread={snapshot.totalUnread}
            onCreate={() => setSheet('new')}
          />
        )}
      </section>
      {attachmentPickerOpen && (
        <AttachmentPickerSheet
          onClose={() => setAttachmentPickerOpen(false)}
          onPrepareNativeCapture={preparePendingNativeCapture}
        />
      )}

      <nav className="bottom-nav" aria-label="底部导航">
        {bottomPrimaryViews.map((view) => (
          <button
            key={view}
            className={
              activeView === view ||
              (view === 'settings' && ['favorites', 'invites', 'explore'].includes(activeView))
                ? 'bottom-button active'
                : 'bottom-button'
            }
            onClick={() => {
              setActiveView(view);
              setMobilePane('list');
            }}
          >
            {viewIcon(view)}
            <span>{viewLabels[view]}</span>
          </button>
        ))}
      </nav>

      {sheet === 'security' && (
        <SecuritySheet
          status={cryptoStatus}
          statusReady={cryptoStatusReady}
          passphrase={recoveryPassphrase}
          progress={keyRestoreProgress}
          message={keyRestoreMessage}
          onPassphraseChange={setRecoveryPassphrase}
          onVerifyCurrentDevice={handleVerifyCurrentDevice}
          onRestoreFromSecretStorage={handleRestoreFromSecretStorage}
          onRestoreWithPassphrase={handleRestoreWithPassphrase}
          onClose={() => setSheet(undefined)}
        />
      )}

      {sheet === 'emojiManager' && client && (
        <EmojiManagerSheet
          client={client}
          mediaAccessToken={session?.accessToken}
          onClose={() => setSheet(undefined)}
          onRefresh={() => syncCustomEmojiState(client)}
          onSuccess={setNotice}
          onError={setError}
        />
      )}

      {sheet === 'new' && (
        <NewConversationSheet
          createForm={createForm}
          currentUserServer={currentUserServer}
          recentRooms={snapshot.rooms
            .filter((room) => room.membership === 'join' && !room.space)
            .sort((a, b) => b.lastTs - a.lastTs)
            .slice(0, 5)}
          mediaAccessToken={session?.accessToken}
          onChange={setCreateForm}
          onSubmit={handleCreateSubmit}
          onOpenRoom={(roomId) => {
            const room = snapshot.rooms.find((item) => item.id === roomId);
            setSheet(undefined);
            handleSelectRoom(roomId);
            setActiveView(room?.direct ? 'direct' : 'rooms');
          }}
          onOpenExplore={() => {
            setSheet(undefined);
            setActiveView('explore');
            setMobilePane('list');
          }}
          onClose={() => setSheet(undefined)}
        />
      )}

      {sheet === 'roomInfo' && selectedRoom && (
        <RoomInfoSheet
          room={selectedRoom}
          members={roomMembers}
          profileForm={roomProfileForm}
          favorite={favoriteRoomIds.includes(selectedRoom.id)}
          mediaItems={roomMediaItems}
          mediaAccessToken={session?.accessToken}
          pinnedMessages={pinnedMessages}
          currentUserId={session?.userId}
          onClose={() => setSheet(undefined)}
          onInvite={handleInviteSubmit}
          onProfileChange={setRoomProfileForm}
          onProfileSubmit={handleRoomProfileSubmit}
          onAvatarSelected={handleRoomAvatarSelected}
          onPreviewMedia={setPreviewMedia}
          onOpenPinned={(eventId) => {
            setSheet(undefined);
            void handleOpenPinnedMessage(selectedRoom.id, eventId);
          }}
          onUnpinMessage={(eventId) =>
            client &&
            runAction(
              () => setMessagePinned(client, selectedRoom.id, eventId, false),
              '已取消置'
            )
          }
          onMentionMember={handleMentionMember}
          onCopyMember={handleCopyMember}
          onCopyRoomLink={handleCopyRoomLink}
          onOpenMemberProfile={openUserProfile}
          onDirectMember={handleDirectMember}
          onKickMember={handleKickMember}
          onBanMember={handleBanMember}
          onSetNotificationMode={(mode) => void handleSetRoomNotificationMode(selectedRoom, mode)}
          onFavorite={() => toggleFavoriteRoom(selectedRoom.id)}
          onLeave={() =>
            client &&
            runAction(async () => {
              await leaveRoom(client, selectedRoom.id);
              setSheet(undefined);
              setMobilePane('list');
            }, '已离开房间')
          }
        />
      )}

      {userProfileMember && selectedRoom && (
        <UserProfileSheet
          member={userProfileMember}
          room={selectedRoom}
          members={roomMembers}
          currentUserId={session?.userId}
          mediaAccessToken={session?.accessToken}
          onClose={() => setSheet(undefined)}
          onCopyMember={handleCopyMember}
          onCopyMemberLink={handleCopyMemberLink}
          onDirectMember={handleDirectMember}
          onKickMember={handleKickMember}
          onBanMember={handleBanMember}
          onPreviewAvatar={handlePreviewMemberAvatar}
        />
      )}

      {typeof sheet === 'object' && sheet?.type === 'forward' && (
        <ForwardSheet
          messages={sheet.messages}
          rooms={snapshot.rooms.filter((room) => room.membership === 'join')}
          mediaAccessToken={session?.accessToken}
          onClose={() => setSheet(undefined)}
          onForward={(roomIds) => handleForwardMessages(sheet.messages, roomIds)}
        />
      )}

      {messageInfoMessage && (
        <MessageInfoSheet
          client={client}
          message={messageInfoMessage}
          room={messageInfoRoom}
          members={roomMembers}
          mediaAccessToken={session?.accessToken}
          customEmojiItems={customEmojiItems}
          favorite={favoriteMessageIds[messageInfoMessage.roomId]?.includes(messageInfoMessage.id) ?? false}
          onClose={() => setSheet(undefined)}
          onOpenMemberProfile={openUserProfile}
          onReply={() => {
            setComposerMode({ type: 'reply', message: messageInfoMessage });
            setMessageDraft('');
            setSheet(undefined);
          }}
          onEdit={() => handleEditMessage(messageInfoMessage)}
          onFavorite={() => toggleFavoriteMessage(messageInfoMessage)}
          onTogglePin={() => handleTogglePinMessage(messageInfoMessage)}
          onCopy={() => handleCopyMessage(messageInfoMessage)}
          onCopyLink={() => handleCopyMessageLink(messageInfoMessage)}
          onForward={() => startForwardSelection(messageInfoMessage)}
          onPreviewAttachment={() => handlePreviewAttachment(messageInfoMessage)}
          onAddImageToEmoji={() => handleAddMessageImageToEmoji(messageInfoMessage)}
          onTranscribeAudio={() => handleTranscribeAudio(messageInfoMessage)}
          onReact={(key, shortcode) =>
            client &&
            runAction(
              () => sendReaction(client, messageInfoMessage.roomId, messageInfoMessage.id, key, shortcode),
              '已更新回应'
            )
          }
          onRedact={() => handleRedactMessage(messageInfoMessage)}
        />
      )}

      {readReceiptMessage && (
        <ReadReceiptSheet
          message={readReceiptMessage}
          inlineReadReceiptState={readReceiptInlineState}
          members={roomMembers}
          mediaAccessToken={session?.accessToken}
          onClose={() => setSheet(undefined)}
          onOpenMemberProfile={openUserProfile}
        />
      )}

      {previewMedia && (
        <EnhancedMediaPreview
          media={previewMedia}
          items={roomMediaItems}
          mediaAccessToken={session?.accessToken}
          onSelect={setPreviewMedia}
          onRequestNavigate={handleRequestPreviewNavigation}
          onAddToEmoji={
            previewMedia.kind === 'image' && previewMedia.mxcUrl
              ? () => handleAddPreviewImageToEmoji(previewMedia)
              : undefined
          }
          onClose={() => setPreviewMedia(undefined)}
        />
      )}
    </main>
  );
}

function LoadingScreen({ label }: { label: string }) {
  return (
    <main className="loading-screen">
      <section className="loading-card">
        <div className="loading-mark" aria-hidden="true">
          <Sparkles size={26} />
        </div>
        <p>{label}</p>
      </section>
    </main>
  );
}

const tapMovementTolerancePx = 10;
const longPressDurationMs = 420;

function Avatar({
  name,
  src,
  accessToken,
  small = false,
  onClick,
  onLongPress,
  ariaLabel,
}: {
  name: string;
  src?: string;
  accessToken?: string;
  small?: boolean;
  onClick?: () => void;
  onLongPress?: () => void;
  ariaLabel?: string;
}) {
  const mediaCandidates = useMemo(
    () =>
      dedupeMediaCandidates([
        { src, fallbackSrc: src },
        ...buildMatrixMediaRetrySrcs(src).map((retrySrc) => ({ src: retrySrc })),
      ]),
    [src]
  );
  const mediaState = useResolvedMediaCandidateList(mediaCandidates, accessToken);
  const resolvedSrc = mediaState.resolvedSrc;
  const className = small ? 'avatar small' : 'avatar';
  const showImage = Boolean(resolvedSrc && !mediaState.failed);
  const longPressTimerRef = useRef<number>();
  const longPressStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    triggered: boolean;
  }>();
  const skipClickRef = useRef(false);

  useEffect(
    () => () => {
      if (longPressTimerRef.current !== undefined) {
        window.clearTimeout(longPressTimerRef.current);
      }
    },
    []
  );

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current !== undefined) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = undefined;
    }
  };

  const resetLongPress = () => {
    clearLongPressTimer();
    longPressStateRef.current = undefined;
  };

  const content = (
    <>
      {showImage ? (
        <img src={resolvedSrc} alt="" onError={mediaState.onRenderedError} />
      ) : (
        <span>{initials(name)}</span>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        className={`${className} avatar-button`}
        type="button"
        onPointerDown={(evt) => {
          if (!onLongPress || evt.button !== 0) return;
          longPressStateRef.current = {
            pointerId: evt.pointerId,
            startX: evt.clientX,
            startY: evt.clientY,
            triggered: false,
          };
          clearLongPressTimer();
          longPressTimerRef.current = window.setTimeout(() => {
            const state = longPressStateRef.current;
            if (!state || state.pointerId !== evt.pointerId) return;
            state.triggered = true;
            skipClickRef.current = true;
            void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
            onLongPress();
          }, longPressDurationMs);
        }}
        onPointerMove={(evt) => {
          const state = longPressStateRef.current;
          if (!state || state.pointerId !== evt.pointerId || state.triggered) return;
          if (
            Math.abs(evt.clientX - state.startX) > tapMovementTolerancePx ||
            Math.abs(evt.clientY - state.startY) > tapMovementTolerancePx
          ) {
            resetLongPress();
          }
        }}
        onPointerUp={resetLongPress}
        onPointerCancel={resetLongPress}
        onClick={(evt) => {
          if (skipClickRef.current) {
            skipClickRef.current = false;
            evt.preventDefault();
            evt.stopPropagation();
            return;
          }
          resetLongPress();
          evt.stopPropagation();
          onClick?.();
        }}
        aria-label={ariaLabel ?? `查看 ${name} 的资料`}
        title={ariaLabel ?? name}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={className}>
      {content}
    </div>
  );
}

function RoomFilterBar({
  value,
  counts,
  options,
  onChange,
}: {
  value: RoomFilter;
  counts: Record<RoomFilter, number>;
  options: RoomFilter[];
  onChange: (value: RoomFilter) => void;
}) {
  return (
    <div className="filter-tabs">
      {options.map((filter) => (
        <button
          key={filter}
          className={value === filter ? 'active' : ''}
          onClick={() => onChange(filter)}
        >
          <span>{roomFilterLabels[filter]}</span>
          <strong>{counts[filter]}</strong>
        </button>
      ))}
    </div>
  );
}

function RoomList({
  rooms,
  selectedRoomId,
  favoriteRoomIds,
  roomDrafts,
  mediaAccessToken,
  onSelectRoom,
  onAccept,
  onReject,
  onSetNotificationMode,
}: {
  rooms: RoomSummary[];
  selectedRoomId?: string;
  favoriteRoomIds: string[];
  roomDrafts: Record<string, string>;
  mediaAccessToken?: string;
  onSelectRoom: (roomId: string) => void;
  onAccept: (roomId: string) => void;
  onReject: (roomId: string) => void;
  onSetNotificationMode: (room: RoomSummary, mode: RoomNotificationMode) => void;
}) {
  const [notificationMenuRoomId, setNotificationMenuRoomId] = useState<string>();
  const longPressTimerRef = useRef<number>();
  const longPressStateRef = useRef<{
    roomId: string;
    pointerId: number;
    startX: number;
    startY: number;
    triggered: boolean;
  }>();
  const skipClickRoomIdRef = useRef<string>();

  useEffect(() => {
    if (!notificationMenuRoomId) return undefined;

    const closeMenu = () => {
      setNotificationMenuRoomId(undefined);
    };

    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, [notificationMenuRoomId]);

  useEffect(
    () => () => {
      if (typeof longPressTimerRef.current === 'number') {
        window.clearTimeout(longPressTimerRef.current);
      }
    },
    []
  );

  const clearLongPressTimer = () => {
    if (typeof longPressTimerRef.current === 'number') {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = undefined;
    }
  };

  const resetLongPress = () => {
    clearLongPressTimer();
    longPressStateRef.current = undefined;
  };

  const handleRoomClick = (event: ReactMouseEvent<HTMLDivElement>, roomId: string) => {
    if (skipClickRoomIdRef.current === roomId) {
      skipClickRoomIdRef.current = undefined;
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    onSelectRoom(roomId);
  };

  const handleRowKeyDown = (event: KeyboardEvent<HTMLDivElement>, roomId: string) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onSelectRoom(roomId);
  };

  if (rooms.length === 0) {
    return (
      <EmptyState
        compact
        icon={<MessageCircle size={26} />}
        title="没有会话"
        copy="可以新建私聊、创建房间，或者从探索里加入公开房间"
      />
    );
  }

  return (
    <div className="room-list">
      {rooms.map((room) => {
        const notificationMenuOpen = notificationMenuRoomId === room.id;

        return (
          <div
            key={room.id}
            className={selectedRoomId === room.id ? 'room-row active' : 'room-row'}
            role="button"
            tabIndex={0}
            onClick={(event) => handleRoomClick(event, room.id)}
            onContextMenu={(event) => {
              if (room.membership === 'invite') return;
              event.preventDefault();
              event.stopPropagation();
              setNotificationMenuRoomId(room.id);
            }}
            onKeyDown={(event) => handleRowKeyDown(event, room.id)}
            onPointerDown={(event) => {
              if (room.membership === 'invite' || event.button !== 0) return;
              longPressStateRef.current = {
                roomId: room.id,
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                triggered: false,
              };
              clearLongPressTimer();
              longPressTimerRef.current = window.setTimeout(() => {
                const state = longPressStateRef.current;
                if (!state || state.pointerId !== event.pointerId || state.roomId !== room.id) return;
                state.triggered = true;
                skipClickRoomIdRef.current = room.id;
                void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
                setNotificationMenuRoomId(room.id);
              }, longPressDurationMs);
            }}
            onPointerMove={(event) => {
              const state = longPressStateRef.current;
              if (!state || state.pointerId !== event.pointerId || state.roomId !== room.id) return;
              if (
                Math.abs(event.clientX - state.startX) > tapMovementTolerancePx ||
                Math.abs(event.clientY - state.startY) > tapMovementTolerancePx
              ) {
                resetLongPress();
              }
            }}
            onPointerUp={resetLongPress}
            onPointerCancel={resetLongPress}
          >
            <Avatar name={room.name} src={room.avatarUrl} accessToken={mediaAccessToken} />
            <span className="room-row-main">
              <span className="room-row-title">
                <strong>{room.name}</strong>
                <span>{formatTime(room.lastTs)}</span>
              </span>
              <span className="room-row-sub">
                {room.encrypted && <Lock size={12} />}
                {favoriteRoomIds.includes(room.id) && <Star size={12} />}
                <span>
                  {roomDrafts[room.id]
                    ? `草稿：${roomDrafts[room.id]}`
                    : getReadableMessageBody(room.lastMessage)}
                </span>
              </span>
            </span>
            {room.membership === 'invite' ? (
              <span className="invite-actions">
                <button
                  type="button"
                  className="mini-action"
                  onClick={(evt) => {
                    evt.stopPropagation();
                    onAccept(room.id);
                  }}
                  aria-label="接受邀请"
                >
                  <Check size={14} />
                </button>
                <button
                  type="button"
                  className="mini-action danger"
                  onClick={(evt) => {
                    evt.stopPropagation();
                    onReject(room.id);
                  }}
                  aria-label="拒绝邀请"
                >
                  <X size={14} />
                </button>
              </span>
            ) : (
              room.unread > 0 && (
                <span className={room.highlight > 0 ? 'unread hot' : 'unread'}>{room.unread}</span>
              )
            )}

            {notificationMenuOpen && room.membership !== 'invite' && (
              <div className="room-notification-popover" onClick={(evt) => evt.stopPropagation()}>
                {roomNotificationOptions.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={room.notificationMode === mode ? 'active' : ''}
                    onClick={() => {
                      onSetNotificationMode(room, mode);
                      setNotificationMenuRoomId(undefined);
                    }}
                  >
                    {roomNotificationIcon(mode, 18)}
                    <span>{roomNotificationLabels[mode]}</span>
                    {room.notificationMode === mode && <Check size={15} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const MemoRoomList = memo(RoomList);

type FavoritePanelFilter = 'messages' | 'images' | 'videos' | 'audio';
type FavoriteDateFilter = 'all' | 'today' | 'week' | 'month';

const favoriteFilterLabels: Record<FavoritePanelFilter, string> = {
  messages: '文字',
  images: '图片',
  videos: '视频',
  audio: '音频',
};
const favoritePanelFilters: FavoritePanelFilter[] = ['messages', 'images', 'videos', 'audio'];

const favoriteDateLabels: Record<FavoriteDateFilter, string> = {
  all: '全部时间',
  today: '今天',
  week: '7天',
  month: '30天',
};

const getFavoriteMessageKind = (message: ChatMessage): FavoritePanelFilter => {
  if (!message.attachment) return 'messages';
  if (message.attachment.kind === 'image') return 'images';
  if (message.attachment.kind === 'video') return 'videos';
  if (message.attachment.kind === 'audio') return 'audio';
  return 'messages';
};

const getFavoriteMessageKindLabel = (message: ChatMessage): string => {
  if (!message.attachment) return '文字';
  if (message.attachment.kind === 'image') return '图片';
  if (message.attachment.kind === 'video') return '视频';
  if (message.attachment.kind === 'audio') return '音频';
  return '附件';
};

const getFavoriteMessagePrimaryActionLabel = (message: ChatMessage): string => {
  if (!message.attachment) return '复制收藏文字';
  if (message.attachment.kind === 'image') return '打开收藏图片';
  if (message.attachment.kind === 'video') return '打开收藏视频';
  if (message.attachment.kind === 'audio') return '打开收藏音频';
  return '打开收藏附件';
};

const matchesFavoriteDate = (timestamp: number, filter: FavoriteDateFilter): boolean => {
  if (filter === 'all') return true;
  if (!timestamp) return false;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (filter === 'today') return timestamp >= start.getTime();
  const days = filter === 'week' ? 7 : 30;
  return timestamp >= Date.now() - days * 24 * 60 * 60 * 1000;
};

const getFavoriteFilterIcon = (filter: FavoritePanelFilter): ReactNode => {
  switch (filter) {
    case 'images':
      return <ImageIcon size={14} />;
    case 'videos':
      return <Play size={14} />;
    case 'audio':
      return <Volume2 size={14} />;
    case 'messages':
      return <MessageCircle size={14} />;
    default:
      return <Star size={14} />;
  }
};

function FavoriteAttachmentThumb({
  message,
  accessToken,
  onPreview,
}: {
  message: ChatMessage;
  accessToken?: string;
  onPreview: () => void;
}) {
  const attachment = message.attachment;
  if (!attachment) {
    return (
      <span className="favorite-attachment-thumb text">
        <MessageCircle size={18} />
      </span>
    );
  }

  const previewSrc = attachment.authUrl ?? attachment.url ?? attachment.authDownloadUrl ?? attachment.downloadUrl;
  const fallbackSrc = attachment.url ?? attachment.downloadUrl;
  const label = getFavoriteMessageKindLabel(message);
  const thumbClassName = `favorite-attachment-thumb favorite-attachment-thumb-${attachment.kind}`;

  return (
    <button className={thumbClassName} type="button" onClick={onPreview} aria-label={`预览${label}`}>
      {attachment.kind === 'image' && previewSrc ? (
        <AuthenticatedImage
          src={previewSrc}
          fallbackSrc={fallbackSrc}
          accessToken={accessToken}
          encryptedFile={getPreviewEncryptedFile(attachment)}
          mimeType={attachment.previewMimeType ?? attachment.mimeType}
          alt={attachment.name ?? message.body}
        />
      ) : attachment.kind === 'video' && previewSrc ? (
        <div className="favorite-attachment-thumb-media">
          <div className="favorite-attachment-thumb-video-frame">
            <CompactVideoPreview
              className="favorite-attachment-thumb-video"
              previewSrc={previewSrc}
              previewFallbackSrc={fallbackSrc}
              accessToken={accessToken}
              previewEncryptedFile={getPreviewEncryptedFile(attachment)}
              previewMimeType={attachment.previewMimeType ?? attachment.mimeType}
              src={attachment.authDownloadUrl ?? attachment.downloadUrl ?? attachment.authUrl ?? attachment.url}
              fallbackSrc={attachment.downloadUrl ?? attachment.url}
              encryptedFile={attachment.encryptedFile}
              mimeType={attachment.mimeType}
              label="视频封面暂不可预览"
            />
            <span className="favorite-attachment-thumb-play">
              <Play size={16} />
            </span>
          </div>
        </div>
      ) : (
        <span>
          {attachment.kind === 'audio' ? <Volume2 size={18} /> : <FileUp size={18} />}
          <small>{attachment.kind === 'audio' && attachment.durationMs ? formatDuration(attachment.durationMs / 1000) : label}</small>
        </span>
      )}
    </button>
  );
}

function FavoritesPanel({
  rooms,
  messages,
  favoriteMessageIds,
  roomDrafts,
  mediaAccessToken,
  onOpenRoom,
  onCopyMessage,
  onPreviewAttachment,
  onToggleRoom,
  onToggleMessage,
  onCreate,
  onExplore,
}: {
  rooms: RoomSummary[];
  messages: Array<{ room: RoomSummary; message: ChatMessage }>;
  favoriteMessageIds: Record<string, string[]>;
  roomDrafts: Record<string, string>;
  mediaAccessToken?: string;
  onOpenRoom: (roomId: string) => void;
  onCopyMessage: (message: ChatMessage) => void | Promise<void>;
  onPreviewAttachment: (message: ChatMessage) => void;
  onToggleRoom: (roomId: string) => void;
  onToggleMessage: (message: ChatMessage) => void;
  onCreate: () => void;
  onExplore: () => void;
}) {
  const [filter, setFilter] = useState<FavoritePanelFilter>('messages');
  const [dateFilter, setDateFilter] = useState<FavoriteDateFilter>('all');
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const normalizedQuery = query.trim().toLowerCase();
  const attachmentCount = messages.filter(({ message }) => Boolean(message.attachment)).length;
  const totalUnread = rooms.reduce((count, room) => count + room.unread, 0);
  const favoriteCount = messages.length;
  const isLocalFavoriteMessage = (message: ChatMessage): boolean =>
    favoriteMessageIds[message.roomId]?.includes(message.id) ?? false;
  const visibleRooms = rooms.filter((room) => {
    if (!matchesFavoriteDate(room.lastTs, dateFilter)) return false;
    if (!normalizedQuery) return true;
    return `${room.name} ${room.topic ?? ''} ${room.canonicalAlias ?? ''}`.toLowerCase().includes(normalizedQuery);
  });
  const visibleMessages = messages.filter(({ room, message }) => {
    if (filter !== getFavoriteMessageKind(message)) return false;
    if (!matchesFavoriteDate(message.timestamp, dateFilter)) return false;
    if (!normalizedQuery) return true;
    return `${room.name} ${message.senderName ?? message.sender ?? ''} ${message.body} ${message.attachment?.name ?? ''}`
      .toLowerCase()
      .includes(normalizedQuery);
  });
  const selectedMessages = visibleMessages.filter(
    ({ message }) => isLocalFavoriteMessage(message) && selectedIds.includes(message.id)
  );
  const hasFavorites = rooms.length > 0 || messages.length > 0;

  useEffect(() => {
    const availableIds = new Set(messages.map(({ message }) => message.id));
    setSelectedIds((current) => current.filter((id) => availableIds.has(id)));
  }, [messages]);

  const toggleSelected = (messageId: string) => {
    setSelectedIds((current) =>
      current.includes(messageId) ? current.filter((id) => id !== messageId) : current.concat(messageId)
    );
  };

  const clearSelected = () => setSelectedIds([]);

  const removeSelected = () => {
    selectedMessages.forEach(({ message }) => onToggleMessage(message));
    clearSelected();
  };

  const activateFavoriteMessage = (message: ChatMessage) => {
    if (message.attachment) {
      onPreviewAttachment(message);
      return;
    }
    void onCopyMessage(message);
  };

  return (
    <div className="favorites-panel">
      <header className="favorites-hero">
        <div>
          <p className="eyebrow">Favorites</p>
          <h2>收藏</h2>
          <span>房间、文字、图片、视频和音频集中在这里</span>
        </div>
        <div className="favorites-stats">
          <span>
            <strong>{rooms.length}</strong>
            <small>收藏房间</small>
          </span>
          <span>
            <strong>{favoriteCount}</strong>
            <small>收藏消息</small>
          </span>
          <span>
            <strong>{totalUnread}</strong>
            <small>未读</small>
          </span>
          <span>
            <strong>{attachmentCount}</strong>
            <small>附件</small>
          </span>
        </div>
      </header>

      <section className="favorites-toolbar">
        <label className="search-field">
          <Search size={17} />
          <input
            value={query}
            placeholder="搜索收藏"
            onChange={(evt) => setQuery(evt.target.value)}
          />
        </label>
        <div className="favorite-date-row" aria-label="收藏时间筛选">
          {(['all', 'today', 'week', 'month'] as FavoriteDateFilter[]).map((item) => (
            <button
              key={item}
              type="button"
              className={dateFilter === item ? 'active' : ''}
              onClick={() => setDateFilter(item)}
            >
              <CalendarDays size={13} />
              {favoriteDateLabels[item]}
            </button>
          ))}
        </div>
      </section>

      <div className="favorite-tabs">
        {favoritePanelFilters.map((item) => (
          <button
            key={item}
            type="button"
            className={filter === item ? 'active' : ''}
            onClick={() => setFilter(item)}
          >
            {getFavoriteFilterIcon(item)}
            {favoriteFilterLabels[item]}
          </button>
        ))}
      </div>

      {selectedIds.length > 0 && (
        <div className="favorites-selection-bar">
          <span>{selectedIds.length} 条已选择</span>
          <button type="button" onClick={clearSelected}>取消</button>
          <button className="danger" type="button" onClick={removeSelected}>移出收藏</button>
        </div>
      )}

      <div className="favorites-scroll">
        {!hasFavorites && (
          <section className="favorites-empty-state">
            <Star size={24} />
            <strong>还没有收藏</strong>
            <span>你收藏的房间、文字、图片、视频和音频会按类型归档</span>
            <div>
              <button type="button" onClick={onCreate}>
                <Plus size={16} />
                新建会话
              </button>
              <button type="button" onClick={onExplore}>
                <Compass size={16} />
                探索房间
              </button>
            </div>
          </section>
        )}

        {rooms.length > 0 && (
          <section className="favorite-section">
            <div className="section-title">
              <span>收藏房间</span>
              <strong>{visibleRooms.length}</strong>
            </div>
            {visibleRooms.length === 0 && hasFavorites ? (
              <p className="digest-empty">没有匹配的收藏房间</p>
            ) : (
              <div className="favorite-room-grid">
                {visibleRooms.map((room) => (
                  <article className="favorite-room-card" key={room.id}>
                    <button className="favorite-room-main" type="button" onClick={() => onOpenRoom(room.id)}>
                      <Avatar name={room.name} src={room.avatarUrl} accessToken={mediaAccessToken} />
                      <span>
                        <strong>{room.name}</strong>
                        <small>
                          {room.direct ? '私聊' : room.space ? '空间' : '群组'} · {room.memberCount}
                          {room.encrypted ? ' · E2EE' : ''}
                        </small>
                        <em>{roomDrafts[room.id] ? `草稿：${roomDrafts[room.id]}` : getReadableMessageBody(room.lastMessage)}</em>
                      </span>
                    </button>
                    <button
                      className="favorite-remove"
                      type="button"
                      onClick={() => onToggleRoom(room.id)}
                      aria-label={`取消收藏 ${room.name}`}
                    >
                      <Star size={15} />
                    </button>
                    {room.unread > 0 && <b>{room.unread}</b>}
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {messages.length > 0 && (
          <section className="favorite-section">
            <div className="section-title">
              <span>收藏消息</span>
              <strong>{visibleMessages.length}</strong>
            </div>
            {visibleMessages.length === 0 && hasFavorites ? (
              <p className="digest-empty">没有匹配的收藏消息</p>
            ) : (
              <div className="favorite-message-list">
                {visibleMessages.slice(0, 80).map(({ room, message }) => {
                  const localFavorite = isLocalFavoriteMessage(message);
                  const displayRoomName = message.favoriteSource?.roomName ?? room.name;
                  const displaySender = message.favoriteSource?.senderName ?? message.senderName ?? message.sender ?? '未知成员';
                  const displayTimestamp = message.favoriteSource?.sourceTimestamp ?? message.timestamp;

                  return (
                    <article
                      className="favorite-message-card"
                      data-kind={getFavoriteMessageKind(message)}
                      key={`${message.roomId}-${message.id}`}
                    >
                      {localFavorite ? (
                        <button
                          className={selectedIds.includes(message.id) ? 'favorite-check active' : 'favorite-check'}
                          type="button"
                          onClick={() => toggleSelected(message.id)}
                          aria-label={selectedIds.includes(message.id) ? '取消选择' : '选择消息'}
                        >
                          {selectedIds.includes(message.id) ? <CheckSquare2 size={18} /> : <Square size={18} />}
                        </button>
                      ) : (
                        <span className="favorite-check placeholder">
                          <Star size={15} />
                        </span>
                      )}
                      <FavoriteAttachmentThumb
                        message={message}
                        accessToken={mediaAccessToken}
                        onPreview={() => onPreviewAttachment(message)}
                      />
                      <button
                        className="favorite-message-main"
                        type="button"
                        onClick={() => activateFavoriteMessage(message)}
                        aria-label={getFavoriteMessagePrimaryActionLabel(message)}
                      >
                        <span>
                          <strong>{displayRoomName}</strong>
                          <small>{displaySender} · {formatFullTime(displayTimestamp)}</small>
                        </span>
                        <p>{getReadableMessageBody(message.body || message.attachment?.name || '附件消息')}</p>
                        <em>{getFavoriteMessageKindLabel(message)}</em>
                      </button>
                      {localFavorite ? (
                        <button
                          className="favorite-remove"
                          type="button"
                          onClick={() => onToggleMessage(message)}
                          aria-label="取消收藏消息"
                        >
                          <Star size={15} />
                        </button>
                      ) : (
                        <span className="favorite-remove placeholder" />
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function LocalSearchDigest({
  results,
  mediaAccessToken,
  onOpen,
}: {
  results: Array<{ room: RoomSummary; message: ChatMessage }>;
  mediaAccessToken?: string;
  onOpen: (roomId: string, eventId: string) => void;
}) {
  return (
    <section className="search-digest">
      <div className="section-title">
        <span>消息结果</span>
        <strong>{results.length}</strong>
      </div>
      {results.slice(0, 30).map(({ room, message }) => (
        <button key={message.id} className="search-result" onClick={() => onOpen(room.id, message.id)}>
          <Avatar name={room.name} src={room.avatarUrl} accessToken={mediaAccessToken} small />
          <span>
            <strong>{room.name}</strong>
            <small>{message.senderName ?? message.sender} · {formatTime(message.timestamp)}</small>
            <p>{getReadableMessageBody(message.body)}</p>
          </span>
        </button>
      ))}
    </section>
  );
}

function PinnedBar({
  items,
  onOpen,
  onOpenAll,
}: {
  items: PinnedMessageSummary[];
  onOpen: (eventId: string) => void;
  onOpenAll: () => void;
}) {
  const firstResolved =
    items.find((item) => item.available || typeof item.timestamp === 'number' || Boolean(item.senderName)) ?? items[0];
  const first = firstResolved;
  if (!first) return null;

  const summaryText =
    first.available || typeof first.timestamp === 'number' || Boolean(first.senderName)
      ? getReadableMessageBody(first.body)
      : `${items.length} 条置顶消息暂时无法显示`;

  return (
    <section className="pinned-bar">
      <button className="pinned-summary" onClick={() => onOpen(first.id)}>
        <Pin size={16} />
        <span>
          <strong>{first.senderName ?? '置顶消息'}</strong>
          <small>{summaryText}</small>
        </span>
      </button>
      <button className="pinned-count" onClick={onOpenAll}>
        {items.length}
      </button>
    </section>
  );
}

function TimelineDateSeparator({ timestamp }: { timestamp: number }) {
  return (
    <div className="date-separator">
      <span>{formatDateSeparator(timestamp)}</span>
    </div>
  );
}

function MentionSuggestions({
  members,
  mediaAccessToken,
  onPick,
}: {
  members: RoomMemberSummary[];
  mediaAccessToken?: string;
  onPick: (member: RoomMemberSummary) => void;
}) {
  return (
    <div className="mention-suggestions">
      {members.map((member) => (
        <button key={member.id} type="button" onClick={() => onPick(member)}>
          <Avatar name={member.name} src={member.avatarUrl} accessToken={mediaAccessToken} small />
          <span>
            <strong>{member.name}</strong>
            <small>{member.id}</small>
          </span>
        </button>
      ))}
    </div>
  );
}

function EmojiTray({
  emojis,
  customItems,
  accessToken,
  onPick,
  onPickCustom,
}: {
  emojis: string[];
  customItems: CustomEmojiItem[];
  accessToken?: string;
  onPick: (emoji: string) => void;
  onPickCustom: (item: CustomEmojiItem, sourceTab?: EmojiTrayTab) => void;
}) {
  const [query, setQuery] = useState('');
  const filteredCustomItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return customItems;
    return customItems.filter((item) =>
      `${item.shortcode} ${item.body} ${item.packName}`.toLowerCase().includes(normalized)
    );
  }, [customItems, query]);
  const customGroups = useMemo(() => {
    const groups = new Map<string, CustomEmojiItem[]>();
    filteredCustomItems.slice(0, 240).forEach((item) => {
      const group = groups.get(item.packName) ?? [];
      group.push(item);
      groups.set(item.packName, group);
    });
    return Array.from(groups.entries());
  }, [filteredCustomItems]);

  return (
    <div className="emoji-tray" aria-label="表情与贴纸">
      <div className="emoji-tray-section">
        <span>
          我的表情包          {customItems.length > 0 && <small>{customItems.length}</small>}
        </span>
        {customItems.length > 0 && (
          <label className="emoji-search-field">
            <Search size={14} />
            <input
              value={query}
              placeholder="搜索贴纸或短码"
              onChange={(evt) => setQuery(evt.target.value)}
            />
          </label>
        )}
        {customItems.length === 0 ? (
          <small>还没有同步到自定义表情包</small>
        ) : customGroups.length === 0 ? (
          <small>没有匹配的表情包内容</small>
        ) : (
          <div className="sticker-groups">
            {customGroups.map(([packName, items]) => (
              <section key={packName} className="sticker-pack">
                <strong>{packName}</strong>
                <div className="sticker-grid">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      title={`${item.packName} / ${item.shortcode}`}
                      onClick={() =>
                        onPickCustom(
                          item,
                          item.usage.includes('emoticon')
                            ? 'emoji'
                            : item.usage.includes('sticker')
                              ? 'sticker'
                              : 'emoji'
                        )
                      }
                    >
                      <AuthenticatedImage
                        src={item.authUrl ?? item.url}
                        fallbackSrc={item.downloadUrl ?? item.url}
                        accessToken={accessToken}
                        deferLoading
                        retrySrcs={[
                          item.authDownloadUrl ?? item.downloadUrl,
                          ...buildMatrixMediaRetrySrcs(item.authUrl, item.url),
                        ]}
                        alt={item.body || item.shortcode}
                      />
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
      <div className="emoji-tray-section">
        <span>常用</span>
        <div className="emoji-grid">
          {emojis.map((emoji) => (
            <button key={emoji} type="button" onClick={() => onPick(emoji)} aria-label={`插入 ${emoji}`}>
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function EnhancedEmojiTray({
  emojis,
  customItems,
  accessToken,
  onPick,
  onPickCustom,
  allowStickers = true,
}: {
  emojis: string[];
  customItems: CustomEmojiItem[];
  accessToken?: string;
  onPick: (emoji: string) => void;
  onPickCustom: (item: CustomEmojiItem, sourceTab?: EmojiTrayTab) => void;
  allowStickers?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<EmojiTrayTab>('emoji');
  const [activeEmojiCollectionId, setActiveEmojiCollectionId] = useState('recent');
  const [activeStickerCollectionId, setActiveStickerCollectionId] = useState<string>();
  const collectionStripRef = useRef<HTMLDivElement | null>(null);
  const collectionDragStateRef = useRef<{
    pointerId: number;
    startX: number;
    scrollLeft: number;
    dragging: boolean;
  }>();
  const suppressCollectionClickRef = useRef(false);
  const [collectionStripState, setCollectionStripState] = useState({ canScrollLeft: false, canScrollRight: false });

  const filteredCustomItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return customItems;
    return customItems.filter((item) =>
      `${item.shortcode} ${item.body} ${item.packName}`.toLowerCase().includes(normalized)
    );
  }, [customItems, query]);

  const buildPackCollections = useCallback(
    (usage: EmojiTrayTab): EmojiCollection[] => {
      const groups = new Map<string, CustomEmojiItem[]>();
      filteredCustomItems.forEach((item) => {
        const shouldInclude =
          usage === 'emoji' ? item.usage.includes('emoticon') : item.usage.includes('sticker');
        if (!shouldInclude) return;

        const group = groups.get(item.packId) ?? [];
        group.push(item);
        groups.set(item.packId, group);
      });

      return Array.from(groups.entries()).map(([packId, items]) => ({
        id: packId,
        name: items[0]?.packName ?? packId,
        kind: 'pack' as const,
        cover: items.find((item) => item.authUrl || item.url || item.authDownloadUrl || item.downloadUrl) ?? items[0],
        items: items.slice(0, usage === 'emoji' ? 180 : 120),
      }));
    },
    [filteredCustomItems]
  );

  const emojiCollections = useMemo<EmojiCollection[]>(
    () => [
      { id: 'recent', name: '最', kind: 'unicode', items: emojis },
      ...buildPackCollections('emoji'),
      ...systemEmojiGroups.map((group) => ({
        id: group.id,
        name: group.name,
        kind: 'unicode' as const,
        items: group.items,
      })),
    ],
    [buildPackCollections, emojis]
  );
  const stickerCollections = useMemo<EmojiCollection[]>(
    () => buildPackCollections('sticker'),
    [buildPackCollections]
  );

  useEffect(() => {
    if (!allowStickers && activeTab === 'sticker') {
      setActiveTab('emoji');
    }
  }, [activeTab, allowStickers]);

  useEffect(() => {
    const availableIds = new Set(emojiCollections.map((collection) => collection.id));
    if (!availableIds.has(activeEmojiCollectionId)) {
      setActiveEmojiCollectionId(emojiCollections[0]?.id ?? 'recent');
    }
  }, [activeEmojiCollectionId, emojiCollections]);

  useEffect(() => {
    const availableIds = new Set(stickerCollections.map((collection) => collection.id));
    if (!activeStickerCollectionId || !availableIds.has(activeStickerCollectionId)) {
      setActiveStickerCollectionId(stickerCollections[0]?.id);
    }
  }, [activeStickerCollectionId, stickerCollections]);

  const effectiveActiveTab = allowStickers ? activeTab : 'emoji';
  const activeCollections = effectiveActiveTab === 'emoji' ? emojiCollections : stickerCollections;
  const activeCollectionId =
    effectiveActiveTab === 'emoji' ? activeEmojiCollectionId : activeStickerCollectionId;
  const activeCollection = activeCollections.find((collection) => collection.id === activeCollectionId);
  const activeCount = activeCollection?.items.length ?? 0;

  const updateCollectionStripState = useCallback(() => {
    const strip = collectionStripRef.current;
    if (!strip) {
      setCollectionStripState({ canScrollLeft: false, canScrollRight: false });
      return;
    }

    const maxScrollLeft = Math.max(0, strip.scrollWidth - strip.clientWidth);
    setCollectionStripState({
      canScrollLeft: strip.scrollLeft > 4,
      canScrollRight: strip.scrollLeft < maxScrollLeft - 4,
    });
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(updateCollectionStripState);
    return () => window.cancelAnimationFrame(frame);
  }, [activeCollections, activeCollectionId, activeTab, query, updateCollectionStripState]);

  const handlePickCollection = (collectionId: string) => {
    if (effectiveActiveTab === 'emoji') {
      setActiveEmojiCollectionId(collectionId);
      return;
    }
    setActiveStickerCollectionId(collectionId);
  };

  const scrollCollectionStrip = (direction: 'prev' | 'next') => {
    const strip = collectionStripRef.current;
    if (!strip) return;

    strip.scrollBy({
      left: (direction === 'next' ? 1 : -1) * Math.max(strip.clientWidth * 0.72, 160),
      behavior: 'smooth',
    });

    window.setTimeout(updateCollectionStripState, 220);
  };

  const handleCollectionStripWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    const strip = collectionStripRef.current;
    if (!strip || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;

    event.preventDefault();
    strip.scrollBy({ left: event.deltaY, behavior: 'auto' });
    updateCollectionStripState();
  };

  const resetCollectionDrag = () => {
    collectionDragStateRef.current = undefined;
  };

  const handleCollectionStripPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const strip = collectionStripRef.current;
    if (!strip || event.button !== 0) return;

    collectionDragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: strip.scrollLeft,
      dragging: false,
    };
  };

  const handleCollectionStripPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const strip = collectionStripRef.current;
    const dragState = collectionDragStateRef.current;
    if (!strip || !dragState || dragState.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - dragState.startX;
    if (!dragState.dragging && Math.abs(deltaX) > 6) {
      dragState.dragging = true;
      suppressCollectionClickRef.current = true;
    }
    if (!dragState.dragging) return;

    event.preventDefault();
    strip.scrollLeft = dragState.scrollLeft - deltaX;
    updateCollectionStripState();
  };

  const handleCollectionStripPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const dragState = collectionDragStateRef.current;
    if (dragState && dragState.pointerId === event.pointerId && dragState.dragging) {
      window.setTimeout(() => {
        suppressCollectionClickRef.current = false;
      }, 0);
    }
    resetCollectionDrag();
  };

  const handleCollectionButtonClick = (
    event: ReactMouseEvent<HTMLButtonElement>,
    collectionId: string
  ) => {
    if (suppressCollectionClickRef.current) {
      event.preventDefault();
      suppressCollectionClickRef.current = false;
      return;
    }

    handlePickCollection(collectionId);
  };

  const renderCollectionItems = () => {
    if (!activeCollection) {
      return <small className="emoji-empty">还没有同步到可用内容</small>;
    }

    if (activeCollection.kind === 'unicode') {
      return (
        <div className="emoji-grid large">
          {activeCollection.items.map((emoji) => (
            <button key={`${activeCollection.id}-${emoji}`} type="button" onClick={() => onPick(emoji)}>
              {emoji}
            </button>
          ))}
        </div>
      );
    }

    return (
      <div
        className={
          effectiveActiveTab === 'sticker' ? 'sticker-grid sticker-panel-grid' : 'emoji-pack-grid'
        }
      >
        {activeCollection.items.map((item) => (
          <button
            key={item.id}
            type="button"
            title={`${item.packName} / ${item.shortcode}`}
            onClick={() => onPickCustom(item, effectiveActiveTab)}
          >
            <AuthenticatedImage
              src={item.authUrl ?? item.url}
              fallbackSrc={item.downloadUrl ?? item.url}
              accessToken={accessToken}
              deferLoading
              retrySrcs={[
                item.authDownloadUrl ?? item.downloadUrl,
                ...buildMatrixMediaRetrySrcs(item.authUrl, item.url),
              ]}
              alt={item.body || item.shortcode}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="emoji-tray" aria-label="emoji and sticker tray">
      <div className="emoji-tray-header">
        <div className="emoji-tray-tabs">
          <button
            type="button"
            className={effectiveActiveTab === 'emoji' ? 'active' : ''}
            onClick={() => setActiveTab('emoji')}
          >
            表情
          </button>
          {allowStickers && (
            <button
              type="button"
              className={effectiveActiveTab === 'sticker' ? 'active' : ''}
              onClick={() => setActiveTab('sticker')}
            >
              贴纸
            </button>
          )}
        </div>
        <small>{activeCount}</small>
      </div>

      {customItems.length > 0 && (
        <label className="emoji-search-field">
          <Search size={14} />
          <input
            value={query}
            placeholder={effectiveActiveTab === 'emoji' ? '搜索表情包或短码' : '搜索贴纸包或短码'}
            onChange={(evt) => setQuery(evt.target.value)}
          />
        </label>
      )}

      <div className="emoji-collection-nav">
        <button
          type="button"
          className="emoji-collection-scroll"
          aria-label="上一组分类"
          onClick={() => scrollCollectionStrip('prev')}
          disabled={!collectionStripState.canScrollLeft}
        >
          <ChevronLeft size={16} />
        </button>
        <div
          ref={collectionStripRef}
          className="emoji-collection-strip"
          role="tablist"
          aria-label={effectiveActiveTab === 'emoji' ? '表情分类' : '贴纸分类'}
          onScroll={updateCollectionStripState}
          onWheel={handleCollectionStripWheel}
          onPointerDown={handleCollectionStripPointerDown}
          onPointerMove={handleCollectionStripPointerMove}
          onPointerUp={handleCollectionStripPointerUp}
          onPointerCancel={resetCollectionDrag}
          onPointerLeave={handleCollectionStripPointerUp}
        >
          {activeCollections.map((collection) => {
            const active = collection.id === activeCollectionId;
            return (
              <button
                key={collection.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={active ? 'emoji-collection-button active' : 'emoji-collection-button'}
                onClick={(event) => handleCollectionButtonClick(event, collection.id)}
              >
                <span className="emoji-collection-thumb-shell" aria-hidden="true">
                  {collection.kind === 'pack' && collection.cover ? (
                    <AuthenticatedImage
                      className="emoji-collection-thumb"
                      src={collection.cover.authUrl ?? collection.cover.url}
                      fallbackSrc={collection.cover.downloadUrl ?? collection.cover.url}
                      accessToken={accessToken}
                      retrySrcs={[
                        collection.cover.authDownloadUrl ?? collection.cover.downloadUrl,
                        ...buildMatrixMediaRetrySrcs(collection.cover.authUrl, collection.cover.url),
                      ]}
                      alt={collection.name}
                    />
                  ) : (
                    <span className="emoji-collection-label">{collection.name.slice(0, 1)}</span>
                  )}
                </span>
                <span>{collection.name}</span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="emoji-collection-scroll"
          aria-label="下一组分类"
          onClick={() => scrollCollectionStrip('next')}
          disabled={!collectionStripState.canScrollRight}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="emoji-tray-section">
        <span>
          {activeCollection?.name ?? (effectiveActiveTab === 'emoji' ? '表情' : '贴纸')}
          {activeCount > 0 && <small>{activeCount}</small>}
        </span>
        {renderCollectionItems()}
      </div>
    </div>
  );
}

function MediaFallback({ label, className }: { label: string; className?: string }) {
  return (
    <span className={className ? `message-media-fallback ${className}` : 'message-media-fallback'}>
      <ImageIcon size={20} />
      <small>{label}</small>
    </span>
  );
}

function AuthenticatedImage({
  src,
  fallbackSrc,
  accessToken,
  encryptedFile,
  mimeType,
  alt,
  className,
  retrySrcs = [],
  deferLoading = false,
}: {
  src?: string;
  fallbackSrc?: string;
  accessToken?: string;
  encryptedFile?: EncryptedMediaFile;
  mimeType?: string;
  alt: string;
  className?: string;
  retrySrcs?: Array<string | MediaCandidate | undefined>;
  deferLoading?: boolean;
}) {
  const mediaCandidates = useMemo(
    () =>
      dedupeMediaCandidates([
        { src, fallbackSrc, encryptedFile, mimeType },
        ...retrySrcs.flatMap((retrySrc) => {
          if (!retrySrc) return [];
          if (typeof retrySrc === 'string') {
            return [{ src: retrySrc, mimeType }];
          }
          return [
            {
              ...retrySrc,
              mimeType: retrySrc.mimeType ?? mimeType,
            },
          ];
        }),
      ]),
    [encryptedFile, fallbackSrc, mimeType, retrySrcs, src]
  );
  const mediaSignature = useMemo(
    () => mediaCandidates.map((candidate) => createMediaCandidateKey(candidate)).join('||'),
    [mediaCandidates]
  );
  const deferredMedia = useDeferredMediaActivation(deferLoading, mediaSignature);
  const mediaState = useResolvedMediaCandidateList(
    deferredMedia.active ? mediaCandidates : [],
    accessToken
  );
  const resolvedSrc = mediaState.resolvedSrc;
  const loading = deferLoading && !deferredMedia.active ? true : mediaState.loading;

  const content = !resolvedSrc ? (
    <MediaFallback className={className} label={loading ? '图片加载中...' : '图片暂不可预览'} />
  ) : (
    <img
      className={className}
      src={resolvedSrc}
      alt={alt}
      onError={mediaState.onRenderedError}
    />
  );

  if (!deferLoading) {
    return content;
  }

  return (
    <span ref={deferredMedia.hostRef} className="authenticated-media-shell">
      {content}
    </span>
  );
}

function AuthenticatedVideo({
  src,
  fallbackSrc,
  accessToken,
  encryptedFile,
  mimeType,
  className,
  controls = false,
}: {
  src?: string;
  fallbackSrc?: string;
  accessToken?: string;
  encryptedFile?: EncryptedMediaFile;
  mimeType?: string;
  className?: string;
  controls?: boolean;
}) {
  const mediaState = useAuthenticatedMediaState(src, accessToken, fallbackSrc, encryptedFile, mimeType);
  const resolvedSrc = mediaState.resolvedSrc;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [resolvedSrc]);

  if (!resolvedSrc) {
    return <MediaFallback label={mediaState.loading ? '视频加载中...' : '视频暂不可预览'} />;
  }

  if (failed) {
    return <MediaFallback label="视频暂不可预览" />;
  }

  return (
    <video
      className={className}
      src={resolvedSrc}
      controls={controls}
      muted={!controls}
      playsInline
      onError={() => setFailed(true)}
    />
  );
}

function ProgressiveImagePreview({
  previewSrc,
  previewFallbackSrc,
  previewEncryptedFile,
  previewMimeType,
  src,
  fallbackSrc,
  accessToken,
  encryptedFile,
  mimeType,
  alt,
  className,
  previewOnly = false,
}: {
  previewSrc?: string;
  previewFallbackSrc?: string;
  previewEncryptedFile?: EncryptedMediaFile;
  previewMimeType?: string;
  src?: string;
  fallbackSrc?: string;
  accessToken?: string;
  encryptedFile?: EncryptedMediaFile;
  mimeType?: string;
  alt: string;
  className?: string;
  previewOnly?: boolean;
}) {
  const previewBaseCandidate = useMemo<MediaCandidate>(
    () => ({
      src: previewSrc,
      fallbackSrc: previewFallbackSrc,
      encryptedFile: previewEncryptedFile,
      mimeType: previewMimeType,
    }),
    [previewEncryptedFile, previewFallbackSrc, previewMimeType, previewSrc]
  );
  const fullBaseCandidate = useMemo<MediaCandidate>(
    () => ({
      src,
      fallbackSrc,
      encryptedFile,
      mimeType,
    }),
    [encryptedFile, fallbackSrc, mimeType, src]
  );
  const previewEncryptedSignature = previewEncryptedFile
    ? `${previewEncryptedFile.url}|${previewEncryptedFile.iv}|${previewEncryptedFile.hashes?.sha256 ?? ''}`
    : '';
  const fullEncryptedSignature = encryptedFile
    ? `${encryptedFile.url}|${encryptedFile.iv}|${encryptedFile.hashes?.sha256 ?? ''}`
    : '';
  const previewAndFullSameAsset =
    (previewSrc ?? '') === (src ?? '') &&
    (previewFallbackSrc ?? '') === (fallbackSrc ?? '') &&
    previewEncryptedSignature === fullEncryptedSignature &&
    (previewMimeType ?? '') === (mimeType ?? '');
  const previewCandidates = useMemo(
    () =>
      dedupeMediaCandidates([
        previewBaseCandidate,
        ...buildMediaRetryCandidates(previewBaseCandidate),
        ...(previewAndFullSameAsset
          ? []
          : [
              fullBaseCandidate,
              ...buildMediaRetryCandidates(fullBaseCandidate),
            ]),
      ]),
    [fullBaseCandidate, previewAndFullSameAsset, previewBaseCandidate]
  );
  const previewOnlyState = useResolvedMediaCandidateList(previewCandidates, accessToken);
  const fullCandidates = useMemo(
    () =>
      dedupeMediaCandidates([
        fullBaseCandidate,
        ...buildMediaRetryCandidates(fullBaseCandidate),
        ...(previewAndFullSameAsset
          ? []
          : [
              previewBaseCandidate,
              ...buildMediaRetryCandidates(previewBaseCandidate),
            ]),
      ]),
    [fullBaseCandidate, previewAndFullSameAsset, previewBaseCandidate]
  );
  const previewState = previewOnlyState;
  const fullState = useResolvedMediaCandidateList(fullCandidates, accessToken);
  const [fullLoaded, setFullLoaded] = useState(false);

  useEffect(() => {
    setFullLoaded(false);
  }, [fullState.resolvedSrc]);

  useEffect(() => {
    setFullLoaded(false);
  }, [previewSrc, src]);

  if (previewOnly) {
    const previewOnlyResolvedSrc = !previewOnlyState.loading ? previewOnlyState.resolvedSrc : undefined;
    const fullFallbackResolvedSrc = !fullState.loading ? fullState.resolvedSrc : undefined;
    const visiblePreviewOnlySrc = previewOnlyResolvedSrc ?? fullFallbackResolvedSrc;
    const previewOnlyLoading = previewOnlyState.loading || (!previewOnlyResolvedSrc && fullState.loading);
    const previewOnlyErrorHandler = previewOnlyResolvedSrc
      ? previewOnlyState.onRenderedError
      : fullState.onRenderedError;

    if (!visiblePreviewOnlySrc) {
      return (
        <MediaFallback
          label={previewOnlyLoading ? '图片加载中...' : '图片暂不可预览'}
        />
      );
    }

    return (
      <img
        className={className}
        src={visiblePreviewOnlySrc}
        alt={alt}
        onError={previewOnlyErrorHandler}
      />
    );
  }

  const canShowPreview = Boolean(previewState.resolvedSrc);
  const canShowFull = !previewAndFullSameAsset && Boolean(fullState.resolvedSrc);
  const visibleSrc = canShowFull ? fullState.resolvedSrc : canShowPreview ? previewState.resolvedSrc : undefined;
  if (!visibleSrc) {
    return (
      <MediaFallback
        label={previewState.loading || fullState.loading ? '图片加载中...' : '图片暂不可预览'}
      />
    );
  }

  const overlayLabel = previewAndFullSameAsset
    ? undefined
    : fullState.failed
    ? '原图加载失败，已显示预览'
    : canShowPreview && (fullState.loading || !fullLoaded)
      ? '原图正在加载中'
      : undefined;

  return (
    <div className="progressive-media-frame">
      {canShowPreview && (
        <img
          className={`${className ?? ''} progressive-media-layer preview${fullLoaded && !fullState.failed ? ' hidden' : ''}`.trim()}
          src={previewState.resolvedSrc}
          alt=""
          onError={previewState.onRenderedError}
        />
      )}
      {canShowFull && (
        <img
          className={`${className ?? ''} progressive-media-layer full${fullLoaded && !fullState.failed ? ' ready' : ''}`.trim()}
          src={fullState.resolvedSrc}
          alt=""
          onLoad={() => {
            setFullLoaded(true);
          }}
          onError={fullState.onRenderedError}
        />
      )}
      {overlayLabel && (
        <div className={`media-preview-loading-overlay${fullState.failed ? ' error' : ''}`}>
          <small>{overlayLabel}</small>
        </div>
      )}
    </div>
  );
}

function ProgressiveVideoPreview({
  previewSrc,
  previewFallbackSrc,
  previewEncryptedFile,
  previewMimeType,
  src,
  fallbackSrc,
  accessToken,
  encryptedFile,
  mimeType,
  className,
}: {
  previewSrc?: string;
  previewFallbackSrc?: string;
  previewEncryptedFile?: EncryptedMediaFile;
  previewMimeType?: string;
  src?: string;
  fallbackSrc?: string;
  accessToken?: string;
  encryptedFile?: EncryptedMediaFile;
  mimeType?: string;
  className?: string;
}) {
  const posterBaseCandidate = useMemo<MediaCandidate>(
    () => ({
      src: previewSrc,
      fallbackSrc: previewFallbackSrc,
      encryptedFile: previewEncryptedFile,
      mimeType: previewMimeType,
    }),
    [previewEncryptedFile, previewFallbackSrc, previewMimeType, previewSrc]
  );
  const videoBaseCandidate = useMemo<MediaCandidate>(
    () => ({
      src,
      fallbackSrc,
      encryptedFile,
      mimeType,
    }),
    [encryptedFile, fallbackSrc, mimeType, src]
  );
  const posterCandidates = useMemo(
    () =>
      dedupeMediaCandidates([
        posterBaseCandidate,
        ...buildMediaRetryCandidates(posterBaseCandidate),
        videoBaseCandidate,
        ...buildMediaRetryCandidates(videoBaseCandidate),
      ]),
    [posterBaseCandidate, videoBaseCandidate]
  );
  const videoCandidates = useMemo(
    () =>
      dedupeMediaCandidates([
        videoBaseCandidate,
        ...buildMediaRetryCandidates(videoBaseCandidate),
        posterBaseCandidate,
        ...buildMediaRetryCandidates(posterBaseCandidate),
      ]),
    [posterBaseCandidate, videoBaseCandidate]
  );
  const posterState = useResolvedMediaCandidateList(posterCandidates, accessToken);
  const videoState = useResolvedMediaCandidateList(videoCandidates, accessToken);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    setVideoReady(false);
  }, [posterState.resolvedSrc]);

  useEffect(() => {
    setVideoReady(false);
  }, [videoState.resolvedSrc]);

  useEffect(() => {
    setVideoReady(false);
  }, [previewSrc, src]);

  if (!posterState.resolvedSrc && !videoState.resolvedSrc) {
    return (
      <MediaFallback
        label={posterState.loading || videoState.loading ? '视频加载中...' : '视频暂不可预览'}
      />
    );
  }

  const overlayLabel = videoState.failed
    ? '视频加载失败，已显示封面'
    : videoState.loading || !videoReady
      ? '正在加载视频'
      : undefined;

  return (
    <div className="progressive-video-shell">
      {posterState.resolvedSrc && (!videoReady || videoState.failed) && (
        <img className="media-preview-poster" src={posterState.resolvedSrc} alt="" />
      )}
      {videoState.resolvedSrc && !videoState.failed && (
        <video
          className={className}
          src={videoState.resolvedSrc}
          controls
          playsInline
          poster={posterState.resolvedSrc}
          onLoadedData={() => setVideoReady(true)}
          onCanPlay={() => setVideoReady(true)}
          onError={videoState.onRenderedError}
          style={{ opacity: videoReady ? 1 : 0 }}
        />
      )}
      {overlayLabel && (
        <div className={`media-preview-loading-overlay${videoState.failed ? ' error' : ''}`}>
          <small>{overlayLabel}</small>
        </div>
      )}
    </div>
  );
}

function CompactVideoPreview({
  previewSrc,
  previewFallbackSrc,
  previewEncryptedFile,
  previewMimeType,
  src,
  fallbackSrc,
  accessToken,
  encryptedFile,
  mimeType,
  className,
  label = '视频暂不可预览',
}: {
  previewSrc?: string;
  previewFallbackSrc?: string;
  previewEncryptedFile?: EncryptedMediaFile;
  previewMimeType?: string;
  src?: string;
  fallbackSrc?: string;
  accessToken?: string;
  encryptedFile?: EncryptedMediaFile;
  mimeType?: string;
  className?: string;
  label?: string;
}) {
  const previewEncryptedSignature = previewEncryptedFile
    ? `${previewEncryptedFile.url}|${previewEncryptedFile.iv}|${previewEncryptedFile.hashes?.sha256 ?? ''}`
    : '';
  const videoEncryptedSignature = encryptedFile
    ? `${encryptedFile.url}|${encryptedFile.iv}|${encryptedFile.hashes?.sha256 ?? ''}`
    : '';
  const previewUsesVideoAsset =
    (previewSrc ?? '') === (src ?? '') &&
    (previewFallbackSrc ?? '') === (fallbackSrc ?? '') &&
    previewEncryptedSignature === videoEncryptedSignature;
  const hasPosterImageSource = Boolean(previewSrc) && (!previewMimeType || previewMimeType.startsWith('image/')) && !previewUsesVideoAsset;
  const posterState = useAuthenticatedMediaState(
    hasPosterImageSource ? previewSrc : undefined,
    accessToken,
    hasPosterImageSource ? previewFallbackSrc : undefined,
    hasPosterImageSource ? previewEncryptedFile : undefined,
    hasPosterImageSource ? previewMimeType : undefined
  );
  const videoState = useAuthenticatedMediaState(
    hasPosterImageSource ? undefined : src ?? previewSrc,
    accessToken,
    hasPosterImageSource ? undefined : fallbackSrc ?? previewFallbackSrc,
    hasPosterImageSource ? undefined : encryptedFile ?? previewEncryptedFile,
    hasPosterImageSource ? undefined : mimeType ?? previewMimeType
  );
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [posterRenderFailed, setPosterRenderFailed] = useState(false);
  const shouldUsePoster = hasPosterImageSource && !posterRenderFailed;
  const videoFallbackState = useAuthenticatedMediaState(
    shouldUsePoster ? undefined : src ?? previewSrc,
    accessToken,
    shouldUsePoster ? undefined : fallbackSrc ?? previewFallbackSrc,
    shouldUsePoster ? undefined : encryptedFile ?? previewEncryptedFile,
    shouldUsePoster ? undefined : mimeType ?? previewMimeType
  );

  useEffect(() => {
    setVideoReady(false);
    setVideoFailed(false);
    setPosterRenderFailed(false);
  }, [videoState.resolvedSrc, posterState.resolvedSrc]);

  if (shouldUsePoster && posterState.resolvedSrc) {
    return (
      <img
        className={className}
        src={posterState.resolvedSrc}
        alt=""
        onError={() => setPosterRenderFailed(true)}
      />
    );
  }

  if (!videoFallbackState.resolvedSrc || videoFailed) {
    return (
      <MediaFallback
        className={className}
        label={videoFallbackState.loading ? '视频加载中...' : label}
      />
    );
  }

  return (
    <video
      className={className}
      src={videoFallbackState.resolvedSrc}
      muted
      playsInline
      preload="metadata"
      onLoadedData={() => {
        setVideoReady(true);
        setVideoFailed(false);
      }}
      onCanPlay={() => {
        setVideoReady(true);
        setVideoFailed(false);
      }}
      onError={() => setVideoFailed(true)}
      style={{ opacity: videoReady ? 1 : 0.08 }}
    />
  );
}

function AttachmentLink({
  src,
  fallbackSrc,
  accessToken,
  encryptedFile,
  mimeType,
  name,
}: {
  src?: string;
  fallbackSrc?: string;
  accessToken?: string;
  encryptedFile?: EncryptedMediaFile;
  mimeType?: string;
  name: string;
}) {
  const resolvedSrc = useAuthenticatedMediaUrl(src, accessToken, fallbackSrc, encryptedFile, mimeType);

  return (
    <a
      className="file-chip"
      href={resolvedSrc ?? fallbackSrc ?? '#'}
      target="_blank"
      rel="noreferrer"
      download={name}
    >
      <FileUp size={17} />
      {name}
    </a>
  );
}

function AttachmentPickerSheet({
  onClose,
  onPrepareNativeCapture,
}: {
  onClose: () => void;
  onPrepareNativeCapture: (kind: PendingNativeCaptureIntent['kind']) => void;
}) {
  return (
    <div className="attachment-picker-backdrop" onClick={onClose}>
      <div className="attachment-picker-sheet" onClick={(event) => event.stopPropagation()}>
        <span className="attachment-picker-grabber" aria-hidden="true" />
        <div className="attachment-picker-card">
          <div className="attachment-picker-options">
            <label
              className="attachment-picker-option"
              htmlFor={composerAttachmentInputIds.cameraImage}
              onClick={() => onPrepareNativeCapture('photo')}
            >
              <span className="attachment-picker-option-icon" aria-hidden="true">
                <Camera size={18} />
              </span>
              <span className="attachment-picker-option-label">拍照发送</span>
            </label>
            <label
              className="attachment-picker-option"
              htmlFor={composerAttachmentInputIds.cameraVideo}
              onClick={() => onPrepareNativeCapture('video')}
            >
              <span className="attachment-picker-option-icon" aria-hidden="true">
                <Video size={18} />
              </span>
              <span className="attachment-picker-option-label">录像发送</span>
            </label>
            <label className="attachment-picker-option" htmlFor={composerAttachmentInputIds.file}>
              <span className="attachment-picker-option-icon" aria-hidden="true">
                <FileUp size={18} />
              </span>
              <span className="attachment-picker-option-label">发送文件</span>
            </label>
          </div>
        </div>
        <button className="attachment-picker-cancel" type="button" onClick={onClose}>
          取消
        </button>
      </div>
    </div>
  );
}

function AudioPlayer({
  src,
  fallbackSrc,
  accessToken,
  encryptedFile,
  mimeType,
  title,
  durationMs,
  transcription,
  onTranscribe,
}: {
  src?: string;
  fallbackSrc?: string;
  accessToken?: string;
  encryptedFile?: EncryptedMediaFile;
  mimeType?: string;
  title: string;
  durationMs?: number;
  transcription?: AudioTranscriptionState;
  onTranscribe?: () => void;
}) {
  const playbackRateOptions = useMemo(
    () => [0.75, 1, 1.25, 1.5, 2].map((rate) => ({ value: rate, label: `${rate}x` })),
    []
  );
  const volumeOptions = useMemo(
    () => [
      { value: 0, label: '静音' },
      { value: 0.25, label: '25%' },
      { value: 0.5, label: '50%' },
      { value: 0.75, label: '75%' },
      { value: 1, label: '100%' },
    ],
    []
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [audioError, setAudioError] = useState('');
  const [pickerOpen, setPickerOpen] = useState<'speed' | 'volume'>();
  const resolvedSrc = useAuthenticatedMediaUrl(src, accessToken, fallbackSrc, encryptedFile, mimeType);
  const volumeValue = muted ? 0 : volume;
  const selectedPlaybackRateLabel =
    playbackRateOptions.find((option) => option.value === playbackRate)?.label ?? `${playbackRate}x`;
  const selectedVolumeLabel =
    volumeOptions.find((option) => option.value === volumeValue)?.label ?? `${Math.round(volumeValue * 100)}%`;
  const transcriptionButtonLabel =
    transcription?.status === 'loading'
      ? '转写中'
      : transcription?.status === 'success'
        ? '重新转写'
        : transcription?.status === 'error'
          ? '重试转写'
          : '转文字';

  useEffect(() => {
    setPlaying(false);
    setDuration(0);
    setCurrentTime(0);
    setAudioError('');
    setPickerOpen(undefined);
    audioRef.current?.load();
  }, [resolvedSrc]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate;
  }, [playbackRate, resolvedSrc]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = volume;
    audioRef.current.muted = muted;
  }, [muted, volume, resolvedSrc]);

  const handleToggle = async () => {
    const audio = audioRef.current;
    if (!audio || !resolvedSrc) {
      setAudioError('音频还没有加载完成。');
      return;
    }

    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }

    try {
      await audio.play();
      setAudioError('');
      setPlaying(true);
    } catch {
      setPlaying(false);
      setAudioError('音频无法播放，可能需要媒体授权或文件暂时不可访问。');
    }
  };

  const handleSeek = (evt: ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    const nextTime = Number(evt.target.value);
    if (!audio || !Number.isFinite(nextTime)) return;
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  return (
    <div className="audio-player">
      <audio
        ref={audioRef}
        src={resolvedSrc}
        preload="metadata"
        onLoadedMetadata={(evt) => {
          setAudioError('');
          setDuration(evt.currentTarget.duration || 0);
        }}
        onTimeUpdate={(evt) => setCurrentTime(evt.currentTarget.currentTime || 0)}
        onEnded={() => setPlaying(false)}
        onError={() => setAudioError('音频加载失败，可能需要媒体授权或文件已不可访问。')}
      />
      <strong className="audio-title">{title || '音频消息'}</strong>
      <div className="audio-main-row">
        <button
          className="audio-play"
          type="button"
          onClick={handleToggle}
          aria-label={playing ? '暂停音频' : '播放音频'}
          disabled={!resolvedSrc}
        >
          {playing ? <Pause size={17} /> : <Play size={17} />}
        </button>
        <div className="audio-progress-block">
          <input
            type="range"
            min="0"
            max={duration || (durationMs ?? 0) / 1000 || currentTime || 0}
            step="0.1"
            value={Math.min(currentTime, duration || (durationMs ?? 0) / 1000 || currentTime)}
            onChange={handleSeek}
            aria-label="音频进度"
          />
          <span className="audio-progress-time">
            <span>{formatDuration(currentTime)}</span>
            <span aria-hidden="true">/</span>
            <span>{formatDuration(duration || (durationMs ?? 0) / 1000)}</span>
          </span>
        </div>
        <div className="audio-inline-controls">
          <button
            className="audio-inline-trigger"
            type="button"
            aria-label="播放速度"
            aria-expanded={pickerOpen === 'speed'}
            onClick={() => setPickerOpen((current) => (current === 'speed' ? undefined : 'speed'))}
          >
            <RotateCw size={14} />
            <span className="audio-inline-value">{selectedPlaybackRateLabel}</span>
            <ChevronDown
              size={14}
              className={pickerOpen === 'speed' ? 'audio-inline-chevron open' : 'audio-inline-chevron'}
            />
          </button>
          <button
            className="audio-inline-trigger"
            type="button"
            aria-label="音量"
            aria-expanded={pickerOpen === 'volume'}
            onClick={() => setPickerOpen((current) => (current === 'volume' ? undefined : 'volume'))}
          >
            {volumeValue === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
            <span className="audio-inline-value">{selectedVolumeLabel}</span>
            <ChevronDown
              size={14}
              className={pickerOpen === 'volume' ? 'audio-inline-chevron open' : 'audio-inline-chevron'}
            />
          </button>
        </div>
      </div>
      {audioError && <em className="audio-error">{audioError}</em>}
      {onTranscribe && (
        <button
          className="audio-transcribe"
          type="button"
          onClick={onTranscribe}
          disabled={transcription?.status === 'loading'}
        >
          <Volume2 size={15} />
          {transcriptionButtonLabel}
        </button>
      )}
      {transcription && (
        <div className={transcription.status === 'error' ? 'audio-transcript error' : 'audio-transcript'}>
          {transcription.detail && transcription.status !== 'loading' && (
            <small className="audio-transcript-detail">{transcription.detail}</small>
          )}
          {transcription.status === 'loading'
            ? `${transcription.detail ?? '正在读取并识别这条语音...'}${transcription.text ? ` ${transcription.text}` : ''}`
            : transcription.status === 'success'
              ? transcription.text
              : transcription.error}
        </div>
      )}
      {pickerOpen && (
        <div className="audio-choice-sheet-backdrop" onClick={() => setPickerOpen(undefined)}>
          <div className="audio-choice-sheet" onClick={(event) => event.stopPropagation()}>
            <span className="audio-choice-sheet-grabber" aria-hidden="true" />
            <div className="audio-choice-sheet-card">
              <strong>{pickerOpen === 'speed' ? '播放速度' : '音量'}</strong>
              <div className="audio-choice-sheet-options">
                {(pickerOpen === 'speed' ? playbackRateOptions : volumeOptions).map((option) => {
                  const selected =
                    pickerOpen === 'speed' ? option.value === playbackRate : option.value === volumeValue;
                  return (
                    <button
                      key={option.label}
                      className={selected ? 'audio-choice-sheet-option active' : 'audio-choice-sheet-option'}
                      type="button"
                      onClick={() => {
                        if (pickerOpen === 'speed') {
                          setPlaybackRate(option.value);
                        } else {
                          setVolume(option.value);
                          setMuted(option.value === 0);
                        }
                        setPickerOpen(undefined);
                      }}
                    >
                      <span>{option.label}</span>
                      {selected && <Check size={16} />}
                    </button>
                  );
                })}
              </div>
            </div>
            <button className="audio-choice-sheet-cancel" type="button" onClick={() => setPickerOpen(undefined)}>
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SecuritySheet({
  status,
  statusReady,
  passphrase,
  progress,
  message,
  onPassphraseChange,
  onVerifyCurrentDevice,
  onRestoreFromSecretStorage,
  onRestoreWithPassphrase,
  onClose,
}: {
  status: CryptoStatus;
  statusReady: boolean;
  passphrase: string;
  progress: string;
  message?: { type: 'success' | 'error'; text: string };
  onPassphraseChange: (value: string) => void;
  onVerifyCurrentDevice: () => void | Promise<void>;
  onRestoreFromSecretStorage: () => void | Promise<void>;
  onRestoreWithPassphrase: () => void | Promise<void>;
  onClose: () => void;
}) {
  const busy = Boolean(progress);
  const cryptoEngineLabel = !statusReady ? '恢复中' : status.cryptoReady ? '可用' : '未启用';
  const statusLabel = (value?: boolean) => {
    if (!statusReady) return '恢复中';
    if (value === undefined) return '未知';
    return value ? '正常' : '需要处理';
  };
  const deviceTrustLabel =
    !statusReady
      ? '恢复中'
      : status.currentDeviceVerified === undefined
      ? '未知'
      : status.currentDeviceCrossSigned
        ? '已交叉签名'
        : status.currentDeviceLocallyVerified
          ? '仅本机信任'
          : status.currentDeviceVerified
            ? '已验证'
            : '未验证';
  const crossSigningLabel =
    !statusReady
      ? '恢复中'
      : status.crossSigningReady === undefined
      ? '未知'
      : status.crossSigningReady
        ? '已就绪'
        : status.crossSigningPrivateKeysInSecretStorage
          ? '待导入'
          : '未就绪';
  const backupVersionLabel = !statusReady ? '恢复中' : status.backupVersion ?? status.activeBackupVersion ?? '未配置';

  return (
    <div className="sheet-backdrop">
      <section className="sheet security-sheet">
        <header className="sheet-header">
          <div>
            <p className="eyebrow">Encryption</p>
            <h2>加密与密钥恢复</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="关闭">
            <X size={20} />
          </button>
        </header>

        <div className="security-status-grid">
          <span>
            <small>加密引擎</small>
            <strong>{cryptoEngineLabel}</strong>
          </span>
          <span>
            <small>安全存储</small>
            <strong>{statusLabel(status.secretStorageReady)}</strong>
          </span>
          <span>
            <small>服务端备份</small>
            <strong>{backupVersionLabel}</strong>
          </span>
          <span>
            <small>备份信任</small>
            <strong>{statusLabel(status.backupTrusted)}</strong>
          </span>
          <span>
            <small>当前设备</small>
            <strong>{deviceTrustLabel}</strong>
          </span>
          <span>
            <small>交叉签名</small>
            <strong>{crossSigningLabel}</strong>
          </span>
        </div>

        <div className="security-copy">
          <KeyRound size={22} />
          <span>
            <strong>恢复密钥后会尝试验证当前设备</strong>
            <small>历史密钥恢复负责解密旧消息；设备验证需要账号的交叉签名私钥。</small>
            <small>其它旧设备不会被自动信任，仍需要从已验证设备逐个验证或删除不用的登录。</small>
          </span>
        </div>

        {progress && <p className="security-progress">{progress}</p>}
        {!progress && !statusReady && <p className="security-progress">正在恢复本机加密状态与密钥信息...</p>}
        {message && (
          <p className={message.type === 'error' ? 'security-message error' : 'security-message success'}>
            {message.text}
          </p>
        )}
        {statusReady && !status.cryptoReady && (
          <p className="security-message error">当前客户端还没有启用端到端加密，无法恢复密钥</p>
        )}

        <div className="security-actions">
          <button
            className="primary-button"
            type="button"
            onClick={onRestoreFromSecretStorage}
            disabled={!statusReady || !status.cryptoReady || busy}
          >
            <Shield size={17} />
            从安全存储恢复
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={onVerifyCurrentDevice}
            disabled={!statusReady || !status.cryptoReady || busy}
          >
            <Shield size={17} />
            验证当前设备
          </button>
          <label>
            恢复密钥或备份口令
            <input
              type="password"
              value={passphrase}
              placeholder="输入恢复密钥 / 口令"
              autoCapitalize="none"
              autoCorrect="off"
              onChange={(evt) => onPassphraseChange(evt.target.value)}
            />
          </label>
          <button
            className="secondary-button"
            type="button"
            onClick={onRestoreWithPassphrase}
            disabled={!statusReady || !status.cryptoReady || busy || !passphrase.trim()}
          >
            <KeyRound size={17} />
            使用恢复密钥恢复
          </button>
        </div>
      </section>
    </div>
  );
}

function EmojiUsageToggleGroup({
  value,
  disabled = false,
  onChange,
}: {
  value: CustomEmojiUsage[];
  disabled?: boolean;
  onChange: (nextValue: CustomEmojiUsage[]) => void;
}) {
  const normalizedValue = normalizeCustomEmojiUsage(value);

  return (
    <div className="emoji-usage-toggle" aria-label="分类用途">
      {customEmojiUsageOrder.map((usage) => {
        const active = normalizedValue.includes(usage);
        return (
          <button
            key={usage}
            type="button"
            className={active ? 'active' : ''}
            disabled={disabled}
            onClick={() => onChange(toggleCustomEmojiUsageValue(normalizedValue, usage))}
          >
            {customEmojiUsageLabels[usage]}
          </button>
        );
      })}
    </div>
  );
}

function EmojiManagerSheet({
  client,
  mediaAccessToken,
  onClose,
  onRefresh,
  onSuccess,
  onError,
}: {
  client: MatrixClient;
  mediaAccessToken?: string;
  onClose: () => void;
  onRefresh: () => void;
  onSuccess: (message: string) => void;
  onError: (message?: string) => void;
}) {
  const [packs, setPacks] = useState<CustomEmojiPack[]>(() => getPersonalCustomEmojiPacks(client));
  const [selectedPackId, setSelectedPackId] = useState<string>(
    () => getPersonalCustomEmojiPacks(client)[0]?.id ?? 'user'
  );
  const [detailPackId, setDetailPackId] = useState<string>();
  const [createName, setCreateName] = useState('');
  const [createUsage, setCreateUsage] = useState<CustomEmojiUsage[]>(['emoticon', 'sticker']);
  const [packNameDraft, setPackNameDraft] = useState('');
  const [packUsageDraft, setPackUsageDraft] = useState<CustomEmojiUsage[]>(['emoticon', 'sticker']);
  const [query, setQuery] = useState('');
  const [selectedShortcodes, setSelectedShortcodes] = useState<string[]>([]);
  const [editingItemShortcode, setEditingItemShortcode] = useState<string>();
  const [itemShortcodeDraft, setItemShortcodeDraft] = useState('');
  const [itemBodyDraft, setItemBodyDraft] = useState('');
  const [moveTargetId, setMoveTargetId] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string }>();
  const singleUploadInputRef = useRef<HTMLInputElement | null>(null);
  const batchUploadInputRef = useRef<HTMLInputElement | null>(null);
  const itemShortcodeInputRef = useRef<HTMLInputElement | null>(null);

  const reloadPacks = useCallback(() => {
    const nextPacks = getPersonalCustomEmojiPacks(client);
    setPacks(nextPacks);
    setSelectedPackId((current) =>
      nextPacks.some((pack) => pack.id === current) ? current : (nextPacks[0]?.id ?? 'user')
    );
    setDetailPackId((current) => (current && nextPacks.some((pack) => pack.id === current) ? current : undefined));
    return nextPacks;
  }, [client]);

  useEffect(() => {
    reloadPacks();
  }, [reloadPacks]);

  const selectedPack = useMemo(
    () => packs.find((pack) => pack.id === selectedPackId) ?? packs[0],
    [packs, selectedPackId]
  );
  const detailPack = useMemo(
    () => (detailPackId ? packs.find((pack) => pack.id === detailPackId) : undefined),
    [detailPackId, packs]
  );

  useEffect(() => {
    if (!selectedPack) return;
    setPackNameDraft(selectedPack.name);
    setPackUsageDraft(normalizeCustomEmojiUsage(selectedPack.usage));
    setQuery('');
    setSelectedShortcodes([]);
    setEditingItemShortcode(undefined);
    setItemShortcodeDraft('');
    setItemBodyDraft('');
  }, [selectedPack?.id]);

  const filteredItems = useMemo(() => {
    if (!selectedPack) return [];
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return selectedPack.items;
    return selectedPack.items.filter((item) =>
      `${item.shortcode} ${item.body} ${item.packName}`.toLowerCase().includes(normalizedQuery)
    );
  }, [query, selectedPack]);

  const availableMoveTargets = useMemo(
    () => packs.filter((pack) => pack.id !== selectedPack?.id),
    [packs, selectedPack?.id]
  );
  const editingItem = useMemo(
    () => selectedPack?.items.find((item) => item.shortcode === editingItemShortcode),
    [editingItemShortcode, selectedPack]
  );

  useEffect(() => {
    setMoveTargetId((current) =>
      current && availableMoveTargets.some((pack) => pack.id === current)
        ? current
        : availableMoveTargets[0]?.id
    );
  }, [availableMoveTargets]);

  const packMetaDirty = Boolean(
    selectedPack &&
      (packNameDraft.trim() !== selectedPack.name ||
        normalizeCustomEmojiUsage(packUsageDraft).join('|') !==
          normalizeCustomEmojiUsage(selectedPack.usage).join('|'))
  );

  const orderedCustomPackIds = packs.filter((pack) => pack.orderable).map((pack) => pack.id);
  const itemMetaDirty = Boolean(
    editingItem &&
      (itemShortcodeDraft.trim() !== editingItem.shortcode ||
        itemBodyDraft.trim() !== (editingItem.body || editingItem.shortcode))
  );

  useEffect(() => {
    if (!editingItemShortcode) return;
    window.requestAnimationFrame(() => {
      itemShortcodeInputRef.current?.focus();
      itemShortcodeInputRef.current?.select();
    });
  }, [editingItemShortcode]);

  async function runMutation<T>(
    action: () => Promise<T>,
    getSuccessText: (result: T) => string
  ): Promise<T | undefined> {
    if (submitting) return undefined;
    setSubmitting(true);
    setMessage(undefined);
    onError(undefined);

    try {
      const result = await action();
      await Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
      onRefresh();
      reloadPacks();
      const successText = getSuccessText(result);
      setMessage({ type: 'success', text: successText });
      onSuccess(successText);
      return result;
    } catch (err) {
      const errorText = err instanceof Error ? err.message : String(err);
      setMessage({ type: 'error', text: errorText });
      onError(errorText);
      return undefined;
    } finally {
      setSubmitting(false);
    }
  }

  const handleCreatePack = async (evt: FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
    const nextPackId = await runMutation(
      () => createCustomEmojiPack(client, createName, createUsage),
      () => '分类已创建'
    );
    if (!nextPackId) return;
    setCreateName('');
    setCreateUsage(['emoticon', 'sticker']);
    setSelectedPackId(nextPackId);
    setDetailPackId(nextPackId);
  };

  const handleSavePackMeta = async () => {
    if (!selectedPack || !packMetaDirty) return;
    await runMutation(
      () =>
        updateCustomEmojiPack(client, selectedPack.id, {
          name: packNameDraft,
          usage: packUsageDraft,
        }),
      () => '分类设置已保存'
    );
  };

  const handleReorderPack = async (packId: string, direction: 'up' | 'down') => {
    if (submitting) return;

    const previousPacks = packs;
    const nextPacks = reorderOrderableEmojiPacks(packs, packId, direction);
    if (nextPacks === packs) return;

    setSubmitting(true);
    setMessage(undefined);
    onError(undefined);
    setPacks(nextPacks);

    try {
      await reorderCustomEmojiPack(client, packId, direction);
      await Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
      onRefresh();
      reloadPacks();
      const successText = direction === 'up' ? '分类已上移' : '分类已下移';
      setMessage({ type: 'success', text: successText });
      onSuccess(successText);
    } catch (err) {
      setPacks(previousPacks);
      const errorText = err instanceof Error ? err.message : String(err);
      setMessage({ type: 'error', text: errorText });
      onError(errorText);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePack = async (pack: CustomEmojiPack) => {
    if (!pack.deletable) return;
    if (!window.confirm(`确定删除分类“${pack.name}”吗？里面的内容会一起删除。`)) return;
    await runMutation(() => deleteCustomEmojiPack(client, pack.id), () => '分类已删除');
  };

  const handleUploadFiles = async (files: File[]) => {
    if (!selectedPack || files.length === 0) return;
    await runMutation(
      () => uploadCustomEmojiPackFiles(client, selectedPack.id, files),
      (count) => `已上传 ${count} 张图片`
    );
  };

  const handleUploadInputChange = (evt: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(evt.target.files ?? []);
    evt.target.value = '';
    if (files.length === 0) return;
    void handleUploadFiles(files);
  };

  const handleDeleteItems = async (shortcodes: string[]) => {
    if (!selectedPack || shortcodes.length === 0) return;
    const deletingSingle = shortcodes.length === 1;
    const confirmText = deletingSingle
      ? `确定删除“${shortcodes[0]}”吗？`
      : `确定删除已选择的 ${shortcodes.length} 个表情/贴纸吗？`;
    if (!window.confirm(confirmText)) return;

    const deletedCount = await runMutation(
      () => deleteCustomEmojiPackItems(client, selectedPack.id, shortcodes),
      (count) => `已删除 ${count} 个内容`
    );
    if (!deletedCount) return;

    setSelectedShortcodes((current) => current.filter((shortcode) => !shortcodes.includes(shortcode)));
    if (editingItemShortcode && shortcodes.includes(editingItemShortcode)) {
      setEditingItemShortcode(undefined);
      setItemShortcodeDraft('');
      setItemBodyDraft('');
    }
  };

  const handleMoveSelection = async () => {
    if (!selectedPack || !moveTargetId || selectedShortcodes.length === 0) return;
    const movedCount = await runMutation(
      () => moveCustomEmojiPackItems(client, selectedPack.id, moveTargetId, selectedShortcodes),
      (count) => `已移动 ${count} 个内容`
    );
    if (!movedCount) return;
    setSelectedShortcodes([]);
  };

  const startEditingItem = (item: CustomEmojiItem) => {
    setEditingItemShortcode(item.shortcode);
    setItemShortcodeDraft(item.shortcode);
    setItemBodyDraft(item.body || item.shortcode);
  };

  const cancelEditingItem = () => {
    setEditingItemShortcode(undefined);
    setItemShortcodeDraft('');
    setItemBodyDraft('');
  };

  const handleSaveItemMeta = async () => {
    if (!selectedPack || !editingItem || !itemMetaDirty) return;

    const originalShortcode = editingItem.shortcode;
    const nextShortcode = await runMutation(
      () =>
        updateCustomEmojiPackItem(client, selectedPack.id, originalShortcode, {
          shortcode: itemShortcodeDraft,
          body: itemBodyDraft,
        }),
      () => '表情设置已保存'
    );
    if (!nextShortcode) return;

    setEditingItemShortcode(nextShortcode);
    setItemShortcodeDraft(nextShortcode);
    setItemBodyDraft((current) => current.trim() || nextShortcode);
    setSelectedShortcodes((current) =>
      current.map((shortcode) => (shortcode === originalShortcode ? nextShortcode : shortcode))
    );
  };

  const toggleSelectedShortcode = (shortcode: string) => {
    setSelectedShortcodes((current) =>
      current.includes(shortcode)
        ? current.filter((item) => item !== shortcode)
        : current.concat(shortcode)
    );
  };

  return (
    <div className="sheet-backdrop">
      <section className="sheet emoji-manager-sheet">
        <header className="sheet-header">
          <div>
            <p className="eyebrow">Emoji</p>
            <h2>表情与贴纸管理</h2>
            <small>这里管理个人分类；房间共享表情仍会继续显示，但暂不在这里编辑。</small>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="关闭">
            <X size={20} />
          </button>
        </header>

        <section className="emoji-manager-summary">
          <span>
            <SmilePlus size={18} />
            <strong>{packs.length}</strong>
            <small>个人分类</small>
          </span>
          <span>
            <ImageIcon size={18} />
            <strong>{packs.reduce((count, pack) => count + pack.items.length, 0)}</strong>
            <small>可管理内容</small>
          </span>
        </section>

        <div className="emoji-manager-scroll">
          {!detailPack ? (
            <>
              {message && (
                <p className={message.type === 'error' ? 'security-message error' : 'security-message success'}>
                  {message.text}
                </p>
              )}

              <form className="emoji-manager-create" onSubmit={handleCreatePack}>
                <div className="section-title">
                  <span>新建分类</span>
                  <strong>支持表情 / 贴纸</strong>
                </div>
                <label className="create-field">
                  <span>分类名称</span>
                  <input
                    value={createName}
                    placeholder="例如：猫猫、收藏、动态贴纸"
                    onChange={(evt) => setCreateName(evt.target.value)}
                  />
                </label>
                <label className="create-field">
                  <span>分类用途</span>
                  <EmojiUsageToggleGroup value={createUsage} disabled={submitting} onChange={setCreateUsage} />
                </label>
                <div className="create-submit-row split">
                  <button type="button" className="secondary-button" onClick={onClose}>
                    关闭
                  </button>
                  <button type="submit" className="primary-button" disabled={submitting || !createName.trim()}>
                    <Plus size={17} />
                    新建分类
                  </button>
                </div>
              </form>

              <section className="emoji-manager-section">
                <div className="section-title">
                  <span>分类列表</span>
                  <strong>点“管理分类”进入详情</strong>
                </div>
                <div className="emoji-pack-list">
                  {packs.map((pack) => {
                    const customIndex = orderedCustomPackIds.indexOf(pack.id);
                    const canMoveUp = pack.orderable && customIndex > 0;
                    const canMoveDown =
                      pack.orderable && customIndex > -1 && customIndex < orderedCustomPackIds.length - 1;

                    return (
                      <div key={pack.id} className="emoji-pack-row">
                        <div className="emoji-pack-main">
                          <span className="emoji-pack-cover-shell" aria-hidden="true">
                            {pack.cover ? (
                              <AuthenticatedImage
                                className="emoji-pack-cover"
                                src={pack.cover.authUrl ?? pack.cover.url}
                                fallbackSrc={pack.cover.downloadUrl ?? pack.cover.url}
                                accessToken={mediaAccessToken}
                                retrySrcs={[
                                  pack.cover.authDownloadUrl ?? pack.cover.downloadUrl,
                                  ...buildMatrixMediaRetrySrcs(pack.cover.authUrl, pack.cover.url),
                                ]}
                                alt={pack.name}
                              />
                            ) : (
                              <span className="emoji-pack-cover fallback">{pack.name.slice(0, 1)}</span>
                            )}
                          </span>
                          <span className="emoji-pack-meta">
                            <strong>{pack.name}</strong>
                            <small>
                              {pack.items.length} 项 · {formatCustomEmojiUsage(pack.usage)}
                              {pack.isDefault ? ' · 默认' : ''}
                            </small>
                          </span>
                        </div>
                        <div className="emoji-pack-actions">
                          <button
                            type="button"
                            className="member-action"
                            disabled={submitting}
                            onClick={() => {
                              setSelectedPackId(pack.id);
                              setDetailPackId(pack.id);
                            }}
                          >
                            管理分类
                          </button>
                          {pack.orderable && (
                            <>
                              <button
                                type="button"
                                className="member-action subtle"
                                disabled={submitting || !canMoveUp}
                                onClick={() => void handleReorderPack(pack.id, 'up')}
                              >
                                上移
                              </button>
                              <button
                                type="button"
                                className="member-action subtle"
                                disabled={submitting || !canMoveDown}
                                onClick={() => void handleReorderPack(pack.id, 'down')}
                              >
                                下移
                              </button>
                            </>
                          )}
                          {pack.deletable && (
                            <button
                              type="button"
                              className="member-action danger"
                              disabled={submitting}
                              onClick={() => void handleDeletePack(pack)}
                            >
                              删除
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          ) : selectedPack ? (
            <section className="emoji-manager-section emoji-manager-editor">
              <div className="emoji-manager-detail-header">
                <button
                  type="button"
                  className="member-action subtle emoji-manager-back"
                  onClick={() => setDetailPackId(undefined)}
                >
                  <ChevronLeft size={16} />
                  返回分类列表
                </button>
                <div className="emoji-pack-main">
                  <span className="emoji-pack-cover-shell" aria-hidden="true">
                    {selectedPack.cover ? (
                      <AuthenticatedImage
                        className="emoji-pack-cover"
                        src={selectedPack.cover.authUrl ?? selectedPack.cover.url}
                        fallbackSrc={selectedPack.cover.downloadUrl ?? selectedPack.cover.url}
                        accessToken={mediaAccessToken}
                        retrySrcs={[
                          selectedPack.cover.authDownloadUrl ?? selectedPack.cover.downloadUrl,
                          ...buildMatrixMediaRetrySrcs(selectedPack.cover.authUrl, selectedPack.cover.url),
                        ]}
                        alt={selectedPack.name}
                      />
                    ) : (
                      <span className="emoji-pack-cover fallback">{selectedPack.name.slice(0, 1)}</span>
                    )}
                  </span>
                  <span className="emoji-pack-meta">
                    <strong>{selectedPack.name}</strong>
                    <small>{selectedPack.items.length} 项，可在这里改名、上传和转移分类</small>
                  </span>
                </div>
              </div>

              {message && (
                <p className={message.type === 'error' ? 'security-message error' : 'security-message success'}>
                  {message.text}
                </p>
              )}

              <label className="create-field">
                <span>分类名称</span>
                <input value={packNameDraft} onChange={(evt) => setPackNameDraft(evt.target.value)} />
              </label>

              <label className="create-field">
                <span>分类用途</span>
                <EmojiUsageToggleGroup value={packUsageDraft} disabled={submitting} onChange={setPackUsageDraft} />
              </label>

              <div className="emoji-manager-inline-actions">
                <button
                  type="button"
                  className="primary-button compact"
                  disabled={submitting || !packMetaDirty}
                  onClick={() => void handleSavePackMeta()}
                >
                  <Check size={16} />
                  保存分类设置
                </button>
                <button
                  type="button"
                  className="secondary-button compact"
                  disabled={submitting}
                  onClick={() => singleUploadInputRef.current?.click()}
                >
                  <FileUp size={16} />
                  单次上传
                </button>
                <button
                  type="button"
                  className="secondary-button compact"
                  disabled={submitting}
                  onClick={() => batchUploadInputRef.current?.click()}
                >
                  <FolderOpen size={16} />
                  批量上传
                </button>
              </div>

              <input
                ref={singleUploadInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleUploadInputChange}
              />
              <input
                ref={batchUploadInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={handleUploadInputChange}
              />

              <label className="search-field">
                <Search size={15} />
                <input
                  value={query}
                  placeholder="搜索短码、名称"
                  onChange={(evt) => setQuery(evt.target.value)}
                />
              </label>

              <div className="emoji-manager-selection-bar">
                <span>
                  {selectedShortcodes.length > 0
                    ? `已选择 ${selectedShortcodes.length} 项`
                    : '点图片可单选或多选，再移动到其他分类'}
                </span>
                <button
                  type="button"
                  className="member-action subtle"
                  disabled={selectedShortcodes.length === 0}
                  onClick={() => setSelectedShortcodes([])}
                >
                  清空选择
                </button>
              </div>

              <div className="emoji-manager-move">
                <select
                  value={moveTargetId ?? ''}
                  disabled={submitting || selectedShortcodes.length === 0 || availableMoveTargets.length === 0}
                  onChange={(evt) => setMoveTargetId(evt.target.value || undefined)}
                >
                  {availableMoveTargets.length === 0 ? (
                    <option value="">没有其他分类可移动</option>
                  ) : (
                    availableMoveTargets.map((pack) => (
                      <option key={pack.id} value={pack.id}>
                        移动到：{pack.name}
                      </option>
                    ))
                  )}
                </select>
                <button
                  type="button"
                  className="secondary-button compact"
                  disabled={submitting || selectedShortcodes.length === 0 || !moveTargetId}
                  onClick={() => void handleMoveSelection()}
                >
                  移动到其他分类
                </button>
                <button
                  type="button"
                  className="secondary-button compact danger"
                  disabled={submitting || selectedShortcodes.length === 0}
                  onClick={() => void handleDeleteItems(selectedShortcodes)}
                >
                  <Trash2 size={16} />
                  删除所选
                </button>
              </div>

              {filteredItems.length === 0 ? (
                <div className="empty-state compact">
                  <ImageIcon size={24} />
                  <h3>{selectedPack.items.length === 0 ? '这个分类还没有内容' : '没有匹配到内容'}</h3>
                  <span>
                    {selectedPack.items.length === 0
                      ? '先上传一张图片，就能在输入框里作为表情或贴纸使用。'
                      : '换个关键词试试，或者清空搜索条件。'}
                  </span>
                </div>
              ) : (
                <div className="emoji-manager-grid">
                  {filteredItems.map((item) => {
                    const selected = selectedShortcodes.includes(item.shortcode);
                    if (editingItemShortcode === item.shortcode) {
                      return (
                        <article key={item.id} className="emoji-manager-item-editor emoji-manager-item-editor-inline">
                          <div className="section-title">
                            <span>编辑单个表情</span>
                            <strong>{item.shortcode}</strong>
                          </div>
                          <div className="emoji-manager-item-editor-preview">
                            <span className="emoji-manager-item-media" aria-hidden="true">
                              <AuthenticatedImage
                                src={item.authUrl ?? item.url}
                                fallbackSrc={item.downloadUrl ?? item.url}
                                accessToken={mediaAccessToken}
                                retrySrcs={[
                                  item.authDownloadUrl ?? item.downloadUrl,
                                  ...buildMatrixMediaRetrySrcs(item.authUrl, item.url),
                                ]}
                                alt={item.body || item.shortcode}
                              />
                            </span>
                            <span>
                              <strong>{item.body || item.shortcode}</strong>
                              <small>就在这里直接改，不用再滚到上面</small>
                            </span>
                          </div>
                          <div className="emoji-manager-item-editor-grid">
                            <label className="create-field">
                              <span>短码</span>
                              <input
                                ref={itemShortcodeInputRef}
                                value={itemShortcodeDraft}
                                placeholder="例如：cat-wave"
                                onChange={(evt) => setItemShortcodeDraft(evt.target.value)}
                              />
                            </label>
                            <label className="create-field">
                              <span>显示名称</span>
                              <input
                                value={itemBodyDraft}
                                placeholder="例如：招手猫猫"
                                onChange={(evt) => setItemBodyDraft(evt.target.value)}
                              />
                            </label>
                          </div>
                          <div className="emoji-manager-inline-actions">
                            <button
                              type="button"
                              className="primary-button compact"
                              disabled={submitting || !itemMetaDirty || !itemShortcodeDraft.trim()}
                              onClick={() => void handleSaveItemMeta()}
                            >
                              <Check size={16} />
                              保存单项设置
                            </button>
                            <button
                              type="button"
                              className="secondary-button compact"
                              disabled={submitting}
                              onClick={cancelEditingItem}
                            >
                              取消编辑
                            </button>
                          </div>
                        </article>
                      );
                    }

                    return (
                      <article
                        key={item.id}
                        className={selected ? 'emoji-manager-item selected' : 'emoji-manager-item'}
                      >
                        <button
                          type="button"
                          className="emoji-manager-item-select"
                          onClick={() => toggleSelectedShortcode(item.shortcode)}
                        >
                          <span className="emoji-manager-item-media" aria-hidden="true">
                            <AuthenticatedImage
                              src={item.authUrl ?? item.url}
                              fallbackSrc={item.downloadUrl ?? item.url}
                              accessToken={mediaAccessToken}
                              retrySrcs={[
                                item.authDownloadUrl ?? item.downloadUrl,
                                ...buildMatrixMediaRetrySrcs(item.authUrl, item.url),
                              ]}
                              alt={item.body || item.shortcode}
                            />
                          </span>
                          <strong>{item.shortcode}</strong>
                          <small>{item.body || item.shortcode}</small>
                        </button>
                        <button
                          type="button"
                          className="emoji-manager-item-edit"
                          aria-label={`编辑 ${item.shortcode}`}
                          disabled={submitting}
                          onClick={() => startEditingItem(item)}
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          className="emoji-manager-item-delete"
                          aria-label={`删除 ${item.shortcode}`}
                          disabled={submitting}
                          onClick={() => void handleDeleteItems([item.shortcode])}
                        >
                          <Trash2 size={14} />
                        </button>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function ForwardSheet({
  messages,
  rooms,
  mediaAccessToken,
  onForward,
  onClose,
}: {
  messages: ChatMessage[];
  rooms: RoomSummary[];
  mediaAccessToken?: string;
  onForward: (roomIds: string[]) => Promise<void>;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [forwarding, setForwarding] = useState(false);
  const visibleRooms = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const joinedRooms = rooms.filter((room) => room.membership === 'join');
    if (!normalized) return joinedRooms;
    return joinedRooms.filter((room) =>
      `${room.name} ${room.topic ?? ''} ${room.canonicalAlias ?? ''}`.toLowerCase().includes(normalized)
    );
  }, [query, rooms]);

  const toggleTargetRoom = (roomId: string) => {
    setSelectedRoomIds((current) =>
      current.includes(roomId)
        ? current.filter((selectedId) => selectedId !== roomId)
        : current.concat(roomId)
    );
  };

  const handleSend = async () => {
    if (selectedRoomIds.length === 0 || forwarding) return;
    setForwarding(true);
    try {
      await onForward(selectedRoomIds);
    } finally {
      setForwarding(false);
    }
  };

  const previewMessages = messages.slice(0, 3);

  return (
    <div className="sheet-backdrop">
      <section className="sheet forward-sheet">
        <header className="sheet-header">
          <div>
            <p className="eyebrow">Forward</p>
            <h2>转发消息</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="关闭">
            <X size={20} />
          </button>
        </header>

        <div className="forward-preview">
          <Forward size={18} />
          <span>
            <strong>
              {messages.length === 1
                ? messages[0].senderName ?? messages[0].sender ?? '消息'
                : `已选择 ${messages.length} 条消息`}
            </strong>
            <small>
              {previewMessages
                .map((item) => getReadableMessageBody(item.body))
                .join(' / ')}
            </small>
          </span>
        </div>

        <label className="search-field">
          <Search size={16} />
          <input value={query} placeholder="搜索转发目标" onChange={(evt) => setQuery(evt.target.value)} />
        </label>

        <div className="forward-room-list">
          {visibleRooms.length === 0 ? (
            <p className="digest-empty">没有匹配的已加入会话</p>
          ) : (
            visibleRooms.map((room) => (
              <button
                key={room.id}
                className={selectedRoomIds.includes(room.id) ? 'selected' : ''}
                onClick={() => toggleTargetRoom(room.id)}
                aria-pressed={selectedRoomIds.includes(room.id)}
              >
                <Avatar name={room.name} src={room.avatarUrl} accessToken={mediaAccessToken} small />
                <span>
                  <strong>{room.name}</strong>
                  <small>{room.direct ? '私聊' : room.space ? '空间' : '群组'} · {room.memberCount} </small>
                </span>
                {selectedRoomIds.includes(room.id) && <Check size={16} />}
              </button>
            ))
          )}
        </div>

        <footer className="forward-actions">
          <span>
            {selectedRoomIds.length === 0
              ? '请选择至少一个目标会'
              : `将转发到 ${selectedRoomIds.length} 个会话`}
          </span>
          <div>
            <button type="button" className="secondary-button compact" onClick={onClose}>
              取消
            </button>
            <button
              type="button"
              className="primary-button compact"
              onClick={() => void handleSend()}
              disabled={selectedRoomIds.length === 0 || forwarding}
            >
              <Send size={16} />
              {forwarding ? '发送中' : '发送'}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

const messageGestureStopSelector = [
  '.message-actions',
  '.reaction-picker-toggle',
  '.reaction-picker-panel',
  '.message-select-toggle',
  '.avatar-button',
  '.message-sender-button',
  '.message-inline-editor',
  '.message-inline-editor textarea',
  '.message-inline-editor button',
  '.message-rich-text a',
  '.audio-player button',
  '.audio-player input',
].join(', ');

const shouldIgnoreMessageGesture = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement && Boolean(target.closest(messageGestureStopSelector));

type MessageSwipeAction = 'reply';

const MESSAGE_SWIPE_TRIGGER_DISTANCE = 72;
const MESSAGE_SWIPE_READY_DISTANCE = 56;
const MESSAGE_SWIPE_MAX_OFFSET = 84;

function MessageRichText({
  body,
  forwardContent,
  client,
  accessToken,
  className = 'message-rich-text',
  members = [],
  onOpenMember,
}: {
  body: string;
  forwardContent?: Record<string, unknown>;
  client?: MatrixClient;
  accessToken?: string;
  className?: string;
  members?: RoomMemberSummary[];
  onOpenMember?: (member: RoomMemberSummary) => void;
}) {
  const richTextRef = useRef<HTMLDivElement | null>(null);
  const html = useMemo(
    () => getMessageBodyHtml({ body, forwardContent }, members, client, accessToken),
    [accessToken, body, client, forwardContent, members]
  );

  useEffect(() => {
    const host = richTextRef.current;
    if (!host) return undefined;

    let cancelled = false;
    const emojiImages = Array.from(
      host.querySelectorAll<HTMLImageElement>('img.message-inline-emoji[data-media-cache-key]')
    );
    if (emojiImages.length === 0) return undefined;

    void Promise.allSettled(
      emojiImages.map(async (image) => {
        const cacheKey = image.dataset.mediaCacheKey?.trim();
        const source = image.dataset.mediaSrc?.trim();
        const fallbackSource = image.dataset.mediaFallbackSrc?.trim();
        if (!cacheKey || !source) return;

        const cachedSrc = peekCachedMediaUrl(cacheKey) ?? (await getCachedMediaUrl(cacheKey, undefined, source));
        if (cachedSrc) {
          if (!cancelled && image.isConnected && image.src !== cachedSrc) {
            image.src = cachedSrc;
          }
          return;
        }

        try {
          const blob = await fetchMediaBlobDeduped(cacheKey, () =>
            fetchMediaBlob(source, accessToken, fallbackSource || undefined)
          );
          const storedUrl = await storeCachedMediaBlob(cacheKey, blob, blob.type, source);
          const resolvedSrc = storedUrl ?? peekCachedMediaUrl(cacheKey);
          if (!cancelled && resolvedSrc && image.isConnected && image.src !== resolvedSrc) {
            image.src = resolvedSrc;
          }
        } catch {
          // Keep the current remote src when offline cache hydration fails.
        }
      })
    );

    return () => {
      cancelled = true;
    };
  }, [accessToken, html]);

  const handleClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (!onOpenMember) return;

      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const mentionLink = target.closest('a[data-mention-user-id]');
      if (!(mentionLink instanceof HTMLAnchorElement)) return;

      const userId = mentionLink.dataset.mentionUserId?.trim();
      if (!userId) return;

      event.preventDefault();
      event.stopPropagation();

      const fallbackName = mentionLink.textContent?.trim().replace(/^@/, '') || userId;
      onOpenMember(members.find((member) => member.id === userId) ?? { id: userId, name: fallbackName });
    },
    [members, onOpenMember]
  );

  return <div ref={richTextRef} className={className} onClick={handleClick} dangerouslySetInnerHTML={{ __html: html }} />;
}

function MessageReactionKey({
  reactionKey,
  shortcode,
  client,
  accessToken,
}: {
  reactionKey: string;
  shortcode?: string;
  client?: MatrixClient;
  accessToken?: string;
}) {
  const mediaSource = useMemo(() => {
    if (!client || !reactionKey.startsWith('mxc://')) return undefined;

    const authThumb = mxcToHttp(client, reactionKey, 48, 48, true);
    const publicThumb = mxcToHttp(client, reactionKey, 48, 48);
    const authFull = mxcToHttp(client, reactionKey, undefined, undefined, true);
    const publicFull = mxcToHttp(client, reactionKey);

    return {
      src: authThumb ?? authFull ?? publicThumb ?? publicFull,
      fallbackSrc: publicThumb ?? publicFull ?? authThumb ?? authFull,
      retrySrcs: [
        authFull,
        publicFull,
        ...buildMatrixMediaRetrySrcs(authThumb, publicThumb, authFull, publicFull),
      ],
    };
  }, [client, reactionKey]);

  if (mediaSource?.src || mediaSource?.fallbackSrc) {
    return (
      <AuthenticatedImage
        className="reaction-key-image"
        src={mediaSource.src}
        fallbackSrc={mediaSource.fallbackSrc}
        accessToken={accessToken}
        retrySrcs={mediaSource.retrySrcs}
        alt={shortcode ?? reactionKey}
      />
    );
  }

  if (isHttpLikeUrl(reactionKey)) {
    return (
      <img
        className="reaction-key-image"
        src={reactionKey}
        alt={shortcode ?? reactionKey}
        loading="lazy"
        decoding="async"
      />
    );
  }

  return <span className="reaction-key-text">{reactionKey}</span>;
}

const formatReactionParticipants = (
  reaction: {
    key: string;
    count: number;
    reactors: Array<{ name: string }>;
  }
): string => {
  if (reaction.reactors.length === 0) {
    return `${reaction.count} 人`;
  }

  const names = reaction.reactors.map((reactor) => reactor.name).filter(Boolean);
  if (names.length === 0) return `${reaction.count} 人`;
  if (names.length <= 3) return names.join('、');
  return `${names.slice(0, 3).join('、')} 等 ${reaction.count} 人`;
};

function MessageReactionButton({
  reaction,
  client,
  accessToken,
  active = false,
  onClick,
}: {
  reaction: {
    key: string;
    count: number;
    shortcode?: string;
    reactors: Array<{ name: string }>;
  };
  client?: MatrixClient;
  accessToken?: string;
  active?: boolean;
  onClick: () => void;
}) {
  const participantLabel = formatReactionParticipants(reaction);
  const actionLabel =
    reaction.shortcode && reaction.shortcode !== reaction.key
      ? `${reaction.key}（:${reaction.shortcode}:）`
      : reaction.key;

  return (
    <button
      type="button"
      className={active ? 'active' : ''}
      onClick={onClick}
      title={participantLabel}
      aria-label={`${actionLabel}，${participantLabel}`}
    >
      <MessageReactionKey
        reactionKey={reaction.key}
        shortcode={reaction.shortcode}
        client={client}
        accessToken={accessToken}
      />
      <span className="reaction-count">{reaction.count}</span>
    </button>
  );
}

function MessageReactionPicker({
  customItems,
  accessToken,
  onReact,
  className,
  panelClassName,
}: {
  customItems: CustomEmojiItem[];
  accessToken?: string;
  onReact: (key: string, shortcode?: string) => void;
  className?: string;
  panelClassName?: string;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const reactionEmojiItems = useMemo(
    () => customItems.filter((item) => item.usage.includes('emoticon')),
    [customItems]
  );

  useEffect(() => {
    if (!pickerOpen) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      if (pickerRef.current?.contains(event.target as Node)) return;
      setPickerOpen(false);
    };

    window.addEventListener('pointerdown', handlePointerDown, true);
    return () => window.removeEventListener('pointerdown', handlePointerDown, true);
  }, [pickerOpen]);

  const handleReact = (key: string, shortcode?: string) => {
    onReact(key, shortcode);
    setPickerOpen(false);
  };

  return (
    <div ref={pickerRef} className={className ?? 'message-reaction-picker'}>
      <div className="quick-reactions" aria-label="快速回应">
        <button
          type="button"
          className={pickerOpen ? 'reaction-picker-toggle active' : 'reaction-picker-toggle'}
          aria-label={pickerOpen ? '收起完整表情选择' : '打开完整表情选择'}
          aria-expanded={pickerOpen}
          onClick={() => setPickerOpen((open) => !open)}
        >
          <SmilePlus size={14} />
        </button>
        {quickReactionOptions.map((reaction) => (
          <button key={reaction} type="button" onClick={() => handleReact(reaction)}>
            {reaction}
          </button>
        ))}
      </div>
      {pickerOpen && (
        <div className={panelClassName ?? 'reaction-picker-panel'}>
          <EnhancedEmojiTray
            emojis={composerEmojiOptions}
            customItems={reactionEmojiItems}
            accessToken={accessToken}
            onPick={(emoji) => handleReact(emoji)}
            onPickCustom={(item) => handleReact(item.mxcUrl, item.shortcode)}
            allowStickers={false}
          />
        </div>
      )}
    </div>
  );
}

function MessageBubble({
  client,
  message,
  favorite,
  highlighted,
  selectionMode,
  selected,
  forwardable,
  mediaAccessToken,
  customEmojiItems,
  members,
  currentUserProfile,
  readReceiptAvatarCount,
  inlineReadReceiptState,
  audioTranscription,
  editing,
  editingDraft,
  savingEdit,
  onToggleSelection,
  onFavorite,
  onReply,
  onOpenReply,
  onInfo,
  onEdit,
  onEditingDraftChange,
  onCancelEdit,
  onSaveEdit,
  onRedact,
  onCopy,
  onCopyLink,
  onTogglePin,
  onForward,
  onRetrySend,
  onPreviewAttachment,
  onAddImageToEmoji,
  onTranscribeAudio,
  onOpenUserProfile,
  onOpenMentionMember,
  onMentionSender,
  onOpenReadReceipts,
  onReact,
}: {
  client?: MatrixClient;
  message: ChatMessage;
  favorite: boolean;
  highlighted: boolean;
  selectionMode: boolean;
  selected: boolean;
  forwardable: boolean;
  mediaAccessToken?: string;
  customEmojiItems: CustomEmojiItem[];
  members: RoomMemberSummary[];
  currentUserProfile?: OwnProfile;
  readReceiptAvatarCount: number;
  inlineReadReceiptState?: InlineReadReceiptState;
  audioTranscription?: AudioTranscriptionState;
  editing: boolean;
  editingDraft: string;
  savingEdit: boolean;
  onToggleSelection: () => void;
  onFavorite: () => void;
  onReply: () => void;
  onOpenReply: (eventId: string) => void;
  onInfo: () => void;
  onEdit: () => void;
  onEditingDraftChange: (value: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onRedact: () => void;
  onCopy: () => void;
  onCopyLink: () => void;
  onTogglePin: () => void;
  onForward: () => void;
  onRetrySend?: () => void;
  onPreviewAttachment: () => void;
  onAddImageToEmoji?: () => void;
  onTranscribeAudio: () => void;
  onOpenUserProfile?: () => void;
  onOpenMentionMember?: (member: RoomMemberSummary) => void;
  onMentionSender?: () => void;
  onOpenReadReceipts: () => void;
  onReact: (key: string, shortcode?: string) => void;
}) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const articleRef = useRef<HTMLElement>(null);
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const actionsScrollAnchorRef = useRef<{
    timeline: HTMLElement;
    articleTop: number;
  } | null>(null);
  const gestureStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    swipeAction?: MessageSwipeAction;
    swipeEngaged: boolean;
    swipeReady: boolean;
    longPressTriggered: boolean;
  }>();
  const skipNextClickRef = useRef(false);
  const longPressTimerRef = useRef<number>();
  const updateActionsOpen = useCallback((nextState: boolean | ((open: boolean) => boolean)) => {
    const article = articleRef.current;
    const timeline = article?.closest<HTMLElement>('.timeline');

    actionsScrollAnchorRef.current =
      article && timeline
        ? {
            timeline,
            articleTop: article.getBoundingClientRect().top,
          }
        : null;

    setActionsOpen(nextState);
  }, []);
  const closeActionsOpen = useCallback(() => {
    updateActionsOpen(false);
  }, [updateActionsOpen]);
  const openActionsOpen = useCallback(() => {
    updateActionsOpen(true);
  }, [updateActionsOpen]);
  const runAndClose = (action: () => void) => {
    action();
    closeActionsOpen();
  };
  const clearLongPressTimer = () => {
    if (longPressTimerRef.current !== undefined) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = undefined;
    }
  };
  const resetGesture = () => {
    clearLongPressTimer();
    gestureStateRef.current = undefined;
    setSwipeOffset(0);
  };
  const attachment = message.attachment;
  const audioAttachment = attachment?.kind === 'audio';
  const showPreviewAction = Boolean(attachment && attachment.kind !== 'audio' && attachment.url);
  const showAddImageToEmojiAction = Boolean(
    attachment?.kind === 'image' && attachment.mxcUrl && onAddImageToEmoji
  );
  const showAudioTranscribeAction = attachment?.kind === 'audio';
  const showMessageEditAction = message.canEdit;
  const showMessageRedactAction = message.canRedact;
  const hasMessageExtraActions = Boolean(
    showPreviewAction ||
      showAddImageToEmojiAction ||
      showAudioTranscribeAction ||
      showMessageEditAction ||
      showMessageRedactAction
  );
  const attachmentName = attachment?.name ?? message.body;
  const showBody = Boolean(
    message.body && (!attachment || message.body !== attachmentName)
  );
  const stickerLikeImage = attachment?.kind === 'image' && isStickerLikeMessage(message);
  const hasVisualAttachment = attachment?.kind === 'image' || attachment?.kind === 'video';
  const mediaOnlyBubble = Boolean(
    hasVisualAttachment && !showBody && !message.replyTo && !editing
  );
  const attachmentPreviewSrc = attachment
    ? attachment.authUrl ?? attachment.url ?? attachment.authDownloadUrl ?? attachment.downloadUrl
    : undefined;
  const attachmentPreviewFallbackSrc = attachment
    ? attachment.downloadUrl ?? attachment.url
    : undefined;
  const attachmentPreviewEncryptedFile = getPreviewEncryptedFile(attachment);
  const attachmentFullSrc = attachment
    ? attachment.authDownloadUrl ?? attachment.downloadUrl ?? attachment.authUrl ?? attachment.url
    : undefined;
  const attachmentFullFallbackSrc = attachment
    ? attachment.downloadUrl ?? attachment.url
    : undefined;
  const visibleReadReceiptCount = clampReadReceiptAvatarCount(readReceiptAvatarCount);
  const bubbleReadReceipts = inlineReadReceiptState?.readReceipts ?? [];
  const inlineReadReceiptLimit = Math.min(3, visibleReadReceiptCount);
  const visibleReadReceipts = bubbleReadReceipts.slice(0, inlineReadReceiptLimit);
  const receiptAvatarEntries = visibleReadReceipts.map((reader) => ({
    key: reader.userId,
    name: reader.name,
    avatarUrl: reader.avatarUrl,
  }));
  const receiptAudienceCount = inlineReadReceiptState?.totalCount ?? bubbleReadReceipts.length;
  const readReceiptOverflow = Math.max(receiptAudienceCount - receiptAvatarEntries.length, 0);
  const showReadReceiptIndicator = Boolean(
    message.mine && (receiptAvatarEntries.length > 0 || readReceiptOverflow > 0)
  );
  const showSenderLine = !message.mine && members.length > 2;
  const messageTimeLabel = formatMessageTime(message.timestamp);
  const messageSendStatusLabel = getMessageSendStatusLabel(message);
  const retryableSend = Boolean(message.mine && message.sendStatus === 'failed' && !editing && onRetrySend);
  const messageFooterLabel = [
    messageTimeLabel,
    message.edited ? '已编辑' : undefined,
  ]
    .filter(Boolean)
    .join(' · ');
  const showMessageFooter = Boolean(
    messageFooterLabel || messageSendStatusLabel || (!editing && showReadReceiptIndicator)
  );
  const messageDetailLabel = [
    formatFullTime(message.timestamp),
    message.edited ? '已编辑' : undefined,
    messageSendStatusLabel,
    message.pinned ? '已置顶' : undefined,
    message.encrypted ? '已加密' : undefined,
  ]
    .filter(Boolean)
    .join(' · ');
  const swipeAction: MessageSwipeAction | undefined = swipeOffset < 0 ? 'reply' : undefined;
  const swipeReady = Boolean(swipeAction && Math.abs(swipeOffset) >= MESSAGE_SWIPE_READY_DISTANCE);
  const bubbleWrapStyle = swipeOffset
    ? ({ transform: `translateX(${swipeOffset}px)` } as CSSProperties)
    : undefined;
  const inlineEditTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (selectionMode) {
      closeActionsOpen();
    }
  }, [closeActionsOpen, selectionMode]);

  useEffect(() => {
    if (!editing) return;
    closeActionsOpen();
    window.requestAnimationFrame(() => {
      const textarea = inlineEditTextareaRef.current;
      if (!textarea) return;
      textarea.focus();
      const length = textarea.value.length;
      textarea.setSelectionRange(length, length);
    });
  }, [closeActionsOpen, editing]);

  useLayoutEffect(() => {
    const textarea = inlineEditTextareaRef.current;
    if (!editing || !textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.max(textarea.scrollHeight, 148)}px`;
  }, [editing, editingDraft]);

  useLayoutEffect(() => {
    const anchor = actionsScrollAnchorRef.current;
    const article = articleRef.current;
    if (!anchor || !article) return;

    const topDelta = article.getBoundingClientRect().top - anchor.articleTop;
    if (Math.abs(topDelta) > 0.5) {
      anchor.timeline.scrollTop += topDelta;
    }

    actionsScrollAnchorRef.current = null;
  }, [actionsOpen]);

  useLayoutEffect(() => {
    const article = articleRef.current;
    if (!article) return;

    if (!actionsOpen || editing) {
      article.style.removeProperty('--message-actions-height');
      return;
    }

    const actions = actionsRef.current;
    if (!actions) return;
    let compensationFrame: number | undefined;

    const updateActionsHeight = () => {
      const timeline = article.closest<HTMLElement>('.timeline');
      const previousTop = article.getBoundingClientRect().top;

      article.style.setProperty(
        '--message-actions-height',
        `${Math.ceil(actions.getBoundingClientRect().height)}px`
      );

      if (!timeline) return;

      if (compensationFrame !== undefined) {
        window.cancelAnimationFrame(compensationFrame);
      }

      compensationFrame = window.requestAnimationFrame(() => {
        compensationFrame = undefined;
        const topDelta = article.getBoundingClientRect().top - previousTop;
        if (Math.abs(topDelta) > 0.5) {
          timeline.scrollTop += topDelta;
        }
      });
    };

    updateActionsHeight();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(() => {
      updateActionsHeight();
    });
    observer.observe(actions);
    return () => {
      observer.disconnect();
      if (compensationFrame !== undefined) {
        window.cancelAnimationFrame(compensationFrame);
      }
    };
  }, [actionsOpen, editing]);

  useEffect(() => {
    if (!actionsOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (articleRef.current?.contains(event.target as Node)) return;
      closeActionsOpen();
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [actionsOpen, closeActionsOpen]);

  useEffect(
    () => () => {
      clearLongPressTimer();
    },
    []
  );

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (selectionMode || event.button !== 0 || shouldIgnoreMessageGesture(event.target)) return;

    gestureStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      swipeEngaged: false,
      swipeReady: false,
      longPressTriggered: false,
    };
    clearLongPressTimer();
    longPressTimerRef.current = window.setTimeout(() => {
      const gesture = gestureStateRef.current;
      if (!gesture || gesture.pointerId !== event.pointerId) return;
      gesture.longPressTriggered = true;
      skipNextClickRef.current = true;
      void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
      openActionsOpen();
    }, longPressDurationMs);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const gesture = gestureStateRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    if (gesture.longPressTriggered) return;

    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    if (absDeltaX > tapMovementTolerancePx || absDeltaY > tapMovementTolerancePx) {
      clearLongPressTimer();
    }

    if (absDeltaY > 18 && absDeltaY >= absDeltaX) {
      resetGesture();
      return;
    }

    if (absDeltaX < 10 || absDeltaX < absDeltaY) {
      return;
    }

    if (deltaX >= 0) {
      if (gesture.swipeEngaged) {
        gesture.swipeEngaged = false;
        gesture.swipeReady = false;
        gesture.swipeAction = undefined;
        setSwipeOffset(0);
      }
      return;
    }

    gesture.swipeEngaged = true;
    gesture.swipeAction = 'reply';
    gesture.swipeReady = absDeltaX >= MESSAGE_SWIPE_TRIGGER_DISTANCE;
    setSwipeOffset(Math.max(-MESSAGE_SWIPE_MAX_OFFSET, deltaX));
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    const gesture = gestureStateRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) {
      resetGesture();
      return;
    }

    if (gesture.longPressTriggered) {
      resetGesture();
      return;
    }

    if (gesture.swipeEngaged) {
      skipNextClickRef.current = true;
    }

    if (gesture.swipeReady && gesture.swipeAction) {
      closeActionsOpen();
      void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
      onReply();
    }

    resetGesture();
  };

  const handleMessageClickCapture = (event: ReactMouseEvent<HTMLElement>) => {
    if (!skipNextClickRef.current) return;
    skipNextClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  const handleMessageClick = (event: ReactMouseEvent<HTMLElement>) => {
    if (shouldIgnoreMessageGesture(event.target)) return;
    if (selectionMode) {
      event.preventDefault();
      onToggleSelection();
    }
  };

  const handleContextMenu = (event: ReactMouseEvent<HTMLElement>) => {
    if (selectionMode || shouldIgnoreMessageGesture(event.target)) return;
    event.preventDefault();
    openActionsOpen();
  };

  const handleInlineEditorKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      onSaveEdit();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      onCancelEdit();
    }
  };

  if (message.kind === 'system') {
    return (
      <div className="system-message">
        <span>{getReadableMessageBody(message.body)}</span>
      </div>
    );
  }

  return (
    <article
      ref={articleRef}
      className={`${message.mine ? 'message mine' : 'message'}${showSenderLine ? ' with-sender-line' : ''}${highlighted ? ' highlighted' : ''}${actionsOpen ? ' actions-open' : ''}${selectionMode ? ' selecting' : ''}${selected ? ' selected' : ''}${!forwardable ? ' not-forwardable' : ''}${editing ? ' editing' : ''}`}
      data-message-id={message.id}
      data-swipe-action={swipeAction}
      data-swipe-ready={swipeReady}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={resetGesture}
      onClickCapture={handleMessageClickCapture}
      onClick={handleMessageClick}
      onContextMenu={handleContextMenu}
      title={messageDetailLabel}
    >
      {selectionMode && (
        <button
          className="message-select-toggle"
          type="button"
          onClick={onToggleSelection}
          disabled={!forwardable}
          aria-pressed={selected}
          aria-label={selected ? '取消选择消息' : '选择消息'}
        >
          {selected ? <Check size={15} /> : <Circle size={15} />}
        </button>
      )}
      {!message.mine && (
        <Avatar
          name={message.senderName ?? message.sender ?? '?'}
          src={message.senderAvatarUrl}
          accessToken={mediaAccessToken}
          onClick={selectionMode ? undefined : onOpenUserProfile}
          onLongPress={selectionMode ? undefined : onMentionSender}
          ariaLabel={`查看 ${message.senderName ?? message.sender ?? '成员'} 的资料，长按提及`}
          small
        />
      )}
      <span className="message-swipe-indicator message-swipe-indicator-reply" aria-hidden="true">
        <Reply size={14} />
        <span>回复</span>
      </span>
      <div className="message-body-shell">
        <div
          className={audioAttachment ? 'bubble-wrap bubble-wrap-audio' : 'bubble-wrap'}
          style={bubbleWrapStyle}
        >
          {showSenderLine && (
            <div className="message-meta">
              {onOpenUserProfile && !selectionMode ? (
                <button className="message-sender-button" type="button" onClick={onOpenUserProfile}>
                  {message.senderName ?? message.sender}
                </button>
              ) : (
                <strong>{message.senderName ?? message.sender}</strong>
              )}
            </div>
          )}
          <div
            className={
              mediaOnlyBubble
                ? 'bubble bubble-media-only'
                : audioAttachment
                  ? 'bubble bubble-audio'
                  : 'bubble'
            }
          >
            {message.replyTo && (
              <button className="reply-preview" onClick={() => onOpenReply(message.replyTo!.eventId)}>
                <strong>{message.replyTo.senderName ?? '回复'}</strong>
                <span>{getReadableMessageBody(message.replyTo.body)}</span>
              </button>
            )}
            {attachment?.kind === 'image' && (attachmentPreviewSrc || attachmentFullSrc) && (
              <button
                className={stickerLikeImage ? 'message-media-button sticker' : 'message-media-button'}
                type="button"
                onClick={selectionMode ? onToggleSelection : onPreviewAttachment}
                aria-label="预览图片"
              >
                <ProgressiveImagePreview
                  className={stickerLikeImage ? 'message-image sticker' : 'message-image'}
                  previewSrc={attachmentPreviewSrc}
                  previewFallbackSrc={attachmentPreviewFallbackSrc}
                  accessToken={mediaAccessToken}
                  previewEncryptedFile={attachmentPreviewEncryptedFile}
                  previewMimeType={attachment.previewMimeType ?? attachment.mimeType}
                  src={attachmentFullSrc}
                  fallbackSrc={attachmentFullFallbackSrc}
                  encryptedFile={attachment.encryptedFile}
                  mimeType={attachment.mimeType}
                  alt={attachmentName}
                  previewOnly
                />
              </button>
            )}
            {attachment?.kind === 'video' && attachmentPreviewSrc && (
              <button
                className="message-media-button"
                type="button"
                onClick={selectionMode ? onToggleSelection : onPreviewAttachment}
                aria-label="预览视频"
              >
                <CompactVideoPreview
                  className="message-image"
                  previewSrc={attachmentPreviewSrc}
                  previewFallbackSrc={attachmentPreviewFallbackSrc}
                  accessToken={mediaAccessToken}
                  previewEncryptedFile={getPreviewEncryptedFile(attachment)}
                  previewMimeType={attachment.previewMimeType ?? attachment.mimeType}
                  src={attachmentFullSrc}
                  fallbackSrc={attachmentFullFallbackSrc}
                  encryptedFile={attachment.encryptedFile}
                  mimeType={attachment.mimeType}
                />
                <span className="media-play-indicator">
                  <Play size={18} />
                </span>
              </button>
            )}
            {attachment?.kind === 'audio' && attachment.url && (
              <AudioPlayer
                src={attachment.authDownloadUrl ?? attachment.authUrl ?? attachment.url}
                fallbackSrc={attachment.downloadUrl ?? attachment.url}
                accessToken={mediaAccessToken}
                encryptedFile={attachment.encryptedFile}
                mimeType={attachment.mimeType}
                title={attachmentName}
                durationMs={attachment.durationMs}
                transcription={audioTranscription}
                onTranscribe={onTranscribeAudio}
              />
            )}
            {attachment?.kind === 'file' && (
              <AttachmentLink
                src={attachment.authDownloadUrl ?? attachment.authUrl ?? attachment.url}
                fallbackSrc={attachment.downloadUrl ?? attachment.url}
                accessToken={mediaAccessToken}
                encryptedFile={attachment.encryptedFile}
                mimeType={attachment.mimeType}
                name={attachment.name ?? message.body}
              />
            )}
            {editing ? (
              <div className="message-inline-editor">
                <textarea
                  ref={inlineEditTextareaRef}
                  value={editingDraft}
                  rows={6}
                  onChange={(event) => onEditingDraftChange(event.target.value)}
                  onKeyDown={handleInlineEditorKeyDown}
                  placeholder="编辑消息"
                  disabled={savingEdit}
                />
                <div className="message-inline-editor-actions">
                  <button
                    type="button"
                    className="primary-button compact"
                    onClick={onSaveEdit}
                    disabled={savingEdit || !editingDraft.trim()}
                  >
                    {savingEdit ? '保存中...' : '保存'}
                  </button>
                  <button
                    type="button"
                    className="secondary-button compact"
                    onClick={onCancelEdit}
                    disabled={savingEdit}
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : showBody ? (
              <MessageRichText
                body={message.body}
                forwardContent={message.forwardContent}
                client={client}
                accessToken={mediaAccessToken}
                members={members}
                onOpenMember={onOpenMentionMember}
              />
            ) : null}
          </div>
          {showMessageFooter && (
            <div className={`message-footer${showReadReceiptIndicator && !editing ? ' has-receipts' : ''}`}>
              {messageFooterLabel && (
                <span className="message-time" aria-label={`发送时间 ${messageDetailLabel}`}>
                  {messageFooterLabel}
                </span>
              )}
              {messageSendStatusLabel &&
                (retryableSend ? (
                  <button
                    type="button"
                    className="message-send-status retry"
                    onClick={onRetrySend}
                    aria-label="重新发送这条消息"
                  >
                    {messageSendStatusLabel}
                  </button>
                ) : (
                  <span
                    className={`message-send-status${
                      message.sendStatus === 'failed' ? ' error' : ''
                    }`}
                  >
                    {messageSendStatusLabel}
                  </span>
                ))}
              {showReadReceiptIndicator && !editing && (
                <button
                  type="button"
                  className="message-read-receipts message-read-receipts-button"
                  aria-label="查看消息已读详情"
                  onClick={onOpenReadReceipts}
                >
                  <div className="message-read-receipt-stack">
                    {receiptAvatarEntries.map((reader) => (
                      <span
                        key={reader.key}
                        className="message-read-receipt-avatar"
                        title={reader.name}
                      >
                        <Avatar
                          name={reader.name}
                          src={reader.avatarUrl}
                          accessToken={mediaAccessToken}
                          small
                        />
                      </span>
                    ))}
                    {readReceiptOverflow > 0 && (
                      <span className="message-read-receipt-more">+{readReceiptOverflow}</span>
                    )}
                  </div>
                </button>
              )}
            </div>
          )}
          {!editing && message.reactions.length > 0 && (
            <div className="message-reaction-row" aria-label="消息回应">
              {message.reactions.map((reaction) => (
                <MessageReactionButton
                  key={reaction.key}
                  reaction={reaction}
                  client={client}
                  accessToken={mediaAccessToken}
                  active={reaction.reactedByMe}
                  onClick={() => onReact(reaction.key, reaction.shortcode)}
                />
              ))}
            </div>
          )}
        </div>
        {!editing && (
          <>
            <div ref={actionsRef} className="message-actions">
              <div className="message-actions-grid four">
                <button onClick={() => runAndClose(onReply)}>
                  <Reply size={14} />
                  回复
                </button>
                <button onClick={() => runAndClose(onForward)}>
                  <Forward size={14} />
                  转发
                </button>
                <button className={favorite ? 'active' : ''} onClick={() => runAndClose(onFavorite)}>
                  <Star size={14} />
                  收藏
                </button>
                <button className={message.pinned ? 'active' : ''} onClick={() => runAndClose(onTogglePin)}>
                  {message.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                  {message.pinned ? '取消置顶' : '置顶'}
                </button>
              </div>
              <div className="message-actions-grid three">
                <button onClick={() => runAndClose(onCopy)}>
                  <Copy size={14} />
                  复制
                </button>
                <button onClick={() => runAndClose(onCopyLink)}>
                  <Link2 size={14} />
                  链接
                </button>
                <button onClick={() => runAndClose(onInfo)}>
                  <Info size={14} />
                  详情
                </button>
              </div>
              {hasMessageExtraActions && (
                <div className="message-actions-extras">
                  {showPreviewAction && (
                    <button onClick={() => runAndClose(onPreviewAttachment)}>
                      <Eye size={14} />
                      预览
                    </button>
                  )}
                  {showAddImageToEmojiAction && (
                    <button onClick={() => runAndClose(onAddImageToEmoji!)}>
                      <SmilePlus size={14} />
                      加到表情
                    </button>
                  )}
                  {showAudioTranscribeAction && (
                    <button onClick={() => runAndClose(onTranscribeAudio)}>
                      <Volume2 size={14} />
                      转文字
                    </button>
                  )}
                  {showMessageEditAction && (
                    <button onClick={() => runAndClose(onEdit)}>
                      <Edit3 size={14} />
                      编辑
                    </button>
                  )}
                  {showMessageRedactAction && (
                    <button className="danger" onClick={() => runAndClose(onRedact)}>
                      <Trash2 size={14} />
                      撤回
                    </button>
                  )}
                </div>
              )}
              <div className="message-actions-reactions">
                {message.reactions.map((reaction) => (
                  <MessageReactionButton
                    key={reaction.key}
                    reaction={reaction}
                    client={client}
                    accessToken={mediaAccessToken}
                    active={reaction.reactedByMe}
                    onClick={() => runAndClose(() => onReact(reaction.key, reaction.shortcode))}
                  />
                ))}
                <MessageReactionPicker
                  className="message-reaction-picker message-reaction-picker-actions"
                  panelClassName="reaction-picker-panel reaction-picker-panel-actions"
                  customItems={customEmojiItems}
                  accessToken={mediaAccessToken}
                  onReact={(key, shortcode) => runAndClose(() => onReact(key, shortcode))}
                />
              </div>
            </div>
          </>
        )}
      </div>
      {message.mine && (
        <Avatar
          name={currentUserProfile?.displayName ?? message.senderName ?? message.sender ?? 'Me'}
          src={currentUserProfile?.avatarUrl ?? message.senderAvatarUrl}
          accessToken={mediaAccessToken}
          onClick={selectionMode ? undefined : onOpenUserProfile}
          ariaLabel={currentUserProfile?.displayName ?? message.senderName ?? message.sender ?? '我的资料'}
          small
        />
      )}
    </article>
  );
}

function NewConversationSheet({
  createForm,
  currentUserServer,
  recentRooms,
  mediaAccessToken,
  onChange,
  onSubmit,
  onOpenRoom,
  onOpenExplore,
  onClose,
}: {
  createForm: CreateFormState;
  currentUserServer?: string;
  recentRooms: RoomSummary[];
  mediaAccessToken?: string;
  onChange: (value: CreateFormState) => void;
  onSubmit: (evt: FormEvent<HTMLFormElement>) => void;
  onOpenRoom: (roomId: string) => void;
  onOpenExplore: () => void;
  onClose: () => void;
}) {
  const modes: Array<{
    id: CreateFormState['mode'];
    title: string;
    copy: string;
    icon: ReactNode;
  }> = [
    { id: 'direct', title: '私聊', copy: '一对一加密会话', icon: <MessageCircle size={18} /> },
    { id: 'group', title: '群组', copy: '创建多人房间', icon: <Users size={18} /> },
    { id: 'join', title: '加入', copy: '别名或房间 ID', icon: <Hash size={18} /> },
  ];
  const submitLabel =
    createForm.mode === 'direct' ? '开始私聊' : createForm.mode === 'group' ? '创建群组' : '加入房间';
  const activeMode = modes.find((mode) => mode.id === createForm.mode) ?? modes[0];

  return (
    <div className="sheet-backdrop">
      <section className="sheet new-conversation-sheet">
        <header className="sheet-header">
          <div>
            <p className="eyebrow">Create</p>
            <h2>新会</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="关闭">
            <X size={20} />
          </button>
        </header>

        <div className="create-mode-tabs">
          {modes.map((mode) => (
            <button
              key={mode.id}
              type="button"
              className={createForm.mode === mode.id ? 'active' : ''}
              onClick={() => onChange({ ...createForm, mode: mode.id })}
            >
              {mode.icon}
              <span>
                <strong>{mode.title}</strong>
              </span>
            </button>
          ))}
        </div>

        <section className="create-mode-summary">
          <span>{activeMode.icon}</span>
          <div>
            <strong>{activeMode.title}</strong>
            <small>{activeMode.copy}</small>
          </div>
        </section>

        <form className="new-conversation-form" onSubmit={onSubmit}>
          {createForm.mode === 'direct' && (
            <label className="create-field">
              <span>
                <AtSign size={16} />
                对方 Matrix ID
              </span>
              <input
                value={createForm.userId}
                autoCapitalize="none"
                autoCorrect="off"
                placeholder={currentUserServer ? `用户 ID，例如 @user:${currentUserServer}` : '@user:server'}
                required
                onChange={(evt) => onChange({ ...createForm, userId: evt.target.value })}
              />
              <small>{currentUserServer ? `当前服务器：${currentUserServer}` : '请输入完整 Matrix ID'}</small>
            </label>
          )}

          {createForm.mode === 'group' && (
            <>
              <label className="create-field">
                <span>
                  <MessageSquarePlus size={16} />
                  房间名称
                </span>
                <input
                  value={createForm.roomName}
                  placeholder="例如：产品讨论组"
                  required
                  onChange={(evt) => onChange({ ...createForm, roomName: evt.target.value })}
                />
              </label>
              <label className="create-field">
                <span>
                  <Info size={16} />
                  主题
                </span>
                <textarea
                  value={createForm.topic}
                  rows={3}
                  placeholder="这间房间用来讨论什"
                  onChange={(evt) => onChange({ ...createForm, topic: evt.target.value })}
                />
              </label>
              <label className="create-toggle">
                <span>
                  <Compass size={16} />
                  <span>
                  公开房间
                  <small>允许服务器目录展示</small>
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={createForm.publicRoom}
                  onChange={(evt) => onChange({ ...createForm, publicRoom: evt.target.checked })}
                />
              </label>
            </>
          )}

          {createForm.mode === 'join' && (
            <label className="create-field">
              <span>
                <Hash size={16} />
                房间 ID 或别名
              </span>
              <input
                value={createForm.roomIdOrAlias}
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="#room:server、!roomId:server 或 matrix.to 链接"
                required
                onChange={(evt) => onChange({ ...createForm, roomIdOrAlias: evt.target.value })}
              />
              <small>也可以先进入探索目录浏览公开房间</small>
            </label>
          )}

          {createForm.mode !== 'join' && (
            <label className="create-toggle">
              <span>
                <Shield size={16} />
                <span>
                端到端加密                <small>开启后房间创建完成后不能关</small>
                </span>
              </span>
              <input
                type="checkbox"
                checked={createForm.encrypted}
                onChange={(evt) => onChange({ ...createForm, encrypted: evt.target.checked })}
              />
            </label>
          )}

          <div className={createForm.mode === 'join' ? 'create-submit-row split' : 'create-submit-row'}>
            {createForm.mode === 'join' && (
              <button className="secondary-button" type="button" onClick={onOpenExplore}>
                <Compass size={17} />
                探索
              </button>
            )}
            <button className="primary-button" type="submit">
              {createForm.mode === 'join' ? <Hash size={18} /> : <MessageSquarePlus size={18} />}
              {submitLabel}
            </button>
          </div>
        </form>

        {recentRooms.length > 0 && (
          <section className="create-recent">
            <div className="section-title">
              <span>最近会话</span>
              <strong>{recentRooms.length}</strong>
            </div>
            <div className="create-recent-list">
              {recentRooms.map((room) => (
                <button key={room.id} type="button" onClick={() => onOpenRoom(room.id)}>
                  <Avatar name={room.name} src={room.avatarUrl} accessToken={mediaAccessToken} small />
                  <span>
                    <strong>{room.name}</strong>
                    <small>{room.direct ? '私聊' : '群组'} · {formatTime(room.lastTs)}</small>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
      </section>
    </div>
  );
}

function MessageInfoSheet({
  client,
  message,
  room,
  members,
  mediaAccessToken,
  customEmojiItems,
  favorite,
  onClose,
  onOpenMemberProfile,
  onReply,
  onEdit,
  onFavorite,
  onTogglePin,
  onCopy,
  onCopyLink,
  onForward,
  onPreviewAttachment,
  onAddImageToEmoji,
  onTranscribeAudio,
  onReact,
  onRedact,
}: {
  client?: MatrixClient;
  message: ChatMessage;
  room?: RoomSummary;
  members: RoomMemberSummary[];
  mediaAccessToken?: string;
  customEmojiItems: CustomEmojiItem[];
  favorite: boolean;
  onClose: () => void;
  onOpenMemberProfile: (member: RoomMemberSummary) => void;
  onReply: () => void;
  onEdit: () => void;
  onFavorite: () => void;
  onTogglePin: () => void;
  onCopy: () => void;
  onCopyLink: () => void;
  onForward: () => void;
  onPreviewAttachment: () => void;
  onAddImageToEmoji?: () => void;
  onTranscribeAudio: () => void;
  onReact: (key: string, shortcode?: string) => void;
  onRedact: () => void;
}) {
  const ownReadReceiptSummary = getOwnMessageReadReceiptSummary(message, members);
  const readReceiptStatusText = getReadReceiptStatusText(message, ownReadReceiptSummary);

  return (
    <div className="sheet-backdrop">
      <section className="sheet message-sheet">
        <header className="sheet-header">
          <div>
            <p className="eyebrow">Message</p>
            <h2>消息详情</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="关闭">
            <X size={20} />
          </button>
        </header>

        <div className="message-detail-preview">
          <div className="message-meta">
            <strong>{message.senderName ?? message.sender ?? '未知成员'}</strong>
            <span>{formatFullTime(message.timestamp)}</span>
          </div>
          <MessageRichText
            body={message.body}
            forwardContent={message.forwardContent}
            client={client}
            accessToken={mediaAccessToken}
            members={members}
            onOpenMember={onOpenMemberProfile}
          />
        </div>

        <div className="message-detail-grid">
          <DetailRow label="房间" value={room?.name ?? message.roomId} />
          <DetailRow label="发送者" value={message.sender ?? '未知'} />
          <DetailRow label="事件 ID" value={message.id} />
          <DetailRow label="房间 ID" value={message.roomId} />
          <DetailRow label="类型" value={message.eventType} />
          <DetailRow label="状态" value={`${message.encrypted ? '已加密' : '未加密'} · ${message.edited ? '已编辑' : '原始消息'}`} />
          <DetailRow
            label="回执"
            value={readReceiptStatusText}
          />
          {message.attachment && (
            <DetailRow
              label="附件"
              value={`${message.attachment.kind} · ${message.attachment.name ?? message.attachment.mimeType ?? '未命名'}`}
            />
          )}
        </div>

        <section className="reaction-panel">
          <div className="section-title">
            <span>回应</span>
            <strong>{message.reactions.reduce((count, reaction) => count + reaction.count, 0)}</strong>
          </div>
          <MessageReactionPicker
            className="message-reaction-picker message-reaction-picker-sheet"
            panelClassName="reaction-picker-panel reaction-picker-panel-sheet"
            customItems={customEmojiItems}
            accessToken={mediaAccessToken}
            onReact={onReact}
          />
          {message.reactions.length > 0 && (
            <div className="reaction-detail-list">
              {message.reactions.map((reaction) => (
                <div key={reaction.key} className="reaction-detail-row">
                  <MessageReactionButton
                    reaction={reaction}
                    client={client}
                    accessToken={mediaAccessToken}
                    active={reaction.reactedByMe}
                    onClick={() => onReact(reaction.key, reaction.shortcode)}
                  />
                  <div className="reaction-detail-members">
                    {reaction.reactors.length > 0 ? (
                      reaction.reactors.map((reactor) => (
                        <span key={`${reaction.key}-${reactor.userId}`} className="reaction-detail-member">
                          <Avatar
                            name={reactor.name}
                            src={reactor.avatarUrl}
                            accessToken={mediaAccessToken}
                            small
                          />
                          <small>{reactor.name}</small>
                        </span>
                      ))
                    ) : (
                      <small className="reaction-detail-empty">还没有拿到回应成员明细</small>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="reaction-panel">
          <div className="section-title">
            <span>已读情况</span>
            <strong>{message.readReceipts.length > 0 ? '成员明细' : '暂无回执'}</strong>
          </div>
          {ownReadReceiptSummary?.totalCount === 1 && (
            <p className="digest-empty">
              {readReceiptStatusText}
            </p>
          )}
          {message.readReceipts.length === 0 ? (
            <p className="digest-empty">暂时还没有已读回执。</p>
          ) : (
            <div className="message-receipt-list">
              {message.readReceipts.map((reader) => (
                <button
                  key={reader.userId}
                  className="message-receipt-row"
                  onClick={() =>
                    onOpenMemberProfile(
                      members.find((member) => member.id === reader.userId) ?? {
                        id: reader.userId,
                        name: reader.name,
                        avatarUrl: reader.avatarUrl,
                      }
                    )
                  }
                >
                  <Avatar name={reader.name} src={reader.avatarUrl} accessToken={mediaAccessToken} small />
                  <span>
                    <strong>{reader.name}</strong>
                    <small>{reader.timestamp ? formatFullTime(reader.timestamp) : reader.userId}</small>
                  </span>
                </button>
              ))}
            </div>
          )}
          {ownReadReceiptSummary && ownReadReceiptSummary.unreadMembers.length > 0 && (
            <div className="message-receipt-list">
              {ownReadReceiptSummary.unreadMembers.map((member) => (
                <button
                  key={member.id}
                  className="message-receipt-row"
                  onClick={() => onOpenMemberProfile(member)}
                >
                  <Avatar name={member.name} src={member.avatarUrl} accessToken={mediaAccessToken} small />
                  <span>
                    <strong>{member.name}</strong>
                    <small>暂未读到这条消息</small>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        <div className="message-info-actions">
          <button onClick={onReply}>
            <Reply size={16} />
            回复
          </button>
          <button onClick={onForward}>
            <Forward size={16} />
            转发
          </button>
          {message.canEdit && (
            <button onClick={onEdit}>
              <Edit3 size={16} />
              编辑
            </button>
          )}
          <button className={favorite ? 'active' : ''} onClick={onFavorite}>
            <Star size={16} />
            {favorite ? '取消收藏' : '收藏'}
          </button>
          <button className={message.pinned ? 'active' : ''} onClick={onTogglePin}>
            {message.pinned ? <PinOff size={16} /> : <Pin size={16} />}
            {message.pinned ? '取消置顶' : '置顶'}
          </button>
          <button onClick={onCopy}>
            <Copy size={16} />
            复制文本
          </button>
          <button onClick={onCopyLink}>
            <Link2 size={16} />
            复制链接
          </button>
          {message.attachment && message.attachment.kind !== 'audio' && message.attachment.url && (
            <button onClick={onPreviewAttachment}>
              <Eye size={16} />
              预览附件
            </button>
          )}
          {message.attachment?.kind === 'image' && message.attachment.mxcUrl && onAddImageToEmoji && (
            <button onClick={onAddImageToEmoji}>
              <SmilePlus size={16} />
              加到表情
            </button>
          )}
          {message.attachment?.kind === 'audio' && (
            <button onClick={onTranscribeAudio}>
              <Volume2 size={16} />
              音频转文字            </button>
          )}
          {message.canRedact && (
            <button className="danger" onClick={onRedact}>
              <Trash2 size={16} />
              撤回
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function ReadReceiptSheet({
  message,
  inlineReadReceiptState,
  members,
  mediaAccessToken,
  onClose,
  onOpenMemberProfile,
}: {
  message: ChatMessage;
  inlineReadReceiptState?: InlineReadReceiptState;
  members: RoomMemberSummary[];
  mediaAccessToken?: string;
  onClose: () => void;
  onOpenMemberProfile: (member: RoomMemberSummary) => void;
}) {
  const effectiveReadReceipts = getEffectiveMessageReadReceipts(message, inlineReadReceiptState);
  const ownReadReceiptSummary = getOwnMessageReadReceiptSummary(message, members, effectiveReadReceipts);
  const title =
    ownReadReceiptSummary?.totalCount === 1
      ? formatOwnMessageReadReceiptSummary(ownReadReceiptSummary)
      : '已读详情';

  return (
    <div className="receipt-sheet-backdrop" onClick={onClose}>
      <section className="receipt-sheet" onClick={(event) => event.stopPropagation()}>
        <header className="receipt-sheet-header">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="关闭">
            <X size={20} />
          </button>
        </header>

        {effectiveReadReceipts.length === 0 ? (
          <p className="digest-empty">
            {ownReadReceiptSummary?.totalCount === 1 ? '对方暂未读到这条消息。' : '暂时还没有已读回执。'}
          </p>
        ) : (
          <div className="receipt-sheet-list">
            {effectiveReadReceipts.map((reader) => (
              <button
                key={reader.userId}
                className="receipt-sheet-row"
                onClick={() =>
                  onOpenMemberProfile(
                    members.find((member) => member.id === reader.userId) ?? {
                      id: reader.userId,
                      name: reader.name,
                      avatarUrl: reader.avatarUrl,
                    }
                  )
                }
              >
                <Avatar name={reader.name} src={reader.avatarUrl} accessToken={mediaAccessToken} small />
                <span className="receipt-sheet-meta">
                  <strong>{reader.name}</strong>
                  <small>{reader.timestamp ? formatTime(reader.timestamp) : reader.userId}</small>
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function UserProfileSheet({
  member,
  room,
  members,
  currentUserId,
  mediaAccessToken,
  onClose,
  onCopyMember,
  onCopyMemberLink,
  onDirectMember,
  onKickMember,
  onBanMember,
  onPreviewAvatar,
}: {
  member: RoomMemberSummary;
  room: RoomSummary;
  members: RoomMemberSummary[];
  currentUserId?: string;
  mediaAccessToken?: string;
  onClose: () => void;
  onCopyMember: (member: RoomMemberSummary) => void;
  onCopyMemberLink: (member: RoomMemberSummary) => void;
  onDirectMember: (member: RoomMemberSummary) => void;
  onKickMember: (member: RoomMemberSummary) => void;
  onBanMember: (member: RoomMemberSummary) => void;
  onPreviewAvatar: (member: RoomMemberSummary) => void;
}) {
  const currentMember = members.find((item) => item.id === member.id) ?? member;
  const displayName = currentMember.name || member.name || member.id;
  const avatarUrl = currentMember.avatarUrl ?? member.avatarUrl;
  const coverAccentUrl = useAuthenticatedMediaUrl(avatarUrl, mediaAccessToken, avatarUrl);
  const localPart = localPartFromUserId(member.id);
  const server = serverFromUserId(member.id);
  const isSelf = member.id === currentUserId;
  const myPowerLevel = members.find((item) => item.id === currentUserId)?.powerLevel ?? 0;
  const targetPowerLevel = currentMember.powerLevel ?? 0;
  const canModerate = !isSelf && myPowerLevel >= 50 && targetPowerLevel < myPowerLevel;

  return (
    <div className="sheet-backdrop">
      <section className="sheet user-profile-sheet">
        <header className="sheet-header">
          <div>
            <p className="eyebrow">Profile</p>
            <h2>用户资料</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="关闭">
            <X size={20} />
          </button>
        </header>

        <section className="user-profile-hero">
          <div className="user-profile-cover">
            {coverAccentUrl && (
              <div
                className="user-profile-cover-art"
                style={{ backgroundImage: `url("${coverAccentUrl}")` }}
                aria-hidden="true"
              />
            )}
          </div>
          <div className="user-profile-identity">
            <div className="user-profile-avatar">
              <Avatar
                name={displayName}
                src={avatarUrl}
                accessToken={mediaAccessToken}
                onClick={avatarUrl ? () => onPreviewAvatar(currentMember) : undefined}
                ariaLabel={`查看 ${displayName} 的头像`}
              />
            </div>
            <div>
              <h3>{displayName}</h3>
              <small>{member.id}</small>
            </div>
          </div>
          <div className="user-profile-chips">
            <span>
              <Shield size={14} />
              {memberRoleLabel(targetPowerLevel)}
            </span>
            {server && (
              <span>
                <Hash size={14} />
                {server}
              </span>
            )}
            <span>
              <Users size={14} />
              {memberMembershipLabel(currentMember.membership)}
            </span>
          </div>
        </section>

        <div className="user-profile-actions">
          {!isSelf && (
            <button className="primary" onClick={() => onDirectMember(member)}>
              <MessageCircle size={16} />
              私聊
            </button>
          )}
          <button onClick={() => onCopyMember(member)}>
            <Copy size={16} />
            复制 ID
          </button>
          <button onClick={() => onCopyMemberLink(member)}>
            <Link2 size={16} />
            复制链接
          </button>
          {avatarUrl && (
            <button onClick={() => onPreviewAvatar(currentMember)}>
              <Eye size={16} />
              查看头像
            </button>
          )}
        </div>

        <section className="user-profile-card">
          <div className="section-title">
            <span>当前房间身份</span>
            <strong>{room.name}</strong>
          </div>
          <div className="message-detail-grid user-profile-detail-grid">
            <DetailRow label="昵称" value={displayName} />
            <DetailRow label="本地名" value={localPart ? `@${localPart}` : member.id} />
            <DetailRow label="服务器" value={server ?? '未知'} />
            <DetailRow label="成员状态" value={memberMembershipLabel(currentMember.membership)} />
            <DetailRow label="权限等级" value={`${memberRoleLabel(targetPowerLevel)} · ${targetPowerLevel}`} />
            <DetailRow label="所在房间" value={`${room.direct ? '私聊' : room.space ? '空间' : '群组'} · ${room.encrypted ? '已加密' : '未加密'}`} />
          </div>
        </section>

        {canModerate && (
          <section className="user-profile-card danger">
            <div className="section-title">
              <span>管理操作</span>
              <strong>你的权限 {myPowerLevel}</strong>
            </div>
            <p>这些操作会影响对方在当前房间的成员状态。</p>
            <div className="user-profile-actions">
              <button className="danger" onClick={() => onKickMember(member)}>
                <UserMinus size={16} />
                移出房间
              </button>
              <button className="danger" onClick={() => onBanMember(member)}>
                <Ban size={16} />
                封禁用户
              </button>
            </div>
          </section>
        )}
      </section>
    </div>
  );
}

function RoomInfoSheet({
  room,
  members,
  profileForm,
  mediaItems,
  mediaAccessToken,
  pinnedMessages,
  favorite,
  currentUserId,
  onClose,
  onInvite,
  onProfileChange,
  onProfileSubmit,
  onAvatarSelected,
  onPreviewMedia,
  onOpenPinned,
  onUnpinMessage,
  onMentionMember,
  onCopyMember,
  onCopyRoomLink,
  onOpenMemberProfile,
  onDirectMember,
  onKickMember,
  onBanMember,
  onSetNotificationMode,
  onFavorite,
  onLeave,
}: {
  room: RoomSummary;
  members: RoomMemberSummary[];
  profileForm: { name: string; topic: string };
  mediaItems: RoomMediaItem[];
  mediaAccessToken?: string;
  pinnedMessages: PinnedMessageSummary[];
  favorite: boolean;
  currentUserId?: string;
  onClose: () => void;
  onInvite: (evt: FormEvent<HTMLFormElement>) => void;
  onProfileChange: (value: { name: string; topic: string }) => void;
  onProfileSubmit: (evt: FormEvent<HTMLFormElement>) => void;
  onAvatarSelected: (file: File) => void;
  onPreviewMedia: (media: RoomMediaItem) => void;
  onOpenPinned: (eventId: string) => void;
  onUnpinMessage: (eventId: string) => void;
  onMentionMember: (member: RoomMemberSummary) => void;
  onCopyMember: (member: RoomMemberSummary) => void;
  onCopyRoomLink: (room: RoomSummary) => void;
  onOpenMemberProfile: (member: RoomMemberSummary) => void;
  onDirectMember: (member: RoomMemberSummary) => void;
  onKickMember: (member: RoomMemberSummary) => void;
  onBanMember: (member: RoomMemberSummary) => void;
  onSetNotificationMode: (mode: RoomNotificationMode) => void;
  onFavorite: () => void;
  onLeave: () => void;
}) {
  const [memberQuery, setMemberQuery] = useState('');
  const myPowerLevel = members.find((member) => member.id === currentUserId)?.powerLevel ?? 0;
  const canModerate = myPowerLevel >= 50;
  const totalMemberCount = Math.max(room.memberCount, members.length);
  const visibleMembers = useMemo(() => {
    const query = memberQuery.trim().toLowerCase();
    if (!query) return members;
    return members.filter((member) =>
      `${member.name} ${member.id} ${memberRoleLabel(member.powerLevel)}`
        .toLowerCase()
        .includes(query)
    );
  }, [memberQuery, members]);

  return (
    <div className="sheet-backdrop">
      <section className="sheet room-sheet">
        <header className="sheet-header">
          <div className="room-info-title">
            <label className="avatar-upload">
              <Avatar name={room.name} src={room.avatarUrl} accessToken={mediaAccessToken} />
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(evt) => {
                  const file = evt.target.files?.[0];
                  evt.target.value = '';
                  if (file) onAvatarSelected(file);
                }}
              />
            </label>
            <div>
              <p className="eyebrow">{room.direct ? 'Direct' : room.space ? 'Space' : 'Room'}</p>
              <h2>{room.name}</h2>
            </div>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="关闭">
            <X size={20} />
          </button>
        </header>

        {room.topic && <p className="room-topic">{room.topic}</p>}

        <form className="room-profile-form" onSubmit={onProfileSubmit}>
          <label>
            房间名称
            <input
              value={profileForm.name}
              onChange={(evt) => onProfileChange({ ...profileForm, name: evt.target.value })}
            />
          </label>
          <label>
            主题
            <textarea
              rows={3}
              value={profileForm.topic}
              onChange={(evt) => onProfileChange({ ...profileForm, topic: evt.target.value })}
            />
          </label>
          <button type="submit">
            <Check size={17} />
            保存资料
          </button>
        </form>

        <div className="stat-grid">
          <span>
            <Users size={17} />
            {room.memberCount} 成员
          </span>
          <span>
            <Bell size={17} />
            {room.unread} 未读
          </span>
          <span>
            <Shield size={17} />
            {room.encrypted ? '已加密' : '未加密'}
          </span>
        </div>

        <section className="room-notification-card">
          <div className="section-title">
            <span>通知提醒</span>
            <strong>{roomNotificationLabels[room.notificationMode]}</strong>
          </div>
          <div className="room-notification-options">
            {roomNotificationOptions.map((mode) => (
              <button
                key={mode}
                type="button"
                className={room.notificationMode === mode ? 'active' : ''}
                onClick={() => onSetNotificationMode(mode)}
              >
                {roomNotificationIcon(mode, 17)}
                <span>{roomNotificationLabels[mode]}</span>
                {room.notificationMode === mode && (
                  <Check className="room-notification-option-check" size={16} />
                )}
              </button>
            ))}
          </div>
        </section>

        <div className="sheet-actions">
          <button onClick={onFavorite}>
            <Star size={17} />
            {favorite ? '取消收藏' : '收藏房间'}
          </button>
          <button
            onClick={() => void onCopyRoomLink(room)}
          >
            <Copy size={17} />
            复制链接
          </button>
          <button className="danger" onClick={onLeave}>
            <DoorOpen size={17} />
            离开房间
          </button>
        </div>

        <section className="pinned-list">
          <div className="section-title">
            <span>置顶消息</span>
            <strong>{pinnedMessages.length}</strong>
          </div>
          {pinnedMessages.length === 0 ? (
            <p className="digest-empty">长按或使用消息操作里的置顶，把重要内容固定在这里</p>
          ) : (
            pinnedMessages.map((message) => (
              <div className="pinned-row" key={message.id}>
                <button onClick={() => onOpenPinned(message.id)}>
                  <Pin size={16} />
                  <span>
                    <strong>{message.senderName ?? '置顶消息'}</strong>
                    <small>
                      {!message.available && typeof message.timestamp !== 'number'
                        ? '服务端暂时拿不到原文'
                        : `${!message.available ? '未同步 · ' : ''}${
                            message.timestamp ? `${formatTime(message.timestamp)} · ` : ''
                          }${getReadableMessageBody(message.body)}`}
                    </small>
                  </span>
                </button>
                <button className="member-action subtle" onClick={() => onUnpinMessage(message.id)}>
                  移除
                </button>
              </div>
            ))
          )}
        </section>

        <MediaStrip items={mediaItems} mediaAccessToken={mediaAccessToken} onPreview={onPreviewMedia} />

        <form className="invite-form" onSubmit={onInvite}>
          <input name="userId" placeholder="邀请 @user:server" autoCapitalize="none" autoCorrect="off" />
          <button type="submit">
            <UserPlus size={17} />
          </button>
        </form>

        <div className="member-list">
          <div className="section-title">
            <span>成员</span>
            <strong>
              {visibleMembers.length === totalMemberCount
                ? totalMemberCount
                : `${visibleMembers.length}/${totalMemberCount}`}
            </strong>
          </div>
          <label className="search-field member-search">
            <Search size={15} />
            <input
              value={memberQuery}
              placeholder="搜索成员、Matrix ID 或角"
              autoCapitalize="none"
              autoCorrect="off"
              onChange={(evt) => setMemberQuery(evt.target.value)}
            />
          </label>
          {visibleMembers.map((member) => (
            <div className="member-row" key={member.id}>
              <Avatar
                name={member.name}
                src={member.avatarUrl}
                accessToken={mediaAccessToken}
                onClick={() => onOpenMemberProfile(member)}
                ariaLabel={`查看 ${member.name} 的资料`}
                small
              />
              <span>
                <button className="member-name-button" type="button" onClick={() => onOpenMemberProfile(member)}>
                  {member.name}
                </button>
                <small>{memberRoleLabel(member.powerLevel)} · {member.id}</small>
              </span>
              <div className="member-actions">
                <button className="member-action" onClick={() => onMentionMember(member)}>
                  <AtSign size={13} />
                  提及
                </button>
                {member.id !== currentUserId && (
                  <button className="member-action" onClick={() => onDirectMember(member)}>
                    <MessageCircle size={13} />
                    私聊
                  </button>
                )}
                {canModerate && member.id !== currentUserId && (member.powerLevel ?? 0) < myPowerLevel && (
                  <>
                    <button className="member-action danger" onClick={() => onKickMember(member)}>
                      <UserMinus size={13} />
                      移出
                    </button>
                    <button className="member-action danger" onClick={() => onBanMember(member)}>
                      <Ban size={13} />
                      封禁
                    </button>
                  </>
                )}
                <button className="member-action subtle" onClick={() => onCopyMember(member)}>
                  <Copy size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function MediaStrip({
  items,
  mediaAccessToken,
  onPreview,
}: {
  items: RoomMediaItem[];
  mediaAccessToken?: string;
  onPreview: (media: RoomMediaItem) => void;
}) {
  return (
    <section className="media-strip">
      <div className="section-title">
        <span>媒体与文件</span>
        <strong>{items.length}</strong>
      </div>
      {items.length === 0 ? (
        <p className="digest-empty">当前同步范围内还没有附件</p>
      ) : (
        <div className="media-grid">
          {items.slice(0, 24).map((item) => (
            <button key={item.messageId} className="media-tile" onClick={() => onPreview(item)}>
              {item.kind === 'image' && item.url ? (
                <AuthenticatedImage
                  src={item.authUrl ?? item.url}
                  fallbackSrc={item.url}
                  accessToken={mediaAccessToken}
                  encryptedFile={item.previewEncryptedFile ?? item.encryptedFile}
                  mimeType={item.previewMimeType ?? item.mimeType}
                  alt={item.name}
                />
              ) : item.kind === 'video' && item.url ? (
                <CompactVideoPreview
                  previewSrc={item.authUrl ?? item.url}
                  previewFallbackSrc={item.url}
                  accessToken={mediaAccessToken}
                  previewEncryptedFile={item.previewEncryptedFile ?? item.encryptedFile}
                  previewMimeType={item.previewMimeType ?? item.mimeType}
                  src={item.authDownloadUrl ?? item.downloadUrl ?? item.authUrl ?? item.url}
                  fallbackSrc={item.downloadUrl ?? item.url}
                  encryptedFile={item.encryptedFile}
                  mimeType={item.mimeType}
                  label="视频封面暂不可预览"
                />
              ) : (
                <span>
                  {item.kind === 'image' ? <ImageIcon size={22} /> : <FileUp size={22} />}
                </span>
              )}
              <small>{item.name}</small>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function MediaPreview({
  media,
  mediaAccessToken,
  onClose,
}: {
  media: RoomMediaItem;
  mediaAccessToken?: string;
  onClose: () => void;
}) {
  const previewSrc =
    media.kind === 'image' || media.kind === 'video'
      ? media.authUrl ?? media.url ?? media.authDownloadUrl ?? media.downloadUrl
      : media.authDownloadUrl ?? media.authUrl ?? media.downloadUrl ?? media.url;
  const fallbackSrc =
    media.kind === 'image' || media.kind === 'video'
      ? media.url ?? media.downloadUrl
      : media.downloadUrl ?? media.url;
  const previewEncryptedFile =
    media.kind === 'image' || media.kind === 'video'
      ? getPreviewEncryptedFile(media)
      : media.encryptedFile;
  const previewMimeType =
    media.kind === 'image' || media.kind === 'video'
      ? media.previewMimeType ?? media.mimeType
      : media.mimeType;

  return (
    <div className="media-preview-backdrop">
      <section className="media-preview">
        <header>
          <span>
            <strong>{media.name}</strong>
            <small>{media.senderName} · {formatTime(media.timestamp)}</small>
          </span>
          <button className="icon-button" onClick={onClose} aria-label="关闭预览">
            <X size={20} />
          </button>
        </header>
        <div className="media-preview-body">
          {media.kind === 'image' && previewSrc ? (
            <AuthenticatedImage
              className="media-preview-image"
              src={previewSrc}
              fallbackSrc={fallbackSrc}
              accessToken={mediaAccessToken}
              encryptedFile={media.encryptedFile}
              mimeType={media.mimeType}
              alt={media.name}
            />
          ) : media.kind === 'video' && previewSrc ? (
            <AuthenticatedVideo
              className="media-preview-video"
              src={previewSrc}
              fallbackSrc={fallbackSrc}
              accessToken={mediaAccessToken}
              encryptedFile={media.encryptedFile}
              mimeType={media.mimeType}
              controls
            />
          ) : media.kind === 'audio' && previewSrc ? (
            <AudioPlayer
              src={previewSrc}
              fallbackSrc={fallbackSrc}
              accessToken={mediaAccessToken}
              encryptedFile={media.encryptedFile}
              mimeType={media.mimeType}
              title={media.name}
              durationMs={media.durationMs}
            />
          ) : previewSrc ? (
            <AttachmentLink
              src={previewSrc}
              fallbackSrc={fallbackSrc}
              accessToken={mediaAccessToken}
              encryptedFile={media.encryptedFile}
              mimeType={media.mimeType}
              name={media.name}
            />
          ) : media.url ? (
            <a className="secondary-button" href={media.url} target="_blank" rel="noreferrer">
              <Eye size={18} />
              打开文件
            </a>
          ) : (
            <p>这个附件没有可预览的地址</p>
          )}
        </div>
      </section>
    </div>
  );
}

function EnhancedMediaPreview({
  media,
  items,
  mediaAccessToken,
  onSelect,
  onRequestNavigate,
  onAddToEmoji,
  onClose,
}: {
  media: RoomMediaItem;
  items: RoomMediaItem[];
  mediaAccessToken?: string;
  onSelect: (media: RoomMediaItem) => void;
  onRequestNavigate?: (direction: 'prev' | 'next', media: RoomMediaItem) => Promise<RoomMediaItem | undefined>;
  onAddToEmoji?: () => void;
  onClose: () => void;
}) {
  const previewSrc =
    media.kind === 'image' || media.kind === 'video'
      ? media.authUrl ?? media.url ?? media.authDownloadUrl ?? media.downloadUrl
      : media.authDownloadUrl ?? media.authUrl ?? media.downloadUrl ?? media.url;
  const previewFallbackSrc =
    media.kind === 'image' || media.kind === 'video'
      ? media.url ?? media.downloadUrl
      : media.downloadUrl ?? media.url;
  const fullSrc =
    media.kind === 'image' || media.kind === 'video'
      ? media.authDownloadUrl ?? media.downloadUrl ?? media.authUrl ?? media.url
      : media.authDownloadUrl ?? media.authUrl ?? media.downloadUrl ?? media.url;
  const fullFallbackSrc =
    media.kind === 'image' || media.kind === 'video'
      ? media.downloadUrl ?? media.url
      : media.downloadUrl ?? media.url;
  const previewEncryptedFile =
    media.kind === 'image' || media.kind === 'video'
      ? getPreviewEncryptedFile(media)
      : media.encryptedFile;
  const previewMimeType =
    media.kind === 'image' || media.kind === 'video'
      ? media.previewMimeType ?? media.mimeType
      : media.mimeType;
  const fullEncryptedFile = media.encryptedFile;
  const fullMimeType = media.mimeType;
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [fitMode, setFitMode] = useState<'fit' | 'actual'>('fit');
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [draggingPreview, setDraggingPreview] = useState(false);
  const [navigationPendingDirection, setNavigationPendingDirection] = useState<'prev' | 'next'>();
  const [swipeOffsetX, setSwipeOffsetX] = useState(0);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const previewPointerPositionsRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const previewDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
  }>();
  const previewPinchRef = useRef<{
    pointerIds: [number, number];
    startDistance: number;
    startZoom: number;
    startPan: { x: number; y: number };
  }>();
  const previewSwipeRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
  }>();
  const previewTouchGestureRef = useRef<
    | {
        kind: 'drag';
        touchId: number;
        startX: number;
        startY: number;
        startPanX: number;
        startPanY: number;
      }
    | {
        kind: 'pinch';
        touchIds: [number, number];
        startDistance: number;
        startZoom: number;
        startPan: { x: number; y: number };
      }
    | {
        kind: 'swipe';
        touchId: number;
        startX: number;
        startY: number;
      }
    | undefined
  >(undefined);
  const prefersTouchPreviewGestures = Capacitor.getPlatform() === 'ios';
  const previewableItems = useMemo(
    () => getNavigableRoomMediaItems(items, media.kind),
    [items, media.kind]
  );
  const activeIndex = useMemo(
    () => previewableItems.findIndex((item) => item.messageId === media.messageId),
    [media.messageId, previewableItems]
  );
  const canPrev = activeIndex > 0;
  const canNext = activeIndex >= 0 && activeIndex < previewableItems.length - 1;
  const showPrevControl = activeIndex >= 0 && (canPrev || Boolean(onRequestNavigate));
  const showNextControl = activeIndex >= 0 && (canNext || Boolean(onRequestNavigate));
  const directPreviewHref =
    media.encryptedFile
      ? undefined
      : withAccessToken(
          toAuthenticatedMediaUrl(
            media.authDownloadUrl ?? media.downloadUrl ?? media.authUrl ?? media.url
          ) ??
            media.authDownloadUrl ??
            media.downloadUrl ??
            media.authUrl ??
            media.url,
          mediaAccessToken
        ) ??
        media.authDownloadUrl ??
        media.downloadUrl ??
        media.authUrl ??
        media.url;
  const resetImageViewport = useCallback(() => {
    setZoom(1);
    setFitMode('fit');
    setPanOffset({ x: 0, y: 0 });
    setDraggingPreview(false);
    setSwipeOffsetX(0);
    previewDragRef.current = undefined;
    previewPinchRef.current = undefined;
    previewSwipeRef.current = undefined;
    previewTouchGestureRef.current = undefined;
    previewPointerPositionsRef.current.clear();
  }, []);
  const getVisiblePreviewImage = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return null;

    const fullImage = stage.querySelector('.progressive-media-layer.full.ready');
    if (fullImage instanceof HTMLImageElement) {
      return fullImage;
    }

    const previewImage = stage.querySelector('.progressive-media-layer.preview');
    return previewImage instanceof HTMLImageElement ? previewImage : null;
  }, []);
  const getMinimumPreviewZoom = useCallback(() => {
    if (media.kind !== 'image') return 1;

    const stage = stageRef.current;
    const visibleImage = getVisiblePreviewImage();
    if (!stage || !visibleImage) return 1;

    const naturalWidth = visibleImage.naturalWidth || visibleImage.clientWidth;
    const naturalHeight = visibleImage.naturalHeight || visibleImage.clientHeight;
    if (!naturalWidth || !naturalHeight) return 1;

    const widthScale = stage.clientWidth / naturalWidth;
    const heightScale = stage.clientHeight / naturalHeight;
    return Math.min(1, Math.min(widthScale || 1, heightScale || 1));
  }, [getVisiblePreviewImage, media.kind]);
  const minimumPreviewZoom = media.kind === 'image' ? getMinimumPreviewZoom() : 1;
  const draggableImage =
    media.kind === 'image' &&
    fitMode === 'actual' &&
    zoom > minimumPreviewZoom * previewSnapToFitZoomThreshold;
  const imageSwipeEnabled = media.kind === 'image' && fitMode === 'fit' && activeIndex >= 0;
  const getStageRelativePoint = useCallback((clientX: number, clientY: number) => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };

    const rect = stage.getBoundingClientRect();
    return {
      x: clientX - (rect.left + rect.width / 2),
      y: clientY - (rect.top + rect.height / 2),
    };
  }, []);
  const findTouchByIdentifier = useCallback((
    touches: {
      length: number;
      item: (index: number) => { identifier: number; clientX: number; clientY: number } | null;
    },
    identifier: number
  ) => {
    for (let index = 0; index < touches.length; index += 1) {
      const touch = touches.item(index);
      if (touch && touch.identifier === identifier) {
        return touch;
      }
    }
    return undefined;
  }, []);
  const shouldDeferToIosBackGesture = useCallback(
    (clientX: number) => prefersTouchPreviewGestures && clientX <= iosEdgeBackGestureZonePx,
    [prefersTouchPreviewGestures]
  );
  const clampPreviewZoom = useCallback(
    (value: number, allowRubberBand = false) => {
      const minZoom = getMinimumPreviewZoom();
      const lowerBound = allowRubberBand ? minZoom * 0.82 : minZoom;
      const upperBound = allowRubberBand ? previewMaxZoom * 1.08 : previewMaxZoom;
      return Math.max(lowerBound, Math.min(upperBound, Number(value.toFixed(3))));
    },
    [getMinimumPreviewZoom]
  );
  const getPanBounds = useCallback((options?: { fitMode?: 'fit' | 'actual'; rotation?: number; zoom?: number }) => {
    const targetFitMode = options?.fitMode ?? fitMode;
    const targetRotation = options?.rotation ?? rotation;
    const targetZoom =
      options?.zoom ?? (targetFitMode === 'fit' ? getMinimumPreviewZoom() : zoom);
    if (media.kind !== 'image' || targetFitMode !== 'actual') return { maxX: 0, maxY: 0 };

    const stage = stageRef.current;
    if (!stage) return { maxX: 0, maxY: 0 };

    const visibleImage = getVisiblePreviewImage();
    const baseWidth = visibleImage?.naturalWidth || visibleImage?.clientWidth || 0;
    const baseHeight = visibleImage?.naturalHeight || visibleImage?.clientHeight || 0;
    if (!baseWidth || !baseHeight) return { maxX: 0, maxY: 0 };

    const quarterTurns = ((Math.round(targetRotation / 90) % 4) + 4) % 4;
    const rotated = quarterTurns % 2 === 1;
    const scaledWidth = (rotated ? baseHeight : baseWidth) * targetZoom;
    const scaledHeight = (rotated ? baseWidth : baseHeight) * targetZoom;
    const maxX = Math.max(0, (scaledWidth - stage.clientWidth) / 2);
    const maxY = Math.max(0, (scaledHeight - stage.clientHeight) / 2);
    return { maxX, maxY };
  }, [fitMode, getMinimumPreviewZoom, getVisiblePreviewImage, media.kind, rotation, zoom]);
  const clampPanOffset = useCallback(
    (
      nextOffset: { x: number; y: number },
      options?: { fitMode?: 'fit' | 'actual'; rotation?: number; zoom?: number }
    ) => {
      const { maxX, maxY } = getPanBounds(options);
      return {
        x: Math.max(-maxX, Math.min(maxX, nextOffset.x)),
        y: Math.max(-maxY, Math.min(maxY, nextOffset.y)),
      };
    },
    [getPanBounds]
  );
  const applyPreviewZoom = useCallback(
    (
      targetZoom: number,
      options: {
        focalPoint?: { x: number; y: number };
        baseZoom?: number;
        basePan?: { x: number; y: number };
        allowRubberBand?: boolean;
        snapToFit?: boolean;
      } = {}
    ) => {
      if (media.kind !== 'image') return;

      const minZoom = getMinimumPreviewZoom();
      const nextZoom = clampPreviewZoom(targetZoom, Boolean(options.allowRubberBand));
      const shouldSnapToFit =
        options.snapToFit !== false && nextZoom <= minZoom * previewSnapToFitZoomThreshold;

      if (shouldSnapToFit) {
        setFitMode('fit');
        setZoom(minZoom);
        setPanOffset({ x: 0, y: 0 });
        return;
      }

      const baseZoom = options.baseZoom ?? (fitMode === 'fit' ? minZoom : zoom);
      const basePan = options.basePan ?? (fitMode === 'fit' ? { x: 0, y: 0 } : panOffset);
      let nextPan = basePan;
      if (options.focalPoint) {
        const ratio = nextZoom / Math.max(baseZoom, 0.001);
        nextPan = {
          x: options.focalPoint.x - ratio * (options.focalPoint.x - basePan.x),
          y: options.focalPoint.y - ratio * (options.focalPoint.y - basePan.y),
        };
      }

      setFitMode('actual');
      setZoom(nextZoom);
      setPanOffset(clampPanOffset(nextPan, { fitMode: 'actual', zoom: nextZoom }));
    },
    [clampPanOffset, clampPreviewZoom, fitMode, getMinimumPreviewZoom, media.kind, panOffset, zoom]
  );
  const finalizeImageGestureViewport = useCallback(() => {
    if (media.kind !== 'image') return;

    const minZoom = getMinimumPreviewZoom();
    setZoom((currentZoom) => {
      const nextZoom = clampPreviewZoom(currentZoom);
      if (nextZoom <= minZoom * previewSnapToFitZoomThreshold) {
        setFitMode('fit');
        setPanOffset({ x: 0, y: 0 });
        return minZoom;
      }

      setFitMode('actual');
      setPanOffset((currentPan) =>
        clampPanOffset(currentPan, { fitMode: 'actual', zoom: nextZoom })
      );
      return nextZoom;
    });
  }, [clampPanOffset, clampPreviewZoom, getMinimumPreviewZoom, media.kind]);
  const previewStageStyle = {
    ['--preview-zoom' as string]: String(fitMode === 'actual' ? zoom : 1),
    ['--preview-rotate' as string]: `${rotation}deg`,
    ['--preview-pan-x' as string]: `${fitMode === 'actual' ? panOffset.x : 0}px`,
    ['--preview-pan-y' as string]: `${fitMode === 'actual' ? panOffset.y : 0}px`,
  } as CSSProperties;
  const swipePreviewEnabled = media.kind !== 'image' && activeIndex >= 0;
  const previewContentStyle = swipeOffsetX
    ? ({ transform: `translateX(${swipeOffsetX}px)` } as CSSProperties)
    : undefined;
  const previewZoomPercent = Math.round(
    ((fitMode === 'fit' ? minimumPreviewZoom : zoom) / Math.max(minimumPreviewZoom, 0.001)) * 100
  );

  const navigatePreview = useCallback(
    async (direction: 'prev' | 'next') => {
      const step = direction === 'prev' ? -1 : 1;
      const localItem = activeIndex >= 0 ? previewableItems[activeIndex + step] : undefined;
      if (localItem) {
        onSelect(localItem);
        return;
      }
      if (!onRequestNavigate || navigationPendingDirection) return;

      setNavigationPendingDirection(direction);
      try {
        const requestedItem = await onRequestNavigate(direction, media);
        if (requestedItem) {
          onSelect(requestedItem);
        }
      } finally {
        setNavigationPendingDirection(undefined);
        setSwipeOffsetX(0);
      }
    },
    [activeIndex, media, navigationPendingDirection, onRequestNavigate, onSelect, previewableItems]
  );

  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setFitMode('fit');
    setPanOffset({ x: 0, y: 0 });
    setDraggingPreview(false);
    setNavigationPendingDirection(undefined);
    setSwipeOffsetX(0);
    previewPointerPositionsRef.current.clear();
    previewDragRef.current = undefined;
    previewPinchRef.current = undefined;
    previewSwipeRef.current = undefined;
    previewTouchGestureRef.current = undefined;
  }, [media.messageId]);

  useEffect(() => {
    if (!prefersTouchPreviewGestures || media.kind !== 'image') return undefined;

    const stage = stageRef.current;
    if (!stage) return undefined;

    const preventNativeGesture = (event: Event) => {
      event.preventDefault();
    };

    stage.addEventListener('gesturestart', preventNativeGesture, { passive: false });
    stage.addEventListener('gesturechange', preventNativeGesture, { passive: false });
    stage.addEventListener('gestureend', preventNativeGesture, { passive: false });

    return () => {
      stage.removeEventListener('gesturestart', preventNativeGesture);
      stage.removeEventListener('gesturechange', preventNativeGesture);
      stage.removeEventListener('gestureend', preventNativeGesture);
    };
  }, [media.kind, media.messageId, prefersTouchPreviewGestures]);

  const previousMinimumPreviewZoomRef = useRef(minimumPreviewZoom);

  useLayoutEffect(() => {
    const previousMinimumPreviewZoom = previousMinimumPreviewZoomRef.current;
    previousMinimumPreviewZoomRef.current = minimumPreviewZoom;

    if (media.kind !== 'image' || fitMode !== 'actual') return;
    if (!previousMinimumPreviewZoom || !minimumPreviewZoom) return;
    if (Math.abs(previousMinimumPreviewZoom - minimumPreviewZoom) < 0.0005) return;

    const zoomRatio = minimumPreviewZoom / previousMinimumPreviewZoom;
    const nextZoom = clampPreviewZoom(zoom * zoomRatio);
    if (Math.abs(nextZoom - zoom) >= 0.0005) {
      setZoom(nextZoom);
    }
    setPanOffset((currentPan) =>
      clampPanOffset(currentPan, { fitMode: 'actual', zoom: nextZoom })
    );
  }, [clampPanOffset, clampPreviewZoom, fitMode, media.kind, minimumPreviewZoom, zoom]);

  useLayoutEffect(() => {
    setPanOffset((current) => {
      if (!draggableImage) {
        if (current.x === 0 && current.y === 0) return current;
        return { x: 0, y: 0 };
      }

      const clamped = clampPanOffset(current);
      if (clamped.x === current.x && clamped.y === current.y) return current;
      return clamped;
    });
  }, [clampPanOffset, draggableImage, fitMode, rotation, zoom]);

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key === 'ArrowLeft' && showPrevControl) {
        event.preventDefault();
        void navigatePreview('prev');
      }
      if (event.key === 'ArrowRight' && showNextControl) {
        event.preventDefault();
        void navigatePreview('next');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigatePreview, onClose, showNextControl, showPrevControl]);

  const handleZoom = useCallback(
    (direction: 'in' | 'out') => {
      if (media.kind !== 'image') return;

      const baseZoom = fitMode === 'fit' ? minimumPreviewZoom : zoom;
      const zoomFactor =
        direction === 'in' ? previewToolbarZoomFactor : 1 / previewToolbarZoomFactor;
      applyPreviewZoom(baseZoom * zoomFactor);
    },
    [applyPreviewZoom, fitMode, media.kind, minimumPreviewZoom, zoom]
  );

  const handleWheelZoom = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (media.kind !== 'image') return;
    event.preventDefault();
    const baseZoom = fitMode === 'fit' ? minimumPreviewZoom : zoom;
    const wheelZoomFactor = Math.exp(-event.deltaY * previewWheelZoomSensitivity);
    applyPreviewZoom(baseZoom * wheelZoomFactor, {
      focalPoint: getStageRelativePoint(event.clientX, event.clientY),
    });
  };

  const handlePreviewStageDoubleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (media.kind !== 'image') return;

    event.preventDefault();
    const focalPoint = getStageRelativePoint(event.clientX, event.clientY);
    if (fitMode === 'fit') {
      applyPreviewZoom(Math.min(previewMaxZoom, Math.max(minimumPreviewZoom * 1.6, 1)), {
        focalPoint,
      });
      return;
    }

    resetImageViewport();
  };

  const handleToggleFitMode = () => {
    if (fitMode === 'fit') {
      setFitMode('actual');
      setZoom(1);
      return;
    }

    resetImageViewport();
  };

  const releasePreviewPointerCapture = useCallback((target: EventTarget | null, pointerId: number) => {
    if (!target || !('releasePointerCapture' in target)) return;

    try {
      (target as HTMLDivElement).releasePointerCapture(pointerId);
    } catch {
      // Pointer capture can already be released by the browser.
    }
  }, []);

  const stopPreviewDrag = useCallback((pointerId?: number, target?: EventTarget | null) => {
    const gesture = previewDragRef.current;
    if (!gesture || (pointerId !== undefined && gesture.pointerId !== pointerId)) return;

    releasePreviewPointerCapture(target ?? null, gesture.pointerId);
    previewDragRef.current = undefined;
    setDraggingPreview(false);
  }, [releasePreviewPointerCapture]);

  const resetPreviewSwipe = useCallback((pointerId?: number, target?: EventTarget | null) => {
    const gesture = previewSwipeRef.current;
    if (!gesture || (pointerId !== undefined && gesture.pointerId !== pointerId)) return;

    releasePreviewPointerCapture(target ?? null, gesture.pointerId);
    previewSwipeRef.current = undefined;
    setSwipeOffsetX(0);
  }, [releasePreviewPointerCapture]);

  const handlePreviewStagePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (prefersTouchPreviewGestures && event.pointerType === 'touch') return;
    if (media.kind !== 'image' || event.button !== 0) return;

    previewPointerPositionsRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    event.currentTarget.setPointerCapture(event.pointerId);

    const trackedPointers = Array.from(previewPointerPositionsRef.current.entries());
    if (trackedPointers.length >= 2) {
      const [firstPointer, secondPointer] = trackedPointers.slice(0, 2);
      const startZoom = fitMode === 'fit' ? minimumPreviewZoom : zoom;
      const startPan = fitMode === 'fit' ? { x: 0, y: 0 } : panOffset;
      const midpointClientX = (firstPointer[1].x + secondPointer[1].x) / 2;
      const midpointClientY = (firstPointer[1].y + secondPointer[1].y) / 2;

      previewPinchRef.current = {
        pointerIds: [firstPointer[0], secondPointer[0]],
        startDistance: Math.hypot(
          secondPointer[1].x - firstPointer[1].x,
          secondPointer[1].y - firstPointer[1].y
        ),
        startZoom,
        startPan,
      };
      previewDragRef.current = undefined;
      previewSwipeRef.current = undefined;
      setSwipeOffsetX(0);
      setDraggingPreview(true);
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (draggableImage) {
      previewDragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startPanX: panOffset.x,
        startPanY: panOffset.y,
      };
      setDraggingPreview(true);
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (imageSwipeEnabled) {
      previewSwipeRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
      };
      setDraggingPreview(false);
      event.stopPropagation();
    }
  };

  const handlePreviewStagePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (prefersTouchPreviewGestures && event.pointerType === 'touch') return;
    if (media.kind !== 'image') return;

    if (previewPointerPositionsRef.current.has(event.pointerId)) {
      previewPointerPositionsRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });
    }

    const pinch = previewPinchRef.current;
    if (pinch && pinch.pointerIds.includes(event.pointerId)) {
      const firstPointer = previewPointerPositionsRef.current.get(pinch.pointerIds[0]);
      const secondPointer = previewPointerPositionsRef.current.get(pinch.pointerIds[1]);
      if (!firstPointer || !secondPointer) return;

      const midpointClientX = (firstPointer.x + secondPointer.x) / 2;
      const midpointClientY = (firstPointer.y + secondPointer.y) / 2;
      const nextDistance = Math.hypot(secondPointer.x - firstPointer.x, secondPointer.y - firstPointer.y);
      const nextZoom = pinch.startZoom * (nextDistance / Math.max(pinch.startDistance, 1));

      applyPreviewZoom(nextZoom, {
        focalPoint: getStageRelativePoint(midpointClientX, midpointClientY),
        baseZoom: pinch.startZoom,
        basePan: pinch.startPan,
        allowRubberBand: true,
        snapToFit: false,
      });
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const gesture = previewDragRef.current;
    if (gesture && gesture.pointerId === event.pointerId && draggableImage) {
      const nextOffset = clampPanOffset({
        x: gesture.startPanX + (event.clientX - gesture.startX),
        y: gesture.startPanY + (event.clientY - gesture.startY),
      });
      setPanOffset(nextOffset);
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const swipeGesture = previewSwipeRef.current;
    if (!swipeGesture || swipeGesture.pointerId !== event.pointerId || !imageSwipeEnabled) {
      return;
    }

    const deltaX = event.clientX - swipeGesture.startX;
    const deltaY = event.clientY - swipeGesture.startY;
    if (Math.abs(deltaY) > Math.abs(deltaX) * 1.15 && Math.abs(deltaY) > 18) {
      resetPreviewSwipe(event.pointerId, event.currentTarget);
      return;
    }
    if (Math.abs(deltaX) <= Math.abs(deltaY)) return;

    setSwipeOffsetX(Math.max(-160, Math.min(160, deltaX)));
    event.preventDefault();
    event.stopPropagation();
  };

  const handlePreviewStagePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (prefersTouchPreviewGestures && event.pointerType === 'touch') return;
    if (media.kind !== 'image') return;

    const pinch = previewPinchRef.current;
    if (pinch && pinch.pointerIds.includes(event.pointerId)) {
      pinch.pointerIds.forEach((pointerId) => {
        previewPointerPositionsRef.current.delete(pointerId);
        releasePreviewPointerCapture(event.currentTarget, pointerId);
      });
      previewPinchRef.current = undefined;
      previewDragRef.current = undefined;
      previewSwipeRef.current = undefined;
      setDraggingPreview(false);
      finalizeImageGestureViewport();
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    previewPointerPositionsRef.current.delete(event.pointerId);

    if (previewDragRef.current?.pointerId === event.pointerId) {
      stopPreviewDrag(event.pointerId, event.currentTarget);
      event.stopPropagation();
      return;
    }

    const swipeGesture = previewSwipeRef.current;
    if (swipeGesture && swipeGesture.pointerId === event.pointerId) {
      const deltaX = event.clientX - swipeGesture.startX;
      const deltaY = event.clientY - swipeGesture.startY;
      const shouldNavigate = Math.abs(deltaX) >= 72 && Math.abs(deltaX) > Math.abs(deltaY) * 1.1;
      if (shouldNavigate) {
        void navigatePreview(deltaX > 0 ? 'prev' : 'next');
      }

      resetPreviewSwipe(event.pointerId, event.currentTarget);
      event.stopPropagation();
      return;
    }

    releasePreviewPointerCapture(event.currentTarget, event.pointerId);
  };

  const handlePreviewBodyPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!swipePreviewEnabled || event.button !== 0 || draggingPreview) return;
    if (
      event.target instanceof HTMLElement &&
      event.target.closest('button, a, input, textarea, video, audio')
    ) {
      return;
    }

    previewSwipeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePreviewBodyPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = previewSwipeRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId || !swipePreviewEnabled || draggingPreview) {
      return;
    }

    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;
    if (Math.abs(deltaY) > Math.abs(deltaX) * 1.15 && Math.abs(deltaY) > 18) {
      resetPreviewSwipe(event.pointerId, event.currentTarget);
      return;
    }
    if (Math.abs(deltaX) <= Math.abs(deltaY)) return;

    setSwipeOffsetX(Math.max(-160, Math.min(160, deltaX)));
    event.preventDefault();
  };

  const handlePreviewBodyPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = previewSwipeRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) {
      resetPreviewSwipe(event.pointerId, event.currentTarget);
      return;
    }

    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;
    const shouldNavigate = Math.abs(deltaX) >= 72 && Math.abs(deltaX) > Math.abs(deltaY) * 1.1;
    if (shouldNavigate) {
      void navigatePreview(deltaX > 0 ? 'prev' : 'next');
    }

    resetPreviewSwipe(event.pointerId, event.currentTarget);
  };

  const handlePreviewStageTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (!prefersTouchPreviewGestures || media.kind !== 'image') return;

    if (event.touches.length === 1) {
      const firstTouch = event.touches.item(0);
      if (firstTouch && shouldDeferToIosBackGesture(firstTouch.clientX)) {
        previewTouchGestureRef.current = undefined;
        setDraggingPreview(false);
        return;
      }
    }

    if (event.touches.length >= 2) {
      const firstTouch = event.touches.item(0);
      const secondTouch = event.touches.item(1);
      if (!firstTouch || !secondTouch) return;

      const startZoom = fitMode === 'fit' ? minimumPreviewZoom : zoom;
      const startPan = fitMode === 'fit' ? { x: 0, y: 0 } : panOffset;
      previewTouchGestureRef.current = {
        kind: 'pinch',
        touchIds: [firstTouch.identifier, secondTouch.identifier],
        startDistance: Math.hypot(
          secondTouch.clientX - firstTouch.clientX,
          secondTouch.clientY - firstTouch.clientY
        ),
        startZoom,
        startPan,
      };
      setSwipeOffsetX(0);
      setDraggingPreview(true);
      event.preventDefault();
      return;
    }

    const touch = event.changedTouches.item(0);
    if (!touch) return;

    if (draggableImage) {
      previewTouchGestureRef.current = {
        kind: 'drag',
        touchId: touch.identifier,
        startX: touch.clientX,
        startY: touch.clientY,
        startPanX: panOffset.x,
        startPanY: panOffset.y,
      };
      setDraggingPreview(true);
      event.preventDefault();
      return;
    }

    if (imageSwipeEnabled) {
      previewTouchGestureRef.current = {
        kind: 'swipe',
        touchId: touch.identifier,
        startX: touch.clientX,
        startY: touch.clientY,
      };
    }
  };

  const handlePreviewStageTouchMove = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (!prefersTouchPreviewGestures || media.kind !== 'image') return;

    const gesture = previewTouchGestureRef.current;
    if (!gesture) return;

    if (gesture.kind === 'pinch') {
      const firstTouch = findTouchByIdentifier(event.touches, gesture.touchIds[0]);
      const secondTouch = findTouchByIdentifier(event.touches, gesture.touchIds[1]);
      if (!firstTouch || !secondTouch) return;

      const midpointClientX = (firstTouch.clientX + secondTouch.clientX) / 2;
      const midpointClientY = (firstTouch.clientY + secondTouch.clientY) / 2;
      const nextDistance = Math.hypot(
        secondTouch.clientX - firstTouch.clientX,
        secondTouch.clientY - firstTouch.clientY
      );
      const nextZoom = gesture.startZoom * (nextDistance / Math.max(gesture.startDistance, 1));

      applyPreviewZoom(nextZoom, {
        focalPoint: getStageRelativePoint(midpointClientX, midpointClientY),
        baseZoom: gesture.startZoom,
        basePan: gesture.startPan,
        allowRubberBand: true,
        snapToFit: false,
      });
      event.preventDefault();
      return;
    }

    const touch = findTouchByIdentifier(event.touches, gesture.touchId);
    if (!touch) return;

    if (gesture.kind === 'drag' && draggableImage) {
      const nextOffset = clampPanOffset({
        x: gesture.startPanX + (touch.clientX - gesture.startX),
        y: gesture.startPanY + (touch.clientY - gesture.startY),
      });
      setPanOffset(nextOffset);
      event.preventDefault();
      return;
    }

    if (gesture.kind !== 'swipe' || !imageSwipeEnabled) return;

    const deltaX = touch.clientX - gesture.startX;
    const deltaY = touch.clientY - gesture.startY;
    if (Math.abs(deltaY) > Math.abs(deltaX) * 1.15 && Math.abs(deltaY) > 18) {
      previewTouchGestureRef.current = undefined;
      setSwipeOffsetX(0);
      return;
    }
    if (Math.abs(deltaX) <= Math.abs(deltaY)) return;

    setSwipeOffsetX(Math.max(-160, Math.min(160, deltaX)));
    event.preventDefault();
  };

  const handlePreviewStageTouchEnd = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (!prefersTouchPreviewGestures || media.kind !== 'image') return;

    const gesture = previewTouchGestureRef.current;
    if (!gesture) return;

    if (gesture.kind === 'pinch') {
      const pinchEnded = gesture.touchIds.some((touchId) => findTouchByIdentifier(event.changedTouches, touchId));
      if (!pinchEnded && event.touches.length >= 2) return;

      previewTouchGestureRef.current = undefined;
      setDraggingPreview(false);
      finalizeImageGestureViewport();
      event.preventDefault();
      return;
    }

    const touch = findTouchByIdentifier(event.changedTouches, gesture.touchId);
    if (!touch) return;

    if (gesture.kind === 'drag') {
      previewTouchGestureRef.current = undefined;
      setDraggingPreview(false);
      return;
    }

    const deltaX = touch.clientX - gesture.startX;
    const deltaY = touch.clientY - gesture.startY;
    const shouldNavigate = Math.abs(deltaX) >= 72 && Math.abs(deltaX) > Math.abs(deltaY) * 1.1;
    if (shouldNavigate) {
      void navigatePreview(deltaX > 0 ? 'prev' : 'next');
    }

    previewTouchGestureRef.current = undefined;
    setSwipeOffsetX(0);
  };

  const handlePreviewStageTouchCancel = () => {
    if (!prefersTouchPreviewGestures || media.kind !== 'image') return;

    const gesture = previewTouchGestureRef.current;
    previewTouchGestureRef.current = undefined;
    if (!gesture) return;

    setSwipeOffsetX(0);
    setDraggingPreview(false);
    if (gesture.kind === 'pinch') {
      finalizeImageGestureViewport();
    }
  };

  return (
    <div className="media-preview-backdrop" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <section className="media-preview rich">
        <header>
          <span>
            <strong>{media.name}</strong>
            <small>
              {media.senderName} · {formatTime(media.timestamp)}
              {activeIndex >= 0 ? ` · ${activeIndex + 1}/${previewableItems.length}` : ''}
            </small>
          </span>
          <div className="media-preview-header-actions">
            {directPreviewHref && (
              <a
                className="icon-button"
                href={directPreviewHref}
                target="_blank"
                rel="noreferrer"
                aria-label="打开原图或原文件"
              >
                <FolderOpen size={18} />
              </a>
            )}
            {media.kind === 'image' && onAddToEmoji && (
              <button className="icon-button" type="button" onClick={onAddToEmoji} aria-label="加入默认表情">
                <SmilePlus size={18} />
              </button>
            )}
            <button className="icon-button" onClick={onClose} aria-label="关闭预览">
              <X size={20} />
            </button>
          </div>
        </header>
        {media.kind === 'image' && (
          <div className="media-preview-toolbar">
            <div className="media-preview-toolbar-group">
              <button type="button" onClick={() => handleZoom('out')} disabled={fitMode === 'fit'}>
                -
              </button>
              <button type="button" onClick={handleToggleFitMode}>
                {fitMode === 'fit' ? '1:1' : '适应'}
              </button>
              <button type="button" onClick={() => handleZoom('in')} disabled={fitMode === 'actual' && zoom >= previewMaxZoom}>
                +
              </button>
              <button
                type="button"
                onClick={() => {
                  setRotation((current) => current - 90);
                }}
                aria-label="向左旋转"
              >
                <RotateCcw size={15} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setRotation((current) => current + 90);
                }}
                aria-label="向右旋转"
              >
                <RotateCw size={15} />
              </button>
            </div>
            <small>{fitMode === 'fit' ? '适应屏幕' : `${previewZoomPercent}%`}</small>
          </div>
        )}
        <div
          className="media-preview-body"
          onWheel={handleWheelZoom}
          onPointerDown={handlePreviewBodyPointerDown}
          onPointerMove={handlePreviewBodyPointerMove}
          onPointerUp={handlePreviewBodyPointerUp}
          onPointerCancel={(event) => resetPreviewSwipe(event.pointerId, event.currentTarget)}
        >
          {showPrevControl && (
            <button
              className="media-preview-nav prev"
              type="button"
              onClick={() => void navigatePreview('prev')}
              aria-label="上一"
              disabled={navigationPendingDirection === 'prev'}
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <div
            className={swipeOffsetX !== 0 ? 'media-preview-content swiping' : 'media-preview-content'}
            style={previewContentStyle}
          >
            {media.kind === 'image' && (previewSrc || fullSrc) ? (
              <div
                ref={stageRef}
                className={
                  fitMode === 'fit'
                    ? 'media-preview-stage fit'
                    : draggingPreview
                      ? 'media-preview-stage actual dragging'
                      : 'media-preview-stage actual'
                }
                style={previewStageStyle}
                onPointerDown={handlePreviewStagePointerDown}
                onPointerMove={handlePreviewStagePointerMove}
                onPointerUp={handlePreviewStagePointerEnd}
                onPointerCancel={handlePreviewStagePointerEnd}
                onTouchStart={handlePreviewStageTouchStart}
                onTouchMove={handlePreviewStageTouchMove}
                onTouchEnd={handlePreviewStageTouchEnd}
                onTouchCancel={handlePreviewStageTouchCancel}
                onDoubleClick={handlePreviewStageDoubleClick}
              >
                <ProgressiveImagePreview
                  className={fitMode === 'fit' ? 'media-preview-image' : 'media-preview-image zoomed'}
                  previewSrc={previewSrc}
                  previewFallbackSrc={previewFallbackSrc}
                  previewEncryptedFile={previewEncryptedFile}
                  previewMimeType={previewMimeType}
                  src={fullSrc}
                  fallbackSrc={fullFallbackSrc}
                  accessToken={mediaAccessToken}
                  encryptedFile={fullEncryptedFile}
                  mimeType={fullMimeType}
                  alt={media.name}
                />
              </div>
            ) : media.kind === 'video' && (previewSrc || fullSrc) ? (
              <ProgressiveVideoPreview
                className="media-preview-video"
                previewSrc={previewSrc}
                previewFallbackSrc={previewFallbackSrc}
                previewEncryptedFile={previewEncryptedFile}
                previewMimeType={previewMimeType}
                src={fullSrc}
                fallbackSrc={fullFallbackSrc}
                accessToken={mediaAccessToken}
                encryptedFile={fullEncryptedFile}
                mimeType={fullMimeType}
              />
            ) : media.kind === 'audio' && fullSrc ? (
              <AudioPlayer
                src={fullSrc}
                fallbackSrc={fullFallbackSrc}
                accessToken={mediaAccessToken}
                encryptedFile={media.encryptedFile}
                mimeType={media.mimeType}
                title={media.name}
                durationMs={media.durationMs}
              />
            ) : fullSrc ? (
              <AttachmentLink
                src={fullSrc}
                fallbackSrc={fullFallbackSrc}
                accessToken={mediaAccessToken}
                encryptedFile={media.encryptedFile}
                mimeType={media.mimeType}
                name={media.name}
              />
            ) : media.url ? (
              <a className="secondary-button" href={media.url} target="_blank" rel="noreferrer">
                <Eye size={18} />
                打开文件
              </a>
            ) : (
              <p>这个附件没有可预览的地址</p>
            )}
          </div>
          {showNextControl && (
            <button
              className="media-preview-nav next"
              type="button"
              onClick={() => void navigatePreview('next')}
              aria-label="下一"
              disabled={navigationPendingDirection === 'next'}
            >
              <ChevronRight size={20} />
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function ExplorePanel({
  sources,
  selectedSourceId,
  publicSearch,
  publicRooms,
  publicLoading,
  currentServer,
  joinedRooms,
  customServers,
  mediaAccessToken,
  onSelectSource,
  onChange,
  onSearch,
  onCreateSource,
  onUpdateSource,
  onDeleteSource,
  onCreateSection,
  onUpdateSection,
  onDeleteSection,
  onCreateCard,
  onUpdateCard,
  onDeleteCard,
  onPickServer,
  onAddServer,
  onRemoveServer,
  onOpenJoined,
  onJoin,
}: {
  sources: ExploreSource[];
  selectedSourceId?: string;
  publicSearch: { server: string; query: string };
  publicRooms: PublicRoomSummary[];
  publicLoading: boolean;
  currentServer?: string;
  joinedRooms: RoomSummary[];
  customServers: string[];
  mediaAccessToken?: string;
  onSelectSource: (sourceId: string) => void;
  onChange: (value: { server: string; query: string }) => void;
  onSearch: (evt?: FormEvent<HTMLFormElement>, overrideSearch?: { server: string; query: string }) => void;
  onCreateSource: (draft: ExploreSourceEditorDraft) => Promise<boolean>;
  onUpdateSource: (sourceId: string, draft: ExploreSourceEditorDraft) => Promise<boolean>;
  onDeleteSource: (sourceId: string) => Promise<boolean>;
  onCreateSection: (sourceId: string, title: string) => Promise<boolean>;
  onUpdateSection: (sourceId: string, sectionId: string, title: string) => Promise<boolean>;
  onDeleteSection: (sourceId: string, sectionId: string) => Promise<boolean>;
  onCreateCard: (sourceId: string, sectionId: string, draft: ExploreNavCardEditorDraft) => Promise<boolean>;
  onUpdateCard: (
    sourceId: string,
    sectionId: string,
    cardId: string,
    draft: ExploreNavCardEditorDraft
  ) => Promise<boolean>;
  onDeleteCard: (sourceId: string, sectionId: string, cardId: string) => Promise<boolean>;
  onPickServer: (server: string) => void;
  onAddServer: (server: string) => void;
  onRemoveServer: (server: string) => void;
  onOpenJoined: (roomId: string) => void;
  onJoin: (roomIdOrAlias: string) => void;
}) {
  const [serverDraft, setServerDraft] = useState('');
  const [editorSheet, setEditorSheet] = useState<ExploreEditorSheet>();
  const [deleteIntent, setDeleteIntent] = useState<ExploreDeleteIntent>();
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const selectedSource = sources.find((source) => source.id === selectedSourceId) ?? sources[0];
  const suggestedServers = Array.from(
    new Set(
      [selectedSource?.kind === 'server' ? selectedSource.value : undefined, currentServer, ...customServers, publicSearch.server.trim(), 'matrix.org']
        .map((server) => (server ? normalizeServerName(server) : ''))
        .filter(Boolean)
    )
  );
  const normalizedQuery = publicSearch.query.trim().toLowerCase();
  const visibleJoinedRooms = joinedRooms
    .filter((room) => {
      if (!normalizedQuery) return true;
      return `${room.name} ${room.topic ?? ''} ${room.canonicalAlias ?? ''}`.toLowerCase().includes(normalizedQuery);
    })
    .sort((a, b) => b.unread - a.unread || b.lastTs - a.lastTs)
    .slice(0, 8);
  const joinedRoomForPublicRoom = (room: PublicRoomSummary): RoomSummary | undefined =>
    joinedRooms.find((joinedRoom) =>
      [room.id, room.alias].filter(Boolean).some((idOrAlias) =>
        idOrAlias === joinedRoom.id || idOrAlias === joinedRoom.canonicalAlias
      )
    );
  const handleAddServer = (evt: FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
    const normalized = normalizeServerName(serverDraft);
    if (!normalized) return;
    onAddServer(normalized);
    setServerDraft('');
  };

  const openLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const getSourceMeta = (source: ExploreSource): string => {
    if (source.kind === 'server') return source.value;
    if (source.kind === 'web') {
      try {
        return new URL(source.value).hostname || source.value;
      } catch {
        return source.value;
      }
    }
    return `${source.navSections?.reduce((count, section) => count + section.cards.length, 0) ?? 0} 个入口`;
  };

  const handleSubmitSourceSheet = async (draft: ExploreSourceEditorDraft) => {
    const success =
      editorSheet?.type === 'editSource'
        ? await onUpdateSource(editorSheet.source.id, draft)
        : await onCreateSource(draft);
    if (success) setEditorSheet(undefined);
  };

  const handleSubmitSectionSheet = async (title: string) => {
    if (!editorSheet || (editorSheet.type !== 'createSection' && editorSheet.type !== 'editSection')) return;
    const success =
      editorSheet.type === 'editSection'
        ? await onUpdateSection(editorSheet.sourceId, editorSheet.section.id, title)
        : await onCreateSection(editorSheet.sourceId, title);
    if (success) setEditorSheet(undefined);
  };

  const handleSubmitCardSheet = async (draft: ExploreNavCardEditorDraft) => {
    if (!editorSheet || (editorSheet.type !== 'createCard' && editorSheet.type !== 'editCard')) return;
    const success =
      editorSheet.type === 'editCard'
        ? await onUpdateCard(editorSheet.sourceId, editorSheet.section.id, editorSheet.card.id, draft)
        : await onCreateCard(editorSheet.sourceId, editorSheet.section.id, draft);
    if (success) setEditorSheet(undefined);
  };

  const handleConfirmDelete = async () => {
    if (!deleteIntent || deleteSubmitting) return;

    setDeleteSubmitting(true);
    try {
      const success =
        deleteIntent.type === 'source'
          ? await onDeleteSource(deleteIntent.source.id)
          : deleteIntent.type === 'section'
            ? await onDeleteSection(deleteIntent.sourceId, deleteIntent.section.id)
            : await onDeleteCard(deleteIntent.sourceId, deleteIntent.sectionId, deleteIntent.card.id);

      if (success) {
        setDeleteIntent(undefined);
      }
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const deleteSheetCopy =
    deleteIntent?.type === 'source'
      ? {
          title: '删除探索来源',
          body: `“${deleteIntent.source.title}”会从当前账号的探索列表中移除。`,
          confirmLabel: '删除来源',
        }
      : deleteIntent?.type === 'section'
        ? {
            title: '删除分组',
            body: `“${deleteIntent.section.title}”里的卡片也会一起删除。`,
            confirmLabel: '删除分组',
          }
        : deleteIntent
          ? {
              title: '删除卡片',
              body: `“${deleteIntent.card.title}”会从这个分组里移除。`,
              confirmLabel: '删除卡片',
            }
          : undefined;

  const renderNavSource = (source: ExploreSource) => {
    const sections = source.navSections ?? [];

    return (
      <>
        <section className="explore-workspace-header">
          <div>
            <span className="explore-source-kind">导航站</span>
            <h3>{source.title}</h3>
            <small>{source.description ?? '收纳常用网站和工具'}</small>
          </div>
          <div className="explore-workspace-actions">
            <button type="button" onClick={() => setEditorSheet({ type: 'createSection', sourceId: source.id })}>
              <Plus size={16} />
              添加分组
            </button>
            <button type="button" onClick={() => setEditorSheet({ type: 'editSource', source })}>
              <Edit3 size={16} />
              编辑导航
            </button>
            <button type="button" className="danger" onClick={() => setDeleteIntent({ type: 'source', source })}>
              <Trash2 size={16} />
              删除导航
            </button>
          </div>
        </section>

        {sections.length === 0 ? (
          <div className="explore-empty">
            <Compass size={24} />
            <strong>这个导航站还没有分组</strong>
            <span>先创建分组，再把常用网站和工具整理进去。</span>
            <button
              type="button"
              className="primary-button compact"
              onClick={() => setEditorSheet({ type: 'createSection', sourceId: source.id })}
            >
              <Plus size={16} />
              添加分组
            </button>
          </div>
        ) : (
          <div className="explore-nav-sections">
            {sections.map((section) => (
              <section key={section.id} className="explore-nav-section">
                <div className="explore-nav-section-header">
                  <div>
                    <h4>{section.title}</h4>
                    <small>{section.cards.length} 张卡片</small>
                  </div>
                  <div className="explore-inline-actions">
                    <button
                      type="button"
                      onClick={() => setEditorSheet({ type: 'createCard', sourceId: source.id, section })}
                    >
                      <Plus size={15} />
                      添加卡片
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorSheet({ type: 'editSection', sourceId: source.id, section })}
                    >
                      <Edit3 size={15} />
                      编辑分组
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => setDeleteIntent({ type: 'section', sourceId: source.id, section })}
                    >
                      <Trash2 size={15} />
                      删除分组
                    </button>
                  </div>
                </div>
                {section.cards.length === 0 ? (
                  <div className="explore-empty compact">
                    <FolderOpen size={20} />
                    <strong>这个分组还没有卡片</strong>
                    <span>把常用站点、系统和工具加进来。</span>
                  </div>
                ) : (
                  <div className="explore-nav-grid">
                    {section.cards.map((card) => (
                      <article key={card.id} className="explore-nav-card">
                        <button
                          type="button"
                          className="explore-nav-card-main"
                          onClick={() => openLink(card.url)}
                        >
                          <Avatar name={card.title} src={card.iconUrl} small />
                          <span>
                            <strong>{card.title}</strong>
                            <small>{card.description ?? card.url}</small>
                            {card.tags && card.tags.length > 0 && <em>{card.tags.join(' · ')}</em>}
                          </span>
                        </button>
                        <div className="explore-nav-card-actions">
                          <button
                            type="button"
                            aria-label={`编辑 ${card.title}`}
                            onClick={() => setEditorSheet({ type: 'editCard', sourceId: source.id, section, card })}
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            type="button"
                            className="danger"
                            aria-label={`删除 ${card.title}`}
                            onClick={() =>
                              setDeleteIntent({
                                type: 'card',
                                sourceId: source.id,
                                sectionId: section.id,
                                card,
                              })
                            }
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </>
    );
  };

  const renderWebSource = (source: ExploreSource) => (
    <section className="explore-web-card">
      <div>
        <span className="explore-source-kind">网页</span>
        <strong>{source.title}</strong>
        {source.description && <small>{source.description}</small>}
        <small>{source.value}</small>
      </div>
      <div className="explore-inline-actions">
        <button type="button" className="primary-button compact" onClick={() => openLink(source.value)}>
          <FolderOpen size={16} />
          打开站点
        </button>
        <button type="button" onClick={() => setEditorSheet({ type: 'editSource', source })}>
          <Edit3 size={15} />
          编辑
        </button>
        <button type="button" className="danger" onClick={() => setDeleteIntent({ type: 'source', source })}>
          <Trash2 size={15} />
          删除
        </button>
      </div>
    </section>
  );

  return (
    <div className="explore-panel">
      <header className="explore-hero">
        <div>
          <p className="eyebrow">Explore</p>
          <h2>探索</h2>
          <span>公开目录、导航站、网页和服务器源</span>
        </div>
        <button
          type="button"
          className="icon-button strong"
          onClick={() =>
            setEditorSheet({
              type: 'createSource',
              initialKind: selectedSource?.kind === 'web' || selectedSource?.kind === 'server' ? selectedSource.kind : 'nav',
            })
          }
          aria-label="添加探索来源"
        >
          <Plus size={20} />
        </button>
      </header>

      {sources.length > 0 && (
        <section className="explore-source-tabs">
          {sources.map((source) => (
            <button
              key={source.id}
              type="button"
              className={source.id === selectedSource?.id ? 'active' : ''}
              onClick={() => onSelectSource(source.id)}
            >
              <span className="explore-source-kind">
                {source.kind === 'nav' ? '导航' : source.kind === 'web' ? '网页' : '服务'}
              </span>
              <strong>{source.title}</strong>
              <small>{getSourceMeta(source)}</small>
            </button>
          ))}
        </section>
      )}

      {sources.length === 0 && (
        <div className="explore-empty">
          <Compass size={24} />
          <strong>还没有探索来源</strong>
          <span>先添加导航站、网页书签或服务器源。</span>
          <button
            type="button"
            className="primary-button compact"
            onClick={() => setEditorSheet({ type: 'createSource', initialKind: 'nav' })}
          >
            <Plus size={16} />
            添加探索来源
          </button>
        </div>
      )}

      {selectedSource?.kind === 'nav' ? (
        renderNavSource(selectedSource)
      ) : selectedSource?.kind === 'web' ? (
        renderWebSource(selectedSource)
      ) : (
        <>
          {selectedSource && (
            <section className="explore-web-card">
              <div>
                <span className="explore-source-kind">服务器源</span>
                <strong>{selectedSource.title}</strong>
                {selectedSource.description && <small>{selectedSource.description}</small>}
                <small>{selectedSource.value}</small>
              </div>
              <div className="explore-inline-actions">
                <button type="button" onClick={() => setEditorSheet({ type: 'editSource', source: selectedSource })}>
                  <Edit3 size={15} />
                  编辑
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => setDeleteIntent({ type: 'source', source: selectedSource })}
                >
                  <Trash2 size={15} />
                  删除
                </button>
              </div>
            </section>
          )}

          <section className="explore-directory">
            <form className="explore-form" onSubmit={onSearch}>
              <label className="create-field">
                <span>
                  <Server size={16} />
                  服务器
                </span>
                <input
                  value={publicSearch.server}
                  placeholder={currentServer ? `当前服务器：${currentServer}` : '留空使用当前服务'}
                  autoCapitalize="none"
                  autoCorrect="off"
                  onChange={(evt) => onChange({ ...publicSearch, server: evt.target.value })}
                />
              </label>
              <label className="create-field">
                <span>
                  <Search size={16} />
                  关键词
                </span>
                <input
                  value={publicSearch.query}
                  placeholder="搜索公开房间、空间、主题"
                  onChange={(evt) => onChange({ ...publicSearch, query: evt.target.value })}
                />
              </label>
              <button className="primary-button compact" type="submit" disabled={publicLoading}>
                <Search size={17} />
                {publicLoading ? '搜索中...' : '搜索目录'}
              </button>
            </form>
          </section>

          <section className="explore-source-strip">
            <div className="section-title">
              <span>服务器源</span>
              <strong>{suggestedServers.length}</strong>
            </div>
            <div className="explore-server-row">
              {suggestedServers.map((server) => (
                <span key={server} className={server === publicSearch.server ? 'active' : ''}>
                  <button type="button" onClick={() => onPickServer(server)}>
                    {server === currentServer ? <Globe2 size={13} /> : <Server size={13} />}
                    {server}
                  </button>
                  {customServers.includes(server) && (
                    <button type="button" onClick={() => onRemoveServer(server)} aria-label={`移除 ${server}`}>
                      <X size={13} />
                    </button>
                  )}
                </span>
              ))}
            </div>
            <form className="explore-source-add" onSubmit={handleAddServer}>
              <input
                value={serverDraft}
                placeholder="添加服务器，例如 matrix.org"
                autoCapitalize="none"
                autoCorrect="off"
                onChange={(evt) => setServerDraft(evt.target.value)}
              />
              <button type="submit">
                <Plus size={16} />
                添加
              </button>
            </form>
          </section>

          {visibleJoinedRooms.length > 0 && (
            <section className="explore-joined">
              <div className="section-title">
                <span>已加入</span>
                <strong>{visibleJoinedRooms.length}</strong>
              </div>
              <div className="explore-joined-list">
                {visibleJoinedRooms.map((room) => (
                  <button key={room.id} type="button" onClick={() => onOpenJoined(room.id)}>
                    <Avatar name={room.name} src={room.avatarUrl} accessToken={mediaAccessToken} small />
                    <span>
                      <strong>{room.name}</strong>
                      <small>
                        {room.space ? '空间' : room.direct ? '私聊' : '群组'} · {room.memberCount}
                      </small>
                    </span>
                    {room.unread > 0 && <b>{room.unread}</b>}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="explore-results">
            <div className="section-title">
              <span>公开目录</span>
              <strong>{publicRooms.length}</strong>
            </div>
            {publicRooms.length === 0 ? (
              <div className="explore-empty">
                <Compass size={24} />
                <strong>{publicLoading ? '正在搜索目录' : '还没有目录结果'}</strong>
                <span>输入关键词搜索，或者点上面的服务器快捷入口浏览公开房间</span>
              </div>
            ) : (
              <div className="public-room-list">
                {publicRooms.map((room) => {
                  const joinedRoom = joinedRoomForPublicRoom(room);
                  return (
                    <article key={room.id || room.alias} className="public-room-card">
                      <button
                        className="public-room-main"
                        type="button"
                        onClick={() => (joinedRoom ? onOpenJoined(joinedRoom.id) : onJoin(room.alias ?? room.id))}
                      >
                        <Avatar name={room.name} src={room.avatarUrl} accessToken={mediaAccessToken} />
                        <span>
                          <strong>{room.name}</strong>
                          <small>{room.alias || room.id}</small>
                          {room.topic && <em>{room.topic}</em>}
                        </span>
                      </button>
                      <div className="public-room-meta">
                        <span>
                          <Users size={13} />
                          {room.joinedMembers}
                        </span>
                        {room.alias && (
                          <span>
                            <Link2 size={13} />
                            别名
                          </span>
                        )}
                        {room.worldReadable && <span>可预览</span>}
                        <button
                          type="button"
                          onClick={() => (joinedRoom ? onOpenJoined(joinedRoom.id) : onJoin(room.alias ?? room.id))}
                        >
                          {joinedRoom ? '打开' : '加入'}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      {editorSheet?.type === 'createSource' && (
        <ExploreSourceEditorSheet
          title="添加探索来源"
          confirmLabel="保存并打开"
          initialDraft={createEmptyExploreSourceDraft(editorSheet.initialKind ?? 'nav')}
          onClose={() => setEditorSheet(undefined)}
          onSubmit={handleSubmitSourceSheet}
        />
      )}

      {editorSheet?.type === 'editSource' && (
        <ExploreSourceEditorSheet
          title={editorSheet.source.kind === 'nav' ? '编辑导航站' : '编辑探索来源'}
          confirmLabel="保存修改"
          initialDraft={toExploreSourceDraft(editorSheet.source)}
          lockKind
          onClose={() => setEditorSheet(undefined)}
          onSubmit={handleSubmitSourceSheet}
        />
      )}

      {editorSheet?.type === 'createSection' && (
        <ExploreSectionEditorSheet
          title="添加分组"
          confirmLabel="创建分组"
          initialTitle=""
          onClose={() => setEditorSheet(undefined)}
          onSubmit={handleSubmitSectionSheet}
        />
      )}

      {editorSheet?.type === 'editSection' && (
        <ExploreSectionEditorSheet
          title="编辑分组"
          confirmLabel="保存分组"
          initialTitle={editorSheet.section.title}
          onClose={() => setEditorSheet(undefined)}
          onSubmit={handleSubmitSectionSheet}
        />
      )}

      {editorSheet?.type === 'createCard' && (
        <ExploreCardEditorSheet
          title="添加卡片"
          confirmLabel="创建卡片"
          initialDraft={createEmptyExploreCardDraft()}
          sectionTitle={editorSheet.section.title}
          onClose={() => setEditorSheet(undefined)}
          onSubmit={handleSubmitCardSheet}
        />
      )}

      {editorSheet?.type === 'editCard' && (
        <ExploreCardEditorSheet
          title="编辑卡片"
          confirmLabel="保存卡片"
          initialDraft={toExploreCardDraft(editorSheet.card)}
          sectionTitle={editorSheet.section.title}
          onClose={() => setEditorSheet(undefined)}
          onSubmit={handleSubmitCardSheet}
        />
      )}

      {deleteIntent && deleteSheetCopy && (
        <ExploreDeleteConfirmSheet
          title={deleteSheetCopy.title}
          body={deleteSheetCopy.body}
          confirmLabel={deleteSheetCopy.confirmLabel}
          busy={deleteSubmitting}
          onClose={() => {
            if (!deleteSubmitting) setDeleteIntent(undefined);
          }}
          onConfirm={() => void handleConfirmDelete()}
        />
      )}
    </div>
  );
}

function ExploreDeleteConfirmSheet({
  title,
  body,
  confirmLabel,
  busy,
  onClose,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="sheet-backdrop">
      <section className="sheet compact-sheet">
        <header className="sheet-header">
          <div>
            <h2>{title}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="关闭" disabled={busy}>
            <X size={20} />
          </button>
        </header>

        <div className="explore-editor-body">
          <div className="explore-confirm-copy">
            <Trash2 size={18} />
            <span>
              <strong>删除后会立即同步到当前账号</strong>
              <small>{body}</small>
            </span>
          </div>
          <div className="explore-confirm-actions">
            <button type="button" className="secondary-button" onClick={onClose} disabled={busy}>
              取消
            </button>
            <button type="button" className="secondary-button danger" onClick={onConfirm} disabled={busy}>
              {busy ? '删除中...' : confirmLabel}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function ExploreSourceEditorSheet({
  title,
  confirmLabel,
  initialDraft,
  lockKind = false,
  onClose,
  onSubmit,
}: {
  title: string;
  confirmLabel: string;
  initialDraft: ExploreSourceEditorDraft;
  lockKind?: boolean;
  onClose: () => void;
  onSubmit: (draft: ExploreSourceEditorDraft) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState<ExploreSourceEditorDraft>(initialDraft);
  const titleLabel = draft.kind === 'nav' ? '导航站名称' : draft.kind === 'web' ? '来源名称' : '服务器名称';
  const valueLabel = draft.kind === 'nav' ? '导航站标识（可选）' : draft.kind === 'web' ? '网页地址' : '服务器地址';
  const valuePlaceholder =
    draft.kind === 'nav'
      ? '例如：工作台'
      : draft.kind === 'web'
        ? '例如：https://example.com'
        : '例如：matrix.org';
  const submitDisabled =
    draft.kind === 'nav'
      ? !draft.title.trim()
      : !draft.value.trim();

  return (
    <div className="sheet-backdrop">
      <section className="sheet compact-sheet">
        <header className="sheet-header">
          <div>
            <h2>{title}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="关闭">
            <X size={20} />
          </button>
        </header>

        <div className="explore-editor-body">
          <p className="explore-editor-copy">添加的来源会写入当前 Matrix 账号，同账号的其他设备也会同步。</p>
          <div className="create-field">
            <span>来源类型</span>
            <div className="segmented three">
              {(['server', 'web', 'nav'] as ExploreSourceKind[]).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  className={draft.kind === kind ? 'active' : ''}
                  disabled={lockKind}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      kind,
                      value: kind === 'nav' ? current.value : current.value,
                    }))
                  }
                >
                  {kind === 'server' ? '社区服务器' : kind === 'web' ? '自定义网页' : '导航站'}
                </button>
              ))}
            </div>
          </div>

          <label className="create-field">
            <span>{titleLabel}</span>
            <input
              value={draft.title}
              placeholder={draft.kind === 'nav' ? '例如：工作台' : '例如：常用入口'}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            />
          </label>

          <label className="create-field">
            <span>{valueLabel}</span>
            <input
              value={draft.value}
              placeholder={valuePlaceholder}
              autoCapitalize="none"
              autoCorrect="off"
              onChange={(event) => setDraft((current) => ({ ...current, value: event.target.value }))}
            />
            {draft.kind === 'nav' && <small>留空时会默认跟导航站名称保持一致。</small>}
          </label>

          <label className="create-field">
            <span>{draft.kind === 'nav' ? '导航站简介（可选）' : '来源简介（可选）'}</span>
            <textarea
              value={draft.description}
              rows={3}
              placeholder={draft.kind === 'nav' ? '例如：收纳常用网站和工具' : '例如：团队知识库或外部站点'}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
            />
          </label>

          <button
            type="button"
            className="primary-button"
            disabled={submitDisabled}
            onClick={() => void onSubmit(draft)}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

function ExploreSectionEditorSheet({
  title,
  confirmLabel,
  initialTitle,
  onClose,
  onSubmit,
}: {
  title: string;
  confirmLabel: string;
  initialTitle: string;
  onClose: () => void;
  onSubmit: (title: string) => void | Promise<void>;
}) {
  const [value, setValue] = useState(initialTitle);

  return (
    <div className="sheet-backdrop">
      <section className="sheet compact-sheet">
        <header className="sheet-header">
          <div>
            <h2>{title}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="关闭">
            <X size={20} />
          </button>
        </header>

        <div className="explore-editor-body">
          <label className="create-field">
            <span>分组名称</span>
            <input
              value={value}
              placeholder="例如：公司相关"
              onChange={(event) => setValue(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="primary-button"
            disabled={!value.trim()}
            onClick={() => void onSubmit(value)}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

function ExploreCardEditorSheet({
  title,
  confirmLabel,
  initialDraft,
  sectionTitle,
  onClose,
  onSubmit,
}: {
  title: string;
  confirmLabel: string;
  initialDraft: ExploreNavCardEditorDraft;
  sectionTitle: string;
  onClose: () => void;
  onSubmit: (draft: ExploreNavCardEditorDraft) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState<ExploreNavCardEditorDraft>(initialDraft);

  return (
    <div className="sheet-backdrop">
      <section className="sheet">
        <header className="sheet-header">
          <div>
            <h2>{title}</h2>
            <small>{sectionTitle}</small>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="关闭">
            <X size={20} />
          </button>
        </header>

        <div className="explore-editor-body">
          <label className="create-field">
            <span>标题</span>
            <input
              value={draft.title}
              placeholder="例如：Google 翻译"
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            />
          </label>
          <label className="create-field">
            <span>链接地址</span>
            <input
              value={draft.url}
              placeholder="例如：https://translate.google.com"
              autoCapitalize="none"
              autoCorrect="off"
              onChange={(event) => setDraft((current) => ({ ...current, url: event.target.value }))}
            />
          </label>
          <label className="create-field">
            <span>描述（可选）</span>
            <textarea
              value={draft.description}
              rows={4}
              placeholder="补一行简短说明，方便以后快速识别"
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
            />
          </label>
          <label className="create-field">
            <span>图标链接（可选）</span>
            <input
              value={draft.iconUrl}
              placeholder="例如：https://example.com/logo.png"
              autoCapitalize="none"
              autoCorrect="off"
              onChange={(event) => setDraft((current) => ({ ...current, iconUrl: event.target.value }))}
            />
          </label>
          <label className="create-field">
            <span>标签（可选）</span>
            <input
              value={draft.tags}
              placeholder="用逗号分隔，例如：翻译，工具"
              onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))}
            />
          </label>
          <button
            type="button"
            className="primary-button"
            disabled={!draft.title.trim() || !draft.url.trim()}
            onClick={() => void onSubmit(draft)}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

function SettingsPanel({
  session,
  snapshot,
  favoriteMessageCount,
  customEmojiCount,
  exploreSourceCount,
  ownProfile,
  profileForm,
  preferences,
  audioTranscriptionSettings,
  audioTranscriptionSupportLabel,
  cryptoStatus,
  cryptoStatusReady,
  mediaAccessToken,
  onLogout,
  onProfileChange,
  onProfileSubmit,
  onAvatarSelected,
  onPreferencesChange,
  onAudioTranscriptionSettingsChange,
  onOpenSecurity,
  onOpenEmojiManager,
  onOpenFavorites,
  onOpenInvites,
  onOpenExplore,
  onClearLocal,
}: {
  session?: StoredMatrixSession;
  snapshot: MatrixSnapshot;
  favoriteMessageCount: number;
  customEmojiCount: number;
  exploreSourceCount: number;
  ownProfile?: OwnProfile;
  profileForm: { displayName: string };
  preferences: AppPreferences;
  audioTranscriptionSettings: AudioTranscriptionSettings;
  audioTranscriptionSupportLabel: string;
  cryptoStatus: CryptoStatus;
  cryptoStatusReady: boolean;
  mediaAccessToken?: string;
  onLogout: () => void;
  onProfileChange: (value: { displayName: string }) => void;
  onProfileSubmit: (evt: FormEvent<HTMLFormElement>) => void;
  onAvatarSelected: (file: File) => void;
  onPreferencesChange: (value: AppPreferences) => void;
  onAudioTranscriptionSettingsChange: (value: AudioTranscriptionSettings) => void;
  onOpenSecurity: () => void;
  onOpenEmojiManager: () => void;
  onOpenFavorites: () => void;
  onOpenInvites: () => void;
  onOpenExplore: () => void;
  onClearLocal: () => void;
}) {
  const notificationPermission =
    typeof Notification === 'undefined' ? '未知' : Notification.permission;
  const joinedRooms = snapshot.rooms.filter((room) => room.membership === 'join');
  const spaceRooms = joinedRooms.filter((room) => room.space).length;
  const mutedRooms = joinedRooms.filter((room) => room.muted).length;
  const inviteRooms = snapshot.rooms.filter((room) => room.membership === 'invite').length;
  const notificationLabel =
    notificationPermission === 'granted'
      ? '已允许'
      : notificationPermission === 'denied'
        ? '已拒绝'
        : notificationPermission === 'default'
          ? '未询问'
          : notificationPermission;
  const cryptoSummaryLabel = !cryptoStatusReady
    ? '正在恢复加密状态'
    : cryptoStatus.cryptoReady
      ? '端到端加密可用'
      : '加密未启用';
  const backupLabel =
    !cryptoStatusReady
      ? '恢复中'
      : cryptoStatus.backupVersion ??
        cryptoStatus.activeBackupVersion ??
        (cryptoStatus.cryptoReady ? '未检测到备份' : '加密未启用');
  const backupTrustLabel =
    !cryptoStatusReady
      ? '恢复中'
      : cryptoStatus.backupTrusted === undefined
      ? '未知'
      : cryptoStatus.backupTrusted
        ? '已信任'
        : '未信任';

  return (
    <div className="settings-list">
      <form className="profile-card" onSubmit={onProfileSubmit}>
        <label className="avatar-upload">
          <Avatar
            name={ownProfile?.displayName ?? session?.userId ?? 'Me'}
            src={ownProfile?.avatarUrl}
            accessToken={mediaAccessToken}
          />
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(evt) => {
              const file = evt.target.files?.[0];
              evt.target.value = '';
              if (file) onAvatarSelected(file);
            }}
          />
        </label>
        <label>
          显示名
          <input
            value={profileForm.displayName}
            onChange={(evt) => onProfileChange({ displayName: evt.target.value })}
          />
        </label>
        <button type="submit">
          <Check size={17} />
          保存
        </button>
      </form>

      <section className="preference-card">
        <div className="section-title">
          <span>外观</span>
        </div>
        <div className="segmented two">
          {(['light', 'dark'] as AppearanceMode[]).map((mode) => (
            <button
              key={mode}
              className={preferences.appearance === mode ? 'active' : ''}
              onClick={() => onPreferencesChange({ ...preferences, appearance: mode })}
            >
              {mode === 'light' ? '浅色' : '深色'}
            </button>
          ))}
        </div>
        <div className="segmented two">
          {(['comfortable', 'compact'] as DensityMode[]).map((density) => (
            <button
              key={density}
              className={preferences.density === density ? 'active' : ''}
              onClick={() => onPreferencesChange({ ...preferences, density })}
            >
              {density === 'comfortable' ? '舒适' : '紧凑'}
            </button>
          ))}
        </div>
      </section>

      <section className="preference-card">
        <div className="section-title">
          <span>消息回执</span>
        </div>
        <button
          type="button"
          className={preferences.sendReadReceipts ? 'settings-item button-like active' : 'settings-item button-like'}
          onClick={() =>
            onPreferencesChange({
              ...preferences,
              sendReadReceipts: !preferences.sendReadReceipts,
            })
          }
        >
          <CheckSquare2 size={19} />
          <span>
            <strong>{preferences.sendReadReceipts ? '已发送已读回执' : '已关闭已读回执'}</strong>
            <small>{preferences.sendReadReceipts ? '进入房间后会同步已读状态，并显示已读头像。' : '只在本地清掉未读，不向对方广播已读。'}</small>
          </span>
        </button>
        <label className="settings-field">
          <span>已读头像显示上限</span>
          <input
            type="number"
            min={MIN_READ_RECEIPT_AVATAR_COUNT}
            max={MAX_READ_RECEIPT_AVATAR_COUNT}
            value={preferences.readReceiptAvatarCount}
            onChange={(evt) =>
              onPreferencesChange({
                ...preferences,
                readReceiptAvatarCount: clampReadReceiptAvatarCount(Number(evt.target.value)),
              })
            }
          />
        </label>
      </section>

      <section className="settings-section">
        <div className="section-title">
          <span>安全与同步</span>
        </div>
        <button className="settings-item button-like" type="button" onClick={onOpenSecurity}>
          <KeyRound size={19} />
          <span>
            <strong>加密与密钥恢复</strong>
            <small>
              {cryptoSummaryLabel} · {backupLabel} · {backupTrustLabel}
            </small>
          </span>
        </button>
        <div className="settings-item">
          <MessageCircle size={19} />
          <span>
            <strong>同步状态</strong>
            <small>{snapshot.rooms.length} 个会话 · {snapshot.totalUnread} 未读 · {snapshot.totalHighlights} 提及</small>
          </span>
        </div>
        <div className="settings-item">
          <Archive size={19} />
          <span>
            <strong>空间与邀请</strong>
            <small>{spaceRooms} 个空间 · {inviteRooms} 个邀请 · {mutedRooms} 个静音</small>
          </span>
        </div>
      </section>

      <section className="settings-section">
        <div className="section-title">
          <span>通知与内容</span>
        </div>
        <div className="settings-item">
          <Bell size={19} />
          <span>
            <strong>系统通知权限</strong>
            <small>{notificationLabel}</small>
          </span>
        </div>
        <button className="settings-item button-like" type="button" onClick={onOpenEmojiManager}>
          <SmilePlus size={19} />
          <span>
            <strong>表情与贴纸</strong>
            <small>{customEmojiCount} 个可用 · 来自个人表情包和房间</small>
          </span>
        </button>
        <button className="settings-item button-like" type="button" onClick={onOpenFavorites}>
          <Star size={19} />
          <span>
            <strong>收藏</strong>
            <small>{favoriteMessageCount} 条收藏消息</small>
          </span>
        </button>
        <button className="settings-item button-like" type="button" onClick={onOpenInvites}>
          <Bell size={19} />
          <span>
            <strong>邀请</strong>
            <small>{inviteRooms > 0 ? `${inviteRooms} 个待处理邀请` : '暂时没有新的邀请'}</small>
          </span>
        </button>
        <button className="settings-item button-like" type="button" onClick={onOpenExplore}>
          <Compass size={19} />
          <span>
            <strong>探索</strong>
            <small>{exploreSourceCount > 0 ? `${exploreSourceCount} 个已保存来源` : '添加导航站、网页和服务器源'}</small>
          </span>
        </button>
      </section>

      <section className="settings-section">
        <div className="section-title">
          <span>语音转文字</span>
        </div>
        <div className="settings-item">
          <Volume2 size={19} />
          <span>
            <strong>
              {hasAihubmixAudioTranscription(audioTranscriptionSettings)
                ? 'AIHubMix 云端转写已启用'
                : canTranscribeAudioInBrowser()
                  ? '当前仅保留浏览器短语音兜底'
                  : '请先配置 AIHubMix 云端转写'}
            </strong>
            <small>{audioTranscriptionSupportLabel}</small>
          </span>
        </div>
        <label className="settings-field">
          <span>AIHubMix API Key</span>
          <input
            type="password"
            value={audioTranscriptionSettings.apiKey}
            placeholder="留空则不启用云端转写"
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            onChange={(evt) =>
              onAudioTranscriptionSettingsChange({
                ...audioTranscriptionSettings,
                apiKey: evt.target.value,
              })
            }
          />
        </label>
        <label className="settings-field">
          <span>服务地址</span>
          <input
            value={audioTranscriptionSettings.baseUrl}
            placeholder={defaultAudioTranscriptionSettings.baseUrl}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            onChange={(evt) =>
              onAudioTranscriptionSettingsChange({
                ...audioTranscriptionSettings,
                baseUrl: evt.target.value,
              })
            }
          />
        </label>
        <p className="settings-helper">
          这份配置会保留在本机，同时在登录后同步到当前账号。没填 API Key 时，Web 预览只会在受支持的桌面 Chrome 里兜底短语音；长语音和 iOS 真机都建议直接使用 AIHubMix。
        </p>
      </section>

      <section className="settings-section">
        <div className="section-title">
          <span>本地数据</span>
        </div>
        <button className="settings-action" type="button" onClick={onClearLocal}>
          清空本地偏好
        </button>
        <button className="settings-action danger" type="button" onClick={onLogout}>
          退出登录        </button>
      </section>
    </div>
  );
}

function SettingsHero({ session, onLogout }: { session?: StoredMatrixSession; onLogout: () => void }) {
  return (
    <div className="hero-panel">
      <Settings size={38} />
      <h2>账户与设置</h2>
      <p>{session?.userId}</p>
      <button className="secondary-button danger" onClick={onLogout}>
        <LogOut size={18} />
        退出登录
      </button>
    </div>
  );
}

function ExploreHero() {
  return (
    <div className="hero-panel">
      <Compass size={38} />
      <h2>探索与导航</h2>
      <p>搜索公开目录，整理导航站、网页和服务器源</p>
    </div>
  );
}

function WelcomePanel({
  totalRooms,
  totalUnread,
  onCreate,
}: {
  totalRooms: number;
  totalUnread: number;
  onCreate: () => void;
}) {
  return (
    <div className="hero-panel">
      <MessageCircle size={40} />
      <h2>选择一个会话</h2>
      <p>{totalRooms} 个会话 · {totalUnread} 条未读</p>
      <button className="primary-button compact" onClick={onCreate}>
        <Plus size={18} />
        新会话
      </button>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  copy,
  compact = false,
}: {
  icon: ReactNode;
  title: string;
  copy: string;
  compact?: boolean;
}) {
  return (
    <div className={compact ? 'empty-state compact' : 'empty-state'}>
      {icon}
      <strong>{title}</strong>
      <span>{copy}</span>
    </div>
  );
}
