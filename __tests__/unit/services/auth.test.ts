/**
 * Unit tests — services/auth.ts (getAuth)
 *
 * Runs the real @clerk/backend verification against a locally generated RSA
 * key pair. Only the JWKS fetch to Clerk's Backend API is stubbed.
 *
 * @jest-environment node
 */
import { createSign, generateKeyPairSync, type KeyObject } from 'node:crypto';

import { getAuth, getExpectedIssuer } from '@/services/auth';

const ISSUER = 'https://clerk.example.test';
const KID = 'ins_test_key';
const USER_ID = 'user_victim123';

const real = generateKeyPairSync('rsa', { modulusLength: 2048 });
const attacker = generateKeyPairSync('rsa', { modulusLength: 2048 });

const b64url = (input: string | Buffer) => Buffer.from(input).toString('base64url');

function claims(overrides: Record<string, unknown> = {}) {
  const now = Math.floor(Date.now() / 1000);
  return {
    sub: USER_ID,
    iss: ISSUER,
    sid: 'sess_123',
    iat: now - 10,
    nbf: now - 10,
    exp: now + 60,
    ...overrides,
  };
}

function sign(payload: Record<string, unknown>, key: KeyObject, header: Record<string, unknown> = {}) {
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: KID, ...header }));
  const body = b64url(JSON.stringify(payload));
  const signature = createSign('RSA-SHA256').update(`${head}.${body}`).sign(key);
  return `${head}.${body}.${b64url(signature)}`;
}

const request = (token?: string) =>
  new Request('https://api.example.test/api/players', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

const fetchMock = jest.fn(async () =>
  new Response(
    JSON.stringify({
      keys: [{ ...real.publicKey.export({ format: 'jwk' }), kid: KID, use: 'sig', alg: 'RS256' }],
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  ),
);

beforeAll(() => {
  global.fetch = fetchMock as unknown as typeof fetch;
  process.env.CLERK_SECRET_KEY = 'sk_test_unit';
  process.env.CLERK_PUBLISHABLE_KEY = `pk_test_${Buffer.from('clerk.example.test$').toString('base64')}`;
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('getAuth', () => {
  it('derives the expected issuer from the publishable key', () => {
    expect(getExpectedIssuer()).toBe(ISSUER);
  });

  it('accepts a token signed by the Clerk instance key', async () => {
    await expect(getAuth(request(sign(claims(), real.privateKey)))).resolves.toEqual({
      userId: USER_ID,
    });
  });

  it('caches the JWKS instead of refetching it per request', async () => {
    await getAuth(request(sign(claims(), real.privateKey)));
    await getAuth(request(sign(claims(), real.privateKey)));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects a forged token with a valid-looking payload and a junk signature', async () => {
    const forged = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: KID }))}.${b64url(
      JSON.stringify(claims()),
    )}.${b64url('not-a-real-signature')}`;
    await expect(getAuth(request(forged))).resolves.toEqual({ userId: null });
  });

  it('rejects a token signed with a different private key', async () => {
    await expect(getAuth(request(sign(claims(), attacker.privateKey)))).resolves.toEqual({
      userId: null,
    });
  });

  it('rejects a genuine token whose payload was swapped to another user', async () => {
    const [head, , signature] = sign(claims(), real.privateKey).split('.');
    const tampered = `${head}.${b64url(JSON.stringify(claims({ sub: 'user_other' })))}.${signature}`;
    await expect(getAuth(request(tampered))).resolves.toEqual({ userId: null });
  });

  it('rejects an unsigned (alg: none) token', async () => {
    const unsigned = `${b64url(JSON.stringify({ alg: 'none', typ: 'JWT' }))}.${b64url(
      JSON.stringify(claims()),
    )}.`;
    await expect(getAuth(request(unsigned))).resolves.toEqual({ userId: null });
  });

  it('rejects an expired token', async () => {
    const now = Math.floor(Date.now() / 1000);
    const expired = sign(claims({ iat: now - 600, nbf: now - 600, exp: now - 300 }), real.privateKey);
    await expect(getAuth(request(expired))).resolves.toEqual({ userId: null });
  });

  it('rejects a validly signed token from another issuer', async () => {
    const other = sign(claims({ iss: 'https://clerk.evil.test' }), real.privateKey);
    await expect(getAuth(request(other))).resolves.toEqual({ userId: null });
  });

  it('rejects a request with no bearer token', async () => {
    await expect(getAuth(request())).resolves.toEqual({ userId: null });
  });

  it('fails closed when CLERK_SECRET_KEY is missing', async () => {
    const saved = process.env.CLERK_SECRET_KEY;
    process.env.CLERK_SECRET_KEY = '';
    try {
      await expect(getAuth(request(sign(claims(), real.privateKey)))).resolves.toEqual({
        userId: null,
      });
    } finally {
      process.env.CLERK_SECRET_KEY = saved;
    }
  });
});
