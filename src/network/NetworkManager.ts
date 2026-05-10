import { Platform } from 'react-native';
import * as Network from 'expo-network';
// react-native-tcp-socket contains native code — not available on web.
// Load it conditionally so the web bundle doesn't crash.
const TcpSocket: any =
  Platform.OS !== 'web' ? require('react-native-tcp-socket') : null;

// ── Transport mode ────────────────────────────────────────────────────────────
export type TransportMode = 'tcp' | 'websocket';
let activeTransport: TransportMode = 'tcp';
let relayUrl: string = '';

// Standard network packet format
export interface NetworkPacket {
  type: string;
  payload?: any;
}

// ── TCP Internal State ────────────────────────────────────────────────────────
let server: any = null;
const connectedClients: Map<string, any> = new Map();
let clientSocket: any = null;

// Helper to write large messages in chunks to prevent Android socket crashes
const safeSocketWrite = (socket: any, message: string) => {
  const CHUNK_SIZE = 8192;
  let offset = 0;
  const writeChunk = () => {
    if (offset >= message.length) return;
    const chunk = message.substring(offset, offset + CHUNK_SIZE);
    offset += CHUNK_SIZE;
    try {
      const flushed = socket.write(chunk);
      if (!flushed) {
        socket.once('drain', writeChunk);
      } else {
        writeChunk();
      }
    } catch (e) {
      console.error('[Network] Error writing chunk:', e);
    }
  };
  writeChunk();
};

// ── TCP Message Buffers (handles packet fragmentation) ──
let clientBuffer: string = '';
const hostBuffers: Map<string, string> = new Map();

// ── WebSocket Internal State ──────────────────────────────────────────────────
let wsSocket: WebSocket | null = null;                          // Client OR host relay socket
let wsRoomCode: string | null = null;                          // Room code (host creates, client joins)
let wsLocalSocketId: string | null = null;                     // Our relay-assigned socket ID
// WS connected clients (host only): relaySocketId → assigned game playerId
const wsConnectedClients: Map<string, { socketId: string; playerId?: string }> = new Map();

// ── Heartbeat State ───────────────────────────────────────────────────────────
const HEARTBEAT_INTERVAL_MS = 4000;
const HEARTBEAT_TIMEOUT_MS = 10000;

let clientHeartbeatInterval: ReturnType<typeof setInterval> | null = null;
let clientLastPongTimestamp: number = 0;
let clientHeartbeatCheckInterval: ReturnType<typeof setInterval> | null = null;
const clientLastPingTimestamp: Map<string, number> = new Map();
let hostHeartbeatInterval: ReturnType<typeof setInterval> | null = null;

// ── Common Callbacks ──────────────────────────────────────────────────────────
export type MessageHandler = (packet: NetworkPacket, clientId?: string) => void;
let onMessageCallback: MessageHandler | null = null;
let onConnectionCallback: ((clientId: string) => void) | null = null;
let onDisconnectCallback: ((clientId: string) => void) | null = null;

export const NetworkManager = {

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ── TRANSPORT SELECTION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  setTransport(mode: TransportMode, url?: string) {
    activeTransport = mode;
    if (url) relayUrl = url;
    console.log(`[Network] Transport set to: ${mode}${url ? ' (' + url + ')' : ''}`);
  },

  getTransport(): TransportMode {
    return activeTransport;
  },

  getRoomCode(): string | null {
    return wsRoomCode;
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ── HOST METHODS (TCP — unchanged)
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
      if (Platform.OS === 'web') {
        reject(new Error('TCP server not available on web'));
        return;
      }
      if (server) {
        server.close();
      }

      const hostIp = await NetworkManager.getLocalIpAddress();
      if (!hostIp) {
        reject(new Error('Could not determine local IP address'));
        return;
      }

      server = TcpSocket!.createServer((socket) => {
        socket.setEncoding('utf8');
        const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
        console.log(`[Host/TCP] Client connected: ${clientId}`);

        connectedClients.set(clientId, socket);
        clientLastPingTimestamp.set(clientId, Date.now());
        if (onConnectionCallback) onConnectionCallback(clientId);

        socket.on('data', (data) => {
          let buffer = hostBuffers.get(clientId) || '';
          buffer += data.toString();
          const parts = buffer.split('\n');
          hostBuffers.set(clientId, parts.pop() || '');

          for (const msg of parts) {
            if (!msg.trim()) continue;
            try {
              const packet: NetworkPacket = JSON.parse(msg);
              if (packet.type === '__PONG__') {
                clientLastPingTimestamp.set(clientId, Date.now());
                continue;
              }
              console.log(`[Host/TCP] Received from ${clientId}:`, packet.type);
              if (onMessageCallback) onMessageCallback(packet, clientId);
            } catch (e) {
              console.error(`[Host/TCP] Failed to parse message from ${clientId}:`, e);
            }
          }
        });

        let clientDidDisconnect = false;
        const triggerClientDisconnect = () => {
          if (clientDidDisconnect) return;
          clientDidDisconnect = true;
          connectedClients.delete(clientId);
          clientLastPingTimestamp.delete(clientId);
          hostBuffers.delete(clientId);
          if (onDisconnectCallback) onDisconnectCallback(clientId);
        };

        socket.on('error', (error) => {
          console.error(`[Host/TCP] Socket error with ${clientId}:`, error);
          triggerClientDisconnect();
        });

        socket.on('close', () => {
          console.log(`[Host/TCP] Client disconnected: ${clientId}`);
          triggerClientDisconnect();
        });
      });

      server.on('error', (error) => {
        console.error('[Host/TCP] Server error:', error);
        reject(error);
      });

      server.listen({ port, host: '0.0.0.0' }, () => {
        console.log(`[Host/TCP] Server listening on ${hostIp}:${port}`);
        NetworkManager._startHostHeartbeat();
        resolve(hostIp);
      });
    });
  },

  broadcast(packet: NetworkPacket) {
    if (activeTransport === 'websocket') {
      NetworkManager._wsBroadcast(packet);
      return;
    }
    if (!server) return;
    const message = JSON.stringify(packet) + '\n';
    connectedClients.forEach((socket) => {
      safeSocketWrite(socket, message);
    });
  },

  sendTo(clientId: string, packet: NetworkPacket) {
    if (activeTransport === 'websocket') {
      NetworkManager._wsSendTo(clientId, packet);
      return;
    }
    const socket = connectedClients.get(clientId);
    if (!socket) {
      console.warn(`[Host/TCP] sendTo: client ${clientId} not found`);
      return;
    }
    const message = JSON.stringify(packet) + '\n';
    safeSocketWrite(socket, message);
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
  // ── CLIENT METHODS (TCP — unchanged)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  connectToServer(ip: string, port: number = 3000): Promise<void> {
    return new Promise((resolve, reject) => {
      if (Platform.OS === 'web') {
        reject(new Error('TCP not available on web — use online mode'));
        return;
      }
      if (clientSocket) {
        clientSocket.destroy();
      }

      let didDisconnect = false;
      const triggerDisconnect = () => {
        if (didDisconnect) return;
        didDisconnect = true;
        NetworkManager._stopClientHeartbeat();
        clientSocket = null;
        clientBuffer = '';
        if (onDisconnectCallback) onDisconnectCallback('host');
      };

      console.log(`[Client/TCP] Connecting to ${ip}:${port}...`);

      clientSocket = TcpSocket!.createConnection({ port, host: ip }, () => {
        console.log(`[Client/TCP] Connected to ${ip}:${port}`);
        if (clientSocket) clientSocket.setEncoding('utf8');
        NetworkManager._startClientHeartbeat();
        resolve();
      });

      clientSocket.on('data', (data) => {
        clientBuffer += data.toString();
        const parts = clientBuffer.split('\n');
        clientBuffer = parts.pop() || '';

        for (const msg of parts) {
          if (!msg.trim()) continue;
          try {
            const packet: NetworkPacket = JSON.parse(msg);
            if (packet.type === '__PING__') {
              clientLastPongTimestamp = Date.now();
              NetworkManager.sendMessage({ type: '__PONG__' });
              continue;
            }
            console.log(`[Client/TCP] Received:`, packet.type);
            if (onMessageCallback) onMessageCallback(packet, 'host');
          } catch (e) {
            console.error(`[Client/TCP] Failed to parse message:`, e);
          }
        }
      });

      clientSocket.on('error', (error) => {
        console.error('[Client/TCP] Socket error:', error);
        triggerDisconnect();
        reject(error);
      });

      clientSocket.on('close', () => {
        console.log('[Client/TCP] Connection closed');
        triggerDisconnect();
      });
    });
  },

  sendMessage(packet: NetworkPacket) {
    if (activeTransport === 'websocket') {
      NetworkManager._wsSendMessage(packet);
      return;
    }
    if (!clientSocket) {
      console.warn('[Client/TCP] Cannot send message, not connected');
      return;
    }
    const message = JSON.stringify(packet) + '\n';
    safeSocketWrite(clientSocket, message);
  },

  disconnect() {
    if (activeTransport === 'websocket') {
      NetworkManager._wsDisconnect();
      return;
    }
    NetworkManager._stopClientHeartbeat();
    if (clientSocket) {
      clientSocket.destroy();
      clientSocket = null;
    }
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ── WEBSOCKET HOST — Create a relay room
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  createRoom(): Promise<string> {
    return new Promise((resolve, reject) => {
      NetworkManager._wsCleanup();

      const url = relayUrl;
      console.log(`[Host/WS] Connecting to relay ${url}...`);

      try {
        wsSocket = new WebSocket(url);
      } catch (e) {
        reject(new Error('WebSocket not available'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Relay connection timeout'));
        wsSocket?.close();
      }, 10000);

      wsSocket.onopen = () => {
        clearTimeout(timeout);
        console.log(`[Host/WS] Connected to relay, creating room...`);
        wsSocket!.send(JSON.stringify({ type: 'CREATE_ROOM' }));
      };

      wsSocket.onmessage = (event) => {
        let packet: NetworkPacket;
        try {
          packet = JSON.parse(event.data as string);
        } catch {
          return;
        }

        if (packet.type === 'ROOM_CREATED') {
          wsRoomCode = packet.payload?.roomCode ?? (packet as any).roomCode;
          wsLocalSocketId = packet.payload?.socketId ?? (packet as any).socketId;
          console.log(`[Host/WS] Room created: ${wsRoomCode}`);
          // No app-level heartbeat in WS mode: JS timers freeze in background,
          // causing false client timeouts on resume. Relay PLAYER_LEFT is reliable.
          resolve(wsRoomCode!);

          // Switch to game message handler
          wsSocket!.onmessage = NetworkManager._wsHostMessageHandler;
          return;
        }

        // Unexpected message before room creation
        console.warn('[Host/WS] Unexpected message before ROOM_CREATED:', packet.type);
      };

      wsSocket.onerror = (e) => {
        clearTimeout(timeout);
        console.error('[Host/WS] WebSocket error:', e);
        reject(new Error('Relay connection failed'));
      };

      wsSocket.onclose = () => {
        console.log('[Host/WS] Relay connection closed');
        NetworkManager._stopHostHeartbeat();
        wsSocket = null;
        wsRoomCode = null;
      };
    });
  },

  _wsHostMessageHandler(event: MessageEvent) {
    let packet: NetworkPacket;
    try {
      packet = JSON.parse(event.data as string);
    } catch {
      return;
    }

    // ── Relay control messages ──
    if (packet.type === 'PLAYER_JOINED') {
      const relayId: string = (packet as any).socketId;
      console.log(`[Host/WS] Client joined relay: ${relayId}`);
      // We'll get the real game clientId from ASSIGN flow; use relayId as temporary key
      wsConnectedClients.set(relayId, { socketId: relayId });
      clientLastPingTimestamp.set(relayId, Date.now());
      if (onConnectionCallback) onConnectionCallback(relayId);
      return;
    }

    if (packet.type === 'PLAYER_LEFT') {
      const relayId: string = (packet as any).socketId;
      console.log(`[Host/WS] Client left relay: ${relayId}`);
      wsConnectedClients.delete(relayId);
      clientLastPingTimestamp.delete(relayId);
      if (onDisconnectCallback) onDisconnectCallback(relayId);
      return;
    }

    // ── Heartbeat ──
    if (packet.type === '__PONG__') {
      const senderId: string = (packet as any).__from;
      if (senderId) clientLastPingTimestamp.set(senderId, Date.now());
      return;
    }

    // ── Game packets forwarded by relay ──
    const senderId: string = (packet as any).__from;
    if (onMessageCallback) onMessageCallback(packet, senderId || 'unknown');
  },

  _wsBroadcast(packet: NetworkPacket) {
    if (!wsSocket || wsSocket.readyState !== WebSocket.OPEN) return;
    wsSocket.send(JSON.stringify(packet));
  },

  _wsSendTo(clientId: string, packet: NetworkPacket) {
    // The relay doesn't support direct addressing — the host broadcasts everything.
    // To target a specific client, we embed the target socketId in a wrapper.
    // The client ignores packets not addressed to it.
    if (!wsSocket || wsSocket.readyState !== WebSocket.OPEN) return;
    wsSocket.send(JSON.stringify({ ...packet, __to: clientId }));
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ── WEBSOCKET CLIENT — Join a relay room
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  joinRoom(roomCode: string): Promise<void> {
    return new Promise((resolve, reject) => {
      NetworkManager._wsCleanup();

      const url = relayUrl;
      console.log(`[Client/WS] Connecting to relay ${url}...`);

      try {
        wsSocket = new WebSocket(url);
      } catch (e) {
        reject(new Error('WebSocket not available'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Relay connection timeout'));
        wsSocket?.close();
      }, 10000);

      wsSocket.onopen = () => {
        clearTimeout(timeout);
        console.log(`[Client/WS] Connected to relay, joining room ${roomCode}...`);
        wsSocket!.send(JSON.stringify({ type: 'JOIN_ROOM', roomCode }));
      };

      wsSocket.onmessage = (event) => {
        let packet: NetworkPacket;
        try {
          packet = JSON.parse(event.data as string);
        } catch {
          return;
        }

        if (packet.type === 'JOIN_OK') {
          wsRoomCode = (packet as any).roomCode;
          wsLocalSocketId = (packet as any).socketId;
          console.log(`[Client/WS] Joined room ${wsRoomCode} as ${wsLocalSocketId}`);
          // No app-level heartbeat in WS mode: the relay handles keep-alive
          // via native WS ping/pong every 30s. False positives when host app
          // goes to background (JS timers freeze) caused spurious disconnects.
          resolve();

          // Switch to game message handler
          wsSocket!.onmessage = NetworkManager._wsClientMessageHandler;
          return;
        }

        if (packet.type === 'JOIN_ERROR') {
          clearTimeout(timeout);
          reject(new Error((packet as any).reason || 'Cannot join room'));
          wsSocket?.close();
          return;
        }
      };

      wsSocket.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Relay connection failed'));
      };

      wsSocket.onclose = () => {
        console.log('[Client/WS] Relay connection closed (network drop)');
        NetworkManager._stopClientHeartbeat();
        wsSocket = null;
        wsRoomCode = null;
        // Network drop — no choice for the user
        if (onDisconnectCallback) onDisconnectCallback('host');
      };
    });
  },

  _wsClientMessageHandler(event: MessageEvent) {
    let packet: NetworkPacket;
    try {
      packet = JSON.parse(event.data as string);
    } catch {
      return;
    }

    // ── Targeted delivery (__to filter) ──
    if ((packet as any).__to && (packet as any).__to !== wsLocalSocketId) {
      return;
    }

    // ── Heartbeat: Host sent __PING__ via broadcast ──
    if (packet.type === '__PING__') {
      clientLastPongTimestamp = Date.now();
      // Reply via _wsSendMessage with sender tag
      if (wsSocket && wsSocket.readyState === WebSocket.OPEN) {
        wsSocket.send(JSON.stringify({ type: '__PONG__', __from: wsLocalSocketId }));
      }
      return;
    }

    // ── Relay control ──
    if (packet.type === 'PLAYER_JOINED' || packet.type === 'PLAYER_LEFT') {
      return;
    }

    if (packet.type === 'HOST_LEFT' || packet.type === 'ROOM_DISSOLVED') {
      console.warn(`[Client/WS] ${packet.type} — host disconnected or room dissolved`);
      NetworkManager._stopClientHeartbeat();
      // Null out onclose before closing to avoid double-firing
      if (wsSocket) { wsSocket.onclose = null; wsSocket.close(1000); wsSocket = null; }
      wsRoomCode = null;
      // Use a distinct callback value so the UI can offer "continue with bot"
      if (onDisconnectCallback) onDisconnectCallback('host_left');
      return;
    }

    console.log(`[Client/WS] Received:`, packet.type);
    if (onMessageCallback) onMessageCallback(packet, 'host');
  },

  _wsSendMessage(packet: NetworkPacket) {
    if (!wsSocket || wsSocket.readyState !== WebSocket.OPEN) {
      console.warn('[Client/WS] Cannot send, not connected');
      return;
    }
    try {
      wsSocket.send(JSON.stringify({ ...packet, __from: wsLocalSocketId }));
    } catch (e) {
      console.error('[Client/WS] Send error:', e);
    }
  },

  _wsDisconnect() {
    NetworkManager._stopClientHeartbeat();
    if (wsSocket) {
      wsSocket.close(1000);
      wsSocket = null;
    }
    wsRoomCode = null;
    wsLocalSocketId = null;
  },

  _wsCleanup() {
    NetworkManager._stopClientHeartbeat();
    NetworkManager._stopHostHeartbeat();
    if (wsSocket) {
      wsSocket.onmessage = null;
      wsSocket.onclose = null;
      wsSocket.close(1000);
      wsSocket = null;
    }
    wsRoomCode = null;
    wsLocalSocketId = null;
    wsConnectedClients.clear();
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ── HEARTBEAT — Active failure detection
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  _startHostHeartbeat() {
    NetworkManager._stopHostHeartbeat();

    hostHeartbeatInterval = setInterval(() => {
      const now = Date.now();

      if (activeTransport === 'tcp') {
        const pingMessage = JSON.stringify({ type: '__PING__' }) + '\n';
        connectedClients.forEach((socket) => {
          safeSocketWrite(socket, pingMessage);
        });
      } else {
        // WebSocket: use broadcast (relay forwards to all clients)
        NetworkManager._wsBroadcast({ type: '__PING__' });
      }

      // Check for stale clients
      clientLastPingTimestamp.forEach((lastPong, clientId) => {
        if (now - lastPong > HEARTBEAT_TIMEOUT_MS) {
          console.warn(`[Host/HB] Client ${clientId} timed out`);
          if (activeTransport === 'tcp') {
            const socket = connectedClients.get(clientId);
            if (socket) socket.destroy();
            connectedClients.delete(clientId);
          } else {
            wsConnectedClients.delete(clientId);
          }
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

  _startClientHeartbeat() {
    NetworkManager._stopClientHeartbeat();
    clientLastPongTimestamp = Date.now();

    clientHeartbeatCheckInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - clientLastPongTimestamp;
      if (elapsed > HEARTBEAT_TIMEOUT_MS) {
        console.warn(`[Client/HB] Host timed out (no PING for ${elapsed}ms)`);
        NetworkManager._stopClientHeartbeat();
        if (activeTransport === 'tcp') {
          if (clientSocket) {
            clientSocket.destroy();
            clientSocket = null;
          }
        } else {
          if (wsSocket) {
            wsSocket.close();
            wsSocket = null;
          }
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

  cleanup() {
    NetworkManager._stopClientHeartbeat();
    NetworkManager._stopHostHeartbeat();
    // TCP cleanup
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
    clientBuffer = '';
    hostBuffers.clear();
    // WebSocket cleanup
    NetworkManager._wsCleanup();
    // Reset transport to default
    activeTransport = 'tcp';
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
