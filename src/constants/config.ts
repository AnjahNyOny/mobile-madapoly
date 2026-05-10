// Network relay configuration
// Switch between local dev server and production relay
export const RELAY_URL = __DEV__
  ? 'ws://10.0.0.169:8080'   // Local dev relay (run relay-server/ on your Mac)
  : 'wss://relay.madapoly.com';  // Production relay (Railway / Render)

export const RELAY_PORT = 8080;
export const LAN_PORT = 3000;
