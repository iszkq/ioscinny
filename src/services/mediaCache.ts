import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';

const MEDIA_CACHE_DIR = 'ioscinny/media';
const WEB_MEDIA_CACHE_NAME = 'ioscinny-media-cache-v1';
const NATIVE_MEDIA_CACHE_INDEX_KEY = 'ioscinny.native-media-cache-index.v1';
const mediaUrlCache = new Map<string, string>();
const isWebPlatform = (): boolean => Capacitor.getPlatform() === 'web';
type PersistedMediaDirectory = 'DATA' | 'CACHE';
type PersistedMediaIndexEntry = {
  directory: PersistedMediaDirectory;
  path: string;
  uri: string;
  updatedAt: number;
};

let nativeMediaCacheIndexLoaded = false;
let nativeMediaCacheIndex: Record<string, PersistedMediaIndexEntry> = {};

const toHex = (value: ArrayBuffer): string =>
  Array.from(new Uint8Array(value))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

const getExtensionFromMimeType = (mimeType?: string): string | undefined => {
  if (!mimeType) return undefined;
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/gif') return 'gif';
  if (mimeType === 'image/heic') return 'heic';
  if (mimeType === 'image/heif') return 'heif';
  if (mimeType === 'video/mp4') return 'mp4';
  if (mimeType === 'audio/mpeg') return 'mp3';
  if (mimeType === 'audio/mp4') return 'm4a';
  return mimeType.split('/')[1]?.split(';')[0];
};

const getExtensionFromUrl = (src?: string): string | undefined => {
  if (!src) return undefined;

  try {
    const url = new URL(src);
    const match = url.pathname.match(/\.([a-z0-9]{2,5})$/i);
    return match?.[1]?.toLowerCase();
  } catch {
    return undefined;
  }
};

const isNativePersistentIndexAvailable = (): boolean =>
  !isWebPlatform() && typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const loadNativeMediaCacheIndex = (): Record<string, PersistedMediaIndexEntry> => {
  if (nativeMediaCacheIndexLoaded) return nativeMediaCacheIndex;

  nativeMediaCacheIndexLoaded = true;
  if (!isNativePersistentIndexAvailable()) return nativeMediaCacheIndex;

  try {
    const rawValue = window.localStorage.getItem(NATIVE_MEDIA_CACHE_INDEX_KEY);
    const parsed = rawValue ? JSON.parse(rawValue) : {};
    if (parsed && typeof parsed === 'object') {
      nativeMediaCacheIndex = parsed as Record<string, PersistedMediaIndexEntry>;
    }
  } catch {
    nativeMediaCacheIndex = {};
  }

  return nativeMediaCacheIndex;
};

const saveNativeMediaCacheIndex = () => {
  if (!isNativePersistentIndexAvailable()) return;

  try {
    window.localStorage.setItem(NATIVE_MEDIA_CACHE_INDEX_KEY, JSON.stringify(nativeMediaCacheIndex));
  } catch {
    // Ignore persistent cache index write failures.
  }
};

const toPersistedMediaDirectory = (directory: Directory): PersistedMediaDirectory | undefined => {
  if (directory === Directory.Data) return 'DATA';
  if (directory === Directory.Cache) return 'CACHE';
  return undefined;
};

const fromPersistedMediaDirectory = (directory: PersistedMediaDirectory | undefined): Directory | undefined => {
  if (directory === 'DATA') return Directory.Data;
  if (directory === 'CACHE') return Directory.Cache;
  return undefined;
};

const getPersistedMediaIndexEntry = (cacheKey?: string): PersistedMediaIndexEntry | undefined => {
  if (!cacheKey || !isNativePersistentIndexAvailable()) return undefined;

  const entry = loadNativeMediaCacheIndex()[cacheKey];
  if (!entry || typeof entry !== 'object') return undefined;
  if (
    typeof entry.path !== 'string' ||
    typeof entry.uri !== 'string' ||
    !fromPersistedMediaDirectory(entry.directory)
  ) {
    delete nativeMediaCacheIndex[cacheKey];
    saveNativeMediaCacheIndex();
    return undefined;
  }

  return entry;
};

const setPersistedMediaIndexEntry = (
  cacheKey: string,
  entry: {
    directory: Directory;
    path: string;
    uri: string;
  }
) => {
  if (!isNativePersistentIndexAvailable()) return;

  const persistedDirectory = toPersistedMediaDirectory(entry.directory);
  if (!persistedDirectory) return;

  loadNativeMediaCacheIndex();
  nativeMediaCacheIndex[cacheKey] = {
    directory: persistedDirectory,
    path: entry.path,
    uri: entry.uri,
    updatedAt: Date.now(),
  };
  saveNativeMediaCacheIndex();
};

const removePersistedMediaIndexEntry = (cacheKey: string) => {
  if (!isNativePersistentIndexAvailable()) return;

  loadNativeMediaCacheIndex();
  if (!nativeMediaCacheIndex[cacheKey]) return;
  delete nativeMediaCacheIndex[cacheKey];
  saveNativeMediaCacheIndex();
};

const blobToBase64 = async (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('无法读取媒体缓存数据'));
    reader.onload = () => {
      const value = typeof reader.result === 'string' ? reader.result : '';
      const base64Value = value.includes(',') ? value.slice(value.indexOf(',') + 1) : value;
      resolve(base64Value);
    };
    reader.readAsDataURL(blob);
  });

const buildCacheId = async (cacheKey: string): Promise<string> => {
  const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(cacheKey));
  return toHex(digest);
};

const buildCachePath = async (cacheKey: string, mimeType?: string, src?: string): Promise<string> => {
  const digest = await buildCacheId(cacheKey);
  const extension = getExtensionFromMimeType(mimeType) ?? getExtensionFromUrl(src) ?? 'bin';
  return `${MEDIA_CACHE_DIR}/${digest}.${extension}`;
};

const findExistingFilesystemCachePath = async (
  cacheKey: string,
  mimeType?: string,
  src?: string
): Promise<{ directory: Directory; path: string } | undefined> => {
  const preferredPath = await buildCachePath(cacheKey, mimeType, src);
  const cacheId = await buildCacheId(cacheKey);

  for (const directory of [Directory.Data, Directory.Cache]) {
    try {
      await Filesystem.stat({ path: preferredPath, directory });
      return { directory, path: preferredPath };
    } catch {
      try {
        const result = await Filesystem.readdir({ path: MEDIA_CACHE_DIR, directory });
        const entry = result.files.find(
          (file) => file.type === 'file' && (file.name === cacheId || file.name.startsWith(`${cacheId}.`))
        );
        if (entry) {
          return { directory, path: `${MEDIA_CACHE_DIR}/${entry.name}` };
        }
      } catch {
        // Ignore missing cache directories.
      }
    }
  }

  return undefined;
};

const getFilesystemWriteDirectory = (mimeType?: string): Directory =>
  mimeType?.startsWith('image/') ? Directory.Data : Directory.Cache;

const toDisplayUrl = (uri: string): string => Capacitor.convertFileSrc(uri);

const isUsableMediaUrl = (url?: string): boolean => {
  if (!url) return false;
  if (isWebPlatform() && /^\/CACHE\//i.test(url)) return false;
  return true;
};

const getCachedFilesystemMediaUrl = async (
  cacheKey: string,
  mimeType?: string,
  src?: string
): Promise<string | undefined> => {
  try {
    const cachedEntry = await findExistingFilesystemCachePath(cacheKey, mimeType, src);
    if (!cachedEntry) return undefined;
    const { uri } = await Filesystem.getUri({ path: cachedEntry.path, directory: cachedEntry.directory });
    const resolvedUrl = toDisplayUrl(uri);
    mediaUrlCache.set(cacheKey, resolvedUrl);
    setPersistedMediaIndexEntry(cacheKey, {
      directory: cachedEntry.directory,
      path: cachedEntry.path,
      uri,
    });
    return resolvedUrl;
  } catch {
    return undefined;
  }
};

const storeCachedFilesystemMediaBlob = async (
  cacheKey: string,
  blob: Blob,
  mimeType?: string,
  src?: string
): Promise<string | undefined> => {
  try {
    const path = await buildCachePath(cacheKey, mimeType ?? blob.type, src);
    const directory = getFilesystemWriteDirectory(mimeType ?? blob.type);
    const data = await blobToBase64(blob);
    await Filesystem.writeFile({
      path,
      directory,
      data,
      recursive: true,
    });
    const { uri } = await Filesystem.getUri({ path, directory });
    const resolvedUrl = toDisplayUrl(uri);
    mediaUrlCache.set(cacheKey, resolvedUrl);
    setPersistedMediaIndexEntry(cacheKey, {
      directory,
      path,
      uri,
    });
    return resolvedUrl;
  } catch {
    return undefined;
  }
};

const getCachedPersistedFilesystemMediaUrl = async (cacheKey: string): Promise<string | undefined> => {
  const persistedEntry = getPersistedMediaIndexEntry(cacheKey);
  if (!persistedEntry) return undefined;

  const directory = fromPersistedMediaDirectory(persistedEntry.directory);
  if (!directory) {
    removePersistedMediaIndexEntry(cacheKey);
    return undefined;
  }

  try {
    await Filesystem.stat({ path: persistedEntry.path, directory });
    const { uri } = await Filesystem.getUri({ path: persistedEntry.path, directory });
    const resolvedUrl = toDisplayUrl(uri);
    mediaUrlCache.set(cacheKey, resolvedUrl);
    if (uri !== persistedEntry.uri) {
      setPersistedMediaIndexEntry(cacheKey, {
        directory,
        path: persistedEntry.path,
        uri,
      });
    }
    return resolvedUrl;
  } catch {
    removePersistedMediaIndexEntry(cacheKey);
    return undefined;
  }
};

const isWebCacheAvailable = (): boolean =>
  typeof window !== 'undefined' && typeof window.caches !== 'undefined';

const buildWebCacheRequest = async (
  cacheKey: string,
  mimeType?: string,
  src?: string
): Promise<Request> => {
  const path = await buildCacheId(cacheKey);
  return new Request(`https://ioscinny.local/__media_cache__/${path}`);
};

const getCachedWebMediaUrl = async (
  cacheKey: string,
  mimeType?: string,
  src?: string
): Promise<string | undefined> => {
  if (!isWebCacheAvailable()) return undefined;

  try {
    const cache = await window.caches.open(WEB_MEDIA_CACHE_NAME);
    const response = await cache.match(await buildWebCacheRequest(cacheKey, mimeType, src));
    if (!response) return undefined;

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    mediaUrlCache.set(cacheKey, objectUrl);
    return objectUrl;
  } catch {
    return undefined;
  }
};

const storeCachedWebMediaBlob = async (
  cacheKey: string,
  blob: Blob,
  mimeType?: string,
  src?: string
): Promise<string | undefined> => {
  if (!isWebCacheAvailable()) return undefined;

  try {
    const cache = await window.caches.open(WEB_MEDIA_CACHE_NAME);
    await cache.put(
      await buildWebCacheRequest(cacheKey, mimeType ?? blob.type, src),
      new Response(blob, {
        headers: mimeType || blob.type ? { 'Content-Type': mimeType ?? blob.type } : undefined,
      })
    );

    const objectUrl = URL.createObjectURL(blob);
    mediaUrlCache.set(cacheKey, objectUrl);
    return objectUrl;
  } catch {
    return undefined;
  }
};

export const peekCachedMediaUrl = (cacheKey?: string): string | undefined =>
  cacheKey
    ? (() => {
        const cachedUrl = mediaUrlCache.get(cacheKey);
        if (!isUsableMediaUrl(cachedUrl)) {
          mediaUrlCache.delete(cacheKey);
          return undefined;
        }
        return cachedUrl;
      })()
    : undefined;

export const peekPersistedCachedMediaUrl = (cacheKey?: string): string | undefined => {
  const persistedEntry = getPersistedMediaIndexEntry(cacheKey);
  if (!persistedEntry) return undefined;

  const resolvedUrl = toDisplayUrl(persistedEntry.uri);
  if (!isUsableMediaUrl(resolvedUrl)) {
    removePersistedMediaIndexEntry(cacheKey ?? '');
    return undefined;
  }
  return resolvedUrl;
};

export const getCachedMediaUrl = async (
  cacheKey: string,
  mimeType?: string,
  src?: string
): Promise<string | undefined> => {
  const cachedUrl = peekCachedMediaUrl(cacheKey);
  if (cachedUrl) return cachedUrl;

  if (isWebPlatform()) {
    return getCachedWebMediaUrl(cacheKey, mimeType, src);
  }

  const persistedFilesystemCachedUrl = await getCachedPersistedFilesystemMediaUrl(cacheKey);
  if (persistedFilesystemCachedUrl) return persistedFilesystemCachedUrl;

  const filesystemCachedUrl = await getCachedFilesystemMediaUrl(cacheKey, mimeType, src);
  if (filesystemCachedUrl) return filesystemCachedUrl;

  return getCachedWebMediaUrl(cacheKey, mimeType, src);
};

export const storeCachedMediaBlob = async (
  cacheKey: string,
  blob: Blob,
  mimeType?: string,
  src?: string
): Promise<string | undefined> => {
  const existingUrl = peekCachedMediaUrl(cacheKey);
  if (existingUrl) return existingUrl;

  if (isWebPlatform()) {
    return storeCachedWebMediaBlob(cacheKey, blob, mimeType ?? blob.type, src);
  }

  const filesystemUrl = await storeCachedFilesystemMediaBlob(cacheKey, blob, mimeType ?? blob.type, src);
  if (filesystemUrl) return filesystemUrl;

  return storeCachedWebMediaBlob(cacheKey, blob, mimeType ?? blob.type, src);
};
