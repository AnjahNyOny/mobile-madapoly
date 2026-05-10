import TcpSocket from 'react-native-tcp-socket';
import * as Network from 'expo-network';

// Standard network packet format
export interface NetworkPacket {
  type: string;
  payload?: any;
}

// ── Internal State ──
let server: TcpSocket.Server | null = null;
const connectedClients: Map<string, TcpSocket.Socket> = new Map();

let clientSocket: TcpSocket.Socket | null = null;

// Callbacks
export type MessageHandler = (packet: NetworkPacket, clientId?: string) => void;
let onMessageCallback: MessageHandler | null = null;
let onConnectionCallback: ((clientId: string) => void) | null = null;
let onDisconnectCallback: ((clientId: string) => void) | null = null;

// ── Heartbeat State ──
const HEARTBEAT_INTERVAL_MS = 4000;   // Send PING every 4 seconds
const HEARTBEAT_TIMEOUT_MS = 10000;   // Consider dead after 10s without PONG

// Client-side heartbeat
let clientHeartbeatInterval: ReturnType<typeof setInterval> | null = null;
let clientLastPongTimestamp: number = 0;
let clientHeartbeatCheckInterval: ReturnType<typeof setInterval> | null = null;

// Host-side heartbeat tracking (per client)
const clientLastPingTimestamp: Map<string, number> = new Map();
let hostHeartbeatInterval: ReturnType<typeof setInterval> | null = null;

export const NetworkManager = {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ── HOST METHODS (Server)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async getLocalIpAddress(): Promise<string | null> {
    try {
      const ip = await Network.getIpAddressAsync();
      return ip;
    } catch (e) {
      console.warn('Failed to get IP address from expo-network:', e);
      return null;
    }
  },

  startServer(port: number = 3000): Promise<string> {
    return new Promise(async (resolve, reject) => {
      if (server) {
        server.close();
      }

      const hostIp = await NetworkManager.getLocalIpAddress();
      if (!hostIp) {
        reject(new Error('Could not determine local IP address'));
        return;
      }

      server = TcpSocket.createServer((socket) => {
        const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
        console.log(`[Host] Client connected: ${clientId}`);
        
        connectedClients.set(clientId, socket);
        clientLastPingTimestamp.set(clientId, Date.now());
        if (onConnectionCallback) onConnectionCallback(clientId);

        socket.on('data', (data) => {
          try {
            // TCP packets might be concatenated, we assume a newline separator logic or just pure JSON for now.
            // Using split('\n') ensures we process batched packets correctly.
            const messages = data.toString().trim().split('\n');
            for (const msg of messages) {
              if (!msg) continue;
              const packet: NetworkPacket = JSON.parse(msg);

              // ── Heartbeat: Client replied with PONG ──
              if (packet.type === '__PONG__') {
                clientLastPingTimestamp.set(clientId, Date.now());
                continue; // Don't forward heartbeat to app logic
              }

              console.log(`[Host] Received from ${clientId}:`, packet.type);
              if (onMessageCallback) onMessageCallback(packet, clientId);
            }
          } catch (e) {
            console.error(`[Host] Failed to parse data from ${clientId}:`, e);
          }
        });

        // Guard: prevent double-fire of disconnect callback per client
        let clientDidDisconnect = false;
        const triggerClientDisconnect = () => {
          if (clientDidDisconnect) return;
          clientDidDisconnect = true;
          connectedClients.delete(clientId);
          clientLastPingTimestamp.delete(clientId);
          if (onDisconnectCallback) onDisconnectCallback(clientId);
        };

        socket.on('error', (error) => {
          console.error(`[Host] Socket error with ${clientId}:`, error);
          triggerClientDisconnect();
        });

        socket.on('close', () => {
          console.log(`[Host] Client disconnected: ${clientId}`);
          triggerClientDisconnect();
        });
      });

      server.on('error', (error) => {
        console.error('[Host] Server error:', error);
        reject(error);
      });

      server.listen({ port, host: '0.0.0.0' }, () => {
        console.log(`[Host] Server listening on ${hostIp}:${port}`);
        // Start host-side heartbeat checker
        NetworkManager._startHostHeartbeat();
        resolve(hostIp);
      });
    });
  },

  broadcast(packet: NetworkPacket) {
    if (!server) return;
    
    // Add newline as delimiter for the receiving end
    const message = JSON.stringify(packet) + '\n';
    connectedClients.forEach((socket, clientId) => {
      try {
        socket.write(message);
      } catch (e) {
        console.error(`[Host] Failed to send to ${clientId}:`, e);
      }
    });
  },

  /**
   * Send a packet to a specific connected client by their socket ID.
   * Used for targeted messages like ASSIGN_PLAYER_ID.
   */
  sendTo(clientId: string, packet: NetworkPacket) {
    const socket = connectedClients.get(clientId);
    if (!socket) {
      console.warn(`[Host] sendTo: client ${clientId} not found`);
      return;
    }
    try {
      const message = JSON.stringify(packet) + '\n';
      socket.write(message);
    } catch (e) {
      console.error(`[Host] Failed to sendTo ${clientId}:`, e);
    }
  },

  closeServer() {
    NetworkManager._stopHostHeartbeat();
    if (server) {
      server.close();
      server = null;
    }
    connectedClients.clear();
    clientLastPingTimestamp.clear();
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ── CLIENT METHODS (Client)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  connectToServer(ip: string, port: number = 3000): Promise<void> {
    return new Promise((resolve, reject) => {
      if (clientSocket) {
        clientSocket.destroy();
      }

      // Guard: prevent double-fire of disconnect callback
      // TCP sockets emit 'error' then 'close' sequentially
      let didDisconnect = false;
      const triggerDisconnect = () => {
        if (didDisconnect) return;
        didDisconnect = true;
        NetworkManager._stopClientHeartbeat();
        clientSocket = null;
        if (onDisconnectCallback) onDisconnectCallback('host');
      };

      console.log(`[Client] Connecting to ${ip}:${port}...`);
      
      clientSocket = TcpSocket.createConnection({
        port,
        host: ip,
      }, () => {
        console.log(`[Client] Connected to ${ip}:${port}`);
        // Start client-side heartbeat
        NetworkManager._startClientHeartbeat();
        resolve();
      });

      clientSocket.on('data', (data) => {
        try {
          const messages = data.toString().trim().split('\n');
          for (const msg of messages) {
            if (!msg) continue;
            const packet: NetworkPacket = JSON.parse(msg);

            // ── Heartbeat: Host sent us a PING, reply with PONG ──
            if (packet.type === '__PING__') {
              clientLastPongTimestamp = Date.now(); // Record that host is alive
              NetworkManager.sendMessage({ type: '__PONG__' });
              continue; // Don't forward heartbeat to app logic
            }

            console.log(`[Client] Received:`, packet.type);
            if (onMessageCallback) onMessageCallback(packet, 'host');
          }
        } catch (e) {
          console.error(`[Client] Failed to parse data:`, e);
        }
      });

      clientSocket.on('error', (error) => {
        console.error('[Client] Socket error:', error);
        triggerDisconnect();
        reject(error);
      });

      clientSocket.on('close', () => {
        console.log('[Client] Connection closed');
        triggerDisconnect();
      });
    });
  },

  sendMessage(packet: NetworkPacket) {
    if (!clientSocket) {
      console.warn('[Client] Cannot send message, not connected');
      return;
    }
    try {
      const message = JSON.stringify(packet) + '\n';
      clientSocket.write(message);
    } catch (e) {
      console.error('[Client] Failed to send message:', e);
    }
  },

  disconnect() {
    NetworkManager._stopClientHeartbeat();
    if (clientSocket) {
      clientSocket.destroy();
      clientSocket = null;
    }
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ── HEARTBEAT — Active failure detection
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * HOST: Periodically send PING to all clients and check for stale ones.
   * If a client hasn't sent a PONG within HEARTBEAT_TIMEOUT_MS, consider it dead.
   */
  _startHostHeartbeat() {
    NetworkManager._stopHostHeartbeat();

    hostHeartbeatInterval = setInterval(() => {
      const now = Date.now();

      // Send PING to all clients
      const pingMessage = JSON.stringify({ type: '__PING__' }) + '\n';
      connectedClients.forEach((socket, clientId) => {
        try {
          socket.write(pingMessage);
        } catch (e) {
          console.error(`[Host/HB] Failed to ping ${clientId}:`, e);
        }
      });

      // Check for stale clients
      clientLastPingTimestamp.forEach((lastPong, clientId) => {
        if (now - lastPong > HEARTBEAT_TIMEOUT_MS) {
          console.warn(`[Host/HB] Client ${clientId} timed out (no PONG for ${HEARTBEAT_TIMEOUT_MS}ms)`);
          const socket = connectedClients.get(clientId);
          if (socket) {
            socket.destroy(); // Force close — will trigger 'close' event
          }
          connectedClients.delete(clientId);
          clientLastPingTimestamp.delete(clientId);
          if (onDisconnectCallback) onDisconnectCallback(clientId);
        }
      });
    }, HEARTBEAT_INTERVAL_MS);
  },

  _stopHostHeartbeat() {
    if (hostHeartbeatInterval) {
      clearInterval(hostHeartbeatInterval);
      hostHeartbeatInterval = null;
    }
  },

  /**
   * CLIENT: Track when we last received a PING from the host.
   * If no PING arrives within HEARTBEAT_TIMEOUT_MS, consider the host dead.
   */
  _startClientHeartbeat() {
    NetworkManager._stopClientHeartbeat();
    clientLastPongTimestamp = Date.now(); // Initialize with "now" (just connected)

    clientHeartbeatCheckInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - clientLastPongTimestamp;

      if (elapsed > HEARTBEAT_TIMEOUT_MS) {
        console.warn(`[Client/HB] Host timed out (no PING for ${elapsed}ms)`);
        NetworkManager._stopClientHeartbeat();
        // Force-close the socket and trigger disconnect
        if (clientSocket) {
          clientSocket.destroy();
          clientSocket = null;
        }
        if (onDisconnectCallback) onDisconnectCallback('host');
      }
    }, HEARTBEAT_INTERVAL_MS);
  },

  _stopClientHeartbeat() {
    if (clientHeartbeatInterval) {
      clearInterval(clientHeartbeatInterval);
      clientHeartbeatInterval = null;
    }
    if (clientHeartbeatCheckInterval) {
      clearInterval(clientHeartbeatCheckInterval);
      clientHeartbeatCheckInterval = null;
    }
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ── FULL CLEANUP
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Clean up ALL network state — called when returning to lobby after disconnect.
   * Stops heartbeats, closes sockets, clears all state.
   */
  cleanup() {
    NetworkManager._stopClientHeartbeat();
    NetworkManager._stopHostHeartbeat();
    if (clientSocket) {
      clientSocket.destroy();
      clientSocket = null;
    }
    if (server) {
      server.close();
      server = null;
    }
    connectedClients.clear();
    clientLastPingTimestamp.clear();
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ── COMMON CALLBACK REGISTRATION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  onMessage(callback: MessageHandler) {
    onMessageCallback = callback;
  },

  onConnection(callback: (clientId: string) => void) {
    onConnectionCallback = callback;
  },

  onDisconnect(callback: (clientId: string) => void) {
    onDisconnectCallback = callback;
  }
};
