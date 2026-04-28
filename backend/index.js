/**
 * Server entry point. Builds the app via the composition root and
 * binds it to the configured port.
 */
require('dotenv').config();

const buildApp = require('./app');

const PORT = process.env.PORT || 3000;

const app = buildApp();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
