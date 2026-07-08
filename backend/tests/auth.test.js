/**
 * Auth route tests — status, stubs, protected endpoints, logout.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const buildApp = require('../app');
const AuthService = require('../services/authService');
const StorageService = require('../services/storageService');

const TEST_KEY = '66qBcUPktOoyHvQb/5bH0ACXe2CLlXfueNtLLIl1iFE=';

function createTestApp(overrides = {}) {
  const authService =
    overrides.authService ||
    new AuthService({
      sessionSecret: 'test-session-secret-min-32-characters',
      encryptionKey: TEST_KEY,
      githubClientId: 'test-client-id',
      githubClientSecret: 'test-client-secret',
      githubCallbackUrl: 'http://localhost:3000/api/auth/github/callback',
    });

  return buildApp({
    authService,
    storageService: overrides.storageService || new StorageService(),
    scanRunner: overrides.scanRunner,
    ...overrides,
  });
}

test('GET /api/auth/status returns unauthenticated by default', async () => {
  const app = createTestApp();
  const res = await request(app).get('/api/auth/status');
  assert.equal(res.status, 200);
  assert.equal(res.body.authenticated, false);
  assert.equal(res.body.user, null);
});

test('GET /api/auth/google returns 501 until Phase 3', async () => {
  const app = createTestApp();
  const res = await request(app).get('/api/auth/google');
  assert.equal(res.status, 501);
  assert.match(res.body.error, /Phase 3/);
});

test('GET /api/auth/google/callback returns 501 until Phase 3', async () => {
  const app = createTestApp();
  const res = await request(app).get('/api/auth/google/callback');
  assert.equal(res.status, 501);
});

test('GET /api/auth/storages requires authentication', async () => {
  const app = createTestApp();
  const res = await request(app).get('/api/auth/storages?provider=github');
  assert.equal(res.status, 401);
});

test('POST /api/auth/storage/validate requires authentication', async () => {
  const app = createTestApp();
  const res = await request(app)
    .post('/api/auth/storage/validate')
    .send({
      provider: 'github',
      storageRef: { id: 'R_x', full_name: 'sam/repo' },
    });
  assert.equal(res.status, 401);
});

test('POST /api/auth/storage requires authentication', async () => {
  const app = createTestApp();
  const res = await request(app)
    .post('/api/auth/storage')
    .send({
      provider: 'github',
      storageRef: { id: 'R_x', full_name: 'sam/repo' },
      action: 'load',
    });
  assert.equal(res.status, 401);
});

test('GET /api/auth/user requires authentication', async () => {
  const app = createTestApp();
  const res = await request(app).get('/api/auth/user');
  assert.equal(res.status, 401);
});

test('POST /api/auth/logout succeeds without an active session', async () => {
  const app = createTestApp();
  const res = await request(app).post('/api/auth/logout');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
});

test('GET /api/auth/github initiates OAuth redirect', async () => {
  const app = createTestApp();
  const res = await request(app).get('/api/auth/github');
  assert.equal(res.status, 302);
  assert.match(res.headers.location, /github\.com\/login\/oauth\/authorize/);
});
