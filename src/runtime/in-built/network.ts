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
 */
export function httpRequestSync(options: {
  method: string;
  url: string;
  body?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
}): HttpRequestResult {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const payload = JSON.stringify({
    method: options.method,
    url: options.url,
    body: options.body ?? '',
    headers: options.headers ?? {},
    timeoutMs,
  });

  // Inline worker script: reads one JSON request from stdin, writes one JSON
  // response to stdout. Kept as a string so we do not ship a separate file.
  const script = `
const http = require('http');
const https = require('https');
const { URL } = require('url');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { input += c; });
process.stdin.on('end', () => {
  let opts;
  try {
    opts = JSON.parse(input);
  } catch (e) {
    process.stdout.write(JSON.stringify({ ok: false, error: 'Invalid request payload' }));
    return;
  }

  let url;
  try {
    url = new URL(opts.url);
  } catch (e) {
    process.stdout.write(JSON.stringify({ ok: false, error: 'Invalid URL: ' + String(opts.url) }));
    return;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    process.stdout.write(JSON.stringify({
      ok: false,
      error: 'Only http and https URLs are supported, got ' + url.protocol,
    }));
    return;
  }

  const lib = url.protocol === 'https:' ? https : http;
  const method = String(opts.method || 'GET').toUpperCase();
  const headers = Object.assign({}, opts.headers || {});
  const body = opts.body == null ? '' : String(opts.body);
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
      res.on('data', (c) => {
        total += c.length;
        if (total > ${MAX_BODY_BYTES}) {
          req.destroy();
          process.stdout.write(JSON.stringify({
            ok: false,
            error: 'Response body exceeds maximum size',
          }));
          return;
        }
        chunks.push(c);
      });
      res.on('end', () => {
        const respBody = Buffer.concat(chunks).toString('utf8');
        const respHeaders = {};
        for (const [k, v] of Object.entries(res.headers)) {
          if (v == null) continue;
          respHeaders[k] = Array.isArray(v) ? v.join(', ') : String(v);
        }
        process.stdout.write(JSON.stringify({
          ok: true,
          status: res.statusCode || 0,
          body: respBody,
          headers: respHeaders,
        }));
      });
    },
  );

  req.on('timeout', () => {
    req.destroy();
    process.stdout.write(JSON.stringify({ ok: false, error: 'Request timed out' }));
  });
  req.on('error', (e) => {
    process.stdout.write(JSON.stringify({
      ok: false,
      error: e && e.message ? e.message : String(e),
    }));
  });

  if (body !== '') req.write(body, 'utf8');
  req.end();
});
`;

  const result = spawnSync(process.execPath, ['-e', script], {
    input: payload,
    encoding: 'utf-8',
    maxBuffer: MAX_BODY_BYTES + 1024 * 1024,
    timeout: timeoutMs + 5_000,
  });

  if (result.error) {
    return { ok: false, error: result.error.message };
  }

  const stdout = (result.stdout ?? '').trim();
  if (!stdout) {
    const stderr = (result.stderr ?? '').trim();
    return {
      ok: false,
      error:
        stderr ||
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
    return {
      ok: false,
      error:
        (result.stderr ?? '').trim() || 'Failed to parse HTTP helper output',
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
 */
export function createKinUrubuga(): ObjectVal {
  return MK_OBJECT(
    new Map().set(
      'saba',
      defineNative({
        name: 'KIN_URUBUGA.saba',
        params: ['string'],
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
