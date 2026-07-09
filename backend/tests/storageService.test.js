/**
 * Unit tests for StorageService — fit-check matrix, reconcile, init guard, save.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const StorageService = require('../services/storageService');

const STORAGE_REF = {
  id: 'R_kgDOA123',
  full_name: 'sam/site-audits',
  html_url: 'https://github.com/sam/site-audits',
};

function manifest(overrides = {}) {
  return {
    equalview: true,
    kind: 'account-store',
    schemaVersion: 1,
    minReaderSchemaVersion: 1,
    account: {
      id: '11111111-1111-1111-1111-111111111111',
      createdAt: '2026-06-30T18:04:00Z',
      updatedAt: '2026-06-30T18:04:00Z',
    },
    storage: {
      provider: 'github',
      providerStorageId: STORAGE_REF.id,
      ownerId: '42',
      ownerDisplay: 'sam',
      repo: STORAGE_REF.full_name,
      branch: 'main',
    },
    settings: { autoDelete90d: true },
    summary: { scanCount: 0, lastScanAt: null },
    features: [],
    ...overrides,
  };
}

function createMockGitHubClient(initial = {}) {
  /** @type {Record<string, { content: string, sha: string }>} */
  const files = { ...initial.files };
  /** @type {Record<string, string>} */
  const blobs = {};
  let headSha = initial.headSha || 'commit-base';
  let blobCounter = 0;

  const repoMeta = {
    default_branch: 'main',
    permissions: { pull: true, push: true, admin: false },
    ...initial.repoMeta,
  };

  let updateRefFailures = initial.updateRefFailures ?? 0;

  return {
    files,
    rest: {
      repos: {
        listForAuthenticatedUser: async () => ({
          data: [
            {
              node_id: STORAGE_REF.id,
              full_name: STORAGE_REF.full_name,
              private: true,
              html_url: STORAGE_REF.html_url,
            },
          ],
        }),
        get: async () => ({ data: repoMeta }),
        getContent: async ({ path }) => {
          if (path === '') {
            const rootFiles = Object.keys(files).filter((p) => !p.includes('/'));
            if (rootFiles.length === 0) {
              const err = new Error('Not Found');
              err.status = 404;
              throw err;
            }
            return {
              data: rootFiles.map((name) => ({ name, type: 'file', path: name })),
            };
          }

          if (path === 'scans') {
            const scanFiles = Object.keys(files)
              .filter((p) => p.startsWith('scans/') && !p.endsWith('index.json'))
              .map((p) => ({
                name: p.replace('scans/', ''),
                type: 'file',
                path: p,
              }));
            if (scanFiles.length === 0) {
              const err = new Error('Not Found');
              err.status = 404;
              throw err;
            }
            return { data: scanFiles };
          }

          const file = files[path];
          if (!file) {
            const err = new Error('Not Found');
            err.status = 404;
            throw err;
          }
          return {
            data: {
              type: 'file',
              content: Buffer.from(file.content, 'utf8').toString('base64'),
              encoding: 'base64',
              sha: file.sha,
            },
          };
        },
      },
      git: {
        getRef: async () => ({ data: { object: { sha: headSha } } }),
        getCommit: async () => ({ data: { tree: { sha: 'tree-base' } } }),
        createBlob: async ({ content }) => {
          blobCounter += 1;
          const sha = `blob-${blobCounter}`;
          blobs[sha] = Buffer.from(content, 'base64').toString('utf8');
          return { data: { sha } };
        },
        createTree: async ({ tree }) => {
          for (const entry of tree) {
            if (entry.path && entry.sha && blobs[entry.sha]) {
              files[entry.path] = { content: blobs[entry.sha], sha: entry.sha };
            }
          }
          return { data: { sha: 'tree-new' } };
        },
        createCommit: async () => {
          headSha = `commit-${blobCounter}`;
          return { data: { sha: headSha } };
        },
        updateRef: async ({ sha }) => {
          if (updateRefFailures > 0) {
            updateRefFailures -= 1;
            const err = new Error('Reference update failed');
            err.status = 422;
            throw err;
          }
          headSha = sha;
        },
      },
    },
  };
}

test('listGitHubRepos maps node id and repo metadata', async () => {
  const storageService = new StorageService();
  const client = createMockGitHubClient();
  const repos = await storageService.listGitHubRepos(client);
  assert.equal(repos.length, 1);
  assert.equal(repos[0].id, STORAGE_REF.id);
  assert.equal(repos[0].full_name, STORAGE_REF.full_name);
});

test('validateStorage returns initializable for empty repo', async () => {
  const storageService = new StorageService();
  const client = createMockGitHubClient();
  const result = await storageService.validateStorage('github', STORAGE_REF, {
    githubClient: client,
  });
  assert.equal(result.status, 'initializable');
  assert.equal(result.capabilities.canWrite, true);
});

test('validateStorage returns unrelated when root has other files', async () => {
  const storageService = new StorageService();
  const client = createMockGitHubClient({
    files: {
      'README.md': { content: '# hi', sha: 'sha-readme' },
    },
  });
  const result = await storageService.validateStorage('github', STORAGE_REF, {
    githubClient: client,
  });
  assert.equal(result.status, 'unrelated');
});

test('validateStorage returns loadable with manifest summary', async () => {
  const storageService = new StorageService();
  const client = createMockGitHubClient({
    files: {
      'equalview.json': {
        content: JSON.stringify(manifest()),
        sha: 'sha-manifest',
      },
      'scans/index.json': {
        content: JSON.stringify({ schemaVersion: 1, scans: [] }),
        sha: 'sha-index',
      },
    },
  });
  const result = await storageService.validateStorage('github', STORAGE_REF, {
    githubClient: client,
  });
  assert.equal(result.status, 'loadable');
  assert.equal(result.manifestSummary.accountId, manifest().account.id);
});

test('validateStorage returns incompatible for newer schema', async () => {
  const storageService = new StorageService();
  const client = createMockGitHubClient({
    files: {
      'equalview.json': {
        content: JSON.stringify(manifest({ schemaVersion: 99 })),
        sha: 'sha-manifest',
      },
    },
  });
  const result = await storageService.validateStorage('github', STORAGE_REF, {
    githubClient: client,
  });
  assert.equal(result.status, 'incompatible');
  assert.equal(result.reason, 'too_new');
});

test('validateStorage returns invalid for malformed manifest', async () => {
  const storageService = new StorageService();
  const client = createMockGitHubClient({
    files: {
      'equalview.json': { content: '{not json', sha: 'sha-manifest' },
    },
  });
  const result = await storageService.validateStorage('github', STORAGE_REF, {
    githubClient: client,
  });
  assert.equal(result.status, 'invalid');
  assert.equal(result.reason, 'malformed_manifest');
});

test('validateStorage stubs google provider until Phase 3', async () => {
  const storageService = new StorageService();
  const result = await storageService.validateStorage('google', { id: 'folder' }, {});
  assert.equal(result.status, 'invalid');
  assert.equal(result.reason, 'provider_not_available');
});

test('initStorage writes manifest and index skeleton', async () => {
  const storageService = new StorageService();
  const client = createMockGitHubClient();
  const result = await storageService.initStorage(
    'github',
    STORAGE_REF,
    { id: '42', username: 'sam' },
    { githubClient: client },
  );

  assert.ok(client.files['equalview.json']);
  assert.ok(client.files['scans/index.json']);
  assert.equal(result.scanCount, 0);
  assert.equal(result.settings.autoDelete90d, true);
});

test('initStorage rejects when manifest already exists (race guard)', async () => {
  const storageService = new StorageService();
  const client = createMockGitHubClient({
    files: {
      'equalview.json': {
        content: JSON.stringify(manifest()),
        sha: 'sha-manifest',
      },
    },
  });

  await assert.rejects(
    () =>
      storageService.initStorage(
        'github',
        STORAGE_REF,
        { id: '42', username: 'sam' },
        { githubClient: client },
      ),
    /already contains an EqualView account|initialized by another session/,
  );
});

test('loadAccount reconciles index from scan files', async () => {
  const storageService = new StorageService();
  const scanPayload = {
    id: '22222222-2222-2222-2222-222222222222',
    schemaVersion: 1,
    url: 'https://codrlabs.com',
    scannedAt: '2026-06-30T18:03:10Z',
    result: {
      problems: { visualAccessibility: [], structureAndSemantics: [], multimedia: [] },
      whatsGood: [],
    },
  };
  const client = createMockGitHubClient({
    files: {
      'equalview.json': {
        content: JSON.stringify(manifest()),
        sha: 'sha-manifest',
      },
      'scans/index.json': {
        content: JSON.stringify({ schemaVersion: 1, scans: [] }),
        sha: 'sha-index',
      },
      'scans/22222222-2222-2222-2222-222222222222_codrlabs.com.json': {
        content: JSON.stringify(scanPayload),
        sha: 'sha-scan',
      },
    },
  });

  const result = await storageService.loadAccount('github', STORAGE_REF, {
    githubClient: client,
  });

  assert.equal(result.scanCount, 1);
  assert.equal(result.reason, 'repairable');
});

test('saveScanResults writes scan file, index, and manifest in one commit', async () => {
  const storageService = new StorageService();
  const client = createMockGitHubClient({
    files: {
      'equalview.json': {
        content: JSON.stringify(manifest()),
        sha: 'sha-manifest',
      },
      'scans/index.json': {
        content: JSON.stringify({ schemaVersion: 1, scans: [] }),
        sha: 'sha-index',
      },
    },
  });

  const scanResult = {
    problems: {
      visualAccessibility: [{ id: 'p1', impact: 'serious', count: 2 }],
      structureAndSemantics: [],
      multimedia: [],
    },
    whatsGood: ['Headings'],
  };

  const saved = await storageService.saveScanResults(
    {
      storage: { ...STORAGE_REF, provider: 'github', branch: 'main' },
    },
    scanResult,
    'https://codrlabs.com',
    { githubClient: client },
  );

  assert.ok(saved.scanId);
  const scanFileKey = Object.keys(client.files).find((k) => k.startsWith('scans/') && k.includes('_codrlabs.com.json'));
  assert.ok(scanFileKey);
  assert.equal(saved.scanCount, 1);

  const updatedManifest = JSON.parse(client.files['equalview.json'].content);
  assert.equal(updatedManifest.summary.scanCount, 1);
});

test('saveScanResults rejects google storage until Phase 3', async () => {
  const storageService = new StorageService();
  await assert.rejects(
    () =>
      storageService.saveScanResults(
        { storage: { provider: 'google' } },
        { problems: {}, whatsGood: [] },
        'https://example.com',
        {},
      ),
    /not available until Phase 3/,
  );
});

test('_writeGitHubFiles retries when branch head moves during save', async () => {
  const storageService = new StorageService();
  const client = createMockGitHubClient({
    updateRefFailures: 1,
    files: {
      'equalview.json': {
        content: JSON.stringify(manifest()),
        sha: 'sha-manifest',
      },
      'scans/index.json': {
        content: JSON.stringify({ schemaVersion: 1, scans: [] }),
        sha: 'sha-index',
      },
    },
  });

  const saved = await storageService.saveScanResults(
    {
      storage: { ...STORAGE_REF, provider: 'github', branch: 'main' },
    },
    {
      problems: { visualAccessibility: [], structureAndSemantics: [], multimedia: [] },
      whatsGood: [],
    },
    'https://codrlabs.com',
    { githubClient: client },
  );

  assert.ok(saved.scanId);
});
