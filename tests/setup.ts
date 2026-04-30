import '@testing-library/jest-dom/vitest';

// Provide a dummy GROQ_API_KEY so modules that import the Groq client at the
// top level (e.g. scripts/ingest/extract.ts) can be loaded under unit tests
// without hitting the SDK's "missing API key" guard. Tests that exercise live
// Groq calls live in tests/integration and load .env.local separately.
if (!process.env.GROQ_API_KEY) {
  process.env.GROQ_API_KEY = 'test-dummy-key';
}
