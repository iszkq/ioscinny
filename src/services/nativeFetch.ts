import { Capacitor, CapacitorHttp } from '@capacitor/core';

const networkErrorPattern = /load failed|failed to fetch|network request failed|fetch failed/i;
const emptyBodyStatuses = new Set([101, 204, 205, 304]);

const createAbortError = (): DOMException =>
  new DOMException('The operation was aborted.', 'AbortError');

const readRequestBody = async (request: Request): Promise<string | undefined> => {
  if (request.method === 'GET' || request.method === 'HEAD') return undefined;
  return request.text();
};

const responseBodyFromNativeData = (
  data: unknown,
  status: number,
  method: string
): BodyInit | null => {
  if (method === 'HEAD' || emptyBodyStatuses.has(status)) return null;
  if (typeof data === 'string') return data;
  if (data == null) return '';
  return JSON.stringify(data);
};

const responseHeadersFromNative = (nativeHeaders?: Record<string, unknown>): Headers => {
  const headers = new Headers();

  Object.entries(nativeHeaders ?? {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => headers.append(key, String(item)));
      return;
    }

    if (value != null) {
      headers.set(key, String(value));
    }
  });

  return headers;
};

export const matrixFetch: typeof fetch = async (input, init) => {
  const request = new Request(input, init);

  if (!Capacitor.isNativePlatform()) {
    return fetch(request);
  }

  if (request.signal.aborted) {
    throw createAbortError();
  }

  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const nativeResponse = await CapacitorHttp.request({
    method: request.method,
    url: request.url,
    headers,
    data: await readRequestBody(request),
    responseType: 'text',
    connectTimeout: 15000,
    readTimeout: 45000,
  });

  return new Response(
    responseBodyFromNativeData(nativeResponse.data, nativeResponse.status, request.method),
    {
      status: nativeResponse.status,
      headers: responseHeadersFromNative(nativeResponse.headers),
    }
  );
};

export const isLikelyNetworkError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return networkErrorPattern.test(message);
};

export const matrixRequestError = (error: unknown, baseUrl: string): Error => {
  const message = error instanceof Error ? error.message : String(error);

  if (isLikelyNetworkError(error)) {
    return new Error(
      `无法连接 ${baseUrl}。请确认手机网络能访问该 homeserver，HTTPS 证书有效，且服务器没有拦截 Matrix API 请求。原始错误：${message}`
    );
  }

  return error instanceof Error ? error : new Error(message);
};
