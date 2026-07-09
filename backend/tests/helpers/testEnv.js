/**
 * Test-only auth env defaults. Never used by index.js — production must set
 * SESSION_SECRET and ENCRYPTION_KEY in backend/.env.
 */
if (!process.env.SESSION_SECRET) {
  process.env.SESSION_SECRET = 'test-session-secret-min-32-characters';
}
if (!process.env.ENCRYPTION_KEY) {
  process.env.ENCRYPTION_KEY = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
}

module.exports = {
  TEST_SESSION_SECRET: process.env.SESSION_SECRET,
  TEST_ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
};
