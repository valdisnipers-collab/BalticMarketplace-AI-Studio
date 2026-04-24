// server/middleware/requireAdmin.ts
//
// Thin re-export of the existing `isAdmin` check from utils/auth. Having
// this file keeps import sites readable — `import { requireAdmin } from
// 'server/middleware/requireAdmin'` reads as intent, not implementation.

export { isAdmin as requireAdmin } from '../utils/auth';
