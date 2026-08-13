/*************************************************************************************************************
 *                                              KIN_URUBUGA                                                  *
 *  Networking helpers. First slice: synchronous HTTP client (GET/POST/…) via Node http/https.               *
 *  On transport failure returns an error message string (same pattern as KIN_INYANDIKO).                     *
 *************************************************************************************************************/

import { spawnSync } from 'child_process';
import {
  MK_NUMBER,
  MK_OBJECT,
  MK_STRING,
  ObjectVal,
  RuntimeVal,
  StringVal,
} from '../values';
import { defineNative } from '../native';
import { createKinError } from '../../lib/errors';

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_BODY_BYTES = 20 * 1024 * 1024;

/** Exported for tests that need a smaller ceiling without shipping a 20MiB payload. */
export const NETWORK_MAX_BODY_BYTES = MAX_BODY_BYTES;

export type HttpRequestResult =
  | {
      ok: true;
      status: number;
      body: string;
      headers: Record<string, string>;
    }
  | { ok: false; error: string };

/**
 * Perform a blocking HTTP(S) request.
 * Spawns a short-lived Node child so the main Kin interpreter stays synchronous
 * without deadlocking the event loop on http/https callbacks.
 *
 * Redirects are not followed — callers inspect `kode` (e.g. 302) and `imitwe`.
 * Response bodies are decoded as UTF-8 text.
 */
export function httpRequestSync(options: {
  method: string;
  url: string;
  body?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  /** Override response size limit (bytes). Used by tests; production default is MAX_BODY_BYTES. */
  maxBodyBytes?: number;
}): HttpRequestResult {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBodyBytes = options.maxBodyBytes ?? MAX_BODY_BYTES;
  const payload = JSON.stringify({
    method: options.method,
    url: options.url,
    body: options.body ?? '',
    headers: options.headers ?? {},
    timeoutMs,
    maxBodyBytes,
  });

  // Inline worker: one JSON request on stdin → exactly one JSON response on stdout.
  // `respond()` is one-shot so timeout+error (or oversize+end) cannot concatenate payloads.
  const script = `
const http = require('http');
const https = require('https');
const { URL } = require('url');

let responded = false;
function respond(obj) {
  if (responded) return;
  responded = true;
  try {
    process.stdout.write(JSON.stringify(obj));
  } catch (e) {
    // Last resort: avoid hanging the parent if stringify fails.
    process.stdout.write(JSON.stringify({
      ok: false,
      error: e && e.message ? e.message : String(e),
    }));
  }
  // Exit after a short tick so the write is flushed; also stops further events.
  setImmediate(() => process.exit(0));
}

function fail(message) {
  respond({ ok: false, error: String(message) });
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { input += c; });
process.stdin.on('end', () => {
  try {
    let opts;
    try {
      opts = JSON.parse(input);
    } catch (e) {
      fail('Invalid request payload');
      return;
    }

    let url;
    try {
      url = new URL(opts.url);
    } catch (e) {
      fail('Invalid URL: ' + String(opts.url));
      return;
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      fail('Only http and https URLs are supported, got ' + url.protocol);
      return;
    }

    const lib = url.protocol === 'https:' ? https : http;
    const method = String(opts.method || 'GET').toUpperCase();
    const headers = Object.assign({}, opts.headers || {});
    const body = opts.body == null ? '' : String(opts.body);
    const maxBody = Number(opts.maxBodyBytes) > 0 ? Number(opts.maxBodyBytes) : ${MAX_BODY_BYTES};
    if (body !== '' && headers['Content-Length'] == null && headers['content-length'] == null) {
      headers['Content-Length'] = Buffer.byteLength(body, 'utf8');
    }

    const req = lib.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method,
        headers,
        timeout: opts.timeoutMs || ${DEFAULT_TIMEOUT_MS},
      },
      (res) => {
        const chunks = [];
        let total = 0;
        let oversized = false;
        res.on('data', (c) => {
          if (oversized || responded) return;
          total += c.length;
          if (total > maxBody) {
            oversized = true;
            req.destroy();
            fail('Response body exceeds maximum size');
            return;
          }
          chunks.push(c);
        });
        res.on('end', () => {
          if (responded || oversized) return;
          const respBody = Buffer.concat(chunks).toString('utf8');
          const respHeaders = {};
          for (const [k, v] of Object.entries(res.headers)) {
            if (v == null) continue;
            // Kin object keys are identifiers: expose content-type as content_type.
            const key = String(k).toLowerCase().replace(/-/g, '_');
            respHeaders[key] = Array.isArray(v) ? v.join(', ') : String(v);
          }
          respond({
            ok: true,
            status: res.statusCode || 0,
            body: respBody,
            headers: respHeaders,
          });
        });
      },
    );

    req.on('timeout', () => {
      req.destroy();
      fail('Request timed out');
    });
    req.on('error', (e) => {
      // After destroy() Node often emits socket hang up — respond() ignores duplicates.
      fail(e && e.message ? e.message : String(e));
    });

    if (body !== '') req.write(body, 'utf8');
    req.end();
  } catch (e) {
    fail(e && e.message ? e.message : String(e));
  }
});
`;

  const result = spawnSync(process.execPath, ['-e', script], {
    input: payload,
    encoding: 'utf-8',
    maxBuffer: Math.max(maxBodyBytes, MAX_BODY_BYTES) + 1024 * 1024,
    timeout: timeoutMs + 5_000,
  });

  if (result.error) {
    // spawnSync timeout surfaces as error.code === 'ETIMEDOUT'
    if ((result.error as NodeJS.ErrnoException).code === 'ETIMEDOUT') {
      return { ok: false, error: 'Request timed out' };
    }
    return { ok: false, error: result.error.message };
  }

  const stdout = (result.stdout ?? '').trim();
  if (!stdout) {
    const stderr = (result.stderr ?? '').trim();
    // Prefer a clean one-line message when Node dumped a stack to stderr.
    const firstLine = stderr.split('\n').find((l) => l.trim().length > 0) ?? '';
    return {
      ok: false,
      error:
        firstLine ||
        (result.status != null
          ? `Request process exited with code ${result.status}`
          : 'Empty response from HTTP helper'),
    };
  }

  try {
    const parsed = JSON.parse(stdout) as HttpRequestResult;
    if (parsed && typeof parsed === 'object' && 'ok' in parsed) {
      return parsed;
    }
    return { ok: false, error: 'Malformed response from HTTP helper' };
  } catch {
    // If a buggy worker still double-wrote, try the first JSON object only.
    const firstBrace = stdout.indexOf('{');
    const secondBrace = stdout.indexOf('}{');
    if (firstBrace === 0 && secondBrace > 0) {
      try {
        const first = JSON.parse(
          stdout.slice(0, secondBrace + 1),
        ) as HttpRequestResult;
        if (first && typeof first === 'object' && 'ok' in first) {
          return first;
        }
      } catch {
        // fall through
      }
    }
    return {
      ok: false,
      error:
        (result.stderr ?? '').trim().split('\n')[0] ||
        'Failed to parse HTTP helper output',
    };
  }
}

/**
 * Kin object literals only allow identifier keys, so hyphenated HTTP header
 * names are written with underscores (Content_Type -> Content-Type).
 */
function headerNameFromKey(key: string): string {
  return key.replace(/_/g, '-');
}

function headersFromObject(value: RuntimeVal): Record<string, string> {
  if (value.type !== 'object') {
    throw createKinError('K018', {
      params: {
        name: 'KIN_URUBUGA.saba',
        arg: 4,
        expected: 'object',
        got: value.type,
      },
      message: `KIN_URUBUGA.saba expects argument 4 to be object, got ${value.type}`,
    });
  }
  const headers: Record<string, string> = {};
  for (const [key, val] of (value as ObjectVal).properties) {
    if (val.type !== 'string') {
      throw createKinError('K018', {
        params: {
          name: 'KIN_URUBUGA.saba',
          arg: 4,
          expected: 'string header values',
          got: val.type,
        },
        message: `KIN_URUBUGA.saba expects header values to be strings, got ${val.type} for "${key}"`,
      });
    }
    headers[headerNameFromKey(key)] = (val as StringVal).value;
  }
  return headers;
}

function responseObject(result: {
  status: number;
  body: string;
  headers: Record<string, string>;
}): ObjectVal {
  const imitwe = new Map<string, RuntimeVal>();
  for (const [key, value] of Object.entries(result.headers)) {
    imitwe.set(key, MK_STRING(value));
  }
  return MK_OBJECT(
    new Map<string, RuntimeVal>()
      .set('kode', MK_NUMBER(result.status))
      .set('umubiri', MK_STRING(result.body))
      .set('imitwe', MK_OBJECT(imitwe)),
  );
}

/**
 * KIN_URUBUGA — networking (urubuga = network / web).
 *
 * saba(url [, method [, body [, headers]]])
 *   - Default method is GET when only url is given.
 *   - Success: object { kode, umubiri, imitwe }
 *   - Failure (DNS, timeout, bad URL, …): error message string
 *   - Redirects are not followed
 */
export function createKinUrubuga(): ObjectVal {
  return MK_OBJECT(
    new Map().set(
      'saba',
      defineNative({
        name: 'KIN_URUBUGA.saba',
        // Optional trailing args: minArgs 1, maxArgs 4. defineNative only auto-checks
        // types for provided slots when params length matches; optional slots use 'any'
        // and are validated below so callers can omit method/body/headers.
        params: ['string', 'any', 'any', 'any'],
        minArgs: 1,
        maxArgs: 4,
        fn: (args) => {
          const url = (args[0] as StringVal).value;
          let method = 'GET';
          let body = '';
          let headers: Record<string, string> = {};

          if (args.length >= 2) {
            if (args[1].type !== 'string') {
              throw createKinError('K018', {
                params: {
                  name: 'KIN_URUBUGA.saba',
                  arg: 2,
                  expected: 'string',
                  got: args[1].type,
                },
                message: `KIN_URUBUGA.saba expects argument 2 to be string, got ${args[1].type}`,
              });
            }
            method = (args[1] as StringVal).value.trim().toUpperCase() || 'GET';
          }

          if (args.length >= 3) {
            if (args[2].type !== 'string') {
              throw createKinError('K018', {
                params: {
                  name: 'KIN_URUBUGA.saba',
                  arg: 3,
                  expected: 'string',
                  got: args[2].type,
                },
                message: `KIN_URUBUGA.saba expects argument 3 to be string, got ${args[2].type}`,
              });
            }
            body = (args[2] as StringVal).value;
          }

          if (args.length >= 4) {
            headers = headersFromObject(args[3]);
          }

          const result = httpRequestSync({ method, url, body, headers });
          if (!result.ok) {
            return MK_STRING(result.error);
          }
          return responseObject(result);
        },
      }),
    ),
  );
}
