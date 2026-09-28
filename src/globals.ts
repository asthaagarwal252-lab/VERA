import { Buffer } from 'buffer'

// Midnight's browser SDK and a few transitive libraries expect these Node
// globals. They are intentionally minimal and contain no environment secrets.
Object.assign(globalThis, {
  Buffer,
  process: { env: { NODE_ENV: import.meta.env.MODE } },
})
