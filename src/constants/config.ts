// Network relay configuration
// Switch between local dev server and production relay
export const RELAY_URL = __DEV__
  ? 'ws://10.0.0.169:8080'   // Local dev relay (run relay-server/ on your Mac)
  : 'wss://mobile-madapoly.onrender.com';  // Production relay (Render)

export const RELAY_HTTP_URL = __DEV__
  ? 'http://10.0.0.169:8080'  // Local dev relay HTTP
  : 'https://mobile-madapoly.onrender.com'; // Production relay HTTP

export const RELAY_PORT = 8080;
export const LAN_PORT = 3000;
