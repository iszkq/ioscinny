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

const decodeBase64Data = (value: string): Uint8Array => {
  const normalized = value.includes(',') ? value.slice(value.indexOf(',') + 1) : value;
  const binary = window.atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const createNativeResponse = (
  request: Request,
  nativeResponse: Awaited<ReturnType<typeof CapacitorHttp.request>>,
  responseType: 'blob' | 'text'
): Response => {
  const body =
    responseType === 'blob'
      ? request.method === 'HEAD' || emptyBodyStatuses.has(nativeResponse.status)
        ? null
        : typeof nativeResponse.data === 'string'
          ? decodeBase64Data(nativeResponse.data)
          : nativeResponse.data == null
            ? new Uint8Array()
            : nativeResponse.data
      : responseBodyFromNativeData(nativeResponse.data, nativeResponse.status, request.method);

  return new Response(body, {
    status: nativeResponse.status,
    headers: responseHeadersFromNative(nativeResponse.headers),
  });
};

const runNativeHttpRequest = async (
  request: Request,
  responseType: 'blob' | 'text'
): Promise<Response> => {
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
    responseType,
    connectTimeout: 15000,
    readTimeout: 45000,
  });

  return createNativeResponse(request, nativeResponse, responseType);
};

export const matrixFetch: typeof fetch = async (input, init) => {
  const request = new Request(input, init);

  if (!Capacitor.isNativePlatform()) {
    return fetch(request);
  }

  return runNativeHttpRequest(request, 'text');
};

export const mediaFetch: typeof fetch = async (input, init) => {
  const request = new Request(input, init);

  if (!Capacitor.isNativePlatform()) {
    return fetch(request);
  }

  return runNativeHttpRequest(request, 'blob');
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
