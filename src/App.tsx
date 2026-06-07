import { App as CapacitorApp } from '@capacitor/app';
import { Device } from '@capacitor/device';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import {
  Archive,
  AtSign,
  Bell,
  Check,
  ChevronLeft,
  Circle,
  Compass,
  Copy,
  DoorOpen,
  Edit3,
  Eye,
  FileUp,
  Hash,
  History,
  Image as ImageIcon,
  Info,
  Lock,
  LogOut,
  MessageCircle,
  MessageSquarePlus,
  Moon,
  Plus,
  Reply,
  Search,
  Send,
  Settings,
  Shield,
  SmilePlus,
  Sparkles,
  Star,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { MatrixClient, SyncState } from 'matrix-js-sdk';
import {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  acceptInvite,
  ChatReply,
  ChatMessage,
  createDirectRoom,
  createGroupRoom,
  createMatrixRuntime,
  editTextMessage,
  getMatrixSnapshot,
  getOwnProfile,
  getRoomMediaItems,
  getRoomMembers,
  getRoomMessages,
  getRoomTypingMembers,
  inviteUser,
  joinRoom,
  leaveRoom,
  loginWithPassword,
  markRoomRead,
  MatrixSnapshot,
  OwnProfile,
  paginateRoomMessages,
  PublicRoomSummary,
  redactMessage,
  rejectInvite,
  RoomMediaItem,
  RoomMemberSummary,
  RoomSummary,
  searchPublicRooms,
  searchLocalMessages,
  sendReplyMessage,
  sendReaction,
  sendTextMessage,
  setRoomMuted,
  updateOwnDisplayName,
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
type MobilePane = 'list' | 'chat';
type Sheet = 'new' | 'roomInfo' | undefined;
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
type AppPreferences = {
  appearance: AppearanceMode;
  density: DensityMode;
};

const defaultHomeserver = 'https://mtx01.cc';
const favoriteRoomsKey = 'ioscinny.favoriteRooms';
const favoriteMessagesKey = 'ioscinny.favoriteMessages';
const appPreferencesKey = 'ioscinny.preferences';

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
      return '同步中';
    case SyncState.Reconnecting:
      return '重连中';
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

const loadPreferences = (): AppPreferences => {
  try {
    const value = window.localStorage.getItem(appPreferencesKey);
    const parsed = value ? (JSON.parse(value) as Partial<AppPreferences>) : {};
    return {
      appearance: parsed.appearance === 'dark' ? 'dark' : 'light',
      density: parsed.density === 'compact' ? 'compact' : 'comfortable',
    };
  } catch {
    return { appearance: 'light', density: 'comfortable' };
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

const serverFromUserId = (userId?: string): string | undefined => userId?.split(':')[1];

export function App() {
  const runtimeStopRef = useRef<(() => void) | undefined>();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<Sheet>(undefined);
  const mobilePaneRef = useRef<MobilePane>('list');
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
  const [roomQuery, setRoomQuery] = useState('');
  const [messageQuery, setMessageQuery] = useState('');
  const [messageDraft, setMessageDraft] = useState('');
  const [composerMode, setComposerMode] = useState<ComposerMode>({ type: 'normal' });
  const [sending, setSending] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [deviceName, setDeviceName] = useState('iPhone');
  const [favoriteRoomIds, setFavoriteRoomIds] = useState<string[]>(() => loadStringArray(favoriteRoomsKey));
  const [favoriteMessageIds, setFavoriteMessageIds] = useState<Record<string, string[]>>(
    () => loadFavoriteMessages()
  );
  const [preferences, setPreferences] = useState<AppPreferences>(() => loadPreferences());
  const [ownProfile, setOwnProfile] = useState<OwnProfile>();
  const [profileForm, setProfileForm] = useState({ displayName: '' });
  const [roomMembers, setRoomMembers] = useState<RoomMemberSummary[]>([]);
  const [typingMembers, setTypingMembers] = useState<string[]>([]);
  const [roomMediaItems, setRoomMediaItems] = useState<RoomMediaItem[]>([]);
  const [previewMedia, setPreviewMedia] = useState<RoomMediaItem>();
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
  }, []);

  const refreshSnapshot = useCallback(
    (mx = client) => {
      if (!mx) return;
      setSnapshot(getMatrixSnapshot(mx));
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
    const source = roomBuckets[activeView as RoomListView] ?? roomBuckets.home;
    const query = roomQuery.trim().toLowerCase();
    if (!query) return source;
    return source.filter((room) =>
      `${room.name} ${room.topic ?? ''} ${room.canonicalAlias ?? ''}`.toLowerCase().includes(query)
    );
  }, [activeView, roomBuckets, roomQuery]);

  const selectedRoom = useMemo(
    () => snapshot.rooms.find((room) => room.id === selectedRoomId),
    [selectedRoomId, snapshot.rooms]
  );

  const selectedRoomMessages = useMemo(() => {
    if (!client || !selectedRoomId) return [];
    return getRoomMessages(client, selectedRoomId, messageQuery);
  }, [client, messageQuery, selectedRoomId, snapshot.version]);

  const favoriteMessageItems = useMemo(() => {
    if (!client) return [];

    return Object.entries(favoriteMessageIds).flatMap(([roomId, ids]) => {
      const room = snapshot.rooms.find((item) => item.id === roomId);
      if (!room) return [];
      const messages = getRoomMessages(client, roomId);
      return messages
        .filter((message) => ids.includes(message.id))
        .map((message) => ({ room, message }));
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

    if (selectedRoomId && visibleRooms.some((room) => room.id === selectedRoomId)) return;
    setSelectedRoomId(visibleRooms[0]?.id);
  }, [activeView, selectedRoomId, visibleRooms]);

  useEffect(() => {
    if (!client || !selectedRoomId) {
      setRoomMembers([]);
      setTypingMembers([]);
      setRoomMediaItems([]);
      return;
    }
    setRoomMembers(getRoomMembers(client, selectedRoomId));
    setRoomMediaItems(getRoomMediaItems(client, selectedRoomId));
  }, [client, selectedRoomId, snapshot.version]);

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
      return;
    }

    setRoomProfileForm({
      name: selectedRoom.name,
      topic: selectedRoom.topic ?? '',
    });
    setComposerMode({ type: 'normal' });
  }, [selectedRoom?.id]);

  useEffect(() => {
    if (!client || !selectedRoomId) return undefined;

    const refreshTyping = () => setTypingMembers(getRoomTypingMembers(client, selectedRoomId));
    refreshTyping();
    const interval = window.setInterval(refreshTyping, 2500);
    return () => window.clearInterval(interval);
  }, [client, selectedRoomId, snapshot.version]);

  useEffect(() => {
    timelineRef.current?.scrollTo({
      top: timelineRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [selectedRoomId, selectedRoomMessages.length]);

  useEffect(() => {
    saveStringArray(favoriteRoomsKey, favoriteRoomIds);
  }, [favoriteRoomIds]);

  useEffect(() => {
    saveFavoriteMessages(favoriteMessageIds);
  }, [favoriteMessageIds]);

  useEffect(() => {
    savePreferences(preferences);
  }, [preferences]);

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
    setSelectedRoomId(roomId);
    setMobilePane('chat');
    setMessageQuery('');
    setComposerMode({ type: 'normal' });
    setMessageDraft('');
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

      if (composerMode.type === 'edit') {
        await editTextMessage(client, selectedRoom.id, composerMode.message.id, body);
      } else if (composerMode.type === 'reply') {
        const replyTo: ChatReply = {
          eventId: composerMode.message.id,
          senderName: composerMode.message.senderName ?? composerMode.message.sender,
          body: composerMode.message.body,
        };
        await sendReplyMessage(client, selectedRoom.id, replyTo, body);
      } else {
        await sendTextMessage(client, selectedRoom.id, body);
      }

      setComposerMode({ type: 'normal' });
      await Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
      refreshSnapshot();
    } catch (err) {
      setMessageDraft(body);
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

  const handleCopyMessage = async (message: ChatMessage) => {
    await navigator.clipboard?.writeText(message.body);
    setNotice('消息已复制');
  };

  const handleEditMessage = (message: ChatMessage) => {
    setComposerMode({ type: 'edit', message });
    setMessageDraft(message.body);
  };

  const handleRedactMessage = async (message: ChatMessage) => {
    if (!client) return;
    await runAction(() => redactMessage(client, message.roomId, message.id), '消息已撤回');
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
    }, '完成');
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

  const handlePublicSearch = async (evt?: FormEvent<HTMLFormElement>) => {
    evt?.preventDefault();
    if (!client) return;

    setPublicLoading(true);
    setError(undefined);
    try {
      const rooms = await searchPublicRooms(client, publicSearch);
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

  return (
    <main className={`app-frame mobile-${mobilePane} theme-${preferences.appearance} density-${preferences.density}`}>
      <aside className="rail">
        <div className="rail-brand">
          <Sparkles size={22} />
        </div>
        <nav className="rail-nav" aria-label="主导航">
          {(['home', 'direct', 'rooms', 'spaces', 'invites', 'favorites', 'explore', 'settings'] as PrimaryView[]).map(
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
        <header className="pane-header">
          <div>
            <p className="eyebrow">Starfire</p>
            <h1>{viewLabels[activeView]}</h1>
          </div>
          <button className="icon-button strong" onClick={() => setSheet('new')} aria-label="新建">
            <Plus size={20} />
          </button>
        </header>

        <div className="account-card">
          <Avatar name={session?.userId ?? 'Me'} />
          <div className="account-meta">
            <strong>{session?.userId}</strong>
            <span>{syncLabel(syncState)} · {deviceName}</span>
          </div>
        </div>

        {activeView !== 'explore' && activeView !== 'settings' && (
          <>
            <label className="search-field">
              <Search size={17} />
              <input
                value={roomQuery}
                placeholder="搜索会话、别名、主题"
                onChange={(evt) => setRoomQuery(evt.target.value)}
              />
            </label>
            <div className="room-list-stack">
              <RoomList
                rooms={visibleRooms}
                selectedRoomId={selectedRoomId}
                favoriteRoomIds={favoriteRoomIds}
                onSelectRoom={handleSelectRoom}
                onAccept={(roomId) =>
                  client && runAction(() => acceptInvite(client, roomId), '已加入房间')
                }
                onReject={(roomId) =>
                  client && runAction(() => rejectInvite(client, roomId), '已拒绝邀请')
                }
              />
              {activeView === 'favorites' && (
                <FavoriteMessageDigest
                  items={favoriteMessageItems}
                  onOpen={(roomId) => handleSelectRoom(roomId)}
                />
              )}
              {localSearchResults.length > 0 && (
                <LocalSearchDigest
                  results={localSearchResults}
                  onOpen={(roomId) => handleSelectRoom(roomId)}
                />
              )}
            </div>
          </>
        )}

        {activeView === 'explore' && (
          <ExplorePanel
            publicSearch={publicSearch}
            publicRooms={publicRooms}
            publicLoading={publicLoading}
            onChange={setPublicSearch}
            onSearch={handlePublicSearch}
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
            onLogout={handleLogout}
            ownProfile={ownProfile}
            profileForm={profileForm}
            preferences={preferences}
            onProfileChange={setProfileForm}
            onProfileSubmit={handleProfileSubmit}
            onPreferencesChange={setPreferences}
            onClearLocal={() => {
              window.localStorage.removeItem(favoriteRoomsKey);
              window.localStorage.removeItem(favoriteMessagesKey);
              setFavoriteRoomIds([]);
              setFavoriteMessageIds({});
              setNotice('本地偏好已清空');
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
              <Avatar name={selectedRoom.name} src={selectedRoom.avatarUrl} />
              <div className="chat-title">
                <h2>{selectedRoom.name}</h2>
                <span>
                  {selectedRoom.direct ? '私聊' : selectedRoom.space ? '空间' : '群组'} · {selectedRoom.memberCount} 人
                  {selectedRoom.encrypted ? ' · E2EE' : ''}
                </span>
              </div>
              <button
                className={favoriteRoomIds.includes(selectedRoom.id) ? 'icon-button active' : 'icon-button'}
                onClick={() => toggleFavoriteRoom(selectedRoom.id)}
                aria-label="收藏房间"
              >
                <Star size={19} />
              </button>
              <button className="icon-button" onClick={() => setSheet('roomInfo')} aria-label="房间信息">
                <Info size={19} />
              </button>
            </header>

            <div className="chat-tools">
              <label className="search-field slim">
                <Search size={16} />
                <input
                  value={messageQuery}
                  placeholder="在当前房间搜索消息"
                  onChange={(evt) => setMessageQuery(evt.target.value)}
                />
              </label>
              <button
                className="tool-button"
                onClick={() => client && runAction(() => markRoomRead(client, selectedRoom.id), '已标记为已读')}
              >
                <Check size={16} />
                已读
              </button>
            </div>

            {error && <button className="message-box danger inline" type="button" onClick={() => setError(undefined)}>{error}</button>}
            {notice && <button className="message-box success inline" type="button" onClick={() => setNotice(undefined)}>{notice}</button>}

            <div className="timeline" ref={timelineRef}>
              <button className="load-older" onClick={handleLoadOlder} disabled={loadingOlder}>
                <History size={15} />
                {loadingOlder ? '加载中' : '加载更早消息'}
              </button>
              {selectedRoomMessages.length === 0 ? (
                <EmptyState
                  icon={<MessageCircle size={30} />}
                  title={messageQuery ? '没有匹配消息' : '这里还没有消息'}
                  copy={messageQuery ? '换一个关键词试试。' : '发出第一条消息，或者等待同步更多历史记录。'}
                />
              ) : (
                selectedRoomMessages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    favorite={favoriteMessageIds[message.roomId]?.includes(message.id) ?? false}
                    onFavorite={() => toggleFavoriteMessage(message)}
                    onReply={() => {
                      setComposerMode({ type: 'reply', message });
                      setMessageDraft('');
                    }}
                    onEdit={() => handleEditMessage(message)}
                    onRedact={() => handleRedactMessage(message)}
                    onCopy={() => handleCopyMessage(message)}
                    onReact={(key) =>
                      client &&
                      runAction(() => sendReaction(client, message.roomId, message.id, key), '已添加回应')
                    }
                  />
                ))
              )}
            </div>

            <form className="composer" onSubmit={handleSendMessage}>
              {typingMembers.length > 0 && (
                <div className="typing-line">
                  {typingMembers.slice(0, 3).join('、')} 正在输入
                </div>
              )}
              {composerMode.type !== 'normal' && (
                <div className="composer-context">
                  <span>
                    {composerMode.type === 'edit' ? '编辑消息' : `回复 ${composerMode.message.senderName ?? '消息'}`}
                    <small>{composerMode.message.body}</small>
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
              <input ref={fileInputRef} type="file" hidden onChange={handleFileSelected} />
              <button
                className="icon-button"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="发送附件"
              >
                <FileUp size={20} />
              </button>
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
        {(['home', 'direct', 'rooms', 'spaces', 'invites', 'favorites', 'explore', 'settings'] as PrimaryView[]).map((view) => (
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
      </nav>

      {sheet === 'new' && (
        <NewConversationSheet
          createForm={createForm}
          currentUserServer={currentUserServer}
          onChange={setCreateForm}
          onSubmit={handleCreateSubmit}
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
          onClose={() => setSheet(undefined)}
          onInvite={handleInviteSubmit}
          onProfileChange={setRoomProfileForm}
          onProfileSubmit={handleRoomProfileSubmit}
          onPreviewMedia={setPreviewMedia}
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

      {previewMedia && (
        <MediaPreview media={previewMedia} onClose={() => setPreviewMedia(undefined)} />
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

function Avatar({ name, src, small = false }: { name: string; src?: string; small?: boolean }) {
  return (
    <div className={small ? 'avatar small' : 'avatar'}>
      {src ? <img src={src} alt="" /> : <span>{initials(name)}</span>}
    </div>
  );
}

function RoomList({
  rooms,
  selectedRoomId,
  favoriteRoomIds,
  onSelectRoom,
  onAccept,
  onReject,
}: {
  rooms: RoomSummary[];
  selectedRoomId?: string;
  favoriteRoomIds: string[];
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
        copy="可以新建私聊、创建房间，或者从探索里加入公开房间。"
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
          <Avatar name={room.name} src={room.avatarUrl} />
          <span className="room-row-main">
            <span className="room-row-title">
              <strong>{room.name}</strong>
              <span>{formatTime(room.lastTs)}</span>
            </span>
            <span className="room-row-sub">
              {room.encrypted && <Lock size={12} />}
              {room.muted && <Bell size={12} />}
              {favoriteRoomIds.includes(room.id) && <Star size={12} />}
              <span>{room.lastMessage}</span>
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

function FavoriteMessageDigest({
  items,
  onOpen,
}: {
  items: Array<{ room: RoomSummary; message: ChatMessage }>;
  onOpen: (roomId: string) => void;
}) {
  return (
    <section className="favorite-digest">
      <div className="section-title">
        <span>收藏消息</span>
        <strong>{items.length}</strong>
      </div>
      {items.length === 0 ? (
        <p className="digest-empty">收藏单条消息后会出现在这里。</p>
      ) : (
        items.slice(0, 24).map(({ room, message }) => (
          <button key={message.id} className="favorite-message" onClick={() => onOpen(room.id)}>
            <span>
              <strong>{room.name}</strong>
              <small>{message.senderName ?? message.sender} · {formatTime(message.timestamp)}</small>
            </span>
            <p>{message.body}</p>
          </button>
        ))
      )}
    </section>
  );
}

function LocalSearchDigest({
  results,
  onOpen,
}: {
  results: Array<{ room: RoomSummary; message: ChatMessage }>;
  onOpen: (roomId: string) => void;
}) {
  return (
    <section className="search-digest">
      <div className="section-title">
        <span>消息结果</span>
        <strong>{results.length}</strong>
      </div>
      {results.slice(0, 30).map(({ room, message }) => (
        <button key={message.id} className="search-result" onClick={() => onOpen(room.id)}>
          <Avatar name={room.name} src={room.avatarUrl} small />
          <span>
            <strong>{room.name}</strong>
            <small>{message.senderName ?? message.sender} · {formatTime(message.timestamp)}</small>
            <p>{message.body}</p>
          </span>
        </button>
      ))}
    </section>
  );
}

function MessageBubble({
  message,
  favorite,
  onFavorite,
  onReply,
  onEdit,
  onRedact,
  onCopy,
  onReact,
}: {
  message: ChatMessage;
  favorite: boolean;
  onFavorite: () => void;
  onReply: () => void;
  onEdit: () => void;
  onRedact: () => void;
  onCopy: () => void;
  onReact: (key: string) => void;
}) {
  if (message.kind === 'system') {
    return (
      <div className="system-message">
        <span>{message.body}</span>
      </div>
    );
  }

  return (
    <article className={message.mine ? 'message mine' : 'message'}>
      {!message.mine && <Avatar name={message.senderName ?? message.sender ?? '?'} src={message.senderAvatarUrl} small />}
      <div className="bubble-wrap">
        <div className="message-meta">
          {!message.mine && <strong>{message.senderName ?? message.sender}</strong>}
          <span>{formatTime(message.timestamp)}</span>
          {message.encrypted && <Shield size={13} />}
          {message.edited && <span>已编辑</span>}
        </div>
        <div className="bubble">
          {message.replyTo && (
            <button className="reply-preview" onClick={onReply}>
              <strong>{message.replyTo.senderName ?? '回复'}</strong>
              <span>{message.replyTo.body}</span>
            </button>
          )}
          {message.attachment?.kind === 'image' && message.attachment.url && (
            <img className="message-image" src={message.attachment.url} alt={message.attachment.name ?? message.body} />
          )}
          {message.attachment?.kind === 'video' && message.attachment.url && (
            <video className="message-image" src={message.attachment.url} controls />
          )}
          {message.attachment?.kind === 'audio' && message.attachment.url && (
            <audio src={message.attachment.url} controls />
          )}
          {message.attachment?.kind === 'file' && (
            <a className="file-chip" href={message.attachment.url} target="_blank" rel="noreferrer">
              <FileUp size={17} />
              {message.attachment.name ?? message.body}
            </a>
          )}
          {message.body && <p>{message.body}</p>}
        </div>
        <div className="message-actions">
          <button onClick={onReply}>
            <Reply size={14} />
            回复
          </button>
          {message.canEdit && (
            <button onClick={onEdit}>
              <Edit3 size={14} />
              编辑
            </button>
          )}
          <button onClick={() => onReact('👍')}>
            <SmilePlus size={14} />
            回应
          </button>
          <button className={favorite ? 'active' : ''} onClick={onFavorite}>
            <Star size={14} />
            收藏
          </button>
          <button onClick={onCopy}>
            <Copy size={14} />
            复制
          </button>
          {message.canRedact && (
            <button className="danger" onClick={onRedact}>
              <Trash2 size={14} />
              撤回
            </button>
          )}
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
      </div>
    </article>
  );
}

function NewConversationSheet({
  createForm,
  currentUserServer,
  onChange,
  onSubmit,
  onClose,
}: {
  createForm: CreateFormState;
  currentUserServer?: string;
  onChange: (value: CreateFormState) => void;
  onSubmit: (evt: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) {
  return (
    <div className="sheet-backdrop">
      <section className="sheet">
        <header className="sheet-header">
          <div>
            <p className="eyebrow">Create</p>
            <h2>新会话</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="关闭">
            <X size={20} />
          </button>
        </header>

        <div className="segmented">
          {(['direct', 'group', 'join'] as const).map((mode) => (
            <button
              key={mode}
              className={createForm.mode === mode ? 'active' : ''}
              onClick={() => onChange({ ...createForm, mode })}
            >
              {mode === 'direct' ? '私聊' : mode === 'group' ? '群组' : '加入'}
            </button>
          ))}
        </div>

        <form className="stack-form" onSubmit={onSubmit}>
          {createForm.mode === 'direct' && (
            <label>
              对方 Matrix ID
              <input
                value={createForm.userId}
                autoCapitalize="none"
                autoCorrect="off"
                placeholder={currentUserServer ? `用户名 或 @user:${currentUserServer}` : '@user:server'}
                onChange={(evt) => onChange({ ...createForm, userId: evt.target.value })}
              />
            </label>
          )}

          {createForm.mode === 'group' && (
            <>
              <label>
                房间名称
                <input
                  value={createForm.roomName}
                  placeholder="例如：产品讨论"
                  onChange={(evt) => onChange({ ...createForm, roomName: evt.target.value })}
                />
              </label>
              <label>
                主题
                <textarea
                  value={createForm.topic}
                  rows={3}
                  placeholder="这间房间用来讨论什么"
                  onChange={(evt) => onChange({ ...createForm, topic: evt.target.value })}
                />
              </label>
              <label className="switch-row">
                <span>
                  公开房间
                  <small>允许服务器目录展示</small>
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
            <label>
              房间 ID 或别名
              <input
                value={createForm.roomIdOrAlias}
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="#room:server 或 !roomId:server"
                onChange={(evt) => onChange({ ...createForm, roomIdOrAlias: evt.target.value })}
              />
            </label>
          )}

          {createForm.mode !== 'join' && (
            <label className="switch-row">
              <span>
                端到端加密
                <small>新会话默认开启</small>
              </span>
              <input
                type="checkbox"
                checked={createForm.encrypted}
                onChange={(evt) => onChange({ ...createForm, encrypted: evt.target.checked })}
              />
            </label>
          )}

          <button className="primary-button" type="submit">
            <MessageSquarePlus size={18} />
            {createForm.mode === 'join' ? '加入房间' : '创建'}
          </button>
        </form>
      </section>
    </div>
  );
}

function RoomInfoSheet({
  room,
  members,
  profileForm,
  mediaItems,
  favorite,
  onClose,
  onInvite,
  onProfileChange,
  onProfileSubmit,
  onPreviewMedia,
  onToggleMute,
  onFavorite,
  onLeave,
}: {
  room: RoomSummary;
  members: RoomMemberSummary[];
  profileForm: { name: string; topic: string };
  mediaItems: RoomMediaItem[];
  favorite: boolean;
  onClose: () => void;
  onInvite: (evt: FormEvent<HTMLFormElement>) => void;
  onProfileChange: (value: { name: string; topic: string }) => void;
  onProfileSubmit: (evt: FormEvent<HTMLFormElement>) => void;
  onPreviewMedia: (media: RoomMediaItem) => void;
  onToggleMute: () => void;
  onFavorite: () => void;
  onLeave: () => void;
}) {
  return (
    <div className="sheet-backdrop">
      <section className="sheet room-sheet">
        <header className="sheet-header">
          <div className="room-info-title">
            <Avatar name={room.name} src={room.avatarUrl} />
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
            {room.memberCount} 人
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

        <div className="sheet-actions">
          <button onClick={onFavorite}>
            <Star size={17} />
            {favorite ? '取消收藏' : '收藏房间'}
          </button>
          <button onClick={onToggleMute}>
            <Bell size={17} />
            {room.muted ? '取消静音' : '静音'}
          </button>
          <button onClick={() => navigator.clipboard?.writeText(room.canonicalAlias ?? room.id)}>
            <Copy size={17} />
            复制地址
          </button>
          <button className="danger" onClick={onLeave}>
            <DoorOpen size={17} />
            离开
          </button>
        </div>

        <MediaStrip items={mediaItems} onPreview={onPreviewMedia} />

        <form className="invite-form" onSubmit={onInvite}>
          <input name="userId" placeholder="邀请 @user:server" autoCapitalize="none" autoCorrect="off" />
          <button type="submit">
            <UserPlus size={17} />
          </button>
        </form>

        <div className="member-list">
          <div className="section-title">
            <span>成员</span>
            <strong>{members.length}</strong>
          </div>
          {members.slice(0, 80).map((member) => (
            <div className="member-row" key={member.id}>
              <Avatar name={member.name} src={member.avatarUrl} small />
              <span>
                <strong>{member.name}</strong>
                <small>{member.id}</small>
              </span>
              {member.powerLevel ? <em>{member.powerLevel}</em> : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function MediaStrip({
  items,
  onPreview,
}: {
  items: RoomMediaItem[];
  onPreview: (media: RoomMediaItem) => void;
}) {
  return (
    <section className="media-strip">
      <div className="section-title">
        <span>媒体与文件</span>
        <strong>{items.length}</strong>
      </div>
      {items.length === 0 ? (
        <p className="digest-empty">当前同步范围内还没有附件。</p>
      ) : (
        <div className="media-grid">
          {items.slice(0, 24).map((item) => (
            <button key={item.messageId} className="media-tile" onClick={() => onPreview(item)}>
              {item.kind === 'image' && item.url ? (
                <img src={item.url} alt={item.name} />
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

function MediaPreview({ media, onClose }: { media: RoomMediaItem; onClose: () => void }) {
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
          {media.kind === 'image' && media.url ? (
            <img src={media.url} alt={media.name} />
          ) : media.url ? (
            <a className="secondary-button" href={media.url} target="_blank" rel="noreferrer">
              <Eye size={18} />
              打开文件
            </a>
          ) : (
            <p>这个附件没有可预览的地址。</p>
          )}
        </div>
      </section>
    </div>
  );
}

function ExplorePanel({
  publicSearch,
  publicRooms,
  publicLoading,
  onChange,
  onSearch,
  onJoin,
}: {
  publicSearch: { server: string; query: string };
  publicRooms: PublicRoomSummary[];
  publicLoading: boolean;
  onChange: (value: { server: string; query: string }) => void;
  onSearch: (evt?: FormEvent<HTMLFormElement>) => void;
  onJoin: (roomIdOrAlias: string) => void;
}) {
  return (
    <div className="explore-panel">
      <form className="stack-form" onSubmit={onSearch}>
        <label>
          服务器
          <input
            value={publicSearch.server}
            placeholder="留空使用当前服务器"
            autoCapitalize="none"
            autoCorrect="off"
            onChange={(evt) => onChange({ ...publicSearch, server: evt.target.value })}
          />
        </label>
        <label>
          关键词
          <input
            value={publicSearch.query}
            placeholder="搜索公开房间"
            onChange={(evt) => onChange({ ...publicSearch, query: evt.target.value })}
          />
        </label>
        <button className="secondary-button" type="submit" disabled={publicLoading}>
          <Search size={17} />
          {publicLoading ? '搜索中' : '搜索'}
        </button>
      </form>

      <div className="public-room-list">
        {publicRooms.map((room) => (
          <button key={room.id || room.alias} className="public-room" onClick={() => onJoin(room.alias ?? room.id)}>
            <Avatar name={room.name} src={room.avatarUrl} />
            <span>
              <strong>{room.name}</strong>
              <small>{room.topic || room.alias || room.id}</small>
            </span>
            <em>{room.joinedMembers}</em>
          </button>
        ))}
      </div>
    </div>
  );
}

function SettingsPanel({
  session,
  deviceName,
  snapshot,
  favoriteMessageCount,
  ownProfile,
  profileForm,
  preferences,
  onLogout,
  onProfileChange,
  onProfileSubmit,
  onPreferencesChange,
  onClearLocal,
}: {
  session?: StoredMatrixSession;
  deviceName: string;
  snapshot: MatrixSnapshot;
  favoriteMessageCount: number;
  ownProfile?: OwnProfile;
  profileForm: { displayName: string };
  preferences: AppPreferences;
  onLogout: () => void;
  onProfileChange: (value: { displayName: string }) => void;
  onProfileSubmit: (evt: FormEvent<HTMLFormElement>) => void;
  onPreferencesChange: (value: AppPreferences) => void;
  onClearLocal: () => void;
}) {
  return (
    <div className="settings-list">
      <form className="profile-card" onSubmit={onProfileSubmit}>
        <Avatar name={ownProfile?.displayName ?? session?.userId ?? 'Me'} src={ownProfile?.avatarUrl} />
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

      <div className="settings-item">
        <Shield size={19} />
        <span>
          <strong>账户</strong>
          <small>{session?.userId}</small>
        </span>
      </div>
      <div className="settings-item">
        <Moon size={19} />
        <span>
          <strong>设备</strong>
          <small>{deviceName} · {session?.deviceId}</small>
        </span>
      </div>
      <div className="settings-item">
        <MessageCircle size={19} />
        <span>
          <strong>同步</strong>
          <small>{snapshot.rooms.length} 个房间 · {snapshot.totalUnread} 未读</small>
        </span>
      </div>
      <div className="settings-item">
        <Star size={19} />
        <span>
          <strong>收藏</strong>
          <small>{favoriteMessageCount} 条收藏消息</small>
        </span>
      </div>
      <button className="settings-action" onClick={onClearLocal}>
        清空本地偏好
      </button>
      <button className="settings-action danger" onClick={onLogout}>
        退出登录
      </button>
    </div>
  );
}

function SettingsHero({ session, onLogout }: { session?: StoredMatrixSession; onLogout: () => void }) {
  return (
    <div className="hero-panel">
      <Settings size={38} />
      <h2>账户与设备</h2>
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
      <p>搜索服务器目录，加入公开群组和社区空间。</p>
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
