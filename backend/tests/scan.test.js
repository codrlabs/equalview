/**
 * Supertests for the scan endpoints. Uses a mock scan runner so tests
 * do not require a local Chrome/Puppeteer install.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

require('./helpers/testEnv');
const buildApp = require('../app');
const mockScanResults = require('../data/mockScanResults');

const mockScanRunner = {
  run: async () => mockScanResults,
  getResults: async () => mockScanResults,
};

function createTestApp(overrides = {}) {
  return buildApp({
    scanRunner: mockScanRunner,
    ...overrides,
  });
}

test('POST /api/scan returns the bucketed mock payload', async () => {
  const app = createTestApp();
  const res = await request(app)
    .post('/api/scan')
    .send({ url: 'https://example.com' });
  assert.equal(res.status, 200);
  assert.ok(res.body.problems);
  assert.ok(Array.isArray(res.body.problems.visualAccessibility));
  assert.ok(Array.isArray(res.body.problems.structureAndSemantics));
  assert.ok(Array.isArray(res.body.problems.multimedia));
  assert.ok(Array.isArray(res.body.whatsGood));
});

test('POST /api/scan rejects a non-http URL', async () => {
  const app = createTestApp();
  const res = await request(app)
    .post('/api/scan')
    .send({ url: 'file:///etc/passwd' });
  assert.equal(res.status, 400);
  assert.ok(res.body.error);
});

test('GET /api/scan-results requires ?url=', async () => {
  const app = createTestApp();
  const res = await request(app).get('/api/scan-results');
  assert.equal(res.status, 400);
});

test('GET /api/scan-results returns the mock payload', async () => {
  const app = createTestApp();
  const res = await request(app)
    .get('/api/scan-results')
    .query({ url: 'https://example.com' });
  assert.equal(res.status, 200);
  assert.ok(res.body.problems);
});

test('GET /problems/:id returns the matching problem', async () => {
  const app = createTestApp();
  const res = await request(app).get('/problems/contrast-1');
  assert.equal(res.status, 200);
  assert.equal(res.body.id, 'contrast-1');
});

test('GET /problems/:id returns 404 for an unknown id', async () => {
  const app = createTestApp();
  const res = await request(app).get('/problems/does-not-exist');
  assert.equal(res.status, 404);
});

test('POST /api/scan still succeeds when storage save fails', async () => {
  const StorageService = require('../services/storageService');
  const storageService = new StorageService();
  storageService.saveScanResults = async () => {
    throw new Error('storage unavailable');
  };

  const app = createTestApp({ storageService });
  const agent = request.agent(app);

  const loginRes = await agent
    .get('/api/auth/status')
    .expect(200);

  assert.equal(loginRes.body.authenticated, false);

  const res = await agent
    .post('/api/scan')
    .send({ url: 'https://example.com' });

  assert.equal(res.status, 200);
  assert.ok(res.body.problems);
});
