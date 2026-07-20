/**
 * Auth route tests — status, stubs, protected endpoints, logout.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { TEST_ENCRYPTION_KEY, TEST_SESSION_SECRET } = require('./helpers/testEnv');
const buildApp = require('../app');
const AuthService = require('../services/authService');
const StorageService = require('../services/storageService');

function createTestApp(overrides = {}) {
  const authService =
    overrides.authService ||
    new AuthService({
      sessionSecret: TEST_SESSION_SECRET,
      encryptionKey: TEST_ENCRYPTION_KEY,
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

test('GET /api/auth/google returns 503 when Google OAuth is not configured', async () => {
  // Explicitly clear Google creds so a developer .env cannot register the strategy.
  const authService = new AuthService({
    sessionSecret: TEST_SESSION_SECRET,
    encryptionKey: TEST_ENCRYPTION_KEY,
    githubClientId: 'test-client-id',
    githubClientSecret: 'test-client-secret',
    githubCallbackUrl: 'http://localhost:3000/api/auth/github/callback',
    googleClientId: '',
    googleClientSecret: '',
    googleCallbackUrl: '',
  });
  const app = createTestApp({ authService });
  const res = await request(app).get('/api/auth/google');
  assert.equal(res.status, 503);
  assert.match(res.body.error, /not configured/i);
});

test('GET /api/auth/google initiates OAuth redirect when configured', async () => {
  const authService = new AuthService({
    sessionSecret: TEST_SESSION_SECRET,
    encryptionKey: TEST_ENCRYPTION_KEY,
    githubClientId: 'test-client-id',
    githubClientSecret: 'test-client-secret',
    githubCallbackUrl: 'http://localhost:3000/api/auth/github/callback',
    googleClientId: 'google-client-id.apps.googleusercontent.com',
    googleClientSecret: 'google-client-secret',
    googleCallbackUrl: 'http://localhost:3000/api/auth/google/callback',
  });
  const app = createTestApp({ authService });
  const res = await request(app).get('/api/auth/google');
  assert.equal(res.status, 302);
  assert.match(res.headers.location, /accounts\.google\.com/);
  assert.match(res.headers.location, /drive\.file/);
});

test('GET /api/auth/config returns Google Picker settings', async () => {
  const authService = new AuthService({
    sessionSecret: TEST_SESSION_SECRET,
    encryptionKey: TEST_ENCRYPTION_KEY,
    googleClientId: 'google-client-id.apps.googleusercontent.com',
    googleClientSecret: 'google-client-secret',
    googleCallbackUrl: 'http://localhost:3000/api/auth/google/callback',
    googlePickerApiKey: 'picker-key-test',
  });
  const app = createTestApp({ authService });
  const res = await request(app).get('/api/auth/config');
  assert.equal(res.status, 200);
  assert.equal(res.body.googleClientId, 'google-client-id.apps.googleusercontent.com');
  assert.equal(res.body.googlePickerApiKey, 'picker-key-test');
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
