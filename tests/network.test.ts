import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { HttpRequest, setHttpTransport } from '../src/runtime/network';
import { createGlobalEnv } from '../src/runtime/globals';
import { NativeFnValue, ObjectVal } from '../src/runtime/values';
import {
  asNumber,
  asObject,
  asString,
  evaluate,
  objectMethod,
} from './helpers';

type MockCall = HttpRequest;

function mockTransport(
  handler: (req: HttpRequest) => {
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
    body?: string;
  },
) {
  const calls: MockCall[] = [];
  setHttpTransport((req) => {
    calls.push(req);
    const res = handler(req);
    return {
      status: res.status ?? 200,
      statusText: res.statusText ?? 'OK',
      headers: res.headers ?? { 'content-type': 'text/plain' },
      body: res.body ?? '',
    };
  });
  return calls;
}

describe('KIN_URUSOBE', () => {
  beforeEach(() => {
    setHttpTransport(() => {
      throw new Error(
        'unexpected network call — tests must mock the transport',
      );
    });
  });

  afterEach(() => {
    setHttpTransport(null);
  });

  test('registers kubona, ohereza, and saba on the global env', () => {
    const env = createGlobalEnv('test.kin');
    const net = env.lookupVar('KIN_URUSOBE') as ObjectVal;
    expect(net.type).toBe('object');
    for (const name of ['kubona', 'ohereza', 'saba']) {
      expect(net.properties.get(name)?.type).toBe('native-fn');
      expect((net.properties.get(name) as NativeFnValue).call).toBeTypeOf(
        'function',
      );
    }
  });

  test('kubona performs an HTTP GET and returns the response object', () => {
    const calls = mockTransport(() => ({
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'text/plain' },
      body: 'muraho',
    }));

    const { result } = evaluate(
      'KIN_URUSOBE.kubona("https://example.test/hello")',
    );
    const response = asObject(result);

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('GET');
    expect(calls[0].url).toBe('https://example.test/hello');
    expect(calls[0].body).toBeUndefined();

    expect(asNumber(response.properties.get('imiterere')!)).toBe(200);
    expect(asString(response.properties.get('ubutumwa')!)).toBe('OK');
    expect(asString(response.properties.get('inyandiko')!)).toBe('muraho');
    expect(
      asString(
        asObject(response.properties.get('imitwe')!).properties.get(
          'content-type',
        )!,
      ),
    ).toBe('text/plain');
  });

  test('kubona forwards an optional headers object', () => {
    const calls = mockTransport(() => ({ body: 'ok' }));

    evaluate(`
      KIN_URUSOBE.kubona("https://example.test/h", {
        Accept: "application/json",
        XKin: "1"
      })
    `);

    expect(calls[0].headers.Accept).toBe('application/json');
    expect(calls[0].headers.XKin).toBe('1');
  });

  test('ohereza POSTs a string body', () => {
    const calls = mockTransport(() => ({ status: 201, body: 'created' }));

    const { result } = evaluate(
      'KIN_URUSOBE.ohereza("https://example.test/items", "payload")',
    );

    expect(calls[0].method).toBe('POST');
    expect(calls[0].url).toBe('https://example.test/items');
    expect(calls[0].body).toBe('payload');
    expect(asNumber(asObject(result).properties.get('imiterere')!)).toBe(201);
    expect(asString(asObject(result).properties.get('inyandiko')!)).toBe(
      'created',
    );
  });

  test('ohereza JSON-encodes an object body and sets content-type', () => {
    const calls = mockTransport(() => ({ body: '{}' }));

    evaluate(
      'KIN_URUSOBE.ohereza("https://example.test/json", { amazina: "Kin", umubare: 2 })',
    );

    expect(calls[0].method).toBe('POST');
    expect(JSON.parse(calls[0].body ?? '')).toEqual({
      amazina: 'Kin',
      umubare: 2,
    });
    expect(calls[0].headers['content-type']).toBe('application/json');
  });

  test('ohereza does not override a caller-supplied content-type', () => {
    const calls = mockTransport(() => ({ body: 'ok' }));
    const env = createGlobalEnv('test.kin');
    const post = objectMethod(env, 'KIN_URUSOBE', 'ohereza');
    const headers = new Map();
    headers.set('content-type', {
      type: 'string',
      value: 'application/vnd.kin+json',
    });

    post.call(
      [
        { type: 'string', value: 'https://example.test/json' },
        {
          type: 'object',
          properties: new Map([['amazina', { type: 'string', value: 'Kin' }]]),
        },
        { type: 'object', properties: headers },
      ] as never,
      env,
    );

    expect(calls[0].headers['content-type']).toBe('application/vnd.kin+json');
  });

  test('saba sends a caller-chosen method', () => {
    const calls = mockTransport(() => ({ status: 204, body: '' }));

    evaluate('KIN_URUSOBE.saba("put", "https://example.test/item", "next")');

    expect(calls[0].method).toBe('PUT');
    expect(calls[0].body).toBe('next');
    expect(calls[0].url).toBe('https://example.test/item');
  });

  test('HTTP error status codes are returned, not thrown', () => {
    mockTransport(() => ({
      status: 404,
      statusText: 'Not Found',
      body: 'missing',
    }));

    const { result } = evaluate(
      'KIN_URUSOBE.kubona("https://example.test/missing")',
    );
    expect(asNumber(asObject(result).properties.get('imiterere')!)).toBe(404);
    expect(asString(asObject(result).properties.get('inyandiko')!)).toBe(
      'missing',
    );
  });

  test('network failures become clear Kin errors', () => {
    setHttpTransport(() => {
      throw new Error('getaddrinfo ENOTFOUND example.test');
    });

    expect(() =>
      evaluate('KIN_URUSOBE.kubona("https://example.test/")'),
    ).toThrow('KIN_URUSOBE.kubona failed: getaddrinfo ENOTFOUND example.test');
  });

  test('rejects missing and invalid arguments', () => {
    mockTransport(() => ({ body: '' }));

    expect(() => evaluate('KIN_URUSOBE.kubona()')).toThrow(
      'KIN_URUSOBE.kubona expects at least one argument',
    );
    expect(() => evaluate('KIN_URUSOBE.kubona(1)')).toThrow(
      'KIN_URUSOBE.kubona expects argument 1 to be a string',
    );
    expect(() => evaluate('KIN_URUSOBE.kubona("ftp://example.test")')).toThrow(
      'KIN_URUSOBE.kubona expects a valid http or https URL',
    );
    expect(() => evaluate('KIN_URUSOBE.kubona("not-a-url")')).toThrow(
      'KIN_URUSOBE.kubona expects a valid http or https URL',
    );
    expect(() =>
      evaluate('KIN_URUSOBE.ohereza("https://example.test")'),
    ).toThrow('KIN_URUSOBE.ohereza expects at least two arguments');
    expect(() => evaluate('KIN_URUSOBE.saba("GET")')).toThrow(
      'KIN_URUSOBE.saba expects at least two arguments',
    );
  });

  test('does not invoke the real transport when mocked (no live internet)', () => {
    let called = false;
    setHttpTransport((req) => {
      called = true;
      expect(req.url.startsWith('https://')).toBe(true);
      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        body: 'stub',
      };
    });

    const env = createGlobalEnv('test.kin');
    const get = objectMethod(env, 'KIN_URUSOBE', 'kubona');
    const result = get.call(
      [{ type: 'string', value: 'https://example.test' } as never],
      env,
    );

    expect(called).toBe(true);
    expect(asString(asObject(result).properties.get('inyandiko')!)).toBe(
      'stub',
    );
  });
});
