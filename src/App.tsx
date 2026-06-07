import { App as CapacitorApp } from '@capacitor/app';
import { Device } from '@capacitor/device';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import {
  Archive,
  AtSign,
  Ban,
  Bell,
  CalendarDays,
  Check,
  CheckSquare2,
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
  KeyRound,
  Link2,
  Lock,
  LogOut,
  MessageCircle,
  MessageSquarePlus,
  Mic,
  Moon,
  MoreHorizontal,
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
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { MatrixClient, SyncState } from 'matrix-js-sdk';
import {
  CSSProperties,
  ChangeEvent,
  Fragment,
  FormEvent,
  KeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
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
  banMember,
  ChatReply,
  ChatMessage,
  CustomEmojiItem,
  CryptoStatus,
  createDirectRoom,
  createGroupRoom,
  createMatrixRuntime,
  editTextMessage,
  ExploreSource,
  forwardMessagesToRooms,
  getCustomEmojiDebugSummary,
  getCustomEmojiItems,
  getCryptoStatus,
  getDirectRoomIdForUser,
  getExploreSources,
  getMatrixSnapshot,
  getOwnProfile,
  getPinnedMessages,
  getRoomMediaItems,
  getRoomMembers,
  getRoomMessages,
  getRoomTypingMembers,
  inviteUser,
  joinRoom,
  kickMember,
  leaveRoom,
  loginWithPassword,
  markRoomRead,
  MatrixSnapshot,
  OwnProfile,
  paginateRoomMessages,
  PinnedMessageSummary,
  PublicRoomSummary,
  redactMessage,
  rejectInvite,
  RoomMediaItem,
  RoomMemberSummary,
  RoomSummary,
  searchPublicRooms,
  searchLocalMessages,
  EncryptedMediaFile,
  sendEmoteMessage,
  sendReplyMessage,
  sendReaction,
  sendStickerMessage,
  sendTextMessage,
  setMessagePinned,
  setRoomMuted,
  restoreKeyBackupFromSecretStorage,
  restoreKeyBackupWithPassphrase,
  updateOwnAvatar,
  updateOwnDisplayName,
  updateRoomAvatar,
  updateRoomProfile,
  updateTypingStatus,
  uploadFileMessage,
} from './services/matrix';
import {
  clearStoredSession,
  loadStoredSession,
  saveStoredSession,
  StoredMatrixSession,
} from './services/sessionStore';

type BootState = 'booting' | 'signedOut' | 'connecting' | 'signedIn' | 'error';
type PrimaryView = 'home' | 'direct' | 'rooms' | 'spaces' | 'invites' | 'favorites' | 'explore' | 'settings';
type RoomListView = Exclude<PrimaryView, 'explore' | 'settings'>;
type RoomFilter = 'all' | 'spaces' | 'unread' | 'mentions';
type MobilePane = 'list' | 'chat';
type Sheet =
  | 'new'
  | 'roomInfo'
  | 'moreNav'
  | 'security'
  | { type: 'messageInfo'; message: ChatMessage }
  | { type: 'forward'; messages: ChatMessage[] }
  | { type: 'userProfile'; member: RoomMemberSummary }
  | undefined;
type ComposerMode =
  | { type: 'normal' }
  | { type: 'reply'; message: ChatMessage }
  | { type: 'edit'; message: ChatMessage };
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

const defaultHomeserver = 'https://mtx01.cc';
const favoriteRoomsKey = 'ioscinny.favoriteRooms';
const favoriteMessagesKey = 'ioscinny.favoriteMessages';
const appPreferencesKey = 'ioscinny.preferences';
const roomDraftsKey = 'ioscinny.roomDrafts';
const exploreServerSourcesKey = 'ioscinny.exploreServers';
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
const bottomPrimaryViews: PrimaryView[] = ['home', 'direct', 'rooms', 'settings'];
const moreNavViews: PrimaryView[] = ['invites', 'favorites', 'explore'];
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
  invites: '邀',
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

const formatTime = (ts: number): string => {
  if (!ts) return '';
  const date = new Date(ts);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
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

const getReadableMessageBody = (body: string): string => {
  if (/Unable to decrypt|DecryptionError/i.test(body)) {
    return '无法解密 · 需要恢复密钥或完成设备验证';
  }
  return body;
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

const getReadableSpeechError = (code?: string): string => {
  if (code === 'not-allowed' || code === 'service-not-allowed' || code === 'NotAllowedError' || code === 'SecurityError') {
    return '语音听写被浏览器拒绝了。请确认当前站点允许麦克风 / 语音识别；iOS WebView 真机需要接入原生 Speech Recognition 权限';
  }
  if (code === 'audio-capture' || code === 'NotFoundError') return '没有读取到麦克风输入，请检查系统麦克风权限';
  if (code === 'network') return '浏览器语音识别服务连接失败，请稍后重试。';
  if (code === 'no-speech') return '没有识别到语音内容。';
  return code ? `语音听写失败：${code}` : '语音听写失败';
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

const toAuthenticatedMediaUrl = (src?: string): string | undefined => {
  if (!src) return undefined;
  try {
    const url = new URL(src);
    if (url.pathname.startsWith('/_matrix/client/v1/media/')) return url.href;
    if (!url.pathname.startsWith('/_matrix/media/v3/')) return undefined;
    url.pathname = url.pathname.replace('/_matrix/media/v3/', '/_matrix/client/v1/media/');
    url.searchParams.set('allow_redirect', 'true');
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
  const tokenSrc = withAccessToken(authenticatedSrc ?? src, accessToken);
  const candidates = [authenticatedSrc ?? src, tokenSrc, fallbackSrc].filter(
    (candidate, index, list): candidate is string =>
      Boolean(candidate) && list.indexOf(candidate) === index
  );

  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, {
        headers: authenticatedSrc && candidate === authenticatedSrc && accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : undefined,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      return encryptedFile
        ? decryptEncryptedMediaBlob(blob, encryptedFile, mimeType)
        : blob;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `媒体无法读取：${lastError instanceof Error ? lastError.message : '媒体地址不可访问'}`
  );
};

const useAuthenticatedMediaState = (
  src?: string,
  accessToken?: string,
  fallbackSrc?: string,
  encryptedFile?: EncryptedMediaFile,
  mimeType?: string
): { resolvedSrc?: string; loading: boolean; failed: boolean } => {
  const [state, setState] = useState<{ resolvedSrc?: string; loading: boolean; failed: boolean }>(() => ({
    resolvedSrc: encryptedFile ? fallbackSrc : fallbackSrc ?? src,
    loading: Boolean(src && encryptedFile),
    failed: false,
  }));

  useEffect(() => {
    let objectUrl: string | undefined;
    let cancelled = false;

    if (!src) {
      setState({ resolvedSrc: fallbackSrc, loading: false, failed: !fallbackSrc });
      return undefined;
    }

    if (encryptedFile) {
      setState({ resolvedSrc: fallbackSrc, loading: true, failed: false });
      void fetchMediaBlob(src, accessToken, fallbackSrc, encryptedFile, mimeType)
        .then((blob) => {
          objectUrl = URL.createObjectURL(blob);
          if (!cancelled) {
            setState({ resolvedSrc: objectUrl, loading: false, failed: false });
          }
        })
        .catch(() => {
          if (!cancelled) {
            setState({
              resolvedSrc: fallbackSrc,
              loading: false,
              failed: !fallbackSrc,
            });
          }
        });

      return () => {
        cancelled = true;
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      };
    }

    const authenticatedSrc = accessToken ? toAuthenticatedMediaUrl(src) : undefined;
    const requestSrc = authenticatedSrc ?? src;
    const tokenSrc = withAccessToken(requestSrc, accessToken);
    const needsAuth = Boolean(authenticatedSrc && accessToken);
    if (!needsAuth) {
      setState({ resolvedSrc: requestSrc, loading: false, failed: false });
      return undefined;
    }

    setState({ resolvedSrc: fallbackSrc ?? tokenSrc, loading: true, failed: false });
    void fetch(requestSrc, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
      .then((response) => {
        if (!response.ok) throw new Error(`Media request failed: ${response.status}`);
        return response.blob();
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) {
          setState({ resolvedSrc: objectUrl, loading: false, failed: false });
        }
      })
      .catch(() => {
        if (!cancelled) {
          const nextSrc = tokenSrc ?? fallbackSrc;
          setState({
            resolvedSrc: nextSrc,
            loading: false,
            failed: !nextSrc,
          });
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [accessToken, encryptedFile, fallbackSrc, mimeType, src]);

  return state;
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

const combineTranscript = (leftText = '', rightText = ''): string =>
  `${leftText} ${rightText}`.replace(/\s+/g, ' ').trim();

const createAudioBufferSegment = (
  audioContext: AudioContext,
  audioBuffer: AudioBuffer,
  startSecond: number,
  endSecond: number
): AudioBuffer => {
  const startFrame = Math.max(0, Math.floor(startSecond * audioBuffer.sampleRate));
  const endFrame = Math.min(audioBuffer.length, Math.ceil(endSecond * audioBuffer.sampleRate));
  const frameLength = Math.max(1, endFrame - startFrame);
  const segment = audioContext.createBuffer(
    audioBuffer.numberOfChannels,
    frameLength,
    audioBuffer.sampleRate
  );

  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel += 1) {
    segment
      .getChannelData(channel)
      .set(audioBuffer.getChannelData(channel).subarray(startFrame, endFrame));
  }

  return segment;
};

const wait = (durationMs: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  });

const transcribeAudioSegmentInBrowser = async (
  audioContext: AudioContext,
  audioBuffer: AudioBuffer,
  onProgress: (text: string) => void
): Promise<string> => {
  const SpeechRecognitionCtor =
    (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;

  if (!SpeechRecognitionCtor) {
    throw new Error('当前浏览器不支持历史语音转文字；iOS 真机需要接入原生语音识别或云端 STT');
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

      if (!finishedBySource && !fatalError && restartCount < 2) {
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

const transcribeAudioBlobInBrowser = async (
  blob: Blob,
  onProgress?: (text: string, detail: string) => void
): Promise<string> => {
  const AudioContextCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextCtor) {
    throw new Error('当前浏览器不支持历史语音转文字；iOS 真机需要接入原生语音识别或云端 STT');
  }

  const audioContext = new AudioContextCtor();
  try {
    if (audioContext.state === 'suspended') {
      await audioContext.resume().catch(() => undefined);
    }

    const audioBuffer = await audioContext.decodeAudioData((await blob.arrayBuffer()).slice(0));
    if (!Number.isFinite(audioBuffer.duration) || audioBuffer.duration <= 0) {
      throw new Error('无法解析这条语音');
    }
    if (audioBuffer.duration > 5 * 60) {
      throw new Error('当前版本最长支持 5 分钟内的语音转文字。');
    }

    const totalSegments = Math.max(1, Math.ceil(audioBuffer.duration / 20));
    let transcript = '';

    for (let segmentIndex = 0; segmentIndex < totalSegments; segmentIndex += 1) {
      const startSecond = segmentIndex * 20;
      const endSecond = Math.min(audioBuffer.duration, startSecond + 20);
      const detail = `正在识别第 ${segmentIndex + 1}/${totalSegments} 段`;
      const segment = createAudioBufferSegment(audioContext, audioBuffer, startSecond, endSecond);

      onProgress?.(transcript, detail);
      try {
        const segmentText = await transcribeAudioSegmentInBrowser(audioContext, segment, (partialText) => {
          onProgress?.(combineTranscript(transcript, partialText), detail);
        });
        transcript = combineTranscript(transcript, segmentText);
        onProgress?.(transcript, detail);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!/没有识别/.test(message)) throw error;
      }

      if (segmentIndex + 1 < totalSegments) {
        await wait(150);
      }
    }

    if (!transcript) throw new Error('没有识别到可转写的语音内容。');
    return transcript;
  } finally {
    await audioContext.close().catch(() => undefined);
  }
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
  members
    .filter((member) => body.includes(member.id) || body.includes(`@${member.name}`))
    .map((member) => member.id);

const getTrailingMentionQuery = (value: string): string | undefined => {
  const match = value.match(/(?:^|\s)@([^\s@:]{0,32})$/);
  return match ? match[1].toLowerCase() : undefined;
};

const buildMatrixPermalink = (room: Pick<RoomSummary, 'id' | 'canonicalAlias'>, eventId?: string): string => {
  const roomPart = encodeURIComponent(room.canonicalAlias ?? room.id);
  const eventPart = eventId ? `/${encodeURIComponent(eventId)}` : '';
  return `https://matrix.to/#/${roomPart}${eventPart}`;
};

const buildUserPermalink = (userId: string): string => `https://matrix.to/#/${encodeURIComponent(userId)}`;

const localPartFromUserId = (userId?: string): string | undefined => {
  if (!userId) return undefined;
  const withoutSigil = userId.startsWith('@') ? userId.slice(1) : userId;
  return withoutSigil.split(':')[0] || undefined;
};

const memberRoleLabel = (powerLevel = 0): string => {
  if (powerLevel >= 100) return '绠＄悊';
  if (powerLevel >= 50) return '鐗堜富';
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

const isCompactMediaAsset = (width?: number, height?: number): boolean =>
  typeof width === 'number' &&
  typeof height === 'number' &&
  Math.max(width, height) <= compactMediaEdgePx;

const isStickerLikeMessage = (message: ChatMessage): boolean =>
  message.eventType === 'm.sticker' ||
  (message.attachment?.kind === 'image' &&
    isCompactMediaAsset(message.attachment.width, message.attachment.height));

export function App() {
  const runtimeStopRef = useRef<(() => void) | undefined>();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognitionLike | undefined>();
  const mediaRecorderRef = useRef<MediaRecorder | undefined>();
  const mediaRecorderStreamRef = useRef<MediaStream | undefined>();
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | undefined>(undefined);
  const recordingCancelledRef = useRef(false);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const emojiTrayRef = useRef<HTMLDivElement | null>(null);
  const emojiToggleButtonRef = useRef<HTMLButtonElement | null>(null);
  const loadingOlderRef = useRef(false);
  const autoScrollToBottomRef = useRef(true);
  const paginationAnchorRef = useRef<
    { roomId: string; scrollTop: number; scrollHeight: number } | undefined
  >(undefined);
  const sheetRef = useRef<Sheet>(undefined);
  const mobilePaneRef = useRef<MobilePane>('list');
  const autoReadKeyRef = useRef<string>();
  const typingTimeoutRef = useRef<number | undefined>(undefined);
  const [bootState, setBootState] = useState<BootState>('booting');
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [session, setSession] = useState<StoredMatrixSession>();
  const [client, setClient] = useState<MatrixClient>();
  const [snapshot, setSnapshot] = useState<MatrixSnapshot>(emptySnapshot);
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string>();
  const [activeView, setActiveView] = useState<PrimaryView>('home');
  const [mobilePane, setMobilePane] = useState<MobilePane>('list');
  const [sheet, setSheet] = useState<Sheet>();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [roomQuery, setRoomQuery] = useState('');
  const [roomFilter, setRoomFilter] = useState<RoomFilter>('all');
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>();
  const [messageQuery, setMessageQuery] = useState('');
  const [messageSearchOpen, setMessageSearchOpen] = useState(false);
  const [messageDraft, setMessageDraft] = useState('');
  const [composerMode, setComposerMode] = useState<ComposerMode>({ type: 'normal' });
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [voiceRecordingMs, setVoiceRecordingMs] = useState(0);
  const [recordingCancelled, setRecordingCancelled] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [deviceName, setDeviceName] = useState('iPhone');
  const [favoriteRoomIds, setFavoriteRoomIds] = useState<string[]>(() => loadStringArray(favoriteRoomsKey));
  const [favoriteMessageIds, setFavoriteMessageIds] = useState<Record<string, string[]>>(
    () => loadFavoriteMessages()
  );
  const [roomDrafts, setRoomDrafts] = useState<Record<string, string>>(() => loadRoomDrafts());
  const [preferences, setPreferences] = useState<AppPreferences>(() => loadPreferences());
  const [exploreServers, setExploreServers] = useState<string[]>(() => loadStringArray(exploreServerSourcesKey));
  const [exploreSources, setExploreSources] = useState<ExploreSource[]>([]);
  const [selectedExploreSourceId, setSelectedExploreSourceId] = useState<string>();
  const [ownProfile, setOwnProfile] = useState<OwnProfile>();
  const [profileForm, setProfileForm] = useState({ displayName: '' });
  const [roomMembers, setRoomMembers] = useState<RoomMemberSummary[]>([]);
  const [typingMembers, setTypingMembers] = useState<string[]>([]);
  const [roomMediaItems, setRoomMediaItems] = useState<RoomMediaItem[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessageSummary[]>([]);
  const [customEmojiItems, setCustomEmojiItems] = useState<CustomEmojiItem[]>([]);
  const [audioTranscriptions, setAudioTranscriptions] = useState<Record<string, AudioTranscriptionState>>({});
  const [previewMedia, setPreviewMedia] = useState<RoomMediaItem>();
  const [cryptoStatus, setCryptoStatus] = useState<CryptoStatus>({ cryptoReady: false });
  const [recoveryPassphrase, setRecoveryPassphrase] = useState('');
  const [keyRestoreProgress, setKeyRestoreProgress] = useState('');
  const [keyRestoreMessage, setKeyRestoreMessage] = useState<{ type: 'success' | 'error'; text: string }>();
  const [pendingScrollEventId, setPendingScrollEventId] = useState<string>();
  const [highlightedMessageId, setHighlightedMessageId] = useState<string>();
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

  const currentUserServer = serverFromUserId(session?.userId);
  const selectedExploreSource = useMemo(
    () => exploreSources.find((source) => source.id === selectedExploreSourceId) ?? exploreSources[0],
    [exploreSources, selectedExploreSourceId]
  );

  useEffect(() => {
    sheetRef.current = sheet;
  }, [sheet]);

  useEffect(() => {
    mobilePaneRef.current = mobilePane;
  }, [mobilePane]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      speechRecognitionRef.current?.stop();
    };
  }, []);

  const stopRuntime = useCallback(() => {
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
    setCustomEmojiItems([]);
    setAudioTranscriptions({});
    setSelectionMode(false);
    setSelectedMessageIds([]);
    setPendingScrollEventId(undefined);
    setHighlightedMessageId(undefined);
  }, []);

  const refreshSnapshot = useCallback(
    (mx = client) => {
      if (!mx) return;
      setSnapshot(getMatrixSnapshot(mx));
    },
    [client]
  );

  const refreshCryptoStatus = useCallback(
    async (mx = client) => {
      if (!mx) {
        setCryptoStatus({ cryptoReady: false });
        return;
      }
      try {
        setCryptoStatus(await getCryptoStatus(mx));
      } catch {
        setCryptoStatus({ cryptoReady: Boolean(mx.getCrypto()) });
      }
    },
    [client]
  );

  const connectSession = useCallback(
    async (nextSession: StoredMatrixSession) => {
      stopRuntime();
      setBootState('connecting');
      setError(undefined);

      try {
        const runtime = await createMatrixRuntime(nextSession, setSnapshot, setSyncState);
        runtimeStopRef.current = runtime.stop;
        setClient(runtime.client);
        setSession(nextSession);
        setBootState('signedIn');
        void refreshCryptoStatus(runtime.client);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setBootState('error');
      }
    },
    [stopRuntime]
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
      if (sheetRef.current) {
        setSheet(undefined);
        return;
      }
      if (mobilePaneRef.current === 'chat') {
        setMobilePane('list');
        return;
      }
      if (canGoBack) {
        window.history.back();
      }
    });

    return () => {
      mounted = false;
      stopRuntime();
      void backButton.then((listener) => listener.remove());
    };
  }, [connectSession, stopRuntime]);

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

  const selectedRoomMessages = useMemo(() => {
    if (!client || !selectedRoomId) return [];
    return getRoomMessages(client, selectedRoomId, messageQuery);
  }, [client, messageQuery, selectedRoomId, snapshot.version]);

  const selectedForwardMessages = useMemo(
    () =>
      selectedRoomMessages.filter(
        (message) => selectedMessageIds.includes(message.id) && isForwardableMessage(message)
      ),
    [selectedMessageIds, selectedRoomMessages]
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
        if (!room) return [];
        const messages = getRoomMessages(client, roomId);
        return messages
          .filter((message) => ids.includes(message.id))
          .map((message) => ({ room, message }));
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
  }, [cinnyFavoritesRoomId, client, favoriteMessageIds, snapshot.rooms, snapshot.version]);

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
      if (selectedRoomId && selectedSpaceId && visibleRooms.some((room) => room.id === selectedRoomId)) return;
      setSelectedRoomId(undefined);
      return;
    }

    if (selectedRoomId && visibleRooms.some((room) => room.id === selectedRoomId)) return;
    setSelectedRoomId(visibleRooms[0]?.id);
  }, [activeView, roomFilter, selectedRoomId, selectedSpaceId, visibleRooms]);

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
  }, [selectedRoomId]);

  useEffect(() => {
    if (!client || !selectedRoomId) {
      setRoomMembers([]);
      setTypingMembers([]);
      setRoomMediaItems([]);
      setPinnedMessages([]);
      setCustomEmojiItems(client ? getCustomEmojiItems(client) : []);
      return;
    }
    setRoomMembers(getRoomMembers(client, selectedRoomId));
    setRoomMediaItems(getRoomMediaItems(client, selectedRoomId));
    setPinnedMessages(getPinnedMessages(client, selectedRoomId));
    setCustomEmojiItems(getCustomEmojiItems(client, selectedRoomId));
  }, [client, selectedRoomId, snapshot.version]);

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

    if (summary) {
      console.info('[ioscinny:emoji-debug]', JSON.stringify(summary));
    }
  }, [client, selectedRoomId, snapshot.version]);

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

  useEffect(() => {
    if (!selectedRoom) {
      setRoomProfileForm({ name: '', topic: '' });
      setComposerMode({ type: 'normal' });
      setMessageDraft('');
      setEmojiOpen(false);
      return;
    }

    setRoomProfileForm({
      name: selectedRoom.name,
      topic: selectedRoom.topic ?? '',
    });
    setComposerMode({ type: 'normal' });
    setMessageDraft(roomDrafts[selectedRoom.id] ?? '');
    setEmojiOpen(false);
    autoScrollToBottomRef.current = true;
    paginationAnchorRef.current = undefined;
  }, [selectedRoom?.id]);

  useEffect(() => {
    if (!client || !selectedRoomId) return undefined;

    const refreshTyping = () => setTypingMembers(getRoomTypingMembers(client, selectedRoomId));
    refreshTyping();
    const interval = window.setInterval(refreshTyping, 2500);
    return () => window.clearInterval(interval);
  }, [client, selectedRoomId, snapshot.version]);

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

  useLayoutEffect(() => {
    const timeline = timelineRef.current;
    const anchor = paginationAnchorRef.current;
    if (!timeline || !anchor || anchor.roomId !== selectedRoomId) return;

    timeline.scrollTop = anchor.scrollTop + (timeline.scrollHeight - anchor.scrollHeight);
    paginationAnchorRef.current = undefined;
  }, [selectedRoomId, selectedRoomMessages.length, snapshot.version]);

  useEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline || pendingScrollEventId || paginationAnchorRef.current) return;
    if (!autoScrollToBottomRef.current) return;

    timeline.scrollTo({
      top: timeline.scrollHeight,
      behavior: selectedRoomMessages.length > 0 ? 'smooth' : 'auto',
    });
  }, [pendingScrollEventId, selectedRoomId, selectedRoomMessages.length]);

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
    setHighlightedMessageId(pendingScrollEventId);
    const timeout = window.setTimeout(() => setHighlightedMessageId(undefined), 1800);
    setPendingScrollEventId(undefined);
    return () => window.clearTimeout(timeout);
  }, [pendingScrollEventId, selectedRoomMessages.length]);

  useEffect(() => {
    saveStringArray(favoriteRoomsKey, favoriteRoomIds);
  }, [favoriteRoomIds]);

  useEffect(() => {
    saveFavoriteMessages(favoriteMessageIds);
  }, [favoriteMessageIds]);

  useEffect(() => {
    saveRoomDrafts(roomDrafts);
  }, [roomDrafts]);

  useEffect(() => {
    savePreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    saveStringArray(exploreServerSourcesKey, exploreServers);
  }, [exploreServers]);

  const runAction = async (action: () => Promise<void>, success?: string) => {
    setError(undefined);
    try {
      await action();
      await Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
      refreshSnapshot();
      if (success) setNotice(success);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleLogin = async (evt: FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
    setBootState('connecting');
    setError(undefined);

    try {
      const nextSession = await loginWithPassword(loginForm);
      await saveStoredSession(nextSession);
      await Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
      await connectSession(nextSession);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBootState('error');
    }
  };

  const handleLogout = async () => {
    stopRuntime();
    await clearStoredSession();
    setSession(undefined);
    setBootState('signedOut');
  };

  const handleSelectRoom = (roomId: string) => {
    const room = snapshot.rooms.find((item) => item.id === roomId);
    if (activeView === 'rooms' && roomFilter === 'spaces' && !selectedSpaceId && room?.space) {
      setSelectedSpaceId(room.id);
      setSelectedRoomId(undefined);
      setRoomQuery('');
      setMobilePane('list');
      return;
    }

    setSelectedRoomId(roomId);
    setMobilePane('chat');
    setMessageQuery('');
    setMessageSearchOpen(false);
    setComposerMode({ type: 'normal' });
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
        await editTextMessage(client, selectedRoom.id, composerMode.message.id, body);
      } else if (composerMode.type === 'reply') {
        const replyTo: ChatReply = {
          eventId: composerMode.message.id,
          senderName: composerMode.message.senderName ?? composerMode.message.sender,
          body: composerMode.message.body,
        };
        await sendReplyMessage(client, selectedRoom.id, replyTo, body);
      } else {
        await sendTextMessage(client, selectedRoom.id, body, extractMentionUserIds(body, roomMembers));
      }

      setComposerMode({ type: 'normal' });
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
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  };

  const handleComposerKeyDown = (evt: KeyboardEvent<HTMLTextAreaElement>) => {
    if (evt.key === 'Enter' && !evt.shiftKey) {
      evt.preventDefault();
      void handleSendMessage();
    }
  };

  const handleDraftChange = (value: string) => {
    setMessageDraft(value);
    if (selectedRoom && composerMode.type === 'normal') {
      setRoomDrafts((current) => {
        const next = { ...current };
        if (value) {
          next[selectedRoom.id] = value;
        } else {
          delete next[selectedRoom.id];
        }
        return next;
      });
    }
    if (!client || !selectedRoom || selectedRoom.membership !== 'join') return;

    void updateTypingStatus(client, selectedRoom.id, Boolean(value.trim())).catch(() => undefined);
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = window.setTimeout(() => {
      if (client && selectedRoom) {
        void updateTypingStatus(client, selectedRoom.id, false).catch(() => undefined);
      }
    }, 5000);
  };

  const handleLoadOlder = async () => {
    if (!client || !selectedRoom || loadingOlder) return;
    setLoadingOlder(true);
    await runAction(() => paginateRoomMessages(client, selectedRoom.id), '已加载更早消息');
    setLoadingOlder(false);
  };

  const loadOlderMessages = useCallback(async () => {
    if (!client || !selectedRoom || loadingOlderRef.current || messageQuery.trim()) return;

    const timeline = timelineRef.current;
    if (timeline) {
      paginationAnchorRef.current = {
        roomId: selectedRoom.id,
        scrollTop: timeline.scrollTop,
        scrollHeight: timeline.scrollHeight,
      };
    }

    loadingOlderRef.current = true;
    setLoadingOlder(true);
    autoScrollToBottomRef.current = false;

    try {
      await paginateRoomMessages(client, selectedRoom.id);
      refreshSnapshot(client);
    } catch (err) {
      paginationAnchorRef.current = undefined;
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      window.requestAnimationFrame(() => {
        const currentAnchor = paginationAnchorRef.current;
        const currentTimeline = timelineRef.current;
        if (
          currentAnchor &&
          currentTimeline &&
          currentAnchor.roomId === selectedRoom.id &&
          currentTimeline.scrollHeight === currentAnchor.scrollHeight
        ) {
          paginationAnchorRef.current = undefined;
        }
      });
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  }, [client, messageQuery, refreshSnapshot, selectedRoom]);

  const handleTimelineScroll = useCallback(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;

    const distanceToBottom = timeline.scrollHeight - (timeline.scrollTop + timeline.clientHeight);
    autoScrollToBottomRef.current = distanceToBottom < 84;

    if (timeline.scrollTop <= 48 && !loadingOlderRef.current && !messageQuery.trim()) {
      void loadOlderMessages();
    }
  }, [loadOlderMessages, messageQuery]);

  const handleCopyMessage = async (message: ChatMessage) => {
    await navigator.clipboard?.writeText(message.body);
    setNotice('消息已复制');
  };

  const handleCopyMessageLink = async (message: ChatMessage) => {
    const room = snapshot.rooms.find((item) => item.id === message.roomId);
    if (!room) return;
    await navigator.clipboard?.writeText(buildMatrixPermalink(room, message.id));
    setNotice('消息链接已复制');
  };

  const handleTogglePinMessage = async (message: ChatMessage) => {
    if (!client) return;
    await runAction(
      () => setMessagePinned(client, message.roomId, message.id, !message.pinned),
      message.pinned ? '已取消置顶' : '已置顶消息'
    );
  };

  const handleOpenMessageInfo = (message: ChatMessage) => {
    setSheet({ type: 'messageInfo', message });
  };

  const handleEditMessage = (message: ChatMessage) => {
    setComposerMode({ type: 'edit', message });
    setMessageDraft(message.body);
    setSheet(undefined);
  };

  const handleRedactMessage = async (message: ChatMessage) => {
    if (!client) return;
    await runAction(() => redactMessage(client, message.roomId, message.id), '消息已撤回');
    setSheet(undefined);
  };

  const handleFileSelected = async (evt: ChangeEvent<HTMLInputElement>) => {
    const file = evt.target.files?.[0];
    evt.target.value = '';
    if (!client || !selectedRoom || !file) return;

    await runAction(
      () => uploadFileMessage(client, selectedRoom.id, file),
      `已发送附件：${file.name}`
    );
  };

  const handlePreviewAttachment = (message: ChatMessage) => {
    if (!message.attachment) return;
    setPreviewMedia({
      messageId: message.id,
      roomId: message.roomId,
      kind: message.attachment.kind,
      url: message.attachment.url,
      authUrl: message.attachment.authUrl,
      previewEncryptedFile: message.attachment.previewEncryptedFile,
      previewMimeType: message.attachment.previewMimeType,
      downloadUrl: message.attachment.downloadUrl,
      authDownloadUrl: message.attachment.authDownloadUrl,
      encryptedFile: message.attachment.encryptedFile,
      name: message.attachment.name ?? message.body,
      mimeType: message.attachment.mimeType,
      durationMs: message.attachment.durationMs,
      width: message.attachment.width,
      height: message.attachment.height,
      senderName: message.senderName,
      timestamp: message.timestamp,
    });
  };

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

  const handlePickCustomEmoji = async (item: CustomEmojiItem) => {
    if (!client || !selectedRoom || selectedRoom.membership !== 'join') return;
    if (item.usage.includes('sticker')) {
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
      setError('当前环境不支持录制语音；iOS 真机需要确认 WebView 麦克风权限。');
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
      const text = await transcribeAudioBlobInBrowser(blob, (partialText, detail) => {
        setAudioTranscriptions((current) => ({
          ...current,
          [message.id]: {
            status: 'loading',
            text: partialText || current[message.id]?.text,
            detail,
          },
        }));
      });
      setAudioTranscriptions((current) => ({
        ...current,
        [message.id]: { status: 'success', text },
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
      setNotice(`密钥恢复完成：导入 ${result.imported}/${result.total}`);
      setKeyRestoreMessage({
        type: 'success',
        text: `密钥恢复完成：导入 ${result.imported}/${result.total}`,
      });
      setKeyRestoreProgress('');
      await refreshCryptoStatus(client);
      refreshSnapshot(client);
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
      setNotice(`密钥恢复完成：导入 ${result.imported}/${result.total}`);
      setKeyRestoreMessage({
        type: 'success',
        text: `密钥恢复完成：导入 ${result.imported}/${result.total}`,
      });
      setRecoveryPassphrase('');
      setKeyRestoreProgress('');
      await refreshCryptoStatus(client);
      refreshSnapshot(client);
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
    setMessageDraft(nextDraft);
    if (selectedRoom && composerMode.type === 'normal') {
      setRoomDrafts((drafts) => ({ ...drafts, [selectedRoom.id]: nextDraft }));
    }
    setSheet(undefined);
    setMobilePane('chat');
  };

  const handlePickMentionSuggestion = (member: RoomMemberSummary) => {
    const nextDraft = messageDraft.match(/(?:^|\s)@[^\s@:]{0,32}$/)
      ? messageDraft.replace(/(^|\s)@[^\s@:]{0,32}$/, `$1${member.id} `)
      : `${messageDraft}${messageDraft.endsWith(' ') || !messageDraft ? '' : ' '}${member.id} `;

    handleDraftChange(nextDraft);
  };

  const handleCopyMember = async (member: RoomMemberSummary) => {
    await navigator.clipboard?.writeText(member.id);
    setNotice('成员 ID 已复制');
  };

  const handleCopyMemberLink = async (member: RoomMemberSummary) => {
    await navigator.clipboard?.writeText(buildUserPermalink(member.id));
    setNotice('用户链接已复制');
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
    if (!window.confirm(`纭畾瑕佹妸 ${member.name} 移出这个房间吗？`)) return;

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
    setFavoriteMessageIds((current) => {
      const roomFavorites = current[message.roomId] ?? [];
      const nextRoomFavorites = roomFavorites.includes(message.id)
        ? roomFavorites.filter((id) => id !== message.id)
        : [...roomFavorites, message.id];
      return {
        ...current,
        [message.roomId]: nextRoomFavorites,
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

  const favoriteMessageCount = Object.values(favoriteMessageIds).reduce(
    (count, ids) => count + ids.length,
    0
  );

  if (bootState === 'booting') {
    return <LoadingScreen label="正在启动 Starfire iOS" />;
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
    return <LoadingScreen label="正在连接 Matrix 与加密存储" />;
  }

  const showPaneSearch = activeView !== 'explore' && activeView !== 'settings' && activeView !== 'favorites';
  const showPaneCreate = activeView !== 'favorites' && activeView !== 'invites' && activeView !== 'explore';
  const showPaneActions = showPaneSearch || showPaneCreate;

  return (
    <main className={`app-frame mobile-${mobilePane} theme-${preferences.appearance} density-${preferences.density}`}>
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
              <RoomList
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
              />
              {localSearchResults.length > 0 && (
                <LocalSearchDigest
                  results={localSearchResults}
                  mediaAccessToken={session?.accessToken}
                  onOpen={(roomId, eventId) => {
                    handleSelectRoom(roomId);
                    setPendingScrollEventId(eventId);
                  }}
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
            onOpenMessage={(roomId, eventId) => {
              const room = snapshot.rooms.find((item) => item.id === roomId);
              handleSelectRoom(roomId);
              setActiveView(room?.direct ? 'direct' : 'rooms');
              setPendingScrollEventId(eventId);
            }}
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
            deviceName={deviceName}
            snapshot={snapshot}
            favoriteMessageCount={favoriteMessageCount}
            customEmojiCount={customEmojiItems.length}
            onLogout={handleLogout}
            ownProfile={ownProfile}
            profileForm={profileForm}
            preferences={preferences}
            cryptoStatus={cryptoStatus}
            mediaAccessToken={session?.accessToken}
            onProfileChange={setProfileForm}
            onProfileSubmit={handleProfileSubmit}
            onAvatarSelected={handleProfileAvatarSelected}
            onPreferencesChange={setPreferences}
            onOpenSecurity={() => setSheet('security')}
            onClearLocal={() => {
              window.localStorage.removeItem(favoriteRoomsKey);
              window.localStorage.removeItem(favoriteMessagesKey);
              setFavoriteRoomIds([]);
              setFavoriteMessageIds({});
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
              <Avatar name={selectedRoom.name} src={selectedRoom.avatarUrl} accessToken={session?.accessToken} />
              <div className="chat-title">
                <h2>{selectedRoom.name}</h2>
                <span>
                  {selectedRoom.direct ? '私聊' : selectedRoom.space ? '空间' : '群组'} · {selectedRoom.memberCount} 人
                  {selectedRoom.encrypted ? ' · E2EE' : ''}
                </span>
              </div>
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
                className={cryptoStatus.cryptoReady ? 'icon-button' : 'icon-button warning'}
                onClick={() => setSheet('security')}
                aria-label="加密与密钥恢复"
              >
                <KeyRound size={19} />
              </button>
              <button className="icon-button" onClick={() => setSheet('roomInfo')} aria-label="房间信息">
                <Info size={19} />
              </button>
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
                  onOpen={(eventId) => setPendingScrollEventId(eventId)}
                  onOpenAll={() => setSheet('roomInfo')}
                />
              )}
              {error && <button className="message-box danger inline" type="button" onClick={() => setError(undefined)}>{error}</button>}
              {notice && <button className="message-box success inline" type="button" onClick={() => setNotice(undefined)}>{notice}</button>}
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

            <div className="timeline" ref={timelineRef} onScroll={handleTimelineScroll}>
              <button className="load-older" onClick={() => void loadOlderMessages()} disabled={loadingOlder}>
                <History size={15} />
                {loadingOlder ? '加载中...' : '加载更早消息'}
              </button>
              {selectedRoomMessages.length === 0 ? (
                <EmptyState
                  icon={<MessageCircle size={30} />}
                  title={messageQuery ? '没有匹配消息' : '这里还没有消息'}
                  copy={messageQuery ? '换一个关键词试试。' : '发出第一条消息，或者等待同步更多历史记录。'}
                />
              ) : (
                selectedRoomMessages.map((message, index) => {
                  const previousMessage = selectedRoomMessages[index - 1];
                  const showDateSeparator =
                    !previousMessage || getDayKey(previousMessage.timestamp) !== getDayKey(message.timestamp);

                  return (
                    <Fragment key={message.id}>
                      {showDateSeparator && <TimelineDateSeparator timestamp={message.timestamp} />}
                      <MessageBubble
                        message={message}
                        favorite={favoriteMessageIds[message.roomId]?.includes(message.id) ?? false}
                        highlighted={message.id === highlightedMessageId}
                        selectionMode={selectionMode}
                        selected={selectedMessageIds.includes(message.id)}
                        forwardable={isForwardableMessage(message)}
                        mediaAccessToken={session?.accessToken}
                        currentUserProfile={ownProfile}
                        readReceiptAvatarCount={preferences.readReceiptAvatarCount}
                        audioTranscription={audioTranscriptions[message.id]}
                        onToggleSelection={() => toggleMessageSelection(message)}
                        onFavorite={() => toggleFavoriteMessage(message)}
                        onReply={() => {
                          setComposerMode({ type: 'reply', message });
                          setMessageDraft('');
                        }}
                        onOpenReply={(eventId) => setPendingScrollEventId(eventId)}
                        onInfo={() => handleOpenMessageInfo(message)}
                        onEdit={() => handleEditMessage(message)}
                        onRedact={() => handleRedactMessage(message)}
                        onCopy={() => handleCopyMessage(message)}
                        onCopyLink={() => handleCopyMessageLink(message)}
                        onTogglePin={() => handleTogglePinMessage(message)}
                        onForward={() => startForwardSelection(message)}
                        onPreviewAttachment={() => handlePreviewAttachment(message)}
                        onTranscribeAudio={() => handleTranscribeAudio(message)}
                        onOpenUserProfile={() => handleOpenMessageSenderProfile(message)}
                        onReact={(key) =>
                          client &&
                          runAction(() => sendReaction(client, message.roomId, message.id, key), '已更新回应')
                        }
                      />
                    </Fragment>
                  );
                })
              )}
            </div>

            <form className="composer" onSubmit={handleSendMessage}>
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
              <input ref={fileInputRef} type="file" hidden onChange={handleFileSelected} />
              <div className="composer-tools" aria-label="输入工具">
                <button
                  className="icon-button"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="发送附件"
                  disabled={selectedRoom.membership !== 'join'}
                >
                  <FileUp size={19} />
                </button>
                <button
                  ref={emojiToggleButtonRef}
                  className={emojiOpen ? 'icon-button active' : 'icon-button'}
                  type="button"
                  onClick={() => setEmojiOpen((open) => !open)}
                  aria-label="表情"
                  disabled={selectedRoom.membership !== 'join'}
                >
                  <SmilePlus size={19} />
                </button>
                <button
                  className={voiceRecording ? 'icon-button active recording' : 'icon-button'}
                  type="button"
                  onClick={handleToggleVoiceRecording}
                  title={voiceRecording ? '录音中，请点击上方发送' : '录制语音'}
                  aria-label={voiceRecording ? '语音录制中' : '录制语音'}
                  disabled={selectedRoom.membership !== 'join' || voiceRecording}
                >
                  <Mic size={19} />
                </button>
              </div>
              <textarea
                value={messageDraft}
                rows={1}
                placeholder={selectedRoom.membership === 'join' ? '输入消息' : '需要先加入房间'}
                disabled={selectedRoom.membership !== 'join'}
                onKeyDown={handleComposerKeyDown}
                onChange={(evt) => handleDraftChange(evt.target.value)}
              />
              <button className="send-button" type="submit" disabled={!messageDraft.trim() || sending}>
                <Send size={19} />
              </button>
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

      <nav className="bottom-nav" aria-label="底部导航">
        {bottomPrimaryViews.map((view) => (
          <button
            key={view}
            className={activeView === view ? 'bottom-button active' : 'bottom-button'}
            onClick={() => {
              setActiveView(view);
              setMobilePane('list');
            }}
          >
            {viewIcon(view)}
            <span>{viewLabels[view]}</span>
          </button>
        ))}
        <button
          className={moreNavViews.includes(activeView) ? 'bottom-button active' : 'bottom-button'}
          onClick={() => setSheet('moreNav')}
        >
          <MoreHorizontal size={20} />
          <span>更多</span>
        </button>
      </nav>

      {sheet === 'moreNav' && (
        <MoreNavSheet
          activeView={activeView}
          unreadByView={unreadByView}
          onClose={() => setSheet(undefined)}
          onPick={(view) => {
            setActiveView(view);
            setMobilePane('list');
            setSheet(undefined);
          }}
        />
      )}

      {sheet === 'security' && (
        <SecuritySheet
          status={cryptoStatus}
          passphrase={recoveryPassphrase}
          progress={keyRestoreProgress}
          message={keyRestoreMessage}
          onPassphraseChange={setRecoveryPassphrase}
          onRestoreFromSecretStorage={handleRestoreFromSecretStorage}
          onRestoreWithPassphrase={handleRestoreWithPassphrase}
          onClose={() => setSheet(undefined)}
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
            setPendingScrollEventId(eventId);
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
          onOpenMemberProfile={openUserProfile}
          onDirectMember={handleDirectMember}
          onKickMember={handleKickMember}
          onBanMember={handleBanMember}
          onToggleMute={() =>
            client &&
            runAction(
              () => setRoomMuted(client, selectedRoom.id, !selectedRoom.muted),
              selectedRoom.muted ? '已取消静音' : '已静音'
            )
          }
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
          onMentionMember={handleMentionMember}
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
          message={messageInfoMessage}
          room={messageInfoRoom}
          favorite={favoriteMessageIds[messageInfoMessage.roomId]?.includes(messageInfoMessage.id) ?? false}
          onClose={() => setSheet(undefined)}
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
          onTranscribeAudio={() => handleTranscribeAudio(messageInfoMessage)}
          onReact={(key) =>
            client &&
            runAction(() => sendReaction(client, messageInfoMessage.roomId, messageInfoMessage.id, key), '已更新回应')
          }
          onRedact={() => handleRedactMessage(messageInfoMessage)}
        />
      )}

      {previewMedia && (
        <EnhancedMediaPreview
          media={previewMedia}
          items={roomMediaItems}
          mediaAccessToken={session?.accessToken}
          onSelect={setPreviewMedia}
          onClose={() => setPreviewMedia(undefined)}
        />
      )}
    </main>
  );
}

function LoadingScreen({ label }: { label: string }) {
  return (
    <main className="loading-screen">
      <Sparkles className="pulse" size={34} />
      <p>{label}</p>
    </main>
  );
}

function Avatar({
  name,
  src,
  accessToken,
  small = false,
  onClick,
  ariaLabel,
}: {
  name: string;
  src?: string;
  accessToken?: string;
  small?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  const [failed, setFailed] = useState(false);
  const resolvedSrc = useAuthenticatedMediaUrl(src, accessToken, src);
  const className = small ? 'avatar small' : 'avatar';
  const showImage = Boolean(resolvedSrc && !failed);

  useEffect(() => {
    setFailed(false);
  }, [resolvedSrc]);

  const content = (
    <>
      {showImage ? (
        <img src={resolvedSrc} alt="" onError={() => setFailed(true)} />
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
        onClick={(evt) => {
          evt.stopPropagation();
          onClick();
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
}: {
  rooms: RoomSummary[];
  selectedRoomId?: string;
  favoriteRoomIds: string[];
  roomDrafts: Record<string, string>;
  mediaAccessToken?: string;
  onSelectRoom: (roomId: string) => void;
  onAccept: (roomId: string) => void;
  onReject: (roomId: string) => void;
}) {
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
      {rooms.map((room) => (
        <button
          key={room.id}
          className={selectedRoomId === room.id ? 'room-row active' : 'room-row'}
          onClick={() => onSelectRoom(room.id)}
        >
          <Avatar name={room.name} src={room.avatarUrl} accessToken={mediaAccessToken} />
          <span className="room-row-main">
            <span className="room-row-title">
              <strong>{room.name}</strong>
              <span>{formatTime(room.lastTs)}</span>
            </span>
            <span className="room-row-sub">
              {room.encrypted && <Lock size={12} />}
              {room.muted && <Bell size={12} />}
              {favoriteRoomIds.includes(room.id) && <Star size={12} />}
              <span>
                {roomDrafts[room.id]
                  ? `草稿：{roomDrafts[room.id]}`
                  : getReadableMessageBody(room.lastMessage)}
              </span>
            </span>
          </span>
          {room.membership === 'invite' ? (
            <span className="invite-actions">
              <span
                className="mini-action"
                onClick={(evt) => {
                  evt.stopPropagation();
                  onAccept(room.id);
                }}
              >
                <Check size={14} />
              </span>
              <span
                className="mini-action danger"
                onClick={(evt) => {
                  evt.stopPropagation();
                  onReject(room.id);
                }}
              >
                <X size={14} />
              </span>
            </span>
          ) : (
            room.unread > 0 && <span className={room.highlight > 0 ? 'unread hot' : 'unread'}>{room.unread}</span>
          )}
        </button>
      ))}
    </div>
  );
}

type FavoritePanelFilter = 'all' | 'rooms' | 'messages' | 'images' | 'videos' | 'audio' | 'files';
type FavoriteDateFilter = 'all' | 'today' | 'week' | 'month';

const favoriteFilterLabels: Record<FavoritePanelFilter, string> = {
  all: '全部',
  rooms: '房间',
  messages: '文字',
  images: '图片',
  videos: '视频',
  audio: '音频',
  files: '文件',
};

const favoriteDateLabels: Record<FavoriteDateFilter, string> = {
  all: '全部时间',
  today: '今天',
  week: '7 ',
  month: '30 ',
};

const getFavoriteMessageKind = (message: ChatMessage): FavoritePanelFilter => {
  if (!message.attachment) return 'messages';
  if (message.attachment.kind === 'image') return 'images';
  if (message.attachment.kind === 'video') return 'videos';
  if (message.attachment.kind === 'audio') return 'audio';
  return 'files';
};

const getFavoriteMessageKindLabel = (message: ChatMessage): string => {
  if (!message.attachment) return '文本';
  if (message.attachment.kind === 'image') return '图片';
  if (message.attachment.kind === 'video') return '视频';
  if (message.attachment.kind === 'audio') return '音频';
  return '文件';
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
    case 'rooms':
      return <FolderOpen size={14} />;
    case 'images':
      return <ImageIcon size={14} />;
    case 'videos':
      return <Play size={14} />;
    case 'audio':
      return <Volume2 size={14} />;
    case 'files':
      return <FileUp size={14} />;
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

  return (
    <button className="favorite-attachment-thumb" type="button" onClick={onPreview} aria-label={`预览${label}`}>
      {attachment.kind === 'image' && previewSrc ? (
        <AuthenticatedImage
          src={previewSrc}
          fallbackSrc={fallbackSrc}
          accessToken={accessToken}
          encryptedFile={attachment.previewEncryptedFile ?? attachment.encryptedFile}
          mimeType={attachment.previewMimeType ?? attachment.mimeType}
          alt={attachment.name ?? message.body}
        />
      ) : attachment.kind === 'video' && previewSrc ? (
        <>
          <AuthenticatedImage
            src={previewSrc}
            fallbackSrc={fallbackSrc}
            accessToken={accessToken}
            encryptedFile={attachment.previewEncryptedFile ?? attachment.encryptedFile}
            mimeType={attachment.previewMimeType ?? attachment.mimeType}
            alt={attachment.name ?? message.body}
          />
          <span>
            <Play size={16} />
          </span>
        </>
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
  onOpenMessage,
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
  onOpenMessage: (roomId: string, eventId: string) => void;
  onPreviewAttachment: (message: ChatMessage) => void;
  onToggleRoom: (roomId: string) => void;
  onToggleMessage: (message: ChatMessage) => void;
  onCreate: () => void;
  onExplore: () => void;
}) {
  const [filter, setFilter] = useState<FavoritePanelFilter>('all');
  const [dateFilter, setDateFilter] = useState<FavoriteDateFilter>('all');
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const normalizedQuery = query.trim().toLowerCase();
  const imageMessages = messages.filter(({ message }) => getFavoriteMessageKind(message) === 'images');
  const videoMessages = messages.filter(({ message }) => getFavoriteMessageKind(message) === 'videos');
  const audioMessages = messages.filter(({ message }) => getFavoriteMessageKind(message) === 'audio');
  const fileMessages = messages.filter(({ message }) => getFavoriteMessageKind(message) === 'files');
  const totalUnread = rooms.reduce((count, room) => count + room.unread, 0);
  const favoriteCount = messages.length;
  const showRooms = filter === 'all' || filter === 'rooms';
  const showMessages = filter !== 'rooms';
  const isLocalFavoriteMessage = (message: ChatMessage): boolean =>
    favoriteMessageIds[message.roomId]?.includes(message.id) ?? false;
  const visibleRooms = rooms.filter((room) => {
    if (!matchesFavoriteDate(room.lastTs, dateFilter)) return false;
    if (!normalizedQuery) return true;
    return `${room.name} ${room.topic ?? ''} ${room.canonicalAlias ?? ''}`.toLowerCase().includes(normalizedQuery);
  });
  const visibleMessages = messages.filter(({ room, message }) => {
    if (filter !== 'all' && filter !== getFavoriteMessageKind(message)) return false;
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

  return (
    <div className="favorites-panel">
      <header className="favorites-hero">
        <div>
          <p className="eyebrow">Favorites</p>
          <h2>收藏</h2>
          <span>房间、消息和附件集中在这</span>
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
            <strong>{imageMessages.length + videoMessages.length + audioMessages.length + fileMessages.length}</strong>
            <small>闄勪欢</small>
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
        {(['all', 'rooms', 'messages', 'images', 'videos', 'audio', 'files'] as FavoritePanelFilter[]).map((item) => (
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
          <span>{selectedIds.length} 条已</span>
          <button type="button" onClick={clearSelected}>取消</button>
          <button className="danger" type="button" onClick={removeSelected}>移出收藏</button>
        </div>
      )}

      <div className="favorites-scroll">
        {!hasFavorites && (
          <section className="favorites-empty-state">
            <Star size={24} />
            <strong>还没有收藏</strong>
            <span>你收藏的房间、消息、图片、语音和文件会按类型归档</span>
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

        {hasFavorites && showRooms && (visibleRooms.length > 0 || filter === 'rooms') && (
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

        {hasFavorites && showMessages && (visibleMessages.length > 0 || filter !== 'all') && (
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
                  const openRoomId = message.favoriteSource?.roomId ?? room.id;
                  const openEventId = message.favoriteSource?.eventId ?? message.id;

                  return (
                    <article className="favorite-message-card" key={`${message.roomId}-${message.id}`}>
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
                      <button className="favorite-message-main" type="button" onClick={() => onOpenMessage(openRoomId, openEventId)}>
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
  const first = items[0];
  if (!first) return null;

  return (
    <section className="pinned-bar">
      <button className="pinned-summary" onClick={() => onOpen(first.id)}>
        <Pin size={16} />
        <span>
          <strong>{first.senderName ?? '置顶消息'}</strong>
          <small>{getReadableMessageBody(first.body)}</small>
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
  onPickCustom: (item: CustomEmojiItem) => void;
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
                      onClick={() => onPickCustom(item)}
                    >
                      <AuthenticatedImage
                        src={item.authUrl ?? item.url}
                        fallbackSrc={item.url}
                        accessToken={accessToken}
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
}: {
  emojis: string[];
  customItems: CustomEmojiItem[];
  accessToken?: string;
  onPick: (emoji: string) => void;
  onPickCustom: (item: CustomEmojiItem) => void;
}) {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<EmojiTrayTab>('emoji');
  const [activeEmojiCollectionId, setActiveEmojiCollectionId] = useState('recent');
  const [activeStickerCollectionId, setActiveStickerCollectionId] = useState<string>();
  const collectionStripRef = useRef<HTMLDivElement | null>(null);
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
        cover: items[0],
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

  const activeCollections = activeTab === 'emoji' ? emojiCollections : stickerCollections;
  const activeCollectionId =
    activeTab === 'emoji' ? activeEmojiCollectionId : activeStickerCollectionId;
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
    if (activeTab === 'emoji') {
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
      <div className={activeTab === 'sticker' ? 'sticker-grid sticker-panel-grid' : 'emoji-pack-grid'}>
        {activeCollection.items.map((item) => (
          <button
            key={item.id}
            type="button"
            title={`${item.packName} / ${item.shortcode}`}
            onClick={() => onPickCustom(item)}
          >
            <AuthenticatedImage
              src={item.authUrl ?? item.url}
              fallbackSrc={item.url}
              accessToken={accessToken}
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
            className={activeTab === 'emoji' ? 'active' : ''}
            onClick={() => setActiveTab('emoji')}
          >
            表情
          </button>
          <button
            type="button"
            className={activeTab === 'sticker' ? 'active' : ''}
            onClick={() => setActiveTab('sticker')}
          >
            贴纸
          </button>
        </div>
        <small>{activeCount}</small>
      </div>

      {customItems.length > 0 && (
        <label className="emoji-search-field">
          <Search size={14} />
          <input
            value={query}
            placeholder={activeTab === 'emoji' ? '搜索表情包或短码' : '搜索贴纸包或短码'}
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
          aria-label={activeTab === 'emoji' ? '表情分类' : '贴纸分类'}
          onScroll={updateCollectionStripState}
          onWheel={handleCollectionStripWheel}
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
                onClick={() => handlePickCollection(collection.id)}
              >
                {collection.kind === 'pack' && collection.cover ? (
                  <AuthenticatedImage
                    className="emoji-collection-thumb"
                    src={collection.cover.authUrl ?? collection.cover.url}
                    fallbackSrc={collection.cover.url}
                    accessToken={accessToken}
                    alt={collection.name}
                  />
                ) : (
                  <span className="emoji-collection-label">{collection.name.slice(0, 1)}</span>
                )}
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
          {activeCollection?.name ?? (activeTab === 'emoji' ? '表情' : '贴纸')}
          {activeCount > 0 && <small>{activeCount}</small>}
        </span>
        {renderCollectionItems()}
      </div>
    </div>
  );
}

function MediaFallback({ label }: { label: string }) {
  return (
    <span className="message-media-fallback">
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
}: {
  src?: string;
  fallbackSrc?: string;
  accessToken?: string;
  encryptedFile?: EncryptedMediaFile;
  mimeType?: string;
  alt: string;
  className?: string;
}) {
  const mediaState = useAuthenticatedMediaState(src, accessToken, fallbackSrc, encryptedFile, mimeType);
  const resolvedSrc = mediaState.resolvedSrc;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [resolvedSrc]);

  if (!resolvedSrc) {
    return <MediaFallback label={mediaState.loading ? '图片加载中...' : '图片暂不可预览'} />;
  }

  if (failed) return <MediaFallback label="图片暂不可预览" />;

  return (
    <img
      className={className}
      src={resolvedSrc}
      alt={alt}
      onLoad={() => setFailed(false)}
      onError={() => setFailed(true)}
    />
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
}) {
  const previewState = useAuthenticatedMediaState(
    previewSrc,
    accessToken,
    previewFallbackSrc,
    previewEncryptedFile,
    previewMimeType
  );
  const fullState = useAuthenticatedMediaState(src, accessToken, fallbackSrc, encryptedFile, mimeType);
  const [fullLoaded, setFullLoaded] = useState(false);
  const [fullFailed, setFullFailed] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);

  useEffect(() => {
    setFullLoaded(false);
    setFullFailed(false);
    setPreviewFailed(false);
  }, [previewSrc, src]);

  const canShowPreview = Boolean(previewState.resolvedSrc) && !previewFailed;
  const canShowFull = Boolean(fullState.resolvedSrc) && !fullFailed;
  const visibleSrc = canShowFull ? fullState.resolvedSrc : canShowPreview ? previewState.resolvedSrc : undefined;
  if (!visibleSrc) {
    return (
      <MediaFallback
        label={previewState.loading || fullState.loading ? '图片加载中...' : '图片暂不可预览'}
      />
    );
  }

  const overlayLabel = fullFailed
    ? '原图加载失败，已显示预览'
    : fullState.loading || !fullLoaded
      ? '正在加载原图'
      : undefined;

  return (
    <div className="progressive-media-frame">
      {canShowPreview && (
        <img
          className={`${className ?? ''} progressive-media-layer preview${fullLoaded && !fullFailed ? ' hidden' : ''}`.trim()}
          src={previewState.resolvedSrc}
          alt=""
          onError={() => setPreviewFailed(true)}
        />
      )}
      {canShowFull && (
        <img
          className={`${className ?? ''} progressive-media-layer full${fullLoaded && !fullFailed ? ' ready' : ''}`.trim()}
          src={fullState.resolvedSrc}
          alt=""
          onLoad={() => {
            setFullLoaded(true);
            setFullFailed(false);
          }}
          onError={() => setFullFailed(true)}
        />
      )}
      {overlayLabel && (
        <div className={`media-preview-loading-overlay${fullFailed ? ' error' : ''}`}>
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
  const posterState = useAuthenticatedMediaState(
    previewSrc,
    accessToken,
    previewFallbackSrc,
    previewEncryptedFile,
    previewMimeType
  );
  const videoState = useAuthenticatedMediaState(src, accessToken, fallbackSrc, encryptedFile, mimeType);
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    setVideoReady(false);
    setVideoFailed(false);
  }, [previewSrc, src]);

  if (!posterState.resolvedSrc && !videoState.resolvedSrc) {
    return (
      <MediaFallback
        label={posterState.loading || videoState.loading ? '视频加载中...' : '视频暂不可预览'}
      />
    );
  }

  const overlayLabel = videoFailed
    ? '视频加载失败，已显示封面'
    : videoState.loading || !videoReady
      ? '正在加载视频'
      : undefined;

  return (
    <div className="progressive-video-shell">
      {posterState.resolvedSrc && (!videoReady || videoFailed) && (
        <img className="media-preview-poster" src={posterState.resolvedSrc} alt="" />
      )}
      {videoState.resolvedSrc && !videoFailed && (
        <video
          className={className}
          src={videoState.resolvedSrc}
          controls
          playsInline
          poster={posterState.resolvedSrc}
          onLoadedData={() => setVideoReady(true)}
          onCanPlay={() => setVideoReady(true)}
          onError={() => setVideoFailed(true)}
          style={{ opacity: videoReady ? 1 : 0 }}
        />
      )}
      {overlayLabel && (
        <div className={`media-preview-loading-overlay${videoFailed ? ' error' : ''}`}>
          <small>{overlayLabel}</small>
        </div>
      )}
    </div>
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [audioError, setAudioError] = useState('');
  const resolvedSrc = useAuthenticatedMediaUrl(src, accessToken, fallbackSrc, encryptedFile, mimeType);

  useEffect(() => {
    setPlaying(false);
    setDuration(0);
    setCurrentTime(0);
    setAudioError('');
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
      <button
        className="audio-play"
        type="button"
        onClick={handleToggle}
        aria-label={playing ? '暂停音频' : '播放音频'}
        disabled={!resolvedSrc}
      >
        {playing ? <Pause size={17} /> : <Play size={17} />}
      </button>
      <div className="audio-info">
        <strong>{title || '音频消息'}</strong>
        <input
          type="range"
          min="0"
          max={duration || (durationMs ?? 0) / 1000 || currentTime || 0}
          step="0.1"
          value={Math.min(currentTime, duration || (durationMs ?? 0) / 1000 || currentTime)}
          onChange={handleSeek}
          aria-label="音频进度"
        />
        <span>
          {formatDuration(currentTime)} / {formatDuration(duration || (durationMs ?? 0) / 1000)}
        </span>
        <div className="audio-control-row">
          <div className="audio-rate-row" aria-label="播放速度">
            {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
              <button
                key={rate}
                className={playbackRate === rate ? 'active' : ''}
                type="button"
                onClick={() => setPlaybackRate(rate)}
              >
                {rate}x
              </button>
            ))}
          </div>
          <label className="audio-volume-control">
            <button
              type="button"
              aria-label={muted ? '取消静音' : '闈欓煶'}
              onClick={() => setMuted((value) => !value)}
            >
              {muted || volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={muted ? 0 : volume}
              aria-label="音量"
              onChange={(evt) => {
                const nextVolume = Number(evt.target.value);
                setVolume(nextVolume);
                setMuted(nextVolume === 0);
              }}
            />
          </label>
        </div>
        {audioError && <em>{audioError}</em>}
      </div>
      {resolvedSrc && (
        <a className="audio-open" href={resolvedSrc} target="_blank" rel="noreferrer" download={title}>
          <Eye size={15} />
        </a>
      )}
      {onTranscribe && (
        <button className="audio-transcribe" type="button" onClick={onTranscribe}>
          <Volume2 size={15} />
          {transcription?.status === 'loading' ? '转写中' : transcription?.status === 'success' ? '已转写' : '转文字'}
        </button>
      )}
      {transcription && (
        <div className={transcription.status === 'error' ? 'audio-transcript error' : 'audio-transcript'}>
          {transcription.status === 'loading'
            ? `${transcription.detail ?? '正在读取并识别这条语音...'}${transcription.text ? ` ${transcription.text}` : ''}`
            : transcription.status === 'success'
              ? transcription.text
              : transcription.error}
        </div>
      )}
    </div>
  );
}

function MoreNavSheet({
  activeView,
  unreadByView,
  onPick,
  onClose,
}: {
  activeView: PrimaryView;
  unreadByView: Record<PrimaryView, number>;
  onPick: (view: PrimaryView) => void;
  onClose: () => void;
}) {
  return (
    <div className="sheet-backdrop">
      <section className="sheet compact-sheet">
        <header className="sheet-header">
          <div>
            <p className="eyebrow">Navigation</p>
            <h2>更多入口</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="关闭">
            <X size={20} />
          </button>
        </header>

        <div className="more-nav-grid">
          {moreNavViews.map((view) => (
            <button
              key={view}
              className={activeView === view ? 'more-nav-item active' : 'more-nav-item'}
              onClick={() => onPick(view)}
            >
              {viewIcon(view)}
              <span>
                <strong>{viewLabels[view]}</strong>
                <small>
                  {unreadByView[view] > 0 ? `${unreadByView[view]} 个待处理` : '已同步'}
                </small>
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function SecuritySheet({
  status,
  passphrase,
  progress,
  message,
  onPassphraseChange,
  onRestoreFromSecretStorage,
  onRestoreWithPassphrase,
  onClose,
}: {
  status: CryptoStatus;
  passphrase: string;
  progress: string;
  message?: { type: 'success' | 'error'; text: string };
  onPassphraseChange: (value: string) => void;
  onRestoreFromSecretStorage: () => void | Promise<void>;
  onRestoreWithPassphrase: () => void | Promise<void>;
  onClose: () => void;
}) {
  const busy = Boolean(progress);
  const statusLabel = (value?: boolean) => {
    if (value === undefined) return '未知';
    return value ? '正常' : '需要处';
  };

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
            <small>鍔犲瘑寮曟搸</small>
            <strong>{status.cryptoReady ? '可用' : '未启用'}</strong>
          </span>
          <span>
            <small>瀹夊叏瀛樺偍</small>
            <strong>{statusLabel(status.secretStorageReady)}</strong>
          </span>
          <span>
            <small>服务端备</small>
            <strong>{status.backupVersion ?? status.activeBackupVersion ?? '未发'}</strong>
          </span>
          <span>
            <small>备份信任</small>
            <strong>{statusLabel(status.backupTrusted)}</strong>
          </span>
        </div>

        <div className="security-copy">
          <KeyRound size={22} />
          <span>
            <strong>无法解密时先恢复密钥</strong>
            <small>如果旧设备或 Element 已开启密钥备份，可以从安全存储或恢复密钥导入历史会话密钥</small>
          </span>
        </div>

        {progress && <p className="security-progress">{progress}</p>}
        {message && (
          <p className={message.type === 'error' ? 'security-message error' : 'security-message success'}>
            {message.text}
          </p>
        )}
        {!status.cryptoReady && (
          <p className="security-message error">当前客户端还没有启用端到端加密，无法恢复密钥</p>
        )}

        <div className="security-actions">
          <button
            className="primary-button"
            type="button"
            onClick={onRestoreFromSecretStorage}
            disabled={!status.cryptoReady || busy}
          >
            <Shield size={17} />
            从安全存储恢复          </button>
          <label>
            恢复密钥或备份口令            <input
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
            disabled={!status.cryptoReady || busy || !passphrase.trim()}
          >
            <KeyRound size={17} />
            使用恢复密钥恢复
          </button>
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
  '.message-select-toggle',
  '.avatar-button',
  '.message-sender-button',
  '.reply-preview',
  '.file-chip',
  '.audio-player button',
  '.audio-player input',
].join(', ');

const shouldIgnoreMessageGesture = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement && Boolean(target.closest(messageGestureStopSelector));

function MessageBubble({
  message,
  favorite,
  highlighted,
  selectionMode,
  selected,
  forwardable,
  mediaAccessToken,
  currentUserProfile,
  readReceiptAvatarCount,
  audioTranscription,
  onToggleSelection,
  onFavorite,
  onReply,
  onOpenReply,
  onInfo,
  onEdit,
  onRedact,
  onCopy,
  onCopyLink,
  onTogglePin,
  onForward,
  onPreviewAttachment,
  onTranscribeAudio,
  onOpenUserProfile,
  onReact,
}: {
  message: ChatMessage;
  favorite: boolean;
  highlighted: boolean;
  selectionMode: boolean;
  selected: boolean;
  forwardable: boolean;
  mediaAccessToken?: string;
  currentUserProfile?: OwnProfile;
  readReceiptAvatarCount: number;
  audioTranscription?: AudioTranscriptionState;
  onToggleSelection: () => void;
  onFavorite: () => void;
  onReply: () => void;
  onOpenReply: (eventId: string) => void;
  onInfo: () => void;
  onEdit: () => void;
  onRedact: () => void;
  onCopy: () => void;
  onCopyLink: () => void;
  onTogglePin: () => void;
  onForward: () => void;
  onPreviewAttachment: () => void;
  onTranscribeAudio: () => void;
  onOpenUserProfile?: () => void;
  onReact: (key: string) => void;
}) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const articleRef = useRef<HTMLElement>(null);
  const gestureStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    swipeReady: boolean;
    longPressTriggered: boolean;
  }>();
  const longPressTimerRef = useRef<number>();
  const skipNextClickRef = useRef(false);
  const runAndClose = (action: () => void) => {
    action();
    setActionsOpen(false);
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
  const attachmentName = attachment?.name ?? message.body;
  const showBody = Boolean(
    message.body && (!attachment || message.body !== attachmentName)
  );
  const stickerLikeImage = attachment?.kind === 'image' && isStickerLikeMessage(message);
  const attachmentPreviewSrc = attachment
    ? attachment.authUrl ?? attachment.url ?? attachment.authDownloadUrl ?? attachment.downloadUrl
    : undefined;
  const attachmentPreviewFallbackSrc = attachment
    ? attachment.url ?? attachment.downloadUrl
    : undefined;
  const attachmentFullSrc = attachment
    ? attachment.authDownloadUrl ?? attachment.downloadUrl ?? attachment.authUrl ?? attachment.url
    : undefined;
  const attachmentFullFallbackSrc = attachment
    ? attachment.downloadUrl ?? attachment.url
    : undefined;
  const visibleReadReceiptCount = clampReadReceiptAvatarCount(readReceiptAvatarCount);
  const visibleReadReceipts = message.mine ? message.readReceipts.slice(0, visibleReadReceiptCount) : [];
  const readReceiptOverflow = Math.max(message.readReceipts.length - visibleReadReceipts.length, 0);

  useEffect(() => {
    if (selectionMode) {
      setActionsOpen(false);
    }
  }, [selectionMode]);

  useEffect(() => {
    if (!actionsOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (articleRef.current?.contains(event.target as Node)) return;
      setActionsOpen(false);
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [actionsOpen]);

  useEffect(() => () => clearLongPressTimer(), []);

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (selectionMode || event.button !== 0 || shouldIgnoreMessageGesture(event.target)) return;

    gestureStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      swipeReady: false,
      longPressTriggered: false,
    };

    clearLongPressTimer();
    longPressTimerRef.current = window.setTimeout(() => {
      const gesture = gestureStateRef.current;
      if (!gesture || gesture.pointerId !== event.pointerId || !forwardable) return;

      gesture.longPressTriggered = true;
      skipNextClickRef.current = true;
      setSwipeOffset(0);
      setActionsOpen(false);
      void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
      onForward();
    }, 420);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const gesture = gestureStateRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId || gesture.longPressTriggered) return;

    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;

    if (Math.abs(deltaY) > 18 && Math.abs(deltaY) >= Math.abs(deltaX)) {
      resetGesture();
      return;
    }

    if (!forwardable || deltaX <= 0 || Math.abs(deltaX) < Math.abs(deltaY)) {
      if (deltaX < -10) resetGesture();
      return;
    }

    clearLongPressTimer();
    gesture.swipeReady = deltaX > 70;
    setSwipeOffset(Math.max(0, Math.min(deltaX, 78)));
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    const gesture = gestureStateRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) {
      resetGesture();
      return;
    }

    if (gesture.swipeReady && forwardable) {
      skipNextClickRef.current = true;
      setActionsOpen(false);
      void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
      onForward();
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
    if (!selectionMode || shouldIgnoreMessageGesture(event.target)) return;
    event.preventDefault();
    onToggleSelection();
  };

  const handleContextMenu = (event: ReactMouseEvent<HTMLElement>) => {
    if (selectionMode || shouldIgnoreMessageGesture(event.target)) return;
    event.preventDefault();
    setActionsOpen((open) => !open);
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
      className={`${message.mine ? 'message mine' : 'message'}${highlighted ? ' highlighted' : ''}${actionsOpen ? ' actions-open' : ''}${selectionMode ? ' selecting' : ''}${selected ? ' selected' : ''}${!forwardable ? ' not-forwardable' : ''}`}
      data-message-id={message.id}
      data-swipe-ready={swipeOffset > 56}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={resetGesture}
      onClickCapture={handleMessageClickCapture}
      onClick={handleMessageClick}
      onContextMenu={handleContextMenu}
      style={swipeOffset > 0 ? { transform: `translateX(${swipeOffset}px)` } : undefined}
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
          ariaLabel={`查看 ${message.senderName ?? message.sender ?? '成员'} 的资料`}
          small
        />
      )}
      <div className="bubble-wrap">
        <div className="message-meta">
          {!message.mine && (
            onOpenUserProfile && !selectionMode ? (
              <button className="message-sender-button" type="button" onClick={onOpenUserProfile}>
                {message.senderName ?? message.sender}
              </button>
            ) : (
              <strong>{message.senderName ?? message.sender}</strong>
            )
          )}
          <span>{formatTime(message.timestamp)}</span>
          {message.encrypted && <Shield size={13} />}
          {message.pinned && <Pin size={13} />}
          {message.edited && <span>已编辑</span>}
        </div>
        <div className="bubble">
          {message.replyTo && (
            <button className="reply-preview" onClick={() => onOpenReply(message.replyTo!.eventId)}>
              <strong>{message.replyTo.senderName ?? '回复'}</strong>
              <span>{getReadableMessageBody(message.replyTo.body)}</span>
            </button>
          )}
          {attachment?.kind === 'image' && attachmentPreviewSrc && (
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
                previewEncryptedFile={attachment.previewEncryptedFile ?? attachment.encryptedFile}
                previewMimeType={attachment.previewMimeType ?? attachment.mimeType}
                src={attachmentFullSrc}
                fallbackSrc={attachmentFullFallbackSrc}
                accessToken={mediaAccessToken}
                encryptedFile={attachment.encryptedFile}
                mimeType={attachment.mimeType}
                alt={attachmentName}
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
              <AuthenticatedImage
                className="message-image"
                src={attachmentPreviewSrc}
                fallbackSrc={attachmentPreviewFallbackSrc}
                accessToken={mediaAccessToken}
                encryptedFile={attachment.previewEncryptedFile ?? attachment.encryptedFile}
                mimeType={attachment.previewMimeType ?? attachment.mimeType}
                alt={attachmentName}
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
          {showBody && <p>{getReadableMessageBody(message.body)}</p>}
        </div>
        {message.mine && visibleReadReceipts.length > 0 && (
          <div className="message-read-receipts" aria-label={`已读 ${message.readReceipts.length} 人`}>
            <Check size={12} />
            <div className="message-read-receipt-stack">
              {visibleReadReceipts.map((reader) => (
                <span key={reader.userId} className="message-read-receipt-avatar" title={reader.name}>
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
            <span>{message.readReceipts.length} 人已读</span>
          </div>
        )}
        <button
          className="message-menu-toggle"
          type="button"
          aria-label={actionsOpen ? '收起消息操作' : '更多消息操作'}
          aria-expanded={actionsOpen}
          onClick={() => setActionsOpen((open) => !open)}
        >
          <MoreHorizontal size={17} />
        </button>
        <div className="message-actions">
          <button onClick={() => runAndClose(onReply)}>
            <Reply size={14} />
            回复
          </button>
          <button onClick={() => runAndClose(onForward)}>
            <Forward size={14} />
            转发
          </button>
          {message.canEdit && (
            <button onClick={() => runAndClose(onEdit)}>
              <Edit3 size={14} />
              编辑
            </button>
          )}
          <div className="quick-reactions" aria-label="快速回">
            <SmilePlus size={14} />
            {quickReactionOptions.map((reaction) => (
              <button key={reaction} onClick={() => runAndClose(() => onReact(reaction))}>
                {reaction}
              </button>
            ))}
          </div>
          <button className={favorite ? 'active' : ''} onClick={() => runAndClose(onFavorite)}>
            <Star size={14} />
            收藏
          </button>
          <button className={message.pinned ? 'active' : ''} onClick={() => runAndClose(onTogglePin)}>
            {message.pinned ? <PinOff size={14} /> : <Pin size={14} />}
            {message.pinned ? '取消置顶' : '置顶'}
          </button>
          <button onClick={() => runAndClose(onCopy)}>
            <Copy size={14} />
            复制
          </button>
          <button onClick={() => runAndClose(onCopyLink)}>
            <Link2 size={14} />
            链接
          </button>
          {message.attachment && message.attachment.kind !== 'audio' && message.attachment.url && (
            <button onClick={() => runAndClose(onPreviewAttachment)}>
              <Eye size={14} />
              预览
            </button>
          )}
          {message.attachment?.kind === 'audio' && (
            <button onClick={() => runAndClose(onTranscribeAudio)}>
              <Volume2 size={14} />
              转文字            </button>
          )}
          <button onClick={() => runAndClose(onInfo)}>
            <Info size={14} />
            详情
          </button>
          {message.canRedact && (
            <button className="danger" onClick={() => runAndClose(onRedact)}>
              <Trash2 size={14} />
              撤回
            </button>
          )}
          {message.reactions.map((reaction) => (
            <button
              key={reaction.key}
              className={reaction.reactedByMe ? 'active' : ''}
              onClick={() => runAndClose(() => onReact(reaction.key))}
            >
              {reaction.key} {reaction.count}
            </button>
          ))}
        </div>
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
  message,
  room,
  favorite,
  onClose,
  onReply,
  onEdit,
  onFavorite,
  onTogglePin,
  onCopy,
  onCopyLink,
  onForward,
  onPreviewAttachment,
  onTranscribeAudio,
  onReact,
  onRedact,
}: {
  message: ChatMessage;
  room?: RoomSummary;
  favorite: boolean;
  onClose: () => void;
  onReply: () => void;
  onEdit: () => void;
  onFavorite: () => void;
  onTogglePin: () => void;
  onCopy: () => void;
  onCopyLink: () => void;
  onForward: () => void;
  onPreviewAttachment: () => void;
  onTranscribeAudio: () => void;
  onReact: (key: string) => void;
  onRedact: () => void;
}) {
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
          <p>{getReadableMessageBody(message.body)}</p>
        </div>

        <div className="message-detail-grid">
          <DetailRow label="房间" value={room?.name ?? message.roomId} />
          <DetailRow label="???" value={message.sender ?? '??'} />
          <DetailRow label="浜嬩欢 ID" value={message.id} />
          <DetailRow label="房间 ID" value={message.roomId} />
          <DetailRow label="绫诲瀷" value={message.eventType} />
          <DetailRow label="状态" value={`${message.encrypted ? '已加密' : '未加密'} · ${message.edited ? '已编辑' : '原始消息'}`} />
          {message.attachment && (
            <DetailRow
              label="闄勪欢"
              value={`${message.attachment.kind} · ${message.attachment.name ?? message.attachment.mimeType ?? '未命名'}`}
            />
          )}
        </div>

        <section className="reaction-panel">
          <div className="section-title">
            <span>回应</span>
            <strong>{message.reactions.reduce((count, reaction) => count + reaction.count, 0)}</strong>
          </div>
          <div className="reaction-picker">
            {quickReactionOptions.map((reaction) => (
              <button key={reaction} onClick={() => onReact(reaction)}>
                {reaction}
              </button>
            ))}
          </div>
          {message.reactions.length > 0 && (
            <div className="reaction-list">
              {message.reactions.map((reaction) => (
                <button
                  key={reaction.key}
                  className={reaction.reactedByMe ? 'active' : ''}
                  onClick={() => onReact(reaction.key)}
                >
                  {reaction.key} {reaction.count}
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
  onMentionMember,
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
  onMentionMember: (member: RoomMemberSummary) => void;
  onCopyMember: (member: RoomMemberSummary) => void;
  onCopyMemberLink: (member: RoomMemberSummary) => void;
  onDirectMember: (member: RoomMemberSummary) => void;
  onKickMember: (member: RoomMemberSummary) => void;
  onBanMember: (member: RoomMemberSummary) => void;
  onPreviewAvatar: (member: RoomMemberSummary) => void;
}) {
  const coverUrl = useAuthenticatedMediaUrl(member.avatarUrl, mediaAccessToken, member.avatarUrl);
  const currentMember = members.find((item) => item.id === member.id) ?? member;
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
            <h2>鐢ㄦ埛璧勬枡</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="关闭">
            <X size={20} />
          </button>
        </header>

        <section className="user-profile-hero">
          <div
            className={coverUrl ? 'user-profile-cover has-image' : 'user-profile-cover'}
            style={coverUrl ? { backgroundImage: `url("${coverUrl}")` } : undefined}
          />
          <div className="user-profile-identity">
            <div className="user-profile-avatar">
              <Avatar
                name={member.name}
                src={member.avatarUrl}
                accessToken={mediaAccessToken}
                onClick={member.avatarUrl ? () => onPreviewAvatar(member) : undefined}
                ariaLabel={`查看 ${member.name} 的头像`}
              />
            </div>
            <div>
              <h3>{member.name}</h3>
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
          <button onClick={() => onMentionMember(member)}>
            <AtSign size={16} />
            提及
          </button>
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
          {member.avatarUrl && (
            <button onClick={() => onPreviewAvatar(member)}>
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
            <DetailRow label="昵称" value={member.name} />
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
              <span>绠＄悊鎿嶄綔</span>
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
                灏佺鐢ㄦ埛
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
  onOpenMemberProfile,
  onDirectMember,
  onKickMember,
  onBanMember,
  onToggleMute,
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
  onOpenMemberProfile: (member: RoomMemberSummary) => void;
  onDirectMember: (member: RoomMemberSummary) => void;
  onKickMember: (member: RoomMemberSummary) => void;
  onBanMember: (member: RoomMemberSummary) => void;
  onToggleMute: () => void;
  onFavorite: () => void;
  onLeave: () => void;
}) {
  const [memberQuery, setMemberQuery] = useState('');
  const myPowerLevel = members.find((member) => member.id === currentUserId)?.powerLevel ?? 0;
  const canModerate = myPowerLevel >= 50;
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
            {room.memberCount} · 
          </span>
          <span>
            <Bell size={17} />
            {room.unread} 未读
          </span>
          <span>
            <Shield size={17} />
            {room.encrypted ? '???' : '???'}
          </span>
        </div>

        <div className="sheet-actions">
          <button onClick={onFavorite}>
            <Star size={17} />
            {favorite ? '取消收藏' : '收藏房间'}
          </button>
          <button onClick={onToggleMute}>
            <Bell size={17} />
            {room.muted ? '取消静音' : '闈欓煶'}
          </button>
          <button onClick={() => navigator.clipboard?.writeText(buildMatrixPermalink(room))}>
            <Copy size={17} />
            复制链接
          </button>
          <button className="danger" onClick={onLeave}>
            <DoorOpen size={17} />
            绂诲紑
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
                      {!message.available ? '未同步 · ' : ''}
                      {message.timestamp ? `${formatTime(message.timestamp)} · ` : ''}
                      {getReadableMessageBody(message.body)}
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
            <strong>{visibleMembers.length}/{members.length}</strong>
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
          {visibleMembers.slice(0, 120).map((member) => (
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
                      灏佺
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
              {(item.kind === 'image' || item.kind === 'video') && item.url ? (
                <AuthenticatedImage
                  src={item.authUrl ?? item.url}
                  fallbackSrc={item.url}
                  accessToken={mediaAccessToken}
                  encryptedFile={item.previewEncryptedFile ?? item.encryptedFile}
                  mimeType={item.previewMimeType ?? item.mimeType}
                  alt={item.name}
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
      ? media.previewEncryptedFile ?? media.encryptedFile
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
  onClose,
}: {
  media: RoomMediaItem;
  items: RoomMediaItem[];
  mediaAccessToken?: string;
  onSelect: (media: RoomMediaItem) => void;
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
      ? media.previewEncryptedFile ?? media.encryptedFile
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
  const previewableItems = useMemo(
    () => items.filter((item) => Boolean(item.authDownloadUrl ?? item.authUrl ?? item.downloadUrl ?? item.url)),
    [items]
  );
  const activeIndex = useMemo(
    () => previewableItems.findIndex((item) => item.messageId === media.messageId),
    [media.messageId, previewableItems]
  );
  const canPrev = activeIndex > 0;
  const canNext = activeIndex >= 0 && activeIndex < previewableItems.length - 1;
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
  const previewStageStyle =
    fitMode === 'actual'
      ? ({
          ['--preview-zoom' as string]: String(zoom),
          ['--preview-rotate' as string]: `${rotation}deg`,
        } as CSSProperties)
      : undefined;

  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setFitMode('fit');
  }, [media.messageId]);

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key === 'ArrowLeft' && canPrev) {
        onSelect(previewableItems[activeIndex - 1]);
      }
      if (event.key === 'ArrowRight' && canNext) {
        onSelect(previewableItems[activeIndex + 1]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, canNext, canPrev, onClose, onSelect, previewableItems]);

  const handleZoom = (delta: number) => {
    setFitMode('actual');
    setZoom((current) => Math.max(1, Math.min(4, Number((current + delta).toFixed(2)))));
  };

  const handleWheelZoom = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (media.kind !== 'image') return;
    event.preventDefault();
    handleZoom(event.deltaY < 0 ? 0.2 : -0.2);
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
              <a className="icon-button" href={directPreviewHref} target="_blank" rel="noreferrer" aria-label="打开原图或原文件">
                <FolderOpen size={18} />
              </a>
            )}
            <button className="icon-button" onClick={onClose} aria-label="关闭预览">
              <X size={20} />
            </button>
          </div>
        </header>
        {media.kind === 'image' && (
          <div className="media-preview-toolbar">
            <div className="media-preview-toolbar-group">
              <button type="button" onClick={() => handleZoom(-0.25)} disabled={zoom <= 1}>
                -
              </button>
              <button type="button" onClick={() => setFitMode((current) => (current === 'fit' ? 'actual' : 'fit'))}>
                {fitMode === 'fit' ? '1:1' : '适应'}
              </button>
              <button type="button" onClick={() => handleZoom(0.25)} disabled={zoom >= 4}>
                +
              </button>
              <button
                type="button"
                onClick={() => {
                  setFitMode('actual');
                  setRotation((current) => current - 90);
                }}
                aria-label="向左旋转"
              >
                <RotateCcw size={15} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setFitMode('actual');
                  setRotation((current) => current + 90);
                }}
                aria-label="向右旋转"
              >
                <RotateCw size={15} />
              </button>
            </div>
            <small>{fitMode === 'fit' ? '适应屏幕' : `${Math.round(zoom * 100)}%`}</small>
          </div>
        )}
        <div className="media-preview-body" onWheel={handleWheelZoom}>
          {canPrev && (
            <button
              className="media-preview-nav prev"
              type="button"
              onClick={() => onSelect(previewableItems[activeIndex - 1])}
              aria-label="上一"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          {media.kind === 'image' && (previewSrc || fullSrc) ? (
            <div
              className={fitMode === 'fit' ? 'media-preview-stage fit' : 'media-preview-stage actual'}
              style={previewStageStyle}
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
          {canNext && (
            <button
              className="media-preview-nav next"
              type="button"
              onClick={() => onSelect(previewableItems[activeIndex + 1])}
              aria-label="下一"
            >
              <ChevronRight size={20} />
            </button>
          )}
        </div>
        {previewableItems.length > 1 && (
          <div className="media-preview-strip">
            {previewableItems.map((item) => {
              const selected = item.messageId === media.messageId;
              const itemPreviewSrc = item.authUrl ?? item.url;
              return (
                <button
                  key={`${item.messageId}-${item.timestamp}`}
                  type="button"
                  className={selected ? 'media-preview-thumb active' : 'media-preview-thumb'}
                  onClick={() => onSelect(item)}
                >
                  {item.kind === 'image' && itemPreviewSrc ? (
                    <AuthenticatedImage
                      src={itemPreviewSrc}
                      fallbackSrc={item.url}
                      accessToken={mediaAccessToken}
                      encryptedFile={item.previewEncryptedFile ?? item.encryptedFile}
                      mimeType={item.previewMimeType ?? item.mimeType}
                      alt={item.name}
                    />
                  ) : item.kind === 'video' && itemPreviewSrc ? (
                    <AuthenticatedImage
                      src={itemPreviewSrc}
                      fallbackSrc={item.url}
                      accessToken={mediaAccessToken}
                      encryptedFile={item.previewEncryptedFile ?? item.encryptedFile}
                      mimeType={item.previewMimeType ?? item.mimeType}
                      alt={item.name}
                    />
                  ) : (
                    <span>{item.kind === 'audio' ? <Volume2 size={18} /> : <FileUp size={18} />}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
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
  onPickServer: (server: string) => void;
  onAddServer: (server: string) => void;
  onRemoveServer: (server: string) => void;
  onOpenJoined: (roomId: string) => void;
  onJoin: (roomIdOrAlias: string) => void;
}) {
  const [serverDraft, setServerDraft] = useState('');
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

  const renderNavSource = (source: ExploreSource) => {
    const sections = (source.navSections ?? []).filter((section) => section.cards.length > 0);
    if (sections.length === 0) {
      return (
        <div className="explore-empty">
          <Compass size={24} />
          <strong>这个导航站还没有入口</strong>
          <span>登录后的账户数据里还没有可显示的导航卡片</span>
        </div>
      );
    }

    return (
      <div className="explore-nav-sections">
        {sections.map((section) => (
          <section key={section.id} className="explore-nav-section">
            <div className="section-title">
              <span>{section.title}</span>
              <strong>{section.cards.length}</strong>
            </div>
            <div className="explore-nav-grid">
              {section.cards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  className="explore-nav-card"
                  onClick={() => window.open(card.url, '_blank', 'noopener,noreferrer')}
                >
                  <Avatar name={card.title} src={card.iconUrl} small />
                  <span>
                    <strong>{card.title}</strong>
                    <small>{card.description ?? card.url}</small>
                    {card.tags && card.tags.length > 0 && <em>{card.tags.join(' · ')}</em>}
                  </span>
                  <FolderOpen size={16} />
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  };

  const renderWebSource = (source: ExploreSource) => (
    <section className="explore-web-card">
      <div>
        <span className="explore-source-kind">网页</span>
        <strong>{source.title}</strong>
        <small>{source.value}</small>
      </div>
      <button
        type="button"
        className="primary-button compact"
        onClick={() => window.open(source.value, '_blank', 'noopener,noreferrer')}
      >
        <FolderOpen size={16} />
        打开站点
      </button>
    </section>
  );

  return (
    <div className="explore-panel">
      <header className="explore-hero">
        <div>
          <p className="eyebrow">Explore</p>
          <h2>探索</h2>
          <span>公开目录、服务器源和已加入房间</span>
        </div>
        <Compass size={24} />
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

      {selectedSource?.kind === 'nav' ? (
        renderNavSource(selectedSource)
      ) : selectedSource?.kind === 'web' ? (
        renderWebSource(selectedSource)
      ) : (
        <>

      <section className="explore-directory">
        <form className="explore-form" onSubmit={onSearch}>
          <label className="create-field">
            <span>
              <Server size={16} />
              服务器            </span>
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
              关键词            </span>
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
                  <small>{room.space ? '空间' : room.direct ? '私聊' : '群组'} · {room.memberCount} </small>
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
                    onClick={() => joinedRoom ? onOpenJoined(joinedRoom.id) : onJoin(room.alias ?? room.id)}
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
                      onClick={() => joinedRoom ? onOpenJoined(joinedRoom.id) : onJoin(room.alias ?? room.id)}
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
    </div>
  );
}

function SettingsPanel({
  session,
  deviceName,
  snapshot,
  favoriteMessageCount,
  customEmojiCount,
  ownProfile,
  profileForm,
  preferences,
  cryptoStatus,
  mediaAccessToken,
  onLogout,
  onProfileChange,
  onProfileSubmit,
  onAvatarSelected,
  onPreferencesChange,
  onOpenSecurity,
  onClearLocal,
}: {
  session?: StoredMatrixSession;
  deviceName: string;
  snapshot: MatrixSnapshot;
  favoriteMessageCount: number;
  customEmojiCount: number;
  ownProfile?: OwnProfile;
  profileForm: { displayName: string };
  preferences: AppPreferences;
  cryptoStatus: CryptoStatus;
  mediaAccessToken?: string;
  onLogout: () => void;
  onProfileChange: (value: { displayName: string }) => void;
  onProfileSubmit: (evt: FormEvent<HTMLFormElement>) => void;
  onAvatarSelected: (file: File) => void;
  onPreferencesChange: (value: AppPreferences) => void;
  onOpenSecurity: () => void;
  onClearLocal: () => void;
}) {
  const notificationPermission =
    typeof Notification === 'undefined' ? '???' : Notification.permission;
  const joinedRooms = snapshot.rooms.filter((room) => room.membership === 'join');
  const encryptedRooms = joinedRooms.filter((room) => room.encrypted).length;
  const directRooms = joinedRooms.filter((room) => room.direct).length;
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
  const backupLabel =
    cryptoStatus.backupVersion ??
    cryptoStatus.activeBackupVersion ??
    (cryptoStatus.cryptoReady ? '未检测到备份' : '加密未启用');
  const backupTrustLabel =
    cryptoStatus.backupTrusted === undefined
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

      <section className="settings-summary-grid">
        <span>
          <MessageCircle size={17} />
          <strong>{joinedRooms.length}</strong>
          <small>已加入</small>
        </span>
        <span>
          <AtSign size={17} />
          <strong>{directRooms}</strong>
          <small>私聊</small>
        </span>
        <span>
          <Shield size={17} />
          <strong>{encryptedRooms}</strong>
          <small>加密房间</small>
        </span>
        <span>
          <SmilePlus size={17} />
          <strong>{customEmojiCount}</strong>
          <small>表情贴纸</small>
        </span>
      </section>

      <section className="settings-section">
        <div className="section-title">
          <span>账号与设置</span>
        </div>
        <div className="settings-item">
          <Shield size={19} />
          <span>
            <strong>Matrix ID</strong>
            <small>{session?.userId}</small>
          </span>
        </div>
        <div className="settings-item">
          <Compass size={19} />
          <span>
            <strong>Homeserver</strong>
            <small>{session?.baseUrl}</small>
          </span>
        </div>
        <div className="settings-item">
          <Moon size={19} />
          <span>
            <strong>当前设备</strong>
            <small>{deviceName} · {session?.deviceId}</small>
          </span>
        </div>
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
              {cryptoStatus.cryptoReady ? '端到端加密可用' : '加密未启用'} · {backupLabel} · {backupTrustLabel}
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
        <div className="settings-item">
          <SmilePlus size={19} />
          <span>
            <strong>表情与贴纸</strong>
            <small>{customEmojiCount} 个可用 · 来自个人表情包和房间</small>
          </span>
        </div>
        <div className="settings-item">
          <Star size={19} />
          <span>
            <strong>收藏</strong>
            <small>{favoriteMessageCount} 条收藏消息</small>
          </span>
        </div>
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
      <h2>探索公开房间</h2>
      <p>搜索服务器目录，加入公开群组和社区空间</p>
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




