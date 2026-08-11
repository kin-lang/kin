/*************************************************************************************************************
 *                                                  Network                                                  *
 *     Native HTTP helpers for Kin. The transport is injectable so tests never touch the live internet.      *
 *************************************************************************************************************/
import { spawnSync } from 'child_process';
import { LogError } from '../lib/log';
import {
  BooleanVal,
  MK_NATIVE_FN,
  MK_NUMBER,
  MK_OBJECT,
  MK_STRING,
  NumberVal,
  ObjectVal,
  RuntimeVal,
  StringVal,
} from './values';

export type HttpMethod = string;

export type HttpRequest = {
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body?: string;
};

export type HttpResponse = {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
};

export type HttpTransport = (request: HttpRequest) => HttpResponse;

const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RESPONSE_BYTES = 20 * 1024 * 1024;

/**
 * Child script: read one JSON HttpRequest from stdin, perform `fetch`,
 * write one JSON HttpResponse to stdout. Kept as a string so the parent
 * interpreter can stay synchronous (same pattern as `sisitemu` / execSync).
 */
const FETCH_SCRIPT = `
let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { raw += chunk; });
process.stdin.on('end', () => {
  (async () => {
    const req = JSON.parse(raw);
    const init = {
      method: req.method,
      headers: req.headers || {},
      signal: AbortSignal.timeout(${REQUEST_TIMEOUT_MS}),
      redirect: 'follow',
    };
    const method = String(req.method || 'GET').toUpperCase();
    if (req.body != null && req.body !== '' && method !== 'GET' && method !== 'HEAD') {
      init.body = req.body;
    }
    const res = await fetch(req.url, init);
    const headers = {};
    res.headers.forEach((value, key) => { headers[key] = value; });
    const body = await res.text();
    process.stdout.write(JSON.stringify({
      status: res.status,
      statusText: res.statusText,
      headers,
      body,
    }));
  })().catch((err) => {
    process.stderr.write(err && err.message ? err.message : String(err));
    process.exit(1);
  });
});
`;

function defaultHttpTransport(request: HttpRequest): HttpResponse {
  const result = spawnSync(process.execPath, ['-e', FETCH_SCRIPT], {
    input: JSON.stringify(request),
    encoding: 'utf-8',
    maxBuffer: MAX_RESPONSE_BYTES,
    timeout: REQUEST_TIMEOUT_MS + 5_000,
    windowsHide: true,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || 'request failed').trim();
    throw new Error(detail || 'request failed');
  }

  try {
    const parsed = JSON.parse(result.stdout) as HttpResponse;
    return {
      status: Number(parsed.status),
      statusText: String(parsed.statusText ?? ''),
      headers: parsed.headers ?? {},
      body: String(parsed.body ?? ''),
    };
  } catch {
    throw new Error('failed to parse HTTP response');
  }
}

let httpTransport: HttpTransport = defaultHttpTransport;

/** Replace the HTTP transport. Pass `null` to restore the default. */
export function setHttpTransport(next: HttpTransport | null): void {
  httpTransport = next ?? defaultHttpTransport;
}

export function getHttpTransport(): HttpTransport {
  return httpTransport;
}

export function performHttpRequest(request: HttpRequest): HttpResponse {
  return httpTransport(request);
}

function isHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function requireStringArg(
  fnName: string,
  args: RuntimeVal[],
  index: number,
): string {
  const arg = args[index];
  if (!arg || arg.type !== 'string') {
    LogError(`${fnName} expects argument ${index + 1} to be a string`);
  }
  return (arg as StringVal).value;
}

function requireUrl(fnName: string, args: RuntimeVal[], index: number): string {
  const url = requireStringArg(fnName, args, index);
  if (!isHttpUrl(url)) {
    LogError(`${fnName} expects a valid http or https URL`);
  }
  return url;
}

function runtimeToJson(value: RuntimeVal): unknown {
  switch (value.type) {
    case 'string':
      return (value as StringVal).value;
    case 'number':
      return (value as NumberVal).value;
    case 'boolean':
      return (value as BooleanVal).value;
    case 'null':
      return null;
    case 'object': {
      const obj = value as ObjectVal;
      const keys = [...obj.properties.keys()];
      const arrayLike =
        keys.length > 0 && keys.every((key, i) => key === String(i));
      if (arrayLike) {
        return keys.map((key) => runtimeToJson(obj.properties.get(key)!));
      }
      const record: Record<string, unknown> = {};
      for (const [key, nested] of obj.properties) {
        record[key] = runtimeToJson(nested);
      }
      return record;
    }
    default:
      return null;
  }
}

function encodeBody(value: RuntimeVal): { body: string; contentType?: string } {
  if (value.type === 'string') {
    return { body: (value as StringVal).value };
  }
  if (value.type === 'null') {
    return { body: '' };
  }
  if (value.type === 'object') {
    return {
      body: JSON.stringify(runtimeToJson(value)),
      contentType: 'application/json',
    };
  }
  if (value.type === 'number' || value.type === 'boolean') {
    return { body: String((value as NumberVal | BooleanVal).value) };
  }
  LogError('KIN_URUSOBE expects the request body to be a string or object');
  return { body: '' };
}

function headersFromRuntime(
  fnName: string,
  value: RuntimeVal,
): Record<string, string> {
  if (value.type !== 'object') {
    LogError(`${fnName} expects headers to be an object`);
  }
  const headers: Record<string, string> = {};
  for (const [key, nested] of (value as ObjectVal).properties) {
    if (
      nested.type === 'string' ||
      nested.type === 'number' ||
      nested.type === 'boolean'
    ) {
      headers[key] = String((nested as StringVal | NumberVal).value);
    } else if (nested.type === 'null') {
      continue;
    } else {
      LogError(`${fnName} expects header values to be strings`);
    }
  }
  return headers;
}

function responseToRuntime(response: HttpResponse): RuntimeVal {
  const headers = new Map<string, RuntimeVal>();
  for (const [key, value] of Object.entries(response.headers)) {
    headers.set(key, MK_STRING(String(value)));
  }

  return MK_OBJECT(
    new Map<string, RuntimeVal>()
      .set('imiterere', MK_NUMBER(response.status))
      .set('ubutumwa', MK_STRING(response.statusText))
      .set('imitwe', MK_OBJECT(headers))
      .set('inyandiko', MK_STRING(response.body)),
  );
}

function runRequest(fnName: string, request: HttpRequest): RuntimeVal {
  try {
    return responseToRuntime(performHttpRequest(request));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    LogError(`${fnName} failed: ${message}`);
    return MK_STRING(message);
  }
}

function mergeHeaders(
  encoded: { contentType?: string },
  userHeaders: Record<string, string>,
): Record<string, string> {
  const headers: Record<string, string> = { ...userHeaders };
  const hasContentType = Object.keys(headers).some(
    (key) => key.toLowerCase() === 'content-type',
  );
  if (encoded.contentType && !hasContentType) {
    headers['content-type'] = encoded.contentType;
  }
  return headers;
}

export function createNetworkBuiltins(): RuntimeVal {
  return MK_OBJECT(
    new Map<string, RuntimeVal>()
      .set(
        'kubona',
        MK_NATIVE_FN((args) => {
          if (args.length < 1) {
            LogError('KIN_URUSOBE.kubona expects at least one argument');
          }
          const url = requireUrl('KIN_URUSOBE.kubona', args, 0);
          const headers =
            args.length >= 2
              ? headersFromRuntime('KIN_URUSOBE.kubona', args[1])
              : {};
          return runRequest('KIN_URUSOBE.kubona', {
            method: 'GET',
            url,
            headers,
          });
        }),
      )
      .set(
        'ohereza',
        MK_NATIVE_FN((args) => {
          if (args.length < 2) {
            LogError('KIN_URUSOBE.ohereza expects at least two arguments');
          }
          const url = requireUrl('KIN_URUSOBE.ohereza', args, 0);
          const encoded = encodeBody(args[1]);
          const userHeaders =
            args.length >= 3
              ? headersFromRuntime('KIN_URUSOBE.ohereza', args[2])
              : {};
          return runRequest('KIN_URUSOBE.ohereza', {
            method: 'POST',
            url,
            headers: mergeHeaders(encoded, userHeaders),
            body: encoded.body,
          });
        }),
      )
      .set(
        'saba',
        MK_NATIVE_FN((args) => {
          if (args.length < 2) {
            LogError('KIN_URUSOBE.saba expects at least two arguments');
          }
          const method = requireStringArg('KIN_URUSOBE.saba', args, 0);
          const url = requireUrl('KIN_URUSOBE.saba', args, 1);
          const encoded =
            args.length >= 3 && args[2].type !== 'null'
              ? encodeBody(args[2])
              : { body: '' };
          const userHeaders =
            args.length >= 4
              ? headersFromRuntime('KIN_URUSOBE.saba', args[3])
              : {};
          return runRequest('KIN_URUSOBE.saba', {
            method: method.toUpperCase(),
            url,
            headers: mergeHeaders(encoded, userHeaders),
            body: encoded.body || undefined,
          });
        }),
      ),
  );
}
