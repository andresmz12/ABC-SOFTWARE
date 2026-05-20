// Stub for @opentelemetry/api — not needed in React Native / web bundle
module.exports = {
  trace: { getTracer: () => ({ startSpan: () => ({ end: () => {}, setAttribute: () => {} }) }) },
  context: { with: (_ctx, fn) => fn(), active: () => ({}) },
  propagation: { inject: () => {}, extract: () => ({}) },
  SpanStatusCode: { OK: 0, ERROR: 1 },
};
