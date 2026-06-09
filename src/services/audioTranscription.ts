import type { MatrixClient } from 'matrix-js-sdk';

export type AudioTranscriptionSettings = {
  apiKey: string;
  baseUrl: string;
  updatedAt: number;
};

export type AudioTranscriptionAccountDataContent = {
  version: 1;
  updatedAt: number;
  apiKey?: string;
  baseUrl?: string;
};

export type AudioTranscriptionSegment = {
  start?: number;
  end?: number;
  text: string;
};

export type AudioTranscriptionResult = {
  text: string;
  segments?: AudioTranscriptionSegment[];
};

type OpenAIAudioTranscriptionSegmentResponse = {
  start?: unknown;
  end?: unknown;
  text?: unknown;
};

type OpenAIAudioTranscriptionResponse = {
  text?: unknown;
  segments?: unknown;
  error?: {
    message?: unknown;
  };
};

type TranscribeAudioWithAihubmixOptions = {
  model?: string;
  language?: string;
  temperature?: number;
  filename?: string;
  mimeType?: string;
};

type AccountDataEventLike = {
  getContent?: () => unknown;
};

const AUDIO_TRANSCRIPTION_SETTINGS_KEY = 'ioscinny.audioTranscription';
export const AUDIO_TRANSCRIPTION_ACCOUNT_DATA_EVENT_TYPE = 'in.cinny.audio_transcription';

export const AIHUBMIX_AUDIO_TRANSCRIPTION_MODEL = 'whisper-large-v3-turbo';
export const AIHUBMIX_AUDIO_TRANSCRIPTION_MAX_FILE_SIZE = 25 * 1024 * 1024;
export const defaultAudioTranscriptionSettings: AudioTranscriptionSettings = {
  apiKey: '',
  baseUrl: 'https://aihubmix.com/v1',
  updatedAt: 0,
};

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

const getFiniteTimestamp = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const getFiniteNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const getSyncShape = (
  settings?: Partial<AudioTranscriptionSettings> | Partial<AudioTranscriptionAccountDataContent>
): AudioTranscriptionSettings => ({
  apiKey: typeof settings?.apiKey === 'string' ? settings.apiKey.trim() : defaultAudioTranscriptionSettings.apiKey,
  baseUrl:
    typeof settings?.baseUrl === 'string' && settings.baseUrl.trim()
      ? settings.baseUrl.trim()
      : defaultAudioTranscriptionSettings.baseUrl,
  updatedAt: getFiniteTimestamp(settings?.updatedAt, defaultAudioTranscriptionSettings.updatedAt),
});

const decodeEscapedText = (value: string): string => {
  let nextValue = value;

  for (let index = 0; index < 3; index += 1) {
    try {
      const decodedValue = JSON.parse(
        `"${nextValue.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
      ) as string;
      if (decodedValue === nextValue) break;
      nextValue = decodedValue;
    } catch {
      break;
    }
  }

  return nextValue.trim();
};

const normalizeAihubmixText = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;

  const trimmedValue = value.trim();
  if (!trimmedValue) return undefined;

  return decodeEscapedText(trimmedValue);
};

const normalizeAihubmixSegments = (value: unknown): AudioTranscriptionSegment[] | undefined => {
  if (!Array.isArray(value)) return undefined;

  const segments = value
    .map((segment): AudioTranscriptionSegment | undefined => {
      if (!segment || typeof segment !== 'object') return undefined;

      const nextSegment = segment as OpenAIAudioTranscriptionSegmentResponse;
      const text = normalizeAihubmixText(nextSegment.text);
      if (!text) return undefined;

      return {
        start: getFiniteNumber(nextSegment.start),
        end: getFiniteNumber(nextSegment.end),
        text,
      };
    })
    .filter((segment): segment is AudioTranscriptionSegment => Boolean(segment));

  return segments.length > 0 ? segments : undefined;
};

const extractOpenAICompatibleError = (
  payload?: OpenAIAudioTranscriptionResponse
): string | undefined => {
  const message = payload?.error?.message;
  return typeof message === 'string' ? message : undefined;
};

const shouldRetryWithoutVerboseResponse = (
  status: number,
  payload?: OpenAIAudioTranscriptionResponse,
  rawText?: string
): boolean => {
  if (status !== 400 && status !== 404 && status !== 422) return false;

  const errorText = `${extractOpenAICompatibleError(payload) ?? ''} ${rawText ?? ''}`.toLowerCase();
  return /response_format|verbose_json|timestamp_granularities|timestamps|segment/.test(errorText);
};

const getAccountDataContent = (
  client: MatrixClient,
  eventType: string
): Record<string, unknown> | undefined => {
  const event = (
    client as unknown as {
      getAccountData?: (type: string) => AccountDataEventLike | undefined;
    }
  ).getAccountData?.(eventType);
  const content = event?.getContent?.();
  return content && typeof content === 'object' ? (content as Record<string, unknown>) : undefined;
};

const setAccountDataContent = async (
  client: MatrixClient,
  eventType: string,
  content: Record<string, unknown>
): Promise<void> => {
  await (
    client as unknown as {
      setAccountData: (type: string, nextContent: Record<string, unknown>) => Promise<unknown>;
    }
  ).setAccountData(eventType, content);
};

export const normalizeAudioTranscriptionSettings = (
  settings?: Partial<AudioTranscriptionSettings> | Partial<AudioTranscriptionAccountDataContent>
): AudioTranscriptionSettings => getSyncShape(settings);

export const isDefaultAudioTranscriptionSettings = (
  settings: AudioTranscriptionSettings
): boolean => {
  const normalized = normalizeAudioTranscriptionSettings(settings);
  return !normalized.apiKey && normalized.baseUrl === defaultAudioTranscriptionSettings.baseUrl;
};

export const getAudioTranscriptionSettingsAccountDataContent = (
  settings: AudioTranscriptionSettings
): AudioTranscriptionAccountDataContent => {
  const normalized = normalizeAudioTranscriptionSettings(settings);
  return {
    version: 1,
    updatedAt: normalized.updatedAt,
    apiKey: normalized.apiKey,
    baseUrl: normalized.baseUrl,
  };
};

export const getAudioTranscriptionSettingsAccountDataSignature = (
  settings: AudioTranscriptionSettings | AudioTranscriptionAccountDataContent
): string => JSON.stringify(getSyncShape(settings));

export const loadAudioTranscriptionSettings = (): AudioTranscriptionSettings => {
  const rawValue = window.localStorage.getItem(AUDIO_TRANSCRIPTION_SETTINGS_KEY);
  if (!rawValue) return defaultAudioTranscriptionSettings;

  try {
    return normalizeAudioTranscriptionSettings(
      JSON.parse(rawValue) as Partial<AudioTranscriptionSettings>
    );
  } catch {
    return defaultAudioTranscriptionSettings;
  }
};

export const saveAudioTranscriptionSettings = (
  settings: AudioTranscriptionSettings
) => {
  window.localStorage.setItem(
    AUDIO_TRANSCRIPTION_SETTINGS_KEY,
    JSON.stringify(normalizeAudioTranscriptionSettings(settings))
  );
};

export const clearAudioTranscriptionSettings = () => {
  window.localStorage.removeItem(AUDIO_TRANSCRIPTION_SETTINGS_KEY);
};

export const getSyncedAudioTranscriptionSettings = (
  client: MatrixClient
): AudioTranscriptionAccountDataContent | undefined => {
  const content = getAccountDataContent(client, AUDIO_TRANSCRIPTION_ACCOUNT_DATA_EVENT_TYPE);
  if (!content) return undefined;

  return {
    version: 1,
    updatedAt: getFiniteTimestamp(content.updatedAt),
    apiKey: typeof content.apiKey === 'string' ? content.apiKey : undefined,
    baseUrl: typeof content.baseUrl === 'string' ? content.baseUrl : undefined,
  };
};

export const saveSyncedAudioTranscriptionSettings = async (
  client: MatrixClient,
  settings: AudioTranscriptionSettings
): Promise<void> => {
  await setAccountDataContent(
    client,
    AUDIO_TRANSCRIPTION_ACCOUNT_DATA_EVENT_TYPE,
    getAudioTranscriptionSettingsAccountDataContent(settings)
  );
};

export const applyAudioTranscriptionSettingsAccountData = (
  currentSettings: AudioTranscriptionSettings,
  content?: AudioTranscriptionAccountDataContent
): AudioTranscriptionSettings => {
  if (!content) return currentSettings;

  const localSettings = normalizeAudioTranscriptionSettings(currentSettings);
  const remoteSettings = normalizeAudioTranscriptionSettings(content);

  if (remoteSettings.updatedAt > localSettings.updatedAt) {
    return remoteSettings;
  }

  if (remoteSettings.updatedAt < localSettings.updatedAt) {
    return localSettings;
  }

  const remoteSignature = getAudioTranscriptionSettingsAccountDataSignature(remoteSettings);
  const localSignature = getAudioTranscriptionSettingsAccountDataSignature(localSettings);
  if (remoteSignature === localSignature) {
    return localSettings;
  }

  if (
    isDefaultAudioTranscriptionSettings(remoteSettings) &&
    !isDefaultAudioTranscriptionSettings(localSettings)
  ) {
    return localSettings;
  }

  return remoteSettings;
};

export const hasAihubmixAudioTranscription = (
  settings: AudioTranscriptionSettings
): boolean => Boolean(settings.apiKey.trim());

export const transcribeAudioWithAihubmix = async (
  settings: AudioTranscriptionSettings,
  audioBlob: Blob,
  options: TranscribeAudioWithAihubmixOptions = {}
): Promise<AudioTranscriptionResult> => {
  const apiKey = settings.apiKey.trim();
  if (!apiKey) {
    throw new Error('请先在设置里填写 AIHubMix API Key。');
  }

  if (audioBlob.size > AIHUBMIX_AUDIO_TRANSCRIPTION_MAX_FILE_SIZE) {
    throw new Error('AIHubMix 当前最多支持 25MB 的音频转写。');
  }

  const endpoint = `${trimTrailingSlash(
    settings.baseUrl.trim() || defaultAudioTranscriptionSettings.baseUrl
  )}/audio/transcriptions`;
  const fileName = options.filename?.trim() || 'voice-message.webm';
  const model = options.model?.trim() || AIHUBMIX_AUDIO_TRANSCRIPTION_MODEL;

  const uploadFile =
    audioBlob instanceof File
      ? audioBlob
      : new File([audioBlob], fileName, {
          type: options.mimeType?.trim() || audioBlob.type || 'audio/webm',
        });

  const requestTranscription = async (
    preferVerboseResponse: boolean
  ): Promise<AudioTranscriptionResult> => {
    const formData = new FormData();
    formData.append('model', model);
    formData.append('file', uploadFile);
    formData.append('language', options.language?.trim() || 'zh');
    formData.append('temperature', `${options.temperature ?? 0.2}`);

    if (preferVerboseResponse) {
      formData.append('response_format', 'verbose_json');
      formData.append('timestamp_granularities[]', 'segment');
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    const rawText = await response.text();
    let payload: OpenAIAudioTranscriptionResponse | undefined;
    try {
      payload = rawText
        ? (JSON.parse(rawText) as OpenAIAudioTranscriptionResponse)
        : undefined;
    } catch {
      payload = undefined;
    }

    if (!response.ok) {
      if (preferVerboseResponse && shouldRetryWithoutVerboseResponse(response.status, payload, rawText)) {
        return requestTranscription(false);
      }

      throw new Error(
        normalizeAihubmixText(extractOpenAICompatibleError(payload)) ??
          `语音转写请求失败，HTTP ${response.status}`
      );
    }

    const segments = normalizeAihubmixSegments(payload?.segments);
    const transcriptionText =
      normalizeAihubmixText(payload?.text) ??
      (segments ? segments.map((segment) => segment.text).join(' ').trim() : undefined) ??
      normalizeAihubmixText(rawText);

    if (!transcriptionText) {
      throw new Error('语音转写结果为空，请稍后再试。');
    }

    return {
      text: transcriptionText,
      segments,
    };
  };

  return requestTranscription(true);
};
