/**
 * StorageService — provider-neutral portable-account storage.
 *
 * Speaks the on-disk contract in docs/guides/auth_storage_guide/accountStorageContract.md.
 * Accepts pre-built authenticated clients (no AuthService dependency).
 * GitHub adapter implemented; Google/Drive stubbed until Phase 3.
 */
const crypto = require('crypto');
const { randomUUID } = require('crypto');

const MANIFEST_PATH = 'vizably.json';
const SCANS_DIR = 'scans';
const INDEX_PATH = `${SCANS_DIR}/index.json`;
const SUPPORTED_SCHEMA_VERSION = 1;
const GOOGLE_NOT_AVAILABLE = 'Google storage is not available until Phase 3';

/**
 * @typedef {'loadable' | 'initializable' | 'unrelated' | 'incompatible' | 'invalid'} FitCheckStatus
 */

/**
 * @typedef {object} StorageCapabilities
 * @property {boolean} canRead
 * @property {boolean} canWrite
 * @property {boolean} canCreate
 */

/**
 * @typedef {object} StorageClients
 * @property {import('@octokit/rest').Octokit} [githubClient]
 * @property {object} [driveClient]
 */

class StorageService {
  /**
   * @param {import('@octokit/rest').Octokit} githubClient
   * @returns {Promise<Array<{ id: string, full_name: string, private: boolean, html_url: string }>>}
   */
  async listGitHubRepos(githubClient) {
    const { data } = await githubClient.rest.repos.listForAuthenticatedUser({
      visibility: 'all',
      affiliation: 'owner,collaborator,organization_member',
      per_page: 100,
      sort: 'updated',
    });

    return data.map((repo) => ({
      id: repo.node_id,
      full_name: repo.full_name,
      private: repo.private,
      html_url: repo.html_url,
    }));
  }

  /**
   * @param {'github' | 'google'} provider
   * @param {object} storageRef
   * @param {StorageClients} clients
   */
  async validateStorage(provider, storageRef, clients) {
    if (provider === 'google') {
      return this._googleNotAvailableValidation();
    }
    if (provider !== 'github') {
      return this._invalidResult('unsupported_provider');
    }
    if (!clients.githubClient) {
      return this._invalidResult('missing_github_client');
    }

    return this._validateGitHubStorage(storageRef, clients.githubClient);
  }

  /**
   * @param {'github' | 'google'} provider
   * @param {object} storageRef
   * @param {StorageClients} clients
   */
  async loadAccount(provider, storageRef, clients) {
    if (provider === 'google') {
      throw new Error(GOOGLE_NOT_AVAILABLE);
    }
    if (provider !== 'github' || !clients.githubClient) {
      throw new Error('GitHub client is required to load account storage');
    }

    const { owner, repo } = this._parseGitHubRef(storageRef);
    const octokit = clients.githubClient;
    const branch = await this._resolveGitHubBranch(octokit, owner, repo, storageRef.branch);

    const manifestFile = await this._readGitHubFile(octokit, owner, repo, MANIFEST_PATH, branch);
    if (!manifestFile) {
      throw new Error('Account manifest not found');
    }

    const manifest = this._parseJson(manifestFile.content, 'manifest');
    const manifestCheck = this._assessManifest(manifest);
    if (manifestCheck.status === 'incompatible' || manifestCheck.status === 'invalid') {
      throw new Error(manifestCheck.reason || 'Invalid account manifest');
    }

    const { index, repaired, scanFiles } = await this._reconcileGitHubIndex(
      octokit,
      owner,
      repo,
      branch,
    );

    let reason = manifestCheck.reason ?? null;
    if (repaired) {
      reason = 'repairable';
      await this._writeGitHubFiles(octokit, owner, repo, branch, [
        {
          path: INDEX_PATH,
          content: JSON.stringify(index, null, 2) + '\n',
        },
        {
          path: MANIFEST_PATH,
          content: JSON.stringify(this._updateManifestSummary(manifest, index), null, 2) + '\n',
          sha: manifestFile.sha,
        },
      ], 'Reconcile scan index cache');
    }

    return {
      provider: 'github',
      storageRef: this._normalizeGitHubStorageRef(storageRef, branch),
      accountId: manifest.account.id,
      settings: manifest.settings ?? { autoDelete90d: true },
      scanCount: index.scans.length,
      manifest,
      index,
      scanFiles,
      reason,
    };
  }

  /**
   * @param {'github' | 'google'} provider
   * @param {object} storageRef
   * @param {object} owner signed-in user identity
   * @param {StorageClients} clients
   */
  async initStorage(provider, storageRef, owner, clients) {
    if (provider === 'google') {
      throw new Error(GOOGLE_NOT_AVAILABLE);
    }
    if (provider !== 'github' || !clients.githubClient) {
      throw new Error('GitHub client is required to initialize account storage');
    }

    const validation = await this.validateStorage(provider, storageRef, clients);
    if (validation.status === 'loadable') {
      throw new Error('Storage already contains an Vizably account');
    }
    if (validation.status === 'incompatible' || validation.status === 'invalid') {
      throw new Error(validation.reason || `Cannot initialize storage (${validation.status})`);
    }
    if (!validation.capabilities.canWrite) {
      throw new Error('Storage is not writable');
    }

    const { owner: repoOwner, repo } = this._parseGitHubRef(storageRef);
    const octokit = clients.githubClient;
    const branch = await this._resolveGitHubBranch(octokit, repoOwner, repo, storageRef.branch);

    const existingManifest = await this._readGitHubFile(
      octokit,
      repoOwner,
      repo,
      MANIFEST_PATH,
      branch,
    );
    if (existingManifest) {
      throw new Error('Storage was initialized by another session');
    }

    const now = new Date().toISOString();
    const manifest = {
      vizably: true,
      kind: 'account-store',
      schemaVersion: SUPPORTED_SCHEMA_VERSION,
      minReaderSchemaVersion: SUPPORTED_SCHEMA_VERSION,
      account: {
        id: randomUUID(),
        createdAt: now,
        updatedAt: now,
      },
      storage: {
        provider: 'github',
        providerStorageId: storageRef.id,
        ownerId: String(owner.id),
        ownerDisplay: owner.username || owner.displayName || owner.email || 'unknown',
        repo: storageRef.full_name,
        branch,
      },
      settings: {
        autoDelete90d: true,
      },
      summary: {
        scanCount: 0,
        lastScanAt: null,
      },
      features: [],
    };

    const index = {
      schemaVersion: SUPPORTED_SCHEMA_VERSION,
      scans: [],
    };

    await this._writeGitHubFiles(
      octokit,
      repoOwner,
      repo,
      branch,
      [
        {
          path: MANIFEST_PATH,
          content: JSON.stringify(manifest, null, 2) + '\n',
        },
        {
          path: INDEX_PATH,
          content: JSON.stringify(index, null, 2) + '\n',
        },
      ],
      'Initialize Vizably account store',
    );

    return {
      provider: 'github',
      storageRef: this._normalizeGitHubStorageRef(storageRef, branch),
      accountId: manifest.account.id,
      settings: manifest.settings,
      scanCount: 0,
      manifest,
      index,
    };
  }

  /**
   * @param {object} account loaded account context (manifest + storage binding)
   * @param {import('../../shared/types.js').ScanResult} scanResult
   * @param {string} url scanned URL
   * @param {StorageClients} clients
   */
  async saveScanResults(account, scanResult, url, clients) {
    if (account?.storage?.provider === 'google') {
      throw new Error(GOOGLE_NOT_AVAILABLE);
    }
    if (!clients.githubClient) {
      throw new Error('GitHub client is required to save scan results');
    }

    const storageRef = account.storageRef ?? account.storage;
    const { owner, repo } = this._parseGitHubRef(storageRef);
    const octokit = clients.githubClient;
    const branch = await this._resolveGitHubBranch(octokit, owner, repo, storageRef.branch);

    const manifestFile = await this._readGitHubFile(octokit, owner, repo, MANIFEST_PATH, branch);
    if (!manifestFile) {
      throw new Error('Account manifest not found');
    }

    const manifest = this._parseJson(manifestFile.content, 'manifest');
    const { index } = await this._reconcileGitHubIndex(octokit, owner, repo, branch);

    const scanId = randomUUID();
    const host = this._hostFromUrl(url);
    const scannedAt = new Date().toISOString();
    const scanPath = `${SCANS_DIR}/${scanId}_${host}.json`;
    const scanPayload = {
      id: scanId,
      schemaVersion: SUPPORTED_SCHEMA_VERSION,
      url,
      scannedAt,
      result: scanResult,
    };
    const scanContent = JSON.stringify(scanPayload, null, 2) + '\n';
    const scanSize = Buffer.byteLength(scanContent, 'utf8');
    const scanSha256 = crypto.createHash('sha256').update(scanContent).digest('hex');
    const { issues, topSeverity } = this._summarizeScanResult(scanResult);

    index.scans.unshift({
      id: scanId,
      url,
      host,
      scannedAt,
      score: this._scoreFromIssues(issues),
      issues,
      topSeverity,
      file: scanPath,
      size: scanSize,
      sha256: scanSha256,
    });

    const updatedManifest = this._updateManifestSummary(manifest, index, scannedAt);
    updatedManifest.account.updatedAt = scannedAt;

    await this._writeGitHubFiles(
      octokit,
      owner,
      repo,
      branch,
      [
        { path: scanPath, content: scanContent },
        { path: INDEX_PATH, content: JSON.stringify(index, null, 2) + '\n' },
        {
          path: MANIFEST_PATH,
          content: JSON.stringify(updatedManifest, null, 2) + '\n',
          sha: manifestFile.sha,
        },
      ],
      `Save accessibility scan for ${host}`,
    );

    return {
      scanId,
      path: scanPath,
      scanCount: index.scans.length,
    };
  }

  /** @private */
  _googleNotAvailableValidation() {
    return {
      status: 'invalid',
      reason: 'provider_not_available',
      capabilities: { canRead: false, canWrite: false, canCreate: false },
    };
  }

  /** @private */
  _invalidResult(reason) {
    return {
      status: 'invalid',
      reason,
      capabilities: { canRead: false, canWrite: false, canCreate: false },
    };
  }

  /** @private */
  async _validateGitHubStorage(storageRef, octokit) {
    const { owner, repo } = this._parseGitHubRef(storageRef);
    const branch = await this._resolveGitHubBranch(octokit, owner, repo, storageRef.branch);

    let capabilities;
    try {
      capabilities = await this._probeGitHubCapabilities(octokit, owner, repo);
    } catch (err) {
      if (err.status === 404) {
        return this._invalidResult('not_found');
      }
      if (err.status === 403) {
        return {
          status: 'invalid',
          reason: 'access_denied',
          capabilities: { canRead: false, canWrite: false, canCreate: false },
        };
      }
      throw err;
    }

    const manifestFile = await this._readGitHubFile(octokit, owner, repo, MANIFEST_PATH, branch);
    if (!manifestFile) {
      const rootEntries = await this._listGitHubDirectory(octokit, owner, repo, '', branch);
      const status = rootEntries.length === 0 ? 'initializable' : 'unrelated';
      return {
        status,
        reason: null,
        capabilities,
      };
    }

    let manifest;
    try {
      manifest = this._parseJson(manifestFile.content, 'manifest');
    } catch {
      return {
        status: 'invalid',
        reason: 'malformed_manifest',
        capabilities,
      };
    }

    const manifestCheck = this._assessManifest(manifest);
    if (manifestCheck.status !== 'loadable') {
      return {
        status: manifestCheck.status,
        reason: manifestCheck.reason,
        capabilities,
      };
    }

    const { index, repaired } = await this._reconcileGitHubIndex(
      octokit,
      owner,
      repo,
      branch,
    );

    return {
      status: 'loadable',
      reason: repaired ? 'repairable' : manifestCheck.reason,
      capabilities,
      manifestSummary: {
        accountId: manifest.account.id,
        schemaVersion: manifest.schemaVersion,
        scanCount: index.scans.length,
        updatedAt: manifest.account.updatedAt,
      },
    };
  }

  /** @private */
  _assessManifest(manifest) {
    if (!manifest || typeof manifest !== 'object') {
      return { status: 'invalid', reason: 'malformed_manifest' };
    }
    if (manifest.vizably !== true || manifest.kind !== 'account-store') {
      return { status: 'unrelated', reason: null };
    }
    if (
      typeof manifest.schemaVersion !== 'number' ||
      !manifest.account?.id ||
      !manifest.storage?.providerStorageId
    ) {
      return { status: 'invalid', reason: 'malformed_manifest' };
    }
    if (manifest.schemaVersion > SUPPORTED_SCHEMA_VERSION) {
      return { status: 'incompatible', reason: 'too_new' };
    }
    if (manifest.schemaVersion < SUPPORTED_SCHEMA_VERSION) {
      return { status: 'loadable', reason: 'migration_required' };
    }
    return { status: 'loadable', reason: null };
  }

  /** @private */
  async _probeGitHubCapabilities(octokit, owner, repo) {
    const { data } = await octokit.rest.repos.get({ owner, repo });
    const permissions = data.permissions ?? {};
    const canWrite = Boolean(permissions.push || permissions.admin);
    return {
      canRead: Boolean(permissions.pull || permissions.push || permissions.admin),
      canWrite,
      canCreate: canWrite,
    };
  }

  /** @private */
  async _resolveGitHubBranch(octokit, owner, repo, branch) {
    if (branch && branch !== 'main') {
      return branch;
    }
    const { data } = await octokit.rest.repos.get({ owner, repo });
    return data.default_branch || branch || 'main';
  }

  /** @private */
  _parseGitHubRef(storageRef) {
    const fullName = storageRef.full_name || storageRef.repo;
    if (!fullName || !fullName.includes('/')) {
      throw new Error('GitHub storageRef requires full_name (owner/repo)');
    }
    const [owner, repo] = fullName.split('/');
    return {
      owner,
      repo,
      branch: storageRef.branch || 'main',
      nodeId: storageRef.id,
    };
  }

  /** @private */
  _normalizeGitHubStorageRef(storageRef, branch) {
    return {
      type: 'github',
      id: storageRef.id,
      full_name: storageRef.full_name,
      html_url: storageRef.html_url,
      branch,
    };
  }

  /** @private */
  async _readGitHubFile(octokit, owner, repo, path, branch) {
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref: branch,
      });
      if (Array.isArray(data) || data.type !== 'file') {
        return null;
      }
      const content = Buffer.from(data.content, data.encoding || 'base64').toString('utf8');
      return { content, sha: data.sha };
    } catch (err) {
      if (err.status === 404) {
        return null;
      }
      throw err;
    }
  }

  /** @private */
  async _listGitHubDirectory(octokit, owner, repo, path, branch) {
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref: branch,
      });
      if (!Array.isArray(data)) {
        return [];
      }
      return data;
    } catch (err) {
      if (err.status === 404) {
        return [];
      }
      throw err;
    }
  }

  /** @private */
  _parseJson(raw, label) {
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error(`Failed to parse ${label} JSON`);
    }
  }

  /** @private */
  async _reconcileGitHubIndex(octokit, owner, repo, branch) {
    const scanEntries = await this._listGitHubDirectory(octokit, owner, repo, SCANS_DIR, branch);
    const scanFiles = scanEntries.filter(
      (entry) =>
        entry.type === 'file' &&
        entry.name.endsWith('.json') &&
        entry.name !== 'index.json',
    );

    /** @type {Array<object>} */
    const rebuiltScans = [];

    for (const file of scanFiles) {
      const fileData = await this._readGitHubFile(
        octokit,
        owner,
        repo,
        `${SCANS_DIR}/${file.name}`,
        branch,
      );
      if (!fileData) {
        continue;
      }

      try {
        const payload = JSON.parse(fileData.content);
        if (!payload.id || !payload.url || !payload.result) {
          continue;
        }
        const host = this._hostFromUrl(payload.url);
        const content = fileData.content;
        const size = Buffer.byteLength(content, 'utf8');
        const { issues, topSeverity } = this._summarizeScanResult(payload.result);
        rebuiltScans.push({
          id: payload.id,
          url: payload.url,
          host,
          scannedAt: payload.scannedAt || new Date().toISOString(),
          score: this._scoreFromIssues(issues),
          issues,
          topSeverity,
          file: `${SCANS_DIR}/${file.name}`,
          size,
          sha256: crypto.createHash('sha256').update(content).digest('hex'),
        });
      } catch {
        // Skip corrupt scan files during reconcile.
      }
    }

    rebuiltScans.sort((a, b) => Date.parse(b.scannedAt) - Date.parse(a.scannedAt));

    const index = {
      schemaVersion: SUPPORTED_SCHEMA_VERSION,
      scans: rebuiltScans,
    };

    const existingIndexFile = await this._readGitHubFile(octokit, owner, repo, INDEX_PATH, branch);
    let repaired = true;
    if (existingIndexFile) {
      try {
        const existingIndex = JSON.parse(existingIndexFile.content);
        repaired = !this._indexesEqual(existingIndex, index);
      } catch {
        repaired = true;
      }
    }

    return { index, repaired, scanFiles };
  }

  /** @private */
  _indexesEqual(existingIndex, rebuiltIndex) {
    if (!Array.isArray(existingIndex?.scans)) {
      return false;
    }
    if (existingIndex.scans.length !== rebuiltIndex.scans.length) {
      return false;
    }
    for (let i = 0; i < rebuiltIndex.scans.length; i += 1) {
      const a = existingIndex.scans[i];
      const b = rebuiltIndex.scans[i];
      if (a.id !== b.id || a.file !== b.file || a.scannedAt !== b.scannedAt) {
        return false;
      }
    }
    return true;
  }

  /** @private */
  _updateManifestSummary(manifest, index, lastScanAt) {
    const updated = structuredClone(manifest);
    updated.summary = {
      scanCount: index.scans.length,
      lastScanAt: lastScanAt ?? index.scans[0]?.scannedAt ?? updated.summary?.lastScanAt ?? null,
    };
    return updated;
  }

  /** @private */
  _hostFromUrl(url) {
    const parsed = new URL(url);
    return parsed.hostname.replace(/[^a-zA-Z0-9.-]/g, '_');
  }

  /** @private */
  _summarizeScanResult(scanResult) {
    let issues = 0;
    /** @type {string | null} */
    let topSeverity = null;
    const rank = { critical: 4, serious: 3, moderate: 2, minor: 1 };

    for (const bucket of Object.values(scanResult?.problems ?? {})) {
      if (!Array.isArray(bucket)) {
        continue;
      }
      for (const problem of bucket) {
        issues += problem.count ?? 1;
        if (problem.impact && (!topSeverity || rank[problem.impact] > rank[topSeverity])) {
          topSeverity = problem.impact;
        }
      }
    }

    return { issues, topSeverity };
  }

  /** @private */
  _scoreFromIssues(issues) {
    return Math.max(0, 100 - issues * 4);
  }

  /**
   * Write multiple files in one GitHub commit. Retries on ref conflict (409/422).
   * Files with `sha` are updates; omit `sha` to create.
   * @private
   */
  async _writeGitHubFiles(octokit, owner, repo, branch, files, message) {
    const maxAttempts = 3;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        return await this._attemptGitHubCommit(
          octokit,
          owner,
          repo,
          branch,
          files,
          message,
        );
      } catch (err) {
        const canRetry = this._isRefConflict(err) && attempt < maxAttempts - 1;
        if (!canRetry) {
          throw err;
        }
        await this._refreshMutableFileShas(octokit, owner, repo, branch, files);
      }
    }

    throw new Error('GitHub write failed after retries');
  }

  /** @private */
  _isRefConflict(err) {
    return err?.status === 409 || err?.status === 422;
  }

  /**
   * Re-read blob shas for files we are updating before a retry.
   * @private
   */
  async _refreshMutableFileShas(octokit, owner, repo, branch, files) {
    for (const file of files) {
      if (!file.sha) {
        continue;
      }
      const existing = await this._readGitHubFile(
        octokit,
        owner,
        repo,
        file.path,
        branch,
      );
      if (existing) {
        file.sha = existing.sha;
      } else {
        delete file.sha;
      }
    }
  }

  /** @private */
  async _attemptGitHubCommit(octokit, owner, repo, branch, files, message) {
    const { data: refData } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`,
    });
    const baseCommitSha = refData.object.sha;
    const { data: baseCommit } = await octokit.rest.git.getCommit({
      owner,
      repo,
      commit_sha: baseCommitSha,
    });

    const treeEntries = await Promise.all(
      files.map(async (file) => {
        const { data: blob } = await octokit.rest.git.createBlob({
          owner,
          repo,
          content: Buffer.from(file.content, 'utf8').toString('base64'),
          encoding: 'base64',
        });
        return {
          path: file.path,
          mode: '100644',
          type: 'blob',
          sha: blob.sha,
        };
      }),
    );

    const { data: tree } = await octokit.rest.git.createTree({
      owner,
      repo,
      base_tree: baseCommit.tree.sha,
      tree: treeEntries,
    });

    const { data: commit } = await octokit.rest.git.createCommit({
      owner,
      repo,
      message,
      tree: tree.sha,
      parents: [baseCommitSha],
    });

    await octokit.rest.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: commit.sha,
    });

    return commit;
  }
}

module.exports = StorageService;
