/**
 * AuthService — Passport strategies, session middleware, token encryption,
 * and authenticated provider clients for the storage service.
 *
 * No user DB: the session payload (identity + encrypted tokens + attached
 * `storage`) is the user. Google auth/Drive clients are stubbed until Phase 3.
 */
const crypto = require('crypto');
const session = require('express-session');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const { Octokit } = require('@octokit/rest');

const GOOGLE_NOT_AVAILABLE = 'Google auth is not available until Phase 3';

class AuthService {
  /**
   * @param {object} [deps]
   * @param {string} [deps.sessionSecret]
   * @param {string} [deps.encryptionKey] base64-encoded 32-byte key
   * @param {string} [deps.githubClientId] GitHub App OAuth client id
   * @param {string} [deps.githubClientSecret]
   * @param {string} [deps.githubCallbackUrl]
   */
  constructor(deps = {}) {
    this.sessionSecret = deps.sessionSecret ?? process.env.SESSION_SECRET;
    this.encryptionKeyB64 = deps.encryptionKey ?? process.env.ENCRYPTION_KEY;
    this.githubClientId =
      deps.githubClientId ??
      process.env.GITHUB_APP_CLIENT_ID ??
      process.env.GITHUB_APP_ID ??
      process.env.GITHUB_CLIENT_ID;
    this.githubClientSecret =
      deps.githubClientSecret ??
      process.env.GITHUB_APP_CLIENT_SECRET ??
      process.env.GITHUB_CLIENT_SECRET;
    this.githubCallbackUrl =
      deps.githubCallbackUrl ?? process.env.GITHUB_REDIRECT_URI;

    this._encryptionKey = this._parseEncryptionKey(this.encryptionKeyB64);
    this._passportConfigured = false;
    this._configurePassport();
  }

  /** @param {string | undefined} b64 */
  _parseEncryptionKey(b64) {
    if (!b64) {
      return null;
    }
    const key = Buffer.from(b64, 'base64');
    if (key.length !== 32) {
      throw new Error(
        'ENCRYPTION_KEY must decode to 32 bytes (openssl rand -base64 32)',
      );
    }
    return key;
  }

  _configurePassport() {
    if (this._passportConfigured) {
      return;
    }

    passport.serializeUser((user, done) => done(null, user));
    passport.deserializeUser((user, done) => done(null, user));

    if (
      this.githubClientId &&
      this.githubClientSecret &&
      this.githubCallbackUrl
    ) {
      passport.use(
        'github',
        new GitHubStrategy(
          {
            clientID: this.githubClientId,
            clientSecret: this.githubClientSecret,
            callbackURL: this.githubCallbackUrl,
            scope: ['read:user', 'user:email'],
          },
          (accessToken, _refreshToken, profile, done) => {
            try {
              done(null, this._buildGitHubUser(accessToken, profile));
            } catch (err) {
              done(err);
            }
          },
        ),
      );
    }

    // Google strategy: Phase 3 — intentionally not registered here.

    this._passportConfigured = true;
  }

  /**
   * @param {string} accessToken
   * @param {import('passport-github2').Profile} profile
   */
  _buildGitHubUser(accessToken, profile) {
    const primaryEmail =
      profile.emails?.find((entry) => entry.primary)?.value ??
      profile.emails?.[0]?.value ??
      null;

    return {
      id: String(profile.id),
      provider: 'github',
      username: profile.username,
      displayName: profile.displayName || profile.username,
      email: primaryEmail,
      avatarUrl: profile.photos?.[0]?.value ?? null,
      tokens: {
        github: {
          accessToken: this.encrypt(accessToken),
        },
      },
      storage: null,
    };
  }

  /**
   * AES-256-GCM encrypt. Returns `iv.authTag.ciphertext` (base64 segments).
   * @param {string} plaintext
   */
  encrypt(plaintext) {
    if (!this._encryptionKey) {
      throw new Error('ENCRYPTION_KEY is not configured');
    }

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this._encryptionKey, iv);
    const encrypted = Buffer.concat([
      cipher.update(String(plaintext), 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return [
      iv.toString('base64'),
      authTag.toString('base64'),
      encrypted.toString('base64'),
    ].join('.');
  }

  /** @param {string} ciphertext */
  decrypt(ciphertext) {
    if (!this._encryptionKey) {
      throw new Error('ENCRYPTION_KEY is not configured');
    }

    const [ivB64, tagB64, dataB64] = ciphertext.split('.');
    if (!ivB64 || !tagB64 || !dataB64) {
      throw new Error('Invalid encrypted token format');
    }

    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(tagB64, 'base64');
    const encrypted = Buffer.from(dataB64, 'base64');
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this._encryptionKey,
      iv,
    );
    decipher.setAuthTag(authTag);

    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString('utf8');
  }

  /** @returns {import('express').RequestHandler[]} */
  middleware() {
    if (!this.sessionSecret) {
      throw new Error('SESSION_SECRET is not configured');
    }

    const sessionMiddleware = session({
      secret: this.sessionSecret,
      resave: false,
      saveUninitialized: false,
      name: 'equalview.sid',
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    });

    return [sessionMiddleware, passport.initialize(), passport.session()];
  }

  /**
   * @param {object} user session payload
   * @returns {import('@octokit/rest').Octokit}
   */
  getGitHubClient(user) {
    const encrypted = user?.tokens?.github?.accessToken;
    if (!encrypted) {
      throw new Error('GitHub access token is not available for this user');
    }

    const accessToken = this.decrypt(encrypted);
    return new Octokit({ auth: accessToken });
  }

  /**
   * Phase 3 stub — returns null until Google Drive adapter lands.
   * @param {object} _user
   * @returns {null}
   */
  getGoogleDriveClient(_user) {
    return null;
  }

  /**
   * Phase 3 stub.
   * @param {object} _user
   */
  async refreshGoogleToken(_user) {
    const err = new Error(GOOGLE_NOT_AVAILABLE);
    err.code = 'GOOGLE_NOT_AVAILABLE';
    throw err;
  }

  /**
   * Build provider clients for routes/controller → storage service.
   * @param {object} user session payload
   * @returns {Promise<{ githubClient?: import('@octokit/rest').Octokit, driveClient?: null }>}
   */
  async clientsFor(user) {
    /** @type {{ githubClient?: import('@octokit/rest').Octokit, driveClient?: null }} */
    const clients = {};

    if (user?.tokens?.github?.accessToken) {
      clients.githubClient = this.getGitHubClient(user);
    }

    const driveClient = this.getGoogleDriveClient(user);
    if (driveClient) {
      clients.driveClient = driveClient;
    }

    return clients;
  }

  /**
   * Passport authenticate helper for auth routes.
   * @param {object} [options]
   */
  authenticateGitHub(options = {}) {
    return passport.authenticate('github', { session: true, ...options });
  }
}

module.exports = AuthService;
