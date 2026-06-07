import { App as CapacitorApp } from '@capacitor/app';
import { Device } from '@capacitor/device';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import {
  CheckCircle2,
  Lock,
  LogOut,
  MessageCircle,
  RefreshCw,
  Send,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { MatrixClient, SyncState } from 'matrix-js-sdk';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  createMatrixRuntime,
  loginWithPassword,
  RoomSummary,
  sendTextMessage,
} from './services/matrix';
import {
  clearStoredSession,
  loadStoredSession,
  saveStoredSession,
  StoredMatrixSession,
} from './services/sessionStore';

type BootState = 'booting' | 'signedOut' | 'connecting' | 'signedIn' | 'error';

const defaultHomeserver = 'https://mtx01.cc';

const syncLabel = (state: SyncState | null): string => {
  switch (state) {
    case SyncState.Prepared:
      return '已准备';
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

export function App() {
  const runtimeStopRef = useRef<(() => void) | undefined>();
  const [bootState, setBootState] = useState<BootState>('booting');
  const [error, setError] = useState<string>();
  const [session, setSession] = useState<StoredMatrixSession>();
  const [client, setClient] = useState<MatrixClient>();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string>();
  const [messageDraft, setMessageDraft] = useState('');
  const [deviceName, setDeviceName] = useState('iPhone');
  const [loginForm, setLoginForm] = useState({
    baseUrl: defaultHomeserver,
    username: '',
    password: '',
  });

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId) ?? rooms[0],
    [rooms, selectedRoomId]
  );

  const stopRuntime = useCallback(() => {
    runtimeStopRef.current?.();
    runtimeStopRef.current = undefined;
    setClient(undefined);
    setRooms([]);
    setSyncState(null);
    setSelectedRoomId(undefined);
  }, []);

  const connectSession = useCallback(
    async (nextSession: StoredMatrixSession) => {
      stopRuntime();
      setBootState('connecting');
      setError(undefined);

      try {
        const runtime = await createMatrixRuntime(nextSession, setRooms, setSyncState);
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

  useEffect(() => {
    if (!selectedRoomId && rooms.length > 0) {
      setSelectedRoomId(rooms[0].id);
    }
  }, [rooms, selectedRoomId]);

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

  const handleSendMessage = async (evt: FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
    if (!client || !selectedRoom) return;

    const body = messageDraft;
    setMessageDraft('');
    try {
      await sendTextMessage(client, selectedRoom.id, body);
      await Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
    } catch (err) {
      setMessageDraft(body);
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  if (bootState === 'booting') {
    return <LoadingScreen label="正在启动 Starfire iOS" />;
  }

  if (bootState === 'signedOut' || (bootState === 'error' && !session)) {
    return (
      <main className="auth-screen">
        <section className="auth-panel">
          <div className="brand-lockup">
            <div className="app-mark">
              <MessageCircle size={32} />
            </div>
            <div>
              <p className="eyebrow">Starfire iOS Prototype</p>
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

            {error && <p className="error-text">{error}</p>}

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
    return <LoadingScreen label="正在初始化 Matrix 与加密存储" />;
  }

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div>
          <p className="eyebrow">Starfire iOS</p>
          <h1>消息</h1>
        </div>
        <button className="icon-button" onClick={handleLogout} aria-label="退出登录">
          <LogOut size={20} />
        </button>
      </header>

      <section className="status-strip">
        <div>
          <ShieldCheck size={18} />
          <span>{syncLabel(syncState)}</span>
        </div>
        <div>
          <Smartphone size={18} />
          <span>{deviceName}</span>
        </div>
        <div>
          <CheckCircle2 size={18} />
          <span>{session?.userId}</span>
        </div>
      </section>

      {error && (
        <button className="inline-error" onClick={() => setError(undefined)}>
          {error}
        </button>
      )}

      <section className="content-grid">
        <nav className="room-list" aria-label="房间列表">
          <div className="section-heading">
            <span>房间</span>
            <strong>{rooms.length}</strong>
          </div>
          {rooms.length === 0 ? (
            <p className="empty-text">同步完成后会显示已加入房间。</p>
          ) : (
            rooms.map((room) => (
              <button
                key={room.id}
                className={room.id === selectedRoom?.id ? 'room-item active' : 'room-item'}
                onClick={() => setSelectedRoomId(room.id)}
              >
                <span>{room.name}</span>
                <small>
                  {room.encrypted ? 'E2EE' : '未加密'}
                  {room.unread > 0 ? ` · ${room.unread}` : ''}
                </small>
              </button>
            ))
          )}
        </nav>

        <section className="chat-preview">
          <div className="chat-header">
            <div>
              <p className="eyebrow">当前房间</p>
              <h2>{selectedRoom?.name ?? '请选择房间'}</h2>
            </div>
            {selectedRoom?.encrypted && <span className="security-pill">端到端加密</span>}
          </div>

          <div className="prototype-copy">
            <p>
              这是第一阶段样机：用于验证 iOS 安装、Matrix 登录、同步、Rust crypto wasm
              和基本发信链路。
            </p>
          </div>

          <form className="message-form" onSubmit={handleSendMessage}>
            <input
              value={messageDraft}
              placeholder={selectedRoom ? '发送一条测试消息' : '等待房间同步'}
              disabled={!selectedRoom}
              onChange={(evt) => setMessageDraft(evt.target.value)}
            />
            <button className="send-button" type="submit" disabled={!selectedRoom || !messageDraft.trim()}>
              <Send size={18} />
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}

function LoadingScreen({ label }: { label: string }) {
  return (
    <main className="loading-screen">
      <RefreshCw className="spin" size={28} />
      <p>{label}</p>
    </main>
  );
}
