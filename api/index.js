// Vercel Serverless Function Entrypoint
// Redirects execution to the actual backend server
const app = require('../backend/src/server');

module.exports = app;
