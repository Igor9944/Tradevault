// src/utils/logger.ts
// Development-only logger to replace console.* calls in production builds
const isDev = import.meta.env.MODE !== 'production';

export const log = {
  info: (msg: any) => { if (isDev) console.info(msg); },
  warn: (msg: any) => { if (isDev) console.warn(msg); },
  error: (msg: any) => { if (isDev) console.error(msg); },
  debug: (msg: any) => { if (isDev) console.debug(msg); },
};