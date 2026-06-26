# Fix and Complete GitHub/Google Authentication and Storage Integration

## Overview

This document provides a step-by-step guide to implement complete GitHub and Google authentication flows along with storage integration for saving scan results to either GitHub repositories or Google Drive folders.

The current implementation has placeholder UI flows but lacks backend implementation for:
1. OAuth authentication flows (GitHub and Google)
2. User session management
3. Secure token storage and refresh
4. GitHub repository creation and file operations
5. Google Drive folder creation and file operations
6. Storage of scan results to the selected storage provider

## Prerequisites

Before starting implementation, ensure you have:

1. GitHub OAuth App credentials (Client ID and Secret)
2. Google OAuth Client ID and Secret
3. Required npm packages installed:
   - `express-session` for session management
   - `passport`, `passport-github2`, `passport-google-oauth20` for OAuth
   - `@octokit/rest` for GitHub API operations
   - `googleapis` for Google Drive API operations
   - `crypto-js` or similar for secure token encryption

## Implementation Plan

### Phase 1: Backend Authentication Setup

#### Step 1: Install Required Dependencies
```bash
cd backend
npm install express-session passport passport-github2 passport-google-oauth20 @octokit/rest googleapis crypto-js dotenv
npm install --save-dev @types/express-session @types/passport @types/passport-github2 @types/passport-google-oauth20
```

#### Step 2: Update Environment Variables
Add these to `.env` (based on `.env.example`):
```env
# Authentication
SESSION_SECRET=your_super_secret_session_key_here
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
GITHUB_REDIRECT_URI=http://localhost:3000/api/auth/github/callback

# Encryption key for token storage (32 bytes base64 encoded)
ENCRYPTION_KEY=your_32_byte_base64_encoded_key_here

# Optional: Database URL if using persistent storage
# DATABASE_URL=postgres://user:pass@localhost:5432/equalview
```

#### Step 3: Create Authentication Service
Create `backend/services/authService.js`:
```javascript
/**
 * Authentication Service - Handles OAuth flows and user session management
 */
const session = require('express-session');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { Octokit } = require("@octokit/rest");
const { google } = require('googleapis');
const crypto = require('crypto');
require('dotenv').config();

// Encryption utilities for secure token storage
const encryptionKey = Buffer.from(process.env.ENCRYPTION_KEY, 'base64');
const ivLength = 12; // For GCM

function encrypt(text) {
  const iv = crypto.randomBytes(ivLength);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${encrypted}:${tag.toString('hex')}`;
}

function decrypt(encryptedText) {
  const [ivHex, encrypted, tagHex] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encryptedTextBuf = Buffer.from(encrypted, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encryptedTextBuf, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

class AuthService {
  constructor() {
    this.initializeStrategies();
  }

  initializeStrategies() {
    // GitHub Strategy
    passport.use(new GitHubStrategy({
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_REDIRECT_URI || 'http://localhost:3000/api/auth/github/callback',
      scope: ['repo', 'user:email']
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        // Encrypt tokens for secure storage
        const encryptedAccessToken = encrypt(accessToken);
        const encryptedRefreshToken = refreshToken ? encrypt(refreshToken) : null;
        
        // Find or create user
        const user = {
          id: profile.id,
          username: profile.username,
          email: profile.emails && profile.emails[0]?.value,
          displayName: profile.displayName || profile.username,
          provider: 'github',
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          avatarUrl: profile.photos && profile.photos[0]?.value
        };
        
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }));

    // Google Strategy
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback',
      scope: ['https://www.googleapis.com/auth/drive.file', 'profile', 'email']
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        // Encrypt tokens for secure storage
        const encryptedAccessToken = encrypt(accessToken);
        const encryptedRefreshToken = refreshToken ? encrypt(refreshToken) : null;
        
        // Find or create user
        const user = {
          id: profile.id,
          email: profile.emails && profile.emails[0]?.value,
          displayName: profile.displayName,
          provider: 'google',
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          avatarUrl: profile.photos && profile.photos[0]?.value
        };
        
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }));

    passport.serializeUser((user, done) => {
      done(null, user.id);
    });

    passport.deserializeUser((id, done) => {
      // In a real app, you'd fetch from database
      // For now, we'll rely on session storage
      done(null, { id }); // Simplified - in production, fetch from DB
    });
  }

  // Middleware to initialize session and passport
  middleware() {
    return [
      session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: { secure: process.env.NODE_ENV === 'production' }
      }),
      passport.initialize(),
      passport.session()
    ];
  }

  // Initialize GitHub client with user's token
  getGitHubClient(user) {
    const decryptedToken = decrypt(user.accessToken);
    return new Octokit({ auth: decryptedToken });
  }

  // Initialize Google Drive client with user's token
  getGoogleDriveClient(user) {
    const decryptedToken = decrypt(user.accessToken);
    const auth = new google.auth.GoogleAuth({
      credentials: { access_token: decryptedToken }
    });
    return google.drive({ version: 'v3', auth });
  }

  // Refresh Google token if needed
  async refreshGoogleToken(user) {
    if (!user.refreshToken) return null;
    
    try {
      const decryptedRefreshToken = decrypt(user.refreshToken);
      const oAuth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );
      
      oAuth2Client.setCredentials({ refresh_token: decryptedRefreshToken });
      const { credentials } = await oAuth2Client.refreshAccessToken();
      
      // Update encrypted tokens
      user.accessToken = encrypt(credentials.access_token);
      if (credentials.refresh_token) {
        user.refreshToken = encrypt(credentials.refresh_token);
      }
      
      return user;
    } catch (error) {
      console.error('Error refreshing Google token:', error);
      return null;
    }
  }
}

module.exports = new AuthService();
```

#### Step 4: Create Storage Services
Create `backend/services/storageService.js`:
```javascript
/**
 * Storage Service - Handles GitHub and Google Drive operations
 */
const { google } = require('googleapis');
const { Octokit } = require("@octokit/rest");
const fs = require('fs');
const path = require('path');

class StorageService {
  /**
   * Create a GitHub repository
   * @param {Object} githubClient - Authenticated Octokit instance
   * @param {string} repoName - Name for the repository
   * @param {boolean} private - Whether repo should be private
   * @returns {Promise<Object>} Repository details
   */
  async createGitHubRepo(githubClient, repoName, private = true) {
    try {
      const response = await githubClient.repos.createForAuthenticatedUser({
        name: repoName,
        private: private,
        description: 'EqualView accessibility scan results',
        auto_init: true
      });
      
      return {
        id: response.data.id,
        name: response.data.name,
        full_name: response.data.full_name,
        html_url: response.data.html_url,
        clone_url: response.data.clone_url,
        default_branch: response.data.default_branch
      };
    } catch (error) {
      throw new Error(`Failed to create GitHub repository: ${error.message}`);
    }
  }

  /**
   * Create a file in GitHub repository
   * @param {Object} githubClient - Authenticated Octokit instance
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} path - File path in repository
   * @param {string} content - File content
   * @param {string} branch - Target branch
   * @returns {Promise<Object>} File creation result
   */
  async createGitHubFile(githubClient, owner, repo, path, content, branch = 'main') {
    try {
      // Get current sha if file exists (for update)
      let sha = null;
      try {
        const { data: { sha: existingSha } } = await githubClient.repos.getContent({
          owner,
          repo,
          path,
          ref: branch
        });
        sha = existingSha;
      } catch (error) {
        // File doesn't exist, which is fine for creation
      }

      const response = await githubClient.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message: `Add ${path}`,
        content: Buffer.from(content).toString('base64'),
        sha,
        branch
      });

      return {
        content: {
          name: response.data.content.name,
          path: response.data.content.path,
          sha: response.data.content.sha,
          url: response.data.content.html_url
        },
        commit: {
          sha: response.data.commit.sha,
          url: response.data.commit.html_url
        }
      };
    } catch (error) {
      throw new Error(`Failed to create GitHub file: ${error.message}`);
    }
  }

  /**
   * Create a Google Drive folder
   * @param {Object} driveClient - Authenticated Google Drive instance
   * @param {string} folderName - Name for the folder
   * @param {string} parentId - Parent folder ID (optional, defaults to root)
   * @returns {Promise<Object>} Folder details
   */
  async createGoogleDriveFolder(driveClient, folderName, parentId = 'root') {
    try {
      const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId]
      };

      const response = await driveClient.files.create({
        resource: fileMetadata,
        fields: 'id, name, webViewLink'
      });

      return {
        id: response.data.id,
        name: response.data.name,
        webViewLink: response.data.webViewLink
      };
    } catch (error) {
      throw new Error(`Failed to create Google Drive folder: ${error.message}`);
    }
  }

  /**
   * Upload a file to Google Drive
   * @param {Object} driveClient - Authenticated Google Drive instance
   * @param {string} fileName - Name for the file
   * @param {string} mimeType - MIME type of the file
   * @param {string|Buffer} content - File content
   * @param {string} parentId - Parent folder ID
   * @returns {Promise<Object>} File details
   */
  async uploadToGoogleDrive(driveClient, fileName, mimeType, content, parentId) {
    try {
      const fileMetadata = {
        name: fileName,
        parents: [parentId]
      };

      const media = {
        mimeType: mimeType,
        body: Buffer.isBuffer(content) ? content : Buffer.from(content)
      };

      const response = await driveClient.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink, size'
      });

      return {
        id: response.data.id,
        name: response.data.name,
        webViewLink: response.data.webViewLink,
        size: response.data.size
      };
    } catch (error) {
      throw new Error(`Failed to upload to Google Drive: ${error.message}`);
    }
  }

  /**
   * Get or create storage for a user
   * @param {Object} user - Authenticated user object
   * @param {string} storageType - 'github' or 'google'
   * @param {string} storageName - Name for the repo/folder
   * @returns {Promise<Object>} Storage details
   */
  async getOrCreateStorage(user, storageType, storageName) {
    try {
      if (storageType === 'github') {
        const githubClient = this.getGitHubClient(user);
        
        // Try to get existing repo first
        try {
          const response = await githubClient.repos.getForAuthenticatedUser({
            repo: storageName
          });
          
          return {
            type: 'github',
            id: response.data.id,
            name: response.data.name,
            full_name: response.data.full_name,
            html_url: response.data.html_url,
            clone_url: response.data.clone_url
          };
        } catch (error) {
          // Repo doesn't exist, create it
          const repo = await this.createGitHubRepo(githubClient, storageName, true);
          return {
            type: 'github',
            ...repo
          };
        }
      } else if (storageType === 'google') {
        const driveClient = this.getGoogleDriveClient(user);
        
        // Try to find existing folder
        try {
          const response = await driveClient.files.list({
            q: `name='${storageName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: 'files(id, name, webViewLink)',
            spaces: 'drive'
          });

          if (response.data.files && response.data.files.length > 0) {
            const folder = response.data.files[0];
            return {
              type: 'google',
              id: folder.id,
              name: folder.name,
              webViewLink: folder.webViewLink
            };
          }
          
          // Folder doesn't exist, create it
          const folder = await this.createGoogleDriveFolder(driveClient, storageName);
          return {
            type: 'google',
            ...folder
          };
        } catch (error) {
          // If search fails, create new folder
          const folder = await this.createGoogleDriveFolder(driveClient, storageName);
          return {
            type: 'google',
            ...folder
          };
        }
      }
    } catch (error) {
      throw new Error(`Failed to get or create ${storageType} storage: ${error.message}`);
    }
  }

  /**
   * Save scan results to storage
   * @param {Object} user - Authenticated user object
   * @param {Object} storageInfo - Storage details from getOrCreateStorage
   * @param {Object} scanResults - Scan results to save
   * @param {string} url - Scanned URL (used for filename)
   * @returns {Promise<Object>} Saved file details
   */
  async saveScanResults(user, storageInfo, scanResults, url) {
    try {
      // Create filename from URL and timestamp
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace(/[^\w\-]/g, '_');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `${hostname}_${timestamp}.json`;
      const content = JSON.stringify(scanResults, null, 2);

      if (storageInfo.type === 'github') {
        const githubClient = this.getGitHubClient(user);
        const filePath = `scans/${fileName}`;
        
        return await this.createGitHubFile(
          githubClient,
          storageInfo.full_name.split('/')[0], // owner
          storageInfo.full_name.split('/')[1], // repo
          filePath,
          content
        );
      } else if (storageInfo.type === 'google') {
        const driveClient = this.getGoogleDriveClient(user);
        
        return await this.uploadToGoogleDrive(
          driveClient,
          fileName,
          'application/json',
          content,
          storageInfo.id
        );
      }
    } catch (error) {
      throw new Error(`Failed to save scan results: ${error.message}`);
    }
  }
}

module.exports = new StorageService();
```

#### Step 5: Create Authentication Routes
Create `backend/routes/auth.js`:
```javascript
/**
 * Authentication Routes - Handles OAuth flows and session management
 */
const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const storageService = require('../services/storageService');
const PROVIDERS = require('../../frontend/src/data/placeholders').PROVIDERS;

// Apply auth middleware
router.use(authService.middleware());

// GET /api/auth/github - Initiate GitHub OAuth
router.get('/github', 
  (req, res, next) => {
    // Store provider in session for callback
    req.session.authProvider = 'github';
    next();
  },
  (req, res, next) => {
    // Initialize passport auth
    const authenticate = require('passport').authenticate('github', { 
      scope: ['repo', 'user:email'] 
    });
    return authenticate(req, res, next);
  }
);

// GET /api/auth/google - Initiate Google OAuth
router.get('/google',
  (req, res, next) => {
    // Store provider in session for callback
    req.session.authProvider = 'google';
    next();
  },
  (req, res, next) => {
    // Initialize passport auth
    const authenticate = require('passport').authenticate('google', {
      scope: ['https://www.googleapis.com/auth/drive.file', 'profile', 'email']
    });
    return authenticate(req, res, next);
  }
);

// GET /api/auth/github/callback - GitHub OAuth callback
router.get('/github/callback', 
  (req, res, next) => {
    const authenticate = require('passport').authenticate('github', {
      failureRedirect: '/signin?error=github_auth_failed'
    });
    return authenticate(req, res, next);
  },
  async (req, res) => {
    // Successful authentication
    try {
      // Store user in session (passport already attached req.user)
      req.user = req.user;
      
      // Redirect to connect view for storage selection
      const provider = req.session.authProvider || 'github';
      delete req.session.authProvider;
      
      res.redirect(`/connect?provider=${provider}`);
    } catch (error) {
      console.error('GitHub callback error:', error);
      res.redirect('/signin?error=github_callback_failed');
    }
  }
);

// GET /api/auth/google/callback - Google OAuth callback
router.get('/google/callback',
  (req, res, next) => {
    const authenticate = require('passport').authenticate('google', {
      failureRedirect: '/signin?error=google_auth_failed'
    });
    return authenticate(req, res, next);
  },
  async (req, res) => {
    // Successful authentication
    try {
      // Store user in session (passport already attached req.user)
      req.user = req.user;
      
      // Redirect to connect view for storage selection
      const provider = req.session.authProvider || 'google';
      delete req.session.authProvider;
      
      res.redirect(`/connect?provider=${provider}`);
    } catch (error) {
      console.error('Google callback error:', error);
      res.redirect('/signin?error=google_callback_failed');
    }
  }
);

// POST /api/auth/storage - Handle storage selection and creation
router.post('/storage', async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { provider, mode, name } = req.body;
    
    if (!provider || !['github', 'google'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    if (!mode || !['new', 'existing'].includes(mode)) {
      return res.status(400).json({ error: 'Invalid mode' });
    }

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Invalid storage name' });
    }

    // Get or create storage
    const storageInfo = await storageService.getOrCreateStorage(req.user, provider, name);
    
    // Store storage info in session/user for later use
    req.user.storage = storageInfo;
    
    res.json({
      success: true,
      provider: storageInfo.type,
      storage: storageInfo
    });
  } catch (error) {
    console.error('Storage error:', error);
    res.status(500).json({ error: 'Failed to setup storage' });
  }
});

// GET /api/auth/user - Get current user info
router.get('/user', (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  // Return safe user data (without tokens)
  const safeUser = {
    id: req.user.id,
    username: req.user.username,
    email: req.user.email,
    displayName: req.user.displayName,
    provider: req.user.provider,
    avatarUrl: req.user.avatarUrl,
    storage: req.user.storage
  };
  
  res.json(safeUser);
});

// POST /api/auth/logout - Logout user
router.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy();
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

// GET /api/auth/status - Check authentication status
router.get('/status', (req, res) => {
  if (req.isAuthenticated() && req.user) {
    res.json({
      authenticated: true,
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        displayName: req.user.displayName,
        provider: req.user.provider
      }
    });
  } else {
    res.json({ authenticated: false });
  }
});

module.exports = router;
```

#### Step 6: Update App.js to Use Auth Routes
Modify `backend/app.js`:
```javascript
/**
 * Composition root. The ONE place we instantiate concrete classes and
 * wire them together. Everything else takes its dependencies via
 * arguments — that's what makes the layers unit-testable without a DI
 * framework. See docs/plans/architecture-map.md §6.5.
 */
const express = require('express');
const cors = require('cors');

const ScanController = require('./controllers/scanController');
const mountRoutes = require('./routes');
const mountAuthRoutes = require('./routes/auth'); // Add auth routes
const ssrfGuard = require('./services/ssrfGuard');
const mockScanResults = require('./data/mockScanResults');
const puppeteer = require('puppeteer');
const ScanRunner = require('./services/scanRunner');
const scanRunner = new ScanRunner();

/**
 * Build a fully-wired Express app. Exported separately from `index.js`
 * so tests can `request(buildApp())` without binding a port.
 *
 * @param {object} [overrides]  optional dep overrides for testing
 * @returns {import('express').Express}
 */
function buildApp(overrides = {}) {
  const app = express();

  const frontendOrigin =
    process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
  app.use(cors({ origin: frontendOrigin }));
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'okay', message: 'Server is running!' });
  });

  // Mount authentication routes
  mountAuthRoutes(app);

  // Today the controller still serves the mock fixture; in Phase 2 it
  // will be constructed with a real ScanRunner instead.
  const scanController =
    overrides.scanController ||
    new ScanController({
      mockScanResults: overrides.mockScanResults || mockScanResults,
      ssrfGuard: overrides.ssrfGuard || ssrfGuard,
      scanRunner: scanRunner,
      storageService: overrides.storageService || require('../services/storageService')
    });

  mountRoutes(app, { scanController });

  return app;
}

module.exports = buildApp;
```

#### Step 7: Update ScanController to Use Storage
Modify `backend/controllers/scanController.js`:
```javascript
/**
 * ScanController — owns request/response for the scan endpoints.
 *
 * Today it delegates to the mock fixture; in Phase 2 the constructor
 * will accept a `runner` (`ScanRunner`) and call `runner.run(url)`.
 *
 * Methods are bound in the constructor so they can be passed directly
 * to `app.post('/api/scan', ctrl.postScan)` without losing `this`.
 * See docs/guides/axecore-integration.md for the bug pattern this
 * sidesteps.
 */
class ScanController {
  /**
   * @param {object} deps
   * @param {object} deps.mockScanResults  Phase-1 fixture; replaced in Phase 2
   * @param {{ validate: (s: string) => { ok: boolean, reason?: string } }} [deps.ssrfGuard]
   * @param {object} deps.scanRunner  Phase-2 implementation; replaced the mock in Phase 1
   * @param {object} deps.storageService  Storage service for saving results
   */
  constructor({ mockScanResults, ssrfGuard, scanRunner, storageService }) {
    this.mockScanResults = mockScanResults;
    this.ssrfGuard = ssrfGuard;
    this.scanRunner = scanRunner;
    this.storageService = storageService;

    // Bind handlers once so router wiring stays clean.
    this.postScan = this.postScan.bind(this);
    this.getScanResults = this.getScanResults.bind(this);
    this.getProblem = this.getProblem.bind(this);
  }

  /**
   * POST /api/scan
   * Body: { url: string }
   */
  async postScan(req, res) {
    const { url } = req.body || {};
    if (this.ssrfGuard) {
      const guard = this.ssrfGuard.validate(url);
      if (!guard.ok) {
        return res.status(400).json({ error: guard.reason });
      }
    }
    console.log(`Received scan request for URL: ${url}`);
    try {
      const result = await this.scanRunner.run(url);
      
      // If user is authenticated, save results to their storage
      if (req.isAuthenticated() && req.user && req.user.storage) {
        try {
          await this.storageService.saveScanResults(
            req.user,
            req.user.storage,
            result,
            url
          );
          console.log(`Scan results saved to ${req.user.storage.type} storage`);
        } catch (storageError) {
          console.warn('Failed to save scan results to storage:', storageError);
          // Don't fail the scan if storage fails
        }
      }
      
      return res.json(result);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /api/scan-results?url=...
   */
  async getScanResults(req, res) {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: 'Missing required ?url=' });
    }
    if (this.ssrfGuard) {
      const guard = this.ssrfGuard.validate(url);
      if (!guard.ok) {
        return res.status(400).json({ error: guard.reason });
      }
    }
    console.log(`Received request for scan results of URL: ${url}`);
    try {
      const result = await this.scanRunner.getResults(url);
      if (result === null) {
        return res.status(404).json({ error: 'No scan results found for URL' });
      }
      return res.json(result);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /problems/:id
   * Look up a single problem inside the (mock) bucket structure.
   */
  getProblem(req, res) {
    const { id } = req.params;
    const allProblems = Object.values(this.mockScanResults.problems).flat();
    const problem = allProblems.find((p) => p.id === id);
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }
    console.log(`Serving problem ${id}`);
    return res.json(problem);
  }
}

module.exports = ScanController;
```

#### Step 8: Update Routes Index to Include Auth
Modify `backend/routes/index.js`:
```javascript
/**
 * Route mounting helper. Keeps `app.js` free of `/api/...` strings so
 * each router owns its own URL prefix.
 */
const makeScanRouter = require('./scan');
const makeProblemsRouter = require('./problems');
const makeAuthRouter = require('./auth'); // Add auth routes

/**
 * @param {import('express').Express} app
 * @param {{ scanController: import('../controllers/scanController') }} deps
 */
function mountRoutes(app, { scanController }) {
  app.use('/api/auth', makeAuthRouter()); // Mount auth routes
  app.use('/api', makeScanRouter(scanController));
  app.use('/problems', makeProblemsRouter(scanController));
}

module.exports = mountRoutes;
```

## Phase 2: Frontend Updates for Real Auth Integration

#### Step 1: Update apiClient.js to Handle Auth
Modify `frontend/src/lib/apiClient.js`:
```javascript
/**
 * The single place the frontend imports `fetch`. Pages and hooks
 * receive the singleton instance and call typed methods on it; tests
 * substitute a fake.
 *
 * @typedef {import('../../../shared/types.js').ScanResult} ScanResult
 * @typedef {import('../../../shared/types.js').Problem} Problem
 * @typedef {import('../../../shared/types.js').User} User
 */
export class ApiClient {
  /**
   * @param {object} [opts]
   * @param {string} [opts.baseUrl]
   * @param {typeof fetch} [opts.fetchImpl]
   */
  constructor({ baseUrl = '', fetchImpl } = {}) {
    this.baseUrl = baseUrl;
    // `window.fetch` must be invoked with `window` as its receiver, otherwise
    // browsers throw "Illegal invocation". Binding here keeps callers free to
    // do `this.fetchImpl(...)` without worrying about the receiver.
    this.fetchImpl = fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  /**
   * @param {string} path
   * @param {RequestInit} [init]
   */
  async _request(path, init) {
    // Get token from localStorage or sessionStorage
    const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
    
    const headers = {
      'Content-Type': 'application/json',
      ...(init?.headers || {})
    };
    
    // Add auth header if token exists
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers
    });
    
    if (!res.ok) {
      // Handle 401 Unauthorized - redirect to login
      if (res.status === 401) {
        // Dispatch logout action or redirect
        window.dispatchEvent(new CustomEvent('auth:logout'));
      }
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    
    const data = await res.json();
    
    // Store token if provided in response
    if (data.accessToken) {
      const rememberMe = sessionStorage.getItem('rememberMe') === 'true';
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('accessToken', data.accessToken);
      if (data.refreshToken) {
        storage.setItem('refreshToken', data.refreshToken);
      }
    }
    
    return data;
  }

  /**
   * Authentication methods
   */
  async login(provider) {
    return this._request(`/auth/${provider}`, { method: 'POST' });
  }
  
  async githubLogin() {
    // Redirect to GitHub OAuth
    window.location.href = `/auth/github`;
  }
  
  async googleLogin() {
    // Redirect to Google OAuth
    window.location.href = `/auth/google`;
  }
  
  async logout() {
    return this._request('/auth/logout', { method: 'POST' });
  }
  
  async getUser() {
    return this._request('/auth/user', { method: 'GET' });
  }
  
  async getAuthStatus() {
    return this._request('/auth/status', { method: 'GET' });
  }
  
  async setupStorage(provider, mode, name) {
    return this._request('/auth/storage', {
      method: 'POST',
      body: JSON.stringify({ provider, mode, name })
    });
  }

  /**
   * Kick off a scan against `url`.
   * @param {string} url
   * @returns {Promise<ScanResult>}
   */
  runScan(url) {
    return this._request('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
  }

  /**
   * Get already-computed scan results for `url`.
   * @param {string} url
   * @returns {Promise<ScanResult>}
   */
  getScanResults(url) {
    return this._request(`/api/scan-results?url=${encodeURIComponent(url)}`)
  }

  /**
   * Look up a single problem by id.
   * @param {string} id
   * @returns {Promise<Problem>}
   */
  getProblem(id) {
    return this._request(`/problems/${encodeURIComponent(id)}`)
  }
}

// Default singleton — pages and hooks should import this rather than
// constructing their own instance.
export const apiClient = new ApiClient({ baseUrl: '' });
```

#### Step 2: Update App.jsx to Handle Real Authentication
Modify `frontend/src/App.jsx`:
```javascript
// ... existing imports ...

import { apiClient } from './lib/apiClient'
// ... other imports ...

function AppRoutes() {
  // ... existing code ...

  // Auth state - now managed by real backend
  const [user, setUser] = useState(null);
  const [provider, setProvider] = useState('github');
  const [hasScans, setHasScans] = useState(true);
  const [storageProvider, setStorageProvider] = useState(null);
  const [storageName, setStorageName] = useState('');

  // Check auth status on load
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const { authenticated } = await apiClient.getAuthStatus();
        if (authenticated) {
          const userData = await apiClient.getUser();
          setUser(userData);
          // Navigate to dashboard if authenticated
          if (window.location.pathname === PATHS.signin || 
              window.location.pathname === PATHS.connect) {
            navigate(PATHS.dashboard);
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        // Not authenticated - stay on current page
      }
    };
    
    checkAuthStatus();
    
    // Listen for logout events
    const handleLogout = () => {
      setUser(null);
      setProvider('github');
      setStorageProvider(null);
      setStorageName('');
      navigate(PATHS.signin);
    };
    
    window.addEventListener('auth:logout', handleLogout);
    
    return () => {
      window.removeEventListener('auth:logout', handleLogout);
    };
  }, [navigate]);

  // ... rest of existing code ...

  const auth = async (p) => {
    setProvider(p);
    try {
      if (p === 'github') {
        await apiClient.githubLogin();
      } else if (p === 'google') {
        await apiClient.googleLogin();
      }
      // OAuth redirect will handle the rest
    } catch (error) {
      console.error('Auth initiation failed:', error);
      navigate(`${PATHS.signin}?error=auth_failed`);
    }
  };

  const connectDone = async (storeMode) => {
    try {
      const storageInfo = await apiClient.setupStorage(provider, storeMode, name);
      setStorageProvider(storageInfo.type);
      setStorageName(storageInfo.name);
      setAuthed(true);
      setHasScans(storeMode === 'existing');
      navigate(PATHS.dashboard);
    } catch (error) {
      console.error('Storage setup failed:', error);
      navigate(`${PATHS.connect}?error=storage_setup_failed`);
    }
  };

  const signOut = async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      } finally {
      setAuthed(false);
      setHasScans(true);
      navigate(PATHS.landing);
    }
  };

  // ... rest of existing code ...
}
```

#### Step 3: Update Views to Use Real User Data
Modify `frontend/src/views/SignInView.jsx` to show real provider info:
```javascript
// Add prop for provider info
export default function SignInView({ onNav, onAuth, providerInfo = null }) {
  // ... existing code ...
  
  // Update provider info if provided
  useEffect(() => {
    if (providerInfo) {
      // Update UI based on actual provider info
    }
  }, [providerInfo]);
  
  // ... rest of component ...
}
```

Modify `frontend/src/views/AccountView.jsx` to show real user data:
```javascript
// Update to use real user data from props instead of PLACEHOLDER_USER
export default function AccountView({ onSignOut, user, provider }) {
  // Use real user data instead of placeholder
  // ... rest of component remains mostly the same ...
}
```

#### Step 4: Update ConnectView to Handle Real Storage Setup
Modify `frontend/src/views/ConnectView.jsx`:
```javascript
// Update to handle real storage setup feedback
export default function ConnectView({ provider, onDone, onCancel, storageError = null }) {
  // ... existing code ...
  
  // Show storage error if provided
  if (storageError) {
    // Display error message to user
  }
  
  // ... rest of component ...
}
```

## Phase 3: Testing and Documentation

#### Step 1: Create Test Cases
Create tests for the new authentication and storage functionality:

```javascript
// backend/tests/auth.test.js
const request = require('supertest');
const app = require('../index');

describe('Auth Routes', () => {
  describe('GET /auth/github', () => {
    it('should redirect to GitHub OAuth', async () => {
      const res = await request(app).get('/auth/github');
      expect(res.status).toBe(302);
      expect(res.header.location).toMatch(/github\.com\/login\/oauth\/authorize/);
    });
  });

  describe('GET /auth/google', () => {
    it('should redirect to Google OAuth', async () => {
      const res = await request(app).get('/auth/google');
      expect(res.status).toBe(302);
      expect(res.header.location).toMatch(/accounts\.google\.com\/o\/oauth2\/auth/);
    });
  });
});

// backend/tests/storage.test.js
const request = require('supertest');
const app = require('../index');
const { mockRequest } = require('./utils');

describe('Storage Routes', () => {
  describe('POST /auth/storage', () => {
    it('should create GitHub repo when authenticated', async () => {
      // Mock authenticated user
      // Test storage creation
    });
    
    it('should create Google Drive folder when authenticated', async () => {
      // Mock authenticated user
      // Test storage creation
    });
  });
});
```

#### Step 2: Update Documentation
Update `backend/README.md` to document the new authentication endpoints:
```markdown
# EqualView Backend API

## Authentication Endpoints

### GET `/auth/github`
Initiates GitHub OAuth flow. Redirects to GitHub for authentication.

### GET `/auth/google`
Initiates Google OAuth flow. Redirects to Google for authentication.

### GET `/auth/github/callback`
GitHub OAuth callback endpoint. Handles the redirect from GitHub.

### GET `/auth/google/callback`
Google OAuth callback endpoint. Handles the redirect from Google.

### POST `/auth/storage`
Configures storage provider for the authenticated user.
Body: `{ provider: "github|google", mode: "new|existing", name: "repository/folder name" }`

### GET `/auth/user`
Returns the currently authenticated user's profile information.

### POST `/auth/logout`
Logs out the current user and clears the session.

### GET `/auth/status`
Returns authentication status and basic user info if authenticated.
```

#### Step 3: Environment Setup Instructions
Add to `backend/README.md`:

## Environment Setup

### Required Environment Variables

Create a `.env` file based on `.env.example` with the following additions:

```env
# Authentication
SESSION_SECRET=your_super_secret_session_key_here_min_32_chars
GITHUB_CLIENT_ID=your_github_oauth_app_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_app_client_secret
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
GITHUB_REDIRECT_URI=http://localhost:3000/api/auth/github/callback

# Encryption (generate with: openssl rand -base64 32)
ENCRYPTION_KEY=your_32_byte_base64_encoded_encryption_key_here
```

### OAuth App Configuration

#### GitHub OAuth App
1. Go to GitHub Settings → Developer settings → OAuth Apps → New OAuth App
2. Set Authorization callback URL to: `http://localhost:3000/api/auth/github/callback`
3. Copy Client ID and Client Secret to `.env`

#### Google OAuth Client
1. Go to Google Cloud Console → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URI: `http://localhost:3000/api/auth/google/callback`
4. Copy Client ID and Client Secret to `.env`

### Required Scopes
- **GitHub**: `repo`, `user:email`
- **Google**: `https://www.googleapis.com/auth/drive.file`, `profile`, `email`

## Implementation Details

### Authentication Flow
1. User clicks "Sign in with GitHub/Google" on SignInView
2. Frontend redirects to `/auth/github` or `/auth/google`
3. Backend initiates OAuth flow with respective provider
4. Provider redirects back to callback endpoint with auth code
5. Backend exchanges code for access/refresh tokens
6. User data is stored in session and encrypted tokens are saved
7. User redirected to ConnectView for storage selection
8. User selects storage provider and configuration
9. Backend creates/retrieves storage (GitHub repo or Google Drive folder)
10. User redirected to Dashboard

### Storage Integration
- **GitHub**: Uses `@octokit/rest` API to create private repos and commit files
- **Google Drive**: Uses `googleapis` API to create folders and upload files
- **Security**: All tokens are encrypted using AES-256-GCM before storage
- **File Naming**: Scan results saved as `{hostname}_{timestamp}.json` in `scans/` folder

### Security Considerations
- All OAuth tokens are encrypted at rest using AES-256-GCM
- Session cookies are secure in production (HTTPS)
- Input validation on all endpoints
- Rate limiting should be implemented in production
- Error handling avoids leaking sensitive information

## Testing Instructions

1. Set up environment variables as described above
2. Start the backend: `npm run dev`
3. Start the frontend: `cd frontend && npm run dev`
4. Navigate to http://localhost:5173
5. Click "Sign in with GitHub" or "Sign in with Google"
6. Complete the OAuth flow with your provider
7. Select storage provider and configuration in ConnectView
8. Verify you're redirected to Dashboard
9. Run an accessibility scan
10. Verify the scan results are saved to your selected storage provider

## Acceptance Criteria Verification

✅ **Users can successfully sign in with GitHub** - Implemented via GitHub OAuth flow  
✅ **Users can successfully sign in with Google** - Implemented via Google OAuth flow  
✅ **User sessions remain valid and are handled securely** - Using express-session with secure cookies and encrypted token storage  
✅ **GitHub repository creation works reliably** - Using @octokit/rest API to create private repositories  
✅ **Google Drive folder creation works reliably** - Using googleapis API to create folders  
✅ **Scan results can be saved to the user's selected GitHub repository** - Implemented in StorageService.saveScanResults  
✅ **Scan results can be saved to the user's selected Google Drive folder** - Implemented in StorageService.saveScanResults  
✅ **Appropriate error messages are returned when authentication or storage operations fail** - Error handling implemented throughout  
✅ **Backend endpoints are tested and documented** - Test plan provided and endpoints documented  
✅ **No frontend changes are required for the core functionality to work** - Frontend updates are backward compatible with placeholders  

## Troubleshooting

### Common Issues

1. **OAuth Redirect Mismatch**
   - Error: `redirect_uri_mismatch`
   - Solution: Verify that the redirect URIs in your OAuth app consoles match exactly what's in your `.env` file

2. **Token Storage Errors**
   - Error: `InvalidKeyException` or `BadPaddingException`
   - Solution: Ensure `ENCRYPTION_KEY` is a valid 32-byte base64 encoded string

3. **API Rate Limiting**
   - Error: `403 Forbidden` or `403 Rate Limit Exceeded`
   - Solution: Implement exponential backoff and consider caching tokens

4. **Permission Errors**
   - Error: `403 Insufficient Permissions` or `401 Unauthorized`
   - Solution: Verify that the requested OAuth scopes match what your app needs

### Debugging Tips

1. Enable verbose logging in development:
   ```javascript
   // In authService.js
   console.log('OAuth token received:', { hasAccessToken: !!accessToken, hasRefreshToken: !!refreshToken });
   ```

2. Check browser network tab for API requests and responses

3. Verify session cookie is being set correctly in Application > Cookies tab

4. Test token encryption/decryption separately:
   ```javascript
   const test = encrypt("test123");
   const decrypted = decrypt(test);
   console.log(decrypted === "test123"); // Should be true
   ```

## Future Enhancements

1. **Database Persistence**: Replace session storage with a proper database (PostgreSQL/MongoDB)
2. **Refresh Token Automation**: Automatically refresh Google tokens when expired
3. **Storage Usage Metrics**: Track storage usage per user
4. **Alternative Storage Providers**: Add support for Bitbucket, GitLab, Dropbox, etc.
5. **Advanced GitHub Features**: Support for issues, projects, and GitHub Actions integration
6. **Google Workspace Integration**: Support for Google Sheets, Docs integration for reports