import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import {
  asNumber,
  asObject,
  asString,
  evaluate,
  objectMethod,
} from './helpers';
import { createGlobalEnv } from '../src/runtime/globals';
import {
  MK_NUMBER,
  MK_OBJECT,
  MK_STRING,
  ObjectVal,
} from '../src/runtime/values';
import { httpRequestSync } from '../src/runtime/in-built/network';

/**
 * Run the HTTP fixture in a *separate* OS process. KIN_URUBUGA.saba uses
 * spawnSync, which blocks the parent event loop — an in-process server would
 * never accept connections (classic deadlock).
 */
function startTestServerProcess(): Promise<{
  baseUrl: string;
  stop: () => void;
}> {
  const script = `
const http = require('http');
const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1');
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks).toString('utf8');
    if (url.pathname === '/echo') {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'X-Kin-Test': 'echo',
      });
      res.end(JSON.stringify({
        method: req.method,
        path: url.pathname,
        query: url.search,
        body,
        contentType: req.headers['content-type'] || null,
      }));
      return;
    }
    if (url.pathname === '/status') {
      const code = Number(url.searchParams.get('code') || '200');
      res.writeHead(code, { 'Content-Type': 'text/plain' });
      res.end('status-' + code);
      return;
    }
    if (url.pathname === '/hello') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('muraho');
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('not found');
  });
});
server.listen(0, '127.0.0.1', () => {
  const port = server.address().port;
  process.stdout.write('READY ' + port + '\\n');
});
`;

  return new Promise((resolve, reject) => {
    const child: ChildProcessWithoutNullStreams = spawn(
      process.execPath,
      ['-e', script],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );

    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill('SIGKILL');
        reject(new Error('Test HTTP server failed to start'));
      }
    }, 10_000);

    let buffer = '';
    child.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf8');
      const match = buffer.match(/READY (\d+)/);
      if (match && !settled) {
        settled = true;
        clearTimeout(timer);
        resolve({
          baseUrl: `http://127.0.0.1:${match[1]}`,
          stop: () => {
            child.kill('SIGTERM');
          },
        });
      }
    });

    child.stderr.on('data', (chunk: Buffer) => {
      if (!settled) {
        // Keep stderr available for debugging failed starts.
        buffer += chunk.toString('utf8');
      }
    });

    child.on('error', (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(err);
      }
    });

    child.on('exit', (code) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(new Error(`Test HTTP server exited early with code ${code}`));
      }
    });
  });
}

describe('KIN_URUBUGA', () => {
  let baseUrl: string;
  let stopServer: () => void;

  beforeAll(async () => {
    const server = await startTestServerProcess();
    baseUrl = server.baseUrl;
    stopServer = server.stop;
  });

  afterAll(() => {
    stopServer();
  });

  test('saba GET returns kode, umubiri, and imitwe', () => {
    const { result } = evaluate(`KIN_URUBUGA.saba("${baseUrl}/hello")`);
    const res = asObject(result);
    expect(asNumber(res.properties.get('kode')!)).toBe(200);
    expect(asString(res.properties.get('umubiri')!)).toBe('muraho');
    const headers = asObject(res.properties.get('imitwe')!);
    const contentType = headers.properties.get('content-type');
    expect(contentType).toBeDefined();
    expect(asString(contentType!).toLowerCase()).toContain('text/plain');
  });

  test('saba default method is GET', () => {
    const { result } = evaluate(`KIN_URUBUGA.saba("${baseUrl}/echo")`);
    const body = asString(asObject(result).properties.get('umubiri')!);
    const parsed = JSON.parse(body) as { method: string };
    expect(parsed.method).toBe('GET');
  });

  test('saba POST sends body and method', () => {
    const { result } = evaluate(
      `KIN_URUBUGA.saba("${baseUrl}/echo", "POST", "amakuru")`,
    );
    const res = asObject(result);
    expect(asNumber(res.properties.get('kode')!)).toBe(200);
    const parsed = JSON.parse(asString(res.properties.get('umubiri')!)) as {
      method: string;
      body: string;
    };
    expect(parsed.method).toBe('POST');
    expect(parsed.body).toBe('amakuru');
  });

  test('saba accepts custom headers as an object (underscores become hyphens)', () => {
    // Kin object keys are identifiers, so Content_Type maps to Content-Type.
    const { result } = evaluate(`
      KIN_URUBUGA.saba(
        "${baseUrl}/echo",
        "POST",
        "payload",
        { Content_Type: "application/json", X_Custom: "kin" }
      )
    `);
    const res = asObject(result);
    const parsed = JSON.parse(asString(res.properties.get('umubiri')!)) as {
      contentType: string | null;
      body: string;
    };
    expect(parsed.contentType).toBe('application/json');
    expect(parsed.body).toBe('payload');
  });

  test('saba surfaces non-2xx status codes without treating them as errors', () => {
    const { result } = evaluate(
      `KIN_URUBUGA.saba("${baseUrl}/status?code=404")`,
    );
    const res = asObject(result);
    expect(asNumber(res.properties.get('kode')!)).toBe(404);
    expect(asString(res.properties.get('umubiri')!)).toBe('status-404');
  });

  test('saba returns an error string for an invalid URL scheme', () => {
    const { result } = evaluate('KIN_URUBUGA.saba("ftp://example.com")');
    expect(result.type).toBe('string');
    expect(asString(result).toLowerCase()).toMatch(/http|https|url|protocol/);
  });

  test('saba returns an error string for a malformed URL', () => {
    const { result } = evaluate('KIN_URUBUGA.saba("not a url")');
    expect(result.type).toBe('string');
    expect(asString(result).length).toBeGreaterThan(0);
  });

  test('saba validates arity and argument types', () => {
    expect(() => evaluate('KIN_URUBUGA.saba()')).toThrow(
      /KIN_URUBUGA.saba expects at least/,
    );
    expect(() => evaluate('KIN_URUBUGA.saba(1)')).toThrow(
      /KIN_URUBUGA.saba expects argument/,
    );
    expect(() => evaluate(`KIN_URUBUGA.saba("${baseUrl}/hello", 1)`)).toThrow(
      /KIN_URUBUGA.saba expects argument 2/,
    );
    expect(() =>
      evaluate(`KIN_URUBUGA.saba("${baseUrl}/hello", "GET", 1)`),
    ).toThrow(/KIN_URUBUGA.saba expects argument 3/);
    expect(() =>
      evaluate(`KIN_URUBUGA.saba("${baseUrl}/hello", "GET", "", "not-object")`),
    ).toThrow(/KIN_URUBUGA.saba expects argument 4/);
  });

  test('saba rejects non-string header values', () => {
    const env = createGlobalEnv('test.kin');
    const saba = objectMethod(env, 'KIN_URUBUGA', 'saba');
    const headers = MK_OBJECT(new Map().set('X-Num', MK_NUMBER(1)));
    expect(() =>
      saba.call(
        [
          MK_STRING(`${baseUrl}/hello`),
          MK_STRING('GET'),
          MK_STRING(''),
          headers,
        ],
        env,
      ),
    ).toThrow(/header values/);
  });

  test('response fields are readable from Kin with member access', () => {
    const { result } = evaluate(`
      reka res = KIN_URUBUGA.saba("${baseUrl}/hello")
      res.umubiri
    `);
    expect(asString(result)).toBe('muraho');
  });

  test('httpRequestSync helper returns structured success payloads', () => {
    const result = httpRequestSync({
      method: 'GET',
      url: `${baseUrl}/hello`,
    });
    expect(result).toEqual({
      ok: true,
      status: 200,
      body: 'muraho',
      headers: expect.objectContaining({
        'content-type': expect.stringContaining('text/plain'),
      }),
    });
  });

  test('environment exposes KIN_URUBUGA.saba', () => {
    const env = createGlobalEnv('test.kin');
    const obj = env.lookupVar('KIN_URUBUGA') as ObjectVal;
    expect(obj.type).toBe('object');
    expect(obj.properties.get('saba')?.type).toBe('native-fn');
  });
});
