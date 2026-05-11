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
 * Force redeploy - latest commit with rejoin fixes
 */

const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');

const PORT = parseInt(process.env.PORT || '8080', 10);
const MAX_PLAYERS_PER_ROOM = 4;
const ROOM_TTL_MS = 5 * 60 * 1000; // 5 min idle before cleanup
const MAX_PACKETS_PER_SECOND = 20;
const MAX_MESSAGE_BYTES = 64 * 1024; // 64 KB — STATE_UPDATE is typically < 5 KB
const MAX_TOTAL_CONNECTIONS = 100;   // Basic DoS guard

// rooms: Map<roomCode, Set<WebSocket>>  — players only (not spectators)
const rooms = new Map();
// roomHosts: Map<roomCode, WebSocket>  — the host socket for each room
const roomHosts = new Map();
// roomSpectators: Map<roomCode, Set<WebSocket>>  — spectators per room
const roomSpectators = new Map();
// roomCreatedAt: Map<roomCode, number>  — creation timestamp
const roomCreatedAt = new Map();
// roomNames: Map<roomCode, string>  — display name chosen by host
const roomNames = new Map();
// roomStatus: Map<roomCode, 'lobby'|'playing'>  — 'lobby' until game starts
const roomStatus = new Map();
// pendingJoinRequests: Map<roomCode, Map<socketId, {ws, playerName, playerAvatar}>>  — awaiting host approval
const pendingJoinRequests = new Map();
// roomPlayerIds: Map<roomCode, Map<localPlayerId, socketId>>  — stable player identity per room
const roomPlayerIds = new Map();
// socketMeta: Map<WebSocket, { roomCode, socketId, packetCount, packetWindow, isSpectator }>
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

function broadcastToSpectators(roomCode, obj) {
  const spectators = roomSpectators.get(roomCode);
  if (!spectators) return;
  const msg = JSON.stringify(obj);
  spectators.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  });
}

function dissolveRoom(roomCode, reason) {
  console.log(`[Relay] Dissolving room ${roomCode}: ${reason}`);
  // Reject all pending requests
  const pending = pendingJoinRequests.get(roomCode);
  if (pending) {
    pending.forEach(({ ws: pws }) => send(pws, { type: 'JOIN_REJECTED', reason: 'Room closed' }));
  }
  broadcastToRoom(roomCode, { type: 'ROOM_DISSOLVED', reason });
  broadcastToSpectators(roomCode, { type: 'ROOM_DISSOLVED', reason });
  rooms.delete(roomCode);
  roomHosts.delete(roomCode);
  roomSpectators.delete(roomCode);
  roomCreatedAt.delete(roomCode);
  roomNames.delete(roomCode);
  roomStatus.delete(roomCode);
  pendingJoinRequests.delete(roomCode);
  roomPlayerIds.delete(roomCode);
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

  const { roomCode, socketId, isSpectator } = meta;

  if (isSpectator) {
    const spectators = roomSpectators.get(roomCode);
    if (spectators) spectators.delete(ws);
    console.log(`[Relay] Spectator ${socketId} left room ${roomCode}`);
    meta.roomCode = null;
    return;
  }

  const room = rooms.get(roomCode);
  if (room) {
    room.delete(ws);
    const isHost = roomHosts.get(roomCode) === ws;

    if (isHost) {
      roomHosts.delete(roomCode);
      console.log(`[Relay] Host ${socketId} left room ${roomCode} (${room.size} clients remaining)`);
      broadcastToRoom(roomCode, { type: 'HOST_LEFT', socketId });
      broadcastToSpectators(roomCode, { type: 'HOST_LEFT', socketId });
      if (room.size === 0) {
        scheduleRoomCleanup(roomCode);
      } else {
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
      // Don't delete the room immediately - keep it for reconnection
      // Just clear the actual WebSocket set but keep the room structure
      if (room) room.clear();
      roomTimers.delete(roomCode);
      console.log(`[Relay] Room ${roomCode} emptied (keeping structure for reconnection)`);
      
      // Schedule full cleanup after a longer period
      const fullCleanupTimer = setTimeout(() => {
        const playerIds = roomPlayerIds.get(roomCode);
        if (playerIds && playerIds.size === 0) {
          // Only fully dissolve if no playerIds are registered
          rooms.delete(roomCode);
          roomHosts.delete(roomCode);
          roomPlayerIds.delete(roomCode);
          roomSpectators.delete(roomCode);
          roomCreatedAt.delete(roomCode);
          roomNames.delete(roomCode);
          roomStatus.delete(roomCode);
          pendingJoinRequests.delete(roomCode);
          console.log(`[Relay] Room ${roomCode} fully dissolved (no players for 5 minutes)`);
        }
      }, 300000); // 5 minutes for full cleanup
      
      roomTimers.set(roomCode, fullCleanupTimer);
    }
  }, ROOM_TTL_MS);

  roomTimers.set(roomCode, timer);
}

// Store recent logs for debugging (last 100 entries)
const recentLogs = [];
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

console.log = (...args) => {
  const msg = args.join(' ');
  recentLogs.push({ type: 'log', timestamp: Date.now(), message: msg });
  if (recentLogs.length > 100) recentLogs.shift();
  originalConsoleLog(...args);
};

console.warn = (...args) => {
  const msg = args.join(' ');
  recentLogs.push({ type: 'warn', timestamp: Date.now(), message: msg });
  if (recentLogs.length > 100) recentLogs.shift();
  originalConsoleWarn(...args);
};

console.error = (...args) => {
  const msg = args.join(' ');
  recentLogs.push({ type: 'error', timestamp: Date.now(), message: msg });
  if (recentLogs.length > 100) recentLogs.shift();
  originalConsoleError(...args);
};

// ── HTTP server for health checks and room listing ──
const httpServer = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
    return;
  }

  if (req.method === 'GET' && req.url === '/rooms') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    const list = Array.from(roomStatus.entries()).map(([code, status]) => ({
      roomCode: code,
      roomName: roomNames.get(code) || null,
      status,
      playerCount: rooms.get(code)?.size || 0,
      spectatorCount: roomSpectators.get(code)?.size || 0,
      createdAt: roomCreatedAt.get(code) || Date.now()
    }));
    res.end(JSON.stringify(list));
    return;
  }

  if (req.method === 'GET' && req.url === '/logs') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(recentLogs));
    return;
  }

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  res.writeHead(404);
  res.end();
});

// ── WebSocket Server ──────────────────────────────────────────────────────────

const wss = new WebSocketServer({ server: httpServer });

httpServer.listen(PORT, () => {
  console.log(`[Relay] Madapoly relay server running on ws://0.0.0.0:${PORT} (HTTP+WS)`);

  // Self-ping every 14 min to prevent Render free tier from sleeping
  const SELF_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
  const selfPingModule = SELF_URL.startsWith('https') ? require('https') : require('http');
  setInterval(() => {
    selfPingModule.get(`${SELF_URL}/health`, (r) => {
      console.log(`[Relay] Self-ping: ${r.statusCode}`);
    }).on('error', (e) => console.warn(`[Relay] Self-ping failed: ${e.message}`));
  }, 14 * 60 * 1000);
});

wss.on('connection', (ws) => {
  // ── Max connections guard ──
  if (wss.clients.size > MAX_TOTAL_CONNECTIONS) {
    console.warn('[Relay] Max connections reached, rejecting new connection');
    ws.close(1013, 'Server overloaded');
    return;
  }

  const socketId = generateSocketId();
  socketMeta.set(ws, { roomCode: null, socketId, packetCount: 0, packetWindow: Date.now(), isSpectator: false });

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
      leaveRoom(ws);

      let roomCode;
      let attempts = 0;
      do {
        roomCode = generateRoomCode();
        attempts++;
      } while (rooms.has(roomCode) && attempts < 10);

      const roomName = (typeof packet.roomName === 'string' && packet.roomName.trim())
        ? packet.roomName.trim().slice(0, 32)
        : null;

      rooms.set(roomCode, new Set([ws]));
      roomSpectators.set(roomCode, new Set());
      roomCreatedAt.set(roomCode, Date.now());
      roomNames.set(roomCode, roomName);
      roomStatus.set(roomCode, 'lobby');
      pendingJoinRequests.set(roomCode, new Map());
      meta.roomCode = roomCode;

      const timer = roomTimers.get(roomCode);
      if (timer) { clearTimeout(timer); roomTimers.delete(roomCode); }

      roomHosts.set(roomCode, ws);
      console.log(`[Relay] Room ${roomCode} "${roomName || '(unnamed)'}" created by ${meta.socketId}`);
      send(ws, { type: 'ROOM_CREATED', roomCode, roomName, socketId: meta.socketId });
      return;
    }

    if (type === 'JOIN_ROOM') {
      // Direct join (legacy, no approval needed — used internally)
      const { roomCode } = packet;
      if (!roomCode) { send(ws, { type: 'JOIN_ERROR', reason: 'Missing roomCode' }); return; }

      const room = rooms.get(roomCode);
      if (!room) { send(ws, { type: 'JOIN_ERROR', reason: 'Room not found' }); return; }
      if (room.size >= MAX_PLAYERS_PER_ROOM) { send(ws, { type: 'JOIN_ERROR', reason: 'Room is full' }); return; }

      leaveRoom(ws);
      room.add(ws);
      meta.roomCode = roomCode;

      const timer = roomTimers.get(roomCode);
      if (timer) { clearTimeout(timer); roomTimers.delete(roomCode); }

      console.log(`[Relay] ${meta.socketId} joined room ${roomCode} (${room.size} players)`);
      send(ws, { type: 'JOIN_OK', roomCode, socketId: meta.socketId });
      broadcastToRoom(roomCode, { type: 'PLAYER_JOINED', socketId: meta.socketId }, ws);
      return;
    }

    if (type === 'JOIN_REQUEST') {
      // Client asks to join — host must approve
      const { roomCode, playerName, playerAvatar } = packet;
      if (!roomCode) { send(ws, { type: 'JOIN_REJECTED', reason: 'Missing roomCode' }); return; }

      const room = rooms.get(roomCode);
      if (!room) { send(ws, { type: 'JOIN_REJECTED', reason: 'Room not found' }); return; }
      if (room.size >= MAX_PLAYERS_PER_ROOM) { send(ws, { type: 'JOIN_REJECTED', reason: 'Room is full' }); return; }
      if (roomStatus.get(roomCode) === 'playing') { send(ws, { type: 'JOIN_REJECTED', reason: 'Game already started' }); return; }

      const pending = pendingJoinRequests.get(roomCode) || new Map();
      pending.set(meta.socketId, { ws, playerName: playerName || 'Joueur', playerAvatar: playerAvatar || '🎩' });
      pendingJoinRequests.set(roomCode, pending);

      const hostWs = roomHosts.get(roomCode);
      if (hostWs) {
        send(hostWs, { type: 'JOIN_REQUEST_RECEIVED', socketId: meta.socketId, playerName: playerName || 'Joueur', playerAvatar: playerAvatar || '🎩', roomCode });
        console.log(`[Relay] JOIN_REQUEST from ${meta.socketId} (${playerName}) → notified host for room ${roomCode}`);
      } else {
        console.warn(`[Relay] JOIN_REQUEST from ${meta.socketId} — NO HOST found for room ${roomCode}`);
      }
      return;
    }

    if (type === 'JOIN_APPROVE') {
      // Host approves a pending join request
      const { socketId: targetId, roomCode } = packet;
      if (!targetId || !roomCode) return;

      const hostWs = roomHosts.get(roomCode);
      if (hostWs !== ws) { console.warn(`[Relay] Non-host tried to approve join`); return; }

      const pending = pendingJoinRequests.get(roomCode);
      const req = pending && pending.get(targetId);
      if (!req) { send(ws, { type: 'JOIN_ERROR', reason: 'Request expired' }); return; }

      const room = rooms.get(roomCode);
      if (!room || room.size >= MAX_PLAYERS_PER_ROOM) {
        send(req.ws, { type: 'JOIN_REJECTED', reason: 'Room is full' });
        pending.delete(targetId);
        return;
      }

      pending.delete(targetId);
      leaveRoom(req.ws);
      room.add(req.ws);
      const reqMeta = socketMeta.get(req.ws);
      if (reqMeta) reqMeta.roomCode = roomCode;

      const timer = roomTimers.get(roomCode);
      if (timer) { clearTimeout(timer); roomTimers.delete(roomCode); }

      console.log(`[Relay] Host approved ${targetId} for room ${roomCode}`);
      send(req.ws, { type: 'JOIN_ACCEPTED', roomCode, socketId: targetId });
      broadcastToRoom(roomCode, { type: 'PLAYER_JOINED', socketId: targetId }, req.ws);
      return;
    }

    if (type === 'JOIN_REJECT') {
      // Host rejects a pending join request
      const { socketId: targetId, roomCode, reason } = packet;
      if (!targetId || !roomCode) return;

      const hostWs = roomHosts.get(roomCode);
      if (hostWs !== ws) return;

      const pending = pendingJoinRequests.get(roomCode);
      const req = pending && pending.get(targetId);
      if (!req) return;

      pending.delete(targetId);
      send(req.ws, { type: 'JOIN_REJECTED', reason: reason || 'Host declined' });
      console.log(`[Relay] Host rejected ${targetId} for room ${roomCode}`);
      return;
    }

    if (type === 'REGISTER_PLAYER_ID') {
      // Called by host/client after ASSIGN_PLAYER_ID to map localPlayerId → relaySocketId
      const { roomCode: rc, localPlayerId } = packet;
      if (!rc || !localPlayerId) return;
      if (!roomPlayerIds.has(rc)) roomPlayerIds.set(rc, new Map());
      roomPlayerIds.get(rc).set(localPlayerId, meta.socketId);
      console.log(`[Relay] Registered ${localPlayerId} → ${meta.socketId} in room ${rc}`);
      return;
    }

    if (type === 'REJOIN_ROOM') {
      // Player reconnecting after drop — bypass host approval if localPlayerId is known
      const { roomCode: rc, localPlayerId, playerName, playerAvatar } = packet;
      if (!rc || !localPlayerId) { send(ws, { type: 'REJOIN_ERROR', reason: 'Missing roomCode or localPlayerId' }); return; }

      const room = rooms.get(rc);
      if (!room) { send(ws, { type: 'REJOIN_ERROR', reason: 'Room not found or expired' }); return; }

      const playerIds = roomPlayerIds.get(rc);
      if (!playerIds || !playerIds.has(localPlayerId)) {
        send(ws, { type: 'REJOIN_ERROR', reason: 'Player not recognized in this room' });
        return;
      }

      // Update the socketId mapping to the new socket
      playerIds.set(localPlayerId, meta.socketId);

      leaveRoom(ws);
      room.add(ws);
      meta.roomCode = rc;

      const timer = roomTimers.get(rc);
      if (timer) { clearTimeout(timer); roomTimers.delete(rc); }
      const hgTimer = hostGoneTimers.get(rc);
      if (hgTimer) { clearTimeout(hgTimer); hostGoneTimers.delete(rc); }

      console.log(`[Relay] ${localPlayerId} rejoined room ${rc} as ${meta.socketId}`);
      send(ws, { type: 'REJOIN_ACCEPTED', roomCode: rc, socketId: meta.socketId, localPlayerId });

      // Notify host so it can re-sync state
      const hostWs = roomHosts.get(rc);
      if (hostWs) send(hostWs, { type: 'PLAYER_REJOINED', socketId: meta.socketId, localPlayerId, playerName, playerAvatar });
      return;
    }

    if (type === 'REJOIN_HOST') {
      // Host reconnecting after page refresh — reclaim room within 60s grace window
      const { roomCode: rc } = packet;
      if (!rc) { send(ws, { type: 'REJOIN_HOST_ERROR', reason: 'Missing roomCode' }); return; }
      const room = rooms.get(rc);
      if (!room) { send(ws, { type: 'REJOIN_HOST_ERROR', reason: 'Room expired or not found' }); return; }
      if (roomHosts.has(rc)) { send(ws, { type: 'REJOIN_HOST_ERROR', reason: 'Room already has a host' }); return; }

      // Cancel host-gone dissolution timer
      const hgTimer = hostGoneTimers.get(rc);
      if (hgTimer) { clearTimeout(hgTimer); hostGoneTimers.delete(rc); }

      leaveRoom(ws);
      room.add(ws);
      meta.roomCode = rc;
      roomHosts.set(rc, ws);

      console.log(`[Relay] Host reclaimed room ${rc} (${room.size - 1} clients present)`);
      send(ws, { type: 'REJOIN_HOST_ACCEPTED', roomCode: rc, socketId: meta.socketId });
      broadcastToRoom(rc, { type: 'HOST_REJOINED', socketId: meta.socketId }, ws);
      return;
    }

    if (type === 'GAME_START') {
      // Host signals the game has started — room goes from lobby to playing
      const { roomCode: rc } = meta;
      if (!rc) return;
      if (roomHosts.get(rc) !== ws) return;
      roomStatus.set(rc, 'playing');
      broadcastToRoom(rc, { type: 'GAME_START' }, ws);
      return;
    }

    if (type === 'LEAVE_ROOM') {
      leaveRoom(ws);
      return;
    }

    if (type === 'JOIN_SPECTATOR') {
      const { roomCode } = packet;
      if (!roomCode) { send(ws, { type: 'SPECTATOR_ERROR', reason: 'Missing roomCode' }); return; }
      const room = rooms.get(roomCode);
      if (!room) { send(ws, { type: 'SPECTATOR_ERROR', reason: 'Room not found' }); return; }

      leaveRoom(ws);
      if (!roomSpectators.has(roomCode)) roomSpectators.set(roomCode, new Set());
      roomSpectators.get(roomCode).add(ws);
      meta.roomCode = roomCode;
      meta.isSpectator = true;

      console.log(`[Relay] ${meta.socketId} is now spectating room ${roomCode}`);
      send(ws, { type: 'SPECTATOR_OK', roomCode, socketId: meta.socketId });
      return;
    }

    // ── Guard: spectators cannot send game packets ──
    if (meta.isSpectator) {
      console.warn(`[Relay] Spectator ${meta.socketId} tried to send — ignored`);
      return;
    }

    // ── Forward everything else to the room (and spectators if STATE_UPDATE) ──
    if (meta.roomCode) {
      broadcastToRoom(meta.roomCode, packet, ws);
      if (type === 'STATE_UPDATE' || packet.type === 'STATE_UPDATE') {
        broadcastToSpectators(meta.roomCode, packet);
      }
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
