import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';

const MEDIA_CACHE_DIR = 'ioscinny/media';
const WEB_MEDIA_CACHE_NAME = 'ioscinny-media-cache-v1';
const mediaUrlCache = new Map<string, string>();
const isWebPlatform = (): boolean => Capacitor.getPlatform() === 'web';

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

const buildCachePath = async (cacheKey: string, mimeType?: string, src?: string): Promise<string> => {
  const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(cacheKey));
  const extension = getExtensionFromMimeType(mimeType) ?? getExtensionFromUrl(src) ?? 'bin';
  return `${MEDIA_CACHE_DIR}/${toHex(digest)}.${extension}`;
};

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
    const path = await buildCachePath(cacheKey, mimeType, src);
    await Filesystem.stat({ path, directory: Directory.Cache });
    const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache });
    const resolvedUrl = toDisplayUrl(uri);
    mediaUrlCache.set(cacheKey, resolvedUrl);
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
    const data = await blobToBase64(blob);
    await Filesystem.writeFile({
      path,
      directory: Directory.Cache,
      data,
      recursive: true,
    });
    const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache });
    const resolvedUrl = toDisplayUrl(uri);
    mediaUrlCache.set(cacheKey, resolvedUrl);
    return resolvedUrl;
  } catch {
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
  const path = await buildCachePath(cacheKey, mimeType, src);
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
