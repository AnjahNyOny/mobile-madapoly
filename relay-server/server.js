/**
 * Madapoly — WebSocket Relay Server
 *
 * Intentionally minimal: routes packets between players of the same room.
 * Contains ZERO game logic. Does not store game state.
 *
 * Supported protocol messages:
 *   { type: 'CREATE_ROOM' }            → { type: 'ROOM_CREATED', roomCode }
 *   { type: 'JOIN_ROOM', roomCode }    → broadcasts { type: 'PLAYER_JOINED', socketId }
 *   { type: 'LEAVE_ROOM' }             → broadcasts { type: 'PLAYER_LEFT', socketId }
 *   anything else                      → forwarded raw to all other members of the room
 *
 * Deploy: Railway / Render (set PORT env var automatically).
 */

const { WebSocketServer, WebSocket } = require('ws');

const PORT = parseInt(process.env.PORT || '8080', 10);
const MAX_PLAYERS_PER_ROOM = 4;
const ROOM_TTL_MS = 5 * 60 * 1000; // 5 min idle before cleanup
const MAX_PACKETS_PER_SECOND = 20;
const MAX_MESSAGE_BYTES = 64 * 1024; // 64 KB — STATE_UPDATE is typically < 5 KB
const MAX_TOTAL_CONNECTIONS = 100;   // Basic DoS guard

// rooms: Map<roomCode, Set<WebSocket>>
const rooms = new Map();
// roomHosts: Map<roomCode, WebSocket>  — the host socket for each room
const roomHosts = new Map();
// socketMeta: Map<WebSocket, { roomCode, socketId, packetCount, packetWindow }>
const socketMeta = new Map();
// roomTimers: Map<roomCode, NodeJS.Timeout>  — idle cleanup timers
const roomTimers = new Map();
// hostGoneTimers: Map<roomCode, NodeJS.Timeout>  — 60s dissolve if host gone
const hostGoneTimers = new Map();

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += '-';
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generateSocketId() {
  return Math.random().toString(36).substr(2, 8).toUpperCase();
}

function send(ws, obj) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(obj));
  }
}

function broadcastToRoom(roomCode, obj, excludeWs = null) {
  const room = rooms.get(roomCode);
  if (!room) return;
  const msg = JSON.stringify(obj);
  room.forEach((ws) => {
    if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    }
  });
}

function dissolveRoom(roomCode, reason) {
  console.log(`[Relay] Dissolving room ${roomCode}: ${reason}`);
  broadcastToRoom(roomCode, { type: 'ROOM_DISSOLVED', reason });
  rooms.delete(roomCode);
  roomHosts.delete(roomCode);
  const t1 = roomTimers.get(roomCode);
  if (t1) { clearTimeout(t1); roomTimers.delete(roomCode); }
  const t2 = hostGoneTimers.get(roomCode);
  if (t2) { clearTimeout(t2); hostGoneTimers.delete(roomCode); }
}

function scheduleHostGoneTimeout(roomCode) {
  const existing = hostGoneTimers.get(roomCode);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    const room = rooms.get(roomCode);
    if (room && room.size > 0) {
      dissolveRoom(roomCode, 'host_timeout');
    } else {
      rooms.delete(roomCode);
      roomHosts.delete(roomCode);
    }
    hostGoneTimers.delete(roomCode);
  }, 60 * 1000);

  hostGoneTimers.set(roomCode, timer);
}

function leaveRoom(ws) {
  const meta = socketMeta.get(ws);
  if (!meta || !meta.roomCode) return;

  const { roomCode, socketId } = meta;
  const room = rooms.get(roomCode);
  if (room) {
    room.delete(ws);
    const isHost = roomHosts.get(roomCode) === ws;

    if (isHost) {
      roomHosts.delete(roomCode);
      console.log(`[Relay] Host ${socketId} left room ${roomCode} (${room.size} clients remaining)`);
      // Notify remaining clients that the host is gone
      broadcastToRoom(roomCode, { type: 'HOST_LEFT', socketId });
      if (room.size === 0) {
        scheduleRoomCleanup(roomCode);
      } else {
        // Give 60s for clients to reconnect or gracefully quit
        scheduleHostGoneTimeout(roomCode);
      }
    } else {
      broadcastToRoom(roomCode, { type: 'PLAYER_LEFT', socketId });
      console.log(`[Relay] ${socketId} left room ${roomCode} (${room.size} remaining)`);
      if (room.size === 0) {
        scheduleRoomCleanup(roomCode);
      }
    }
  }
  meta.roomCode = null;
}

function scheduleRoomCleanup(roomCode) {
  // Cancel any existing timer
  const existing = roomTimers.get(roomCode);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    const room = rooms.get(roomCode);
    if (!room || room.size === 0) {
      rooms.delete(roomCode);
      roomTimers.delete(roomCode);
      console.log(`[Relay] Room ${roomCode} cleaned up (idle)`);
    }
  }, ROOM_TTL_MS);

  roomTimers.set(roomCode, timer);
}

// ── Server ────────────────────────────────────────────────────────────────────

const wss = new WebSocketServer({ port: PORT });

console.log(`[Relay] Madapoly relay server running on ws://0.0.0.0:${PORT}`);

wss.on('connection', (ws) => {
  // ── Max connections guard ──
  if (wss.clients.size > MAX_TOTAL_CONNECTIONS) {
    console.warn('[Relay] Max connections reached, rejecting new connection');
    ws.close(1013, 'Server overloaded');
    return;
  }

  const socketId = generateSocketId();
  socketMeta.set(ws, { roomCode: null, socketId, packetCount: 0, packetWindow: Date.now() });

  console.log(`[Relay] New connection: ${socketId} (total: ${wss.clients.size})`);

  ws.on('message', (raw) => {
    const meta = socketMeta.get(ws);
    if (!meta) return;

    // ── Message size guard ──
    if (raw.length > MAX_MESSAGE_BYTES) {
      console.warn(`[Relay] Oversized message (${raw.length} bytes) from ${meta.socketId} — dropping`);
      return;
    }

    // ── Rate limiting ──
    const now = Date.now();
    if (now - meta.packetWindow > 1000) {
      meta.packetCount = 0;
      meta.packetWindow = now;
    }
    meta.packetCount++;
    if (meta.packetCount > MAX_PACKETS_PER_SECOND) {
      console.warn(`[Relay] Rate limit hit by ${meta.socketId}`);
      return;
    }

    // ── Parse ──
    let packet;
    try {
      packet = JSON.parse(raw.toString());
    } catch {
      console.warn(`[Relay] Invalid JSON from ${meta.socketId}`);
      return;
    }

    const { type } = packet;

    // ── Protocol handlers ──

    if (type === 'CREATE_ROOM') {
      // Leave any existing room first
      leaveRoom(ws);

      let roomCode;
      let attempts = 0;
      do {
        roomCode = generateRoomCode();
        attempts++;
      } while (rooms.has(roomCode) && attempts < 10);

      rooms.set(roomCode, new Set([ws]));
      meta.roomCode = roomCode;

      // Cancel any pending cleanup for this (unlikely) code
      const timer = roomTimers.get(roomCode);
      if (timer) { clearTimeout(timer); roomTimers.delete(roomCode); }

      roomHosts.set(roomCode, ws);
      console.log(`[Relay] Room ${roomCode} created by ${meta.socketId}`);
      send(ws, { type: 'ROOM_CREATED', roomCode, socketId: meta.socketId });
      return;
    }

    if (type === 'JOIN_ROOM') {
      const { roomCode } = packet;
      if (!roomCode) {
        send(ws, { type: 'JOIN_ERROR', reason: 'Missing roomCode' });
        return;
      }

      const room = rooms.get(roomCode);
      if (!room) {
        send(ws, { type: 'JOIN_ERROR', reason: 'Room not found' });
        return;
      }
      if (room.size >= MAX_PLAYERS_PER_ROOM) {
        send(ws, { type: 'JOIN_ERROR', reason: 'Room is full' });
        return;
      }

      leaveRoom(ws); // Leave previous room if any
      room.add(ws);
      meta.roomCode = roomCode;

      // Cancel pending cleanup if room was idle
      const timer = roomTimers.get(roomCode);
      if (timer) { clearTimeout(timer); roomTimers.delete(roomCode); }

      console.log(`[Relay] ${meta.socketId} joined room ${roomCode} (${room.size} players)`);
      send(ws, { type: 'JOIN_OK', roomCode, socketId: meta.socketId });
      broadcastToRoom(roomCode, { type: 'PLAYER_JOINED', socketId: meta.socketId }, ws);
      return;
    }

    if (type === 'LEAVE_ROOM') {
      leaveRoom(ws);
      return;
    }

    // ── Forward everything else to the room ──
    if (meta.roomCode) {
      broadcastToRoom(meta.roomCode, packet, ws);
    } else {
      console.warn(`[Relay] ${meta.socketId} tried to send outside a room`);
    }
  });

  ws.on('close', () => {
    console.log(`[Relay] Connection closed: ${socketId}`);
    leaveRoom(ws);
    socketMeta.delete(ws);
  });

  ws.on('error', (err) => {
    console.error(`[Relay] Error on ${socketId}:`, err.message);
  });

  // ── WebSocket native ping/pong for ghost connection detection ──
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
});

// Heartbeat: terminate ghost connections every 30s
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      console.log(`[Relay] Terminating ghost connection`);
      leaveRoom(ws);
      socketMeta.delete(ws);
      ws.terminate();
      return;
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});
