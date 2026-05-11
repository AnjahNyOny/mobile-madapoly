import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, SafeAreaView, ActivityIndicator, Clipboard, ScrollView, Platform, Animated, Easing, Image } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '../styles/theme';
import { NetworkManager } from '../network/NetworkManager';
import { useGameStore, ConnectedClient } from '../store/useGameStore';
import { RELAY_URL, RELAY_HTTP_URL } from '../constants/config';
import { saveSession, loadSession, clearSession, loadGameState, clearGameState } from '../utils/sessionStorage';

type LobbyMode = 'select' | 'host' | 'client' | 'online_host' | 'online_client';

const AVATARS = ['🎩', '🚗', '🐕', '🚢', '👟', '🛒', '🐴', '🚜'];

const TOKENS: { id: string; label: string; image: any }[] = [
  { id: 'lemur-madagascar', label: 'Lémur',       image: require('../../assets/images/tokens/lemur-madagascar.png') },
  { id: 'cow',              label: 'Zébu',         image: require('../../assets/images/tokens/cow.png') },
  { id: 'chameleon',        label: 'Caméléon',     image: require('../../assets/images/tokens/chameleon.png') },
  { id: 'crocodile',        label: 'Crocodile',    image: require('../../assets/images/tokens/crocodile.png') },
  { id: 'eagle',            label: 'Aigle',        image: require('../../assets/images/tokens/eagle.png') },
  { id: 'lion',             label: 'Lion',         image: require('../../assets/images/tokens/lion.png') },
  { id: 'turtle',           label: 'Tortue',       image: require('../../assets/images/tokens/turtle.png') },
  { id: 'frog',             label: 'Grenouille',   image: require('../../assets/images/tokens/frog.png') },
  { id: 'angler-fish',      label: 'Poisson',      image: require('../../assets/images/tokens/angler-fish.png') },
  { id: 'anteater',         label: 'Fourmilier',   image: require('../../assets/images/tokens/anteater.png') },
  { id: 'baboon',           label: 'Babouin',      image: require('../../assets/images/tokens/baboon.png') },
  { id: 'bear',             label: 'Ours',         image: require('../../assets/images/tokens/bear.png') },
  { id: 'beaver',           label: 'Castor',       image: require('../../assets/images/tokens/beaver.png') },
  { id: 'bee',              label: 'Abeille',      image: require('../../assets/images/tokens/bee.png') },
  { id: 'bison',            label: 'Bison',        image: require('../../assets/images/tokens/bison.png') },
  { id: 'boar',             label: 'Sanglier',     image: require('../../assets/images/tokens/boar.png') },
  { id: 'butterfly',        label: 'Papillon',     image: require('../../assets/images/tokens/butterfly.png') },
  { id: 'capybara',         label: 'Capybara',     image: require('../../assets/images/tokens/capybara.png') },
  { id: 'cat',              label: 'Chat',         image: require('../../assets/images/tokens/cat.png') },
  { id: 'chimpanzee',       label: 'Chimpanzé',    image: require('../../assets/images/tokens/chimpanzee.png') },
  { id: 'crab',             label: 'Crabe',        image: require('../../assets/images/tokens/crab.png') },
  { id: 'deer',             label: 'Cerf',         image: require('../../assets/images/tokens/deer.png') },
  { id: 'dolphin',          label: 'Dauphin',      image: require('../../assets/images/tokens/dolphin.png') },
  { id: 'dove',             label: 'Colombe',      image: require('../../assets/images/tokens/dove.png') },
  { id: 'elephant',         label: 'Éléphant',     image: require('../../assets/images/tokens/elephant.png') },
  { id: 'fennec',           label: 'Fennec',       image: require('../../assets/images/tokens/fennec.png') },
  { id: 'fox',              label: 'Renard',       image: require('../../assets/images/tokens/fox.png') },
  { id: 'goat',             label: 'Chèvre',       image: require('../../assets/images/tokens/goat.png') },
  { id: 'goldfish',         label: 'Poisson rouge',image: require('../../assets/images/tokens/goldfish.png') },
  { id: 'guinea-pig',       label: 'Cochon d\'inde',image: require('../../assets/images/tokens/guinea-pig.png') },
  { id: 'hedgehog',         label: 'Hérisson',     image: require('../../assets/images/tokens/hedgehog.png') },
  { id: 'hippopotamus',     label: 'Hippo',        image: require('../../assets/images/tokens/hippopotamus.png') },
  { id: 'horse',            label: 'Cheval',       image: require('../../assets/images/tokens/horse.png') },
  { id: 'hyena',            label: 'Hyène',        image: require('../../assets/images/tokens/hyena.png') },
  { id: 'kangaroo',         label: 'Kangourou',    image: require('../../assets/images/tokens/kangaroo.png') },
  { id: 'koala',            label: 'Koala',        image: require('../../assets/images/tokens/koala.png') },
  { id: 'llama',            label: 'Lama',         image: require('../../assets/images/tokens/llama.png') },
  { id: 'mouse',            label: 'Souris',       image: require('../../assets/images/tokens/mouse.png') },
  { id: 'owl',              label: 'Hibou',        image: require('../../assets/images/tokens/owl.png') },
  { id: 'panda-bear-panda', label: 'Panda',        image: require('../../assets/images/tokens/panda-bear-panda.png') },
  { id: 'penguin-bird',     label: 'Pingouin',     image: require('../../assets/images/tokens/penguin-bird.png') },
  { id: 'pig',              label: 'Cochon',       image: require('../../assets/images/tokens/pig.png') },
  { id: 'rabbit',           label: 'Lapin',        image: require('../../assets/images/tokens/rabbit.png') },
  { id: 'raccoon',          label: 'Raton laveur', image: require('../../assets/images/tokens/raccoon.png') },
  { id: 'shark',            label: 'Requin',       image: require('../../assets/images/tokens/shark.png') },
  { id: 'sheep',            label: 'Mouton',       image: require('../../assets/images/tokens/sheep.png') },
  { id: 'sloth',            label: 'Paresseux',    image: require('../../assets/images/tokens/sloth.png') },
  { id: 'snake',            label: 'Serpent',      image: require('../../assets/images/tokens/snake.png') },
  { id: 'spider',           label: 'Araignée',     image: require('../../assets/images/tokens/spider.png') },
  { id: 'squirrel',         label: 'Écureuil',     image: require('../../assets/images/tokens/squirrel.png') },
  { id: 'tiger',            label: 'Tigre',        image: require('../../assets/images/tokens/tiger.png') },
  { id: 'wolf',             label: 'Loup',         image: require('../../assets/images/tokens/wolf.png') },
];

export const LobbyScreen = () => {
  const [mode, setMode] = useState<LobbyMode>('select');
  const [tokenExpanded, setTokenExpanded] = useState(false);
  const [expandedMode, setExpandedMode] = useState<'solo' | 'lan' | 'online' | null>('solo');
  const [hostIp, setHostIp] = useState<string>('');
  const [clientInputIp, setClientInputIp] = useState<string>('');
  // connectedClients lives in Zustand so it persists when LobbyScreen unmounts during game
  const connectedClients = useGameStore(s => s.connectedClients);
  const setConnectedClients = useGameStore(s => s.setConnectedClients);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [botCount, setBotCount] = useState(3); // Default: 3 bots for solo, adjusts for network
  // Online mode state
  const [roomCode, setRoomCode] = useState<string>('');
  const [clientInputRoomCode, setClientInputRoomCode] = useState<string>('');
  const [roomCodeCopied, setRoomCodeCopied] = useState(false);
  const [liveRooms, setLiveRooms] = useState<{ roomCode: string; roomName: string | null; status: string; playerCount: number; spectatorCount: number }[]>([]);
  const [isFetchingRooms, setIsFetchingRooms] = useState(false);
  const [onlineRoomName, setOnlineRoomName] = useState<string>('');
  const [pendingRequests, setPendingRequests] = useState<{ socketId: string; playerName: string; playerAvatar: string }[]>([]);
  const [savedSession, setSavedSession] = useState<import('../utils/sessionStorage').SavedSession | null>(null);
  // Map playerId → timer for grace-period bankruptcy
  const bankruptcyTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  // Grace period timer before showing host-disconnected modal
  const hostGraceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const setNetworkRole = useGameStore(s => s.setNetworkRole);
  const setLocalPlayerId = useGameStore(s => s.setLocalPlayerId);
  const setLocalPlayerInfo = useGameStore(s => s.setLocalPlayerInfo);
  const localPlayerName = useGameStore(s => s.localPlayerName);
  const localPlayerAvatar = useGameStore(s => s.localPlayerAvatar);
  const setAppScreen = useGameStore(s => s.setAppScreen);
  const syncState = useGameStore(s => s.syncState);
  const initGame = useGameStore(s => s.initGame);
  const appScreen = useGameStore(s => s.appScreen);
  const setWinCondition = useGameStore(s => s.setWinCondition);
  const winCondition = useGameStore(s => s.winCondition);

  const fetchLiveRooms = async () => {
    setIsFetchingRooms(true);
    try {
      const res = await fetch(`${RELAY_HTTP_URL}/rooms`);
      const data = await res.json();
      setLiveRooms(data);
    } catch {
      setLiveRooms([]);
    } finally {
      setIsFetchingRooms(false);
    }
  };

  const handleRejoin = async (session: import('../utils/sessionStorage').SavedSession) => {
    setIsConnecting(true);
    setConnectionError('Reconnexion en cours...');
    NetworkManager.setTransport('websocket', RELAY_URL);
    // Set localPlayerId BEFORE rejoining to avoid race condition:
    // GAME_START can arrive before rejoinRoom() resolves, causing GameScreen
    // to mount with localPlayerId=null (no HUD buttons, "thinking" state).
    useGameStore.getState().setLocalPlayerId(session.localPlayerId);
    useGameStore.getState().setLocalPlayerInfo(session.playerName, session.playerAvatar);
    setNetworkRole('client', 'client-' + Date.now());
    try {
      await NetworkManager.rejoinRoom(session.roomCode, session.localPlayerId, session.playerName, session.playerAvatar);
      setMode('online_client');
      setConnectionError('');
      saveSession(session);
    } catch (e: any) {
      clearSession();
      setSavedSession(null);
      setConnectionError(e?.message || 'Impossible de reprendre la partie.');
      NetworkManager.setTransport('tcp');
    } finally {
      setIsConnecting(false);
    }
  };

  // ── Auto-rejoin / auto-reclaim: detect saved session on mount ──
  useEffect(() => {
    const session = loadSession();
    if (!session) return;
    setSavedSession(session);
    if (session.localPlayerId === 'host') {
      // Host refresh: silently try to reclaim the room
      handleHostRejoin(session);
    } else {
      // Client refresh: refresh room list so Reprendre button appears
      fetchLiveRooms();
    }
  }, []);

  const handleApprove = (socketId: string) => {
    NetworkManager.approveJoin(socketId);
    setPendingRequests(prev => prev.filter(r => r.socketId !== socketId));
  };

  const handleReject = (socketId: string) => {
    NetworkManager.rejectJoin(socketId, 'Refusé par l\'hôte');
    setPendingRequests(prev => prev.filter(r => r.socketId !== socketId));
  };

  const handleWatch = async (code: string) => {
    setIsConnecting(true);
    setConnectionError('');
    NetworkManager.setTransport('websocket', RELAY_URL);
    try {
      await NetworkManager.watchRoom(code);
      setNetworkRole('spectator', null);
      setAppScreen('game');
    } catch (e: any) {
      setConnectionError(e?.message || 'Impossible de rejoindre comme spectateur.');
      NetworkManager.setTransport('tcp');
    } finally {
      setIsConnecting(false);
    }
  };

  // Bug fix: reset local UI state when store returns to lobby (e.g. after DisconnectModal "Quitter")
  useEffect(() => {
    if (appScreen === 'lobby') {
      setMode('select');
      setConnectedClients([]);
      setRoomCode('');
      setClientInputRoomCode('');
      setConnectionError('');
      setIsConnecting(false);
    }
  }, [appScreen]);

  // Auto-refresh live rooms when select screen is shown
  useEffect(() => {
    if (mode === 'select') fetchLiveRooms();
  }, [mode]);

  useEffect(() => {
    // Register common network listeners
    NetworkManager.onConnection((clientId) => {
      // Host: assign a stable player ID to the newly connected client
      const assignedPlayerId = `player-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      setConnectedClients((prev) => [...prev, { socketId: clientId, playerId: assignedPlayerId }]);
      
      // Send the assigned player ID directly to this specific client
      NetworkManager.sendTo(clientId, {
        type: 'ASSIGN_PLAYER_ID',
        payload: { playerId: assignedPlayerId }
      });
    });

    NetworkManager.onDisconnect((clientId) => {
      console.log(`[Lobby] onDisconnect fired: clientId=${clientId}`);
      const storeState = useGameStore.getState();
      const allClients = storeState.connectedClients;
      console.log(`[Lobby] connectedClients in store:`, JSON.stringify(allClients.map(c => c.socketId)));
      const client = allClients.find(c => c.socketId === clientId);
      console.log(`[Lobby] matched client:`, client ? client.playerId : 'NOT FOUND');

      if (clientId !== 'host' && clientId !== 'host_left' && client) {
        if (storeState.appScreen === 'game' && storeState.networkRole === 'host') {
          console.log(`[Lobby] Client ${client.playerId} disconnected — 20s grace period before bankruptcy`);
          // Give the client 20s to rejoin before declaring bankruptcy
          const playerId = client.playerId;
          const timer = setTimeout(() => {
            bankruptcyTimers.current.delete(playerId);
            console.log(`[Lobby] Grace period expired — triggering bankruptcy for ${playerId}`);
            useGameStore.getState().handleBankruptcy(playerId, null);
          }, 20_000);
          bankruptcyTimers.current.set(playerId, timer);
        }
      }

      setConnectedClients((prev) => prev.filter(c => c.socketId !== clientId));

      if (clientId === 'relay_closed') {
        // Our relay connection dropped (host side) — try to recreate the room
        const { appScreen } = useGameStore.getState();
        if (appScreen === 'lobby') {
          setConnectionError('Connexion relay perdue. Recréation de la room...');
          NetworkManager.setTransport('websocket', RELAY_URL);
          NetworkManager.createRoom(undefined)
            .then((code) => { setRoomCode(code); setConnectionError(''); })
            .catch(() => { setConnectionError('Relay inaccessible. Réessayez.'); setMode('select'); });
        }
        return;
      }

      if (clientId === 'host' || clientId === 'host_left') {
        // We were a client and the host disconnected
        const { appScreen } = useGameStore.getState();
        if (appScreen === 'game') {
          // Give host 60s grace period to refresh/reconnect before showing modal
          if (hostGraceTimer.current) clearTimeout(hostGraceTimer.current);
          hostGraceTimer.current = setTimeout(() => {
            const status = clientId === 'host_left' ? 'host_disconnected' : 'disconnected';
            useGameStore.getState().setNetworkStatus(status);
          }, 60000);
        } else {
          // In lobby: clear session, show error and go back to select
          clearSession();
          setSavedSession(null);
          NetworkManager.cleanup();
          setConnectionError('Hôte déconnecté - La room a été fermée');
          setMode('select');
        }
      }
    });

    NetworkManager.onMessage((packet, clientId) => {
      // Client: receive our assigned player ID from the host
      if (packet.type === 'ASSIGN_PLAYER_ID') {
        const { playerId } = packet.payload;
        useGameStore.getState().setLocalPlayerId(playerId);
        
        // Register our stable playerId with the relay for reconnection
        const state = useGameStore.getState();
        const rc = NetworkManager.getRoomCode();
        if (rc) NetworkManager.registerPlayerId(rc, playerId);

        // Persist session so page refresh can auto-rejoin
        if (rc) saveSession({ roomCode: rc, localPlayerId: playerId, playerName: state.localPlayerName, playerAvatar: state.localPlayerAvatar });

        NetworkManager.sendMessage({
          type: 'SET_PLAYER_INFO',
          payload: { name: state.localPlayerName, avatar: state.localPlayerAvatar }
        });
        return;
      }

      // Host: receive client's info
      if (packet.type === 'SET_PLAYER_INFO' && clientId) {
        setConnectedClients(prev => prev.map(c => 
          c.socketId === clientId 
            ? { ...c, name: packet.payload.name, avatar: packet.payload.avatar }
            : c
        ));
        return;
      }

      if (packet.type === 'GAME_START') {
        // Host is back — cancel any pending disconnect timer
        if (hostGraceTimer.current) { clearTimeout(hostGraceTimer.current); hostGraceTimer.current = null; }
        useGameStore.getState().setNetworkStatus('connected');
        syncState(packet.payload);
        setAppScreen('game');
      } else if (packet.type === 'STATE_UPDATE') {
        // Host is back — cancel any pending disconnect timer
        if (hostGraceTimer.current) { clearTimeout(hostGraceTimer.current); hostGraceTimer.current = null; }
        useGameStore.getState().setNetworkStatus('connected');
        syncState(packet.payload);
      } else if (packet.type === 'TIMER_UPDATE') {
        // Update timer from host
        useGameStore.getState().setTurnTimeRemaining(packet.payload.turnTimeRemaining);
      } else if (packet.type === 'HOST_REJOINED') {
        // Host came back — cancel grace timer and dismiss disconnect modal if showing
        if (hostGraceTimer.current) { clearTimeout(hostGraceTimer.current); hostGraceTimer.current = null; }
        useGameStore.getState().setNetworkStatus('connected');
      }

      if (packet.type === 'ROOM_DISSOLVED' || packet.type === 'ROOM_DELETED') {
        // Room was deleted by host or server - clear session and return to select
        clearSession();
        setSavedSession(null);
        NetworkManager.cleanup();
        setConnectionError('La room a été fermée par l\'hôte');
        setMode('select');
        return;
      }
      
      // Handle client requests on the host side
      if (useGameStore.getState().networkRole === 'host') {
        if (packet.type === 'REQUEST_ROLL_DICE') useGameStore.getState().rollDice();
        if (packet.type === 'REQUEST_BUY_PROPERTY') useGameStore.getState().buyProperty();
        if (packet.type === 'REQUEST_SKIP_PURCHASE') useGameStore.getState().skipPurchase();
        if (packet.type === 'REQUEST_END_TURN') useGameStore.getState().endTurn();
        if (packet.type === 'REQUEST_PAY_BAIL') useGameStore.getState().payBail();
        if (packet.type === 'REQUEST_USE_JAIL_CARD') useGameStore.getState().useJailCard();
        if (packet.type === 'REQUEST_ROLL_JAIL') useGameStore.getState().rollForJailBreak();
        if (packet.type === 'REQUEST_BUILD_HOUSE') useGameStore.getState().buildHouse(packet.payload.propertyId);
        if (packet.type === 'REQUEST_SELL_HOUSE') useGameStore.getState().sellHouse(packet.payload.propertyId);
        if (packet.type === 'REQUEST_MORTGAGE') useGameStore.getState().mortgageProperty(packet.payload.propertyId);
        if (packet.type === 'REQUEST_UNMORTGAGE') useGameStore.getState().unmortgageProperty(packet.payload.propertyId);
        if (packet.type === 'REQUEST_TRADE') useGameStore.getState().proposeTrade(packet.payload);
        if (packet.type === 'RESPOND_TRADE') useGameStore.getState().respondToTrade(packet.payload.accept);
        if (packet.type === 'CANCEL_TRADE') useGameStore.getState().cancelTrade();
        if (packet.type === 'REQUEST_FORFEIT' && clientId) {
          // The packet.payload may contain the playerId, or we match via
          // the connectedClients state. Since this closure may be stale,
          // we use a fresh lookup from the store's players list.
          // Each client's playerId was assigned on connection.
          const state = useGameStore.getState();
          const clientPlayer = state.players.find(p => !p.isBot && p.id !== 'host' && !p.isBankrupt);
          // Safer: look up by packet payload if available
          if (packet.payload?.playerId) {
            state.handleBankruptcy(packet.payload.playerId, null);
          } else if (clientPlayer) {
            state.handleBankruptcy(clientPlayer.id, null);
          }
        }
      }
    });

    NetworkManager.onJoinRequest((socketId, playerName, playerAvatar) => {
      console.log(`[Lobby] JOIN REQUEST received: ${playerName} (${socketId})`);
      setPendingRequests(prev => {
        if (prev.find(r => r.socketId === socketId)) return prev;
        return [...prev, { socketId, playerName, playerAvatar }];
      });
    });

    // Host: when a client reconnects, re-send the full state targeted to their new socket
    NetworkManager.onPlayerRejoined((newSocketId, localPlayerId) => {
      // Cancel any pending bankruptcy timer for this player
      const timer = bankruptcyTimers.current.get(localPlayerId);
      if (timer) {
        clearTimeout(timer);
        bankruptcyTimers.current.delete(localPlayerId);
        console.log(`[Lobby] Bankruptcy timer cancelled — ${localPlayerId} rejoined`);
      }
      // Update socketId in connectedClients to new socket
      setConnectedClients(prev => prev.map(c =>
        c.playerId === localPlayerId ? { ...c, socketId: newSocketId } : c
      ));

      const state = useGameStore.getState();
      const { players, board, currentPlayerIndex, turnPhase, consecutiveDoubles, lastDiceRoll, actionDeadline, lastEvent, winCondition, chronoEndTime } = state;
      
      // Ensure all players have consecutiveTimeouts property
      const playersWithTimeouts = players.map(player => ({
        ...player,
        consecutiveTimeouts: player.consecutiveTimeouts || 0
      }));
      
      NetworkManager.sendTo(newSocketId, {
        type: 'GAME_START',
        payload: { players: playersWithTimeouts, board, currentPlayerIndex, turnPhase, consecutiveDoubles, lastDiceRoll, actionDeadline, lastEvent, winCondition, chronoEndTime }
      });
      console.log(`[Lobby] Re-synced state to rejoined player ${localPlayerId} (${newSocketId})`);
    });

    // We DO NOT close the server or disconnect on unmount, 
    // because the network must persist during the GameScreen!
  }, []); 

  const handleHost = async () => {
    setMode('host');
    setNetworkRole('host', 'host');
    try {
      const ip = await NetworkManager.startServer(3000);
      setHostIp(ip);
    } catch (e) {
      setConnectionError('Impossible de démarrer le serveur');
      setMode('select');
    }
  };

  const handleHostRejoin = async (session: import('../utils/sessionStorage').SavedSession) => {
    setIsConnecting(true);
    setConnectionError('Reconnexion hôte en cours...');
    NetworkManager.setTransport('websocket', RELAY_URL);
    setNetworkRole('host', 'host');
    try {
      await NetworkManager.rejoinHost(session.roomCode);
      setRoomCode(session.roomCode);
      NetworkManager._startHostHeartbeat();
      setConnectionError('');
      saveSession(session);
      // If game was already started (persisted in session), restore state and go back to game screen
      if (session.gameStarted) {
        const savedState = loadGameState();
        if (savedState) {
          useGameStore.getState().syncState(savedState);
          // Restore connectedClients so host knows which players are remote
          if (savedState._connectedClients) {
            setConnectedClients(savedState._connectedClients);
          }
          // Broadcast state to clients so they know host is back and dismiss disconnect modal
          const { _connectedClients, savedAt, ...payload } = savedState;
          NetworkManager.broadcast({ type: 'STATE_UPDATE', payload });
        }
        setAppScreen('game');
      } else {
        setMode('online_host');
      }
    } catch (e: any) {
      // Don't clear session — keep it so user can still delete the room from the list
      setConnectionError(e?.message || 'Impossible de reprendre la room.');
      NetworkManager.setTransport('tcp');
      // Fetch rooms so user can see their room in the list with delete option
      fetchLiveRooms();
    } finally {
      setIsConnecting(false);
    }
  };

  const handleOnlineHost = async () => {
    setIsConnecting(true);
    setConnectionError('');
    NetworkManager.setTransport('websocket', RELAY_URL);
    setNetworkRole('host', 'host');
    try {
      const name = onlineRoomName.trim() || undefined;
      const code = await NetworkManager.createRoom(name);
      setRoomCode(code);
      setMode('online_host');
      // Persist host session for page-refresh recovery
      saveSession({ roomCode: code, localPlayerId: 'host', playerName: localPlayerName, playerAvatar: localPlayerAvatar });
    } catch (e) {
      setConnectionError('Impossible de créer la room. Vérifiez votre connexion.');
      NetworkManager.setTransport('tcp');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDeleteRoom = () => {
    if (roomCode) {
      NetworkManager.deleteRoom(roomCode);
      NetworkManager.cleanup();
      setConnectedClients([]);
      setRoomCode('');
      setNetworkRole('local');
      setLocalPlayerId('');
      clearSession();
      setMode('select');
    }
  };

  const handleDeleteRoomFromList = async (targetRoomCode: string) => {
    try {
      await fetch(`${RELAY_HTTP_URL}/rooms/${targetRoomCode}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('[Lobby] Failed to delete room via HTTP:', e);
    }
    NetworkManager.cleanup();
    clearSession();
    clearGameState();
    setSavedSession(null);
    // Refresh room list
    fetchLiveRooms();
  };

  const handleOnlineJoin = async () => {
    const code = clientInputRoomCode.trim().toUpperCase();
    if (!code) return;
    setIsConnecting(true);
    setConnectionError('En attente d\'approbation de l\'hôte...');
    NetworkManager.setTransport('websocket', RELAY_URL);
    try {
      await NetworkManager.joinRoom(code, localPlayerName, localPlayerAvatar);
      setMode('online_client');
      const playerId = useGameStore.getState().localPlayerId;
      setNetworkRole('client', 'client-' + Date.now());
      setConnectionError('');
      // Persist session for page refresh recovery
      if (playerId) saveSession({ roomCode: code, localPlayerId: playerId, playerName: localPlayerName, playerAvatar: localPlayerAvatar });
    } catch (e: any) {
      setConnectionError(e?.message || 'Connexion impossible. Vérifiez le code.');
      NetworkManager.setTransport('tcp');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleCopyRoomCode = () => {
    Clipboard.setString(roomCode);
    setRoomCodeCopied(true);
    setTimeout(() => setRoomCodeCopied(false), 2000);
  };

  const handleJoin = async () => {
    if (!clientInputIp) return;
    setIsConnecting(true);
    setConnectionError('');
    try {
      await NetworkManager.connectToServer(clientInputIp, 3000);
      setMode('client');
      setNetworkRole('client', 'client-' + Date.now()); // Unique local ID
    } catch (e) {
      setConnectionError('Connexion impossible. Vérifiez l\'IP.');
    } finally {
      setIsConnecting(false);
    }
  };

  const startGame = () => {
    // Host's own player ID
    const hostPlayerId = 'host';
    setLocalPlayerId(hostPlayerId);

    // Create initial players. Host + connected clients + bots.
    const playersSetup: {id: string, name: string, avatar: string, isBot: boolean}[] = [
      { id: hostPlayerId, name: localPlayerName, avatar: localPlayerAvatar, isBot: false },
      ...connectedClients.map((c, i) => ({ 
        id: c.playerId, 
        name: c.name || `Joueur ${i + 2}`, 
        avatar: c.avatar || AVATARS[(i + 1) % AVATARS.length], 
        isBot: false 
      }))
    ];
    
    // Add bots up to botCount (but cap at 4 total)
    const maxBots = Math.min(botCount, 4 - playersSetup.length);
    for (let i = 0; i < maxBots; i++) {
      playersSetup.push({ 
        id: `bot-${playersSetup.length}`, 
        name: `Bot ${i + 1}`, 
        avatar: AVATARS[(playersSetup.length) % AVATARS.length], 
        isBot: true 
      });
    }

    // Ensure minimum 2 players
    if (playersSetup.length < 2) {
      playersSetup.push({ id: 'bot-fill', name: 'Bot 1', avatar: '🤖', isBot: true });
    }

    initGame(playersSetup);
    
    // Broadcast GAME_START with full initial state to all connected clients
    const state = useGameStore.getState();
    const { players, board, currentPlayerIndex, turnPhase, consecutiveDoubles, lastDiceRoll, actionDeadline, lastEvent, winCondition, chronoEndTime } = state;
    
    // Ensure all players have consecutiveTimeouts property
    const playersWithTimeouts = players.map(player => ({
      ...player,
      consecutiveTimeouts: player.consecutiveTimeouts || 0
    }));
    
    NetworkManager.broadcast({
      type: 'GAME_START',
      payload: { players: playersWithTimeouts, board, currentPlayerIndex, turnPhase, consecutiveDoubles, lastDiceRoll, actionDeadline, lastEvent, winCondition, chronoEndTime }
    });
    NetworkManager.notifyGameStart();

    // Mark game as started in session for page-refresh recovery
    const sess = loadSession();
    if (sess) saveSession({ ...sess, gameStarted: true });

    setAppScreen('game');
  };

  // Max bots for host mode depends on connected clients
  const maxBotsForHost = 4 - 1 - connectedClients.length; // 4 - host - clients
  const minBotsForHost = Math.max(0, 2 - 1 - connectedClients.length); // ensure >= 2 total

  const startSolo = () => {
    setMode('host');
    setNetworkRole('local');
    setLocalPlayerId('player1');
    const playersSetup: {id: string, name: string, avatar: string, isBot: boolean}[] = [
      { id: 'player1', name: localPlayerName, avatar: localPlayerAvatar, isBot: false },
    ];
    for (let i = 0; i < botCount; i++) {
      playersSetup.push({ 
        id: `b${i + 1}`, 
        name: `Bot ${i + 1}`, 
        avatar: AVATARS[(i + 1) % AVATARS.length], 
        isBot: true 
      });
    }
    initGame(playersSetup); 
    setAppScreen('game'); 
  };

  // ── Win condition sub-selector (shared) ──
  const WinOptions = () => (
    <View style={styles.winBlock}>
      <Text style={styles.sectionLabel}>CONDITION DE VICTOIRE</Text>
      <View style={styles.chipRow}>
        {(['last_standing', 'fortune_limit', 'chrono'] as const).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.chip, winCondition.type === t && styles.chipActive]}
            onPress={() => setWinCondition(
              t === 'fortune_limit' ? { type: 'fortune_limit', amount: 10000 }
              : t === 'chrono' ? { type: 'chrono', durationMs: 30 * 60 * 1000 }
              : { type: 'last_standing' }
            )}
          >
            <Text style={[styles.chipText, winCondition.type === t && styles.chipTextActive]}>
              {t === 'last_standing' ? '🏳 Dernier' : t === 'fortune_limit' ? '💰 Fortune' : '⏱ Chrono'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {winCondition.type === 'fortune_limit' && (
        <View style={styles.chipRow}>
          {[5000, 10000, 20000, 50000].map(amt => (
            <TouchableOpacity
              key={amt}
              style={[styles.chip, winCondition.amount === amt && styles.chipActive]}
              onPress={() => setWinCondition({ type: 'fortune_limit', amount: amt })}
            >
              <Text style={[styles.chipText, winCondition.amount === amt && styles.chipTextActive]}>{(amt/1000).toFixed(0)}k AR</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {winCondition.type === 'chrono' && (
        <View style={styles.chipRow}>
          {[15, 30, 45, 60].map(min => (
            <TouchableOpacity
              key={min}
              style={[styles.chip, winCondition.durationMs === min * 60000 && styles.chipActive]}
              onPress={() => setWinCondition({ type: 'chrono', durationMs: min * 60000 })}
            >
              <Text style={[styles.chipText, winCondition.durationMs === min * 60000 && styles.chipTextActive]}>{min} min</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  // ── Bot stepper (shared) ──
  const BotStepper = ({ min, max }: { min: number; max: number }) => (
    max > 0 ? (
      <View style={styles.botRow}>
        <Text style={styles.sectionLabel}>BOTS</Text>
        <View style={styles.stepperInline}>
          <TouchableOpacity style={[styles.stepBtn, botCount <= min && styles.stepBtnDisabled]} onPress={() => setBotCount(Math.max(min, botCount - 1))} disabled={botCount <= min}>
            <Text style={styles.stepBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.stepVal}>{botCount}</Text>
          <TouchableOpacity style={[styles.stepBtn, botCount >= max && styles.stepBtnDisabled]} onPress={() => setBotCount(Math.min(max, botCount + 1))} disabled={botCount >= max}>
            <Text style={styles.stepBtnText}>+</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.stepHint}>{1 + connectedClients.length + botCount} joueurs</Text>
      </View>
    ) : null
  );

  // Helper : résout l'image PNG d'un token ou retourne null (fallback emoji)
  const getTokenImage = (avatar?: string) => TOKENS.find(t => t.id === avatar)?.image ?? null;

  // ── Player slot card (shared) ──
  const PlayerSlot = ({ avatar, name, role, waiting }: { avatar?: string; name?: string; role?: string; waiting?: boolean }) => {
    const img = avatar ? getTokenImage(avatar) : null;
    return (
      <View style={waiting ? styles.playerSlotWaiting : styles.playerSlot}>
        {waiting
          ? <Text style={styles.slotAvatar}>⋯</Text>
          : img
            ? <Image source={img} style={styles.slotAvatarImage} />
            : <Text style={styles.slotAvatar}>{avatar || '🎮'}</Text>
        }
        <View style={{ flex: 1 }}>
          <Text style={styles.slotName}>{waiting ? 'En attente…' : name || 'Joueur'}</Text>
          {!waiting && <Text style={styles.slotRole}>{role}</Text>}
        </View>
        {!waiting && (
          <View style={styles.slotReady}>
            <Text style={styles.slotReadyText}>✓</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>

      {/* ════════════════════════ SELECT ════════════════════════ */}
      {mode === 'select' && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* ── HEADER : Logo lemur + flag ── */}
          <View style={styles.logoBlock}>
            <View style={styles.logoStack}>
              <Image
                source={require('../../assets/images/flag-for-madagascar-svgrepo-com.png')}
                style={styles.logoFlag}
              />
              <Image
                source={require('../../assets/images/lemur-madagascar-svgrepo-com.png')}
                style={styles.logoLemurImg}
              />
            </View>
            <View style={styles.titleRow}>
              <Text style={styles.titleMada}>MADA</Text>
              <Text style={styles.titlePoly}>POLY</Text>
            </View>
            <Text style={styles.subtitle}>Édition Ariary Luxe</Text>
          </View>

          {connectionError ? <Text style={styles.errorText}>{connectionError}</Text> : null}

          <View style={styles.content}>

            {/* ── IDENTITÉ ── */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>VOTRE IDENTITÉ</Text>
              <TextInput
                style={styles.nameInput}
                value={localPlayerName}
                onChangeText={(t) => setLocalPlayerInfo(t, localPlayerAvatar)}
                placeholder="Votre pseudo"
                placeholderTextColor={COLORS.textMuted}
                maxLength={12}
              />
              <View style={styles.tokenHeaderRow}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.sectionLabel}>PION</Text>
                  {localPlayerAvatar && (() => {
                    const sel = TOKENS.find(t => t.id === localPlayerAvatar);
                    return sel ? (
                      <View style={styles.selectedTokenBadge}>
                        <Image source={sel.image} style={{ width: 20, height: 20, resizeMode: 'contain' }} />
                        <Text style={styles.selectedTokenName}>{sel.label}</Text>
                      </View>
                    ) : null;
                  })()}
                </View>
                <TouchableOpacity style={styles.tokenExpandBtn} onPress={() => setTokenExpanded(v => !v)}>
                  <Text style={styles.tokenExpandBtnText}>{tokenExpanded ? '▲ Réduire' : '▼ Choisir'}</Text>
                </TouchableOpacity>
              </View>
              {tokenExpanded && (
                <View style={styles.tokenGrid}>
                  {TOKENS.map(tok => (
                    <TouchableOpacity
                      key={tok.id}
                      style={[styles.tokenBtn, localPlayerAvatar === tok.id && styles.tokenBtnActive]}
                      onPress={() => { setLocalPlayerInfo(localPlayerName, tok.id); setTokenExpanded(false); }}
                    >
                      <Image source={tok.image} style={styles.tokenImage} />
                      <Text style={styles.tokenLabel}>{tok.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* ── MODES ── */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>MODE DE JEU</Text>
              <View style={styles.modeCards}>

                {/* SOLO */}
                <View style={styles.modeCard}>
                  <TouchableOpacity style={styles.modeCardHeader} onPress={() => setExpandedMode(expandedMode === 'solo' ? null : 'solo')} activeOpacity={0.8}>
                    <Text style={styles.modeIcon}>🏠</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modeTitle}>Solo</Text>
                      <Text style={styles.modeDesc}>Contre les bots</Text>
                    </View>
                    <Text style={styles.modeChevron}>{expandedMode === 'solo' ? '▲' : '▶'}</Text>
                  </TouchableOpacity>
                  {expandedMode === 'solo' && (
                    <View style={styles.modeBody}>
                      <WinOptions />
                      <BotStepper min={1} max={3} />
                      <TouchableOpacity style={styles.launchBtn} onPress={startSolo}>
                        <Text style={styles.launchBtnText}>LANCER</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* LAN — mobile only */}
                {Platform.OS !== 'web' && (
                  <View style={styles.modeCard}>
                    <TouchableOpacity style={styles.modeCardHeader} onPress={() => setExpandedMode(expandedMode === 'lan' ? null : 'lan')} activeOpacity={0.8}>
                      <Text style={styles.modeIcon}>📶</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modeTitle}>Local Wi-Fi</Text>
                        <Text style={styles.modeDesc}>Même réseau</Text>
                      </View>
                      <Text style={styles.modeChevron}>{expandedMode === 'lan' ? '▲' : '▶'}</Text>
                    </TouchableOpacity>
                    {expandedMode === 'lan' && (
                      <View style={styles.modeBody}>
                        <TouchableOpacity style={styles.launchBtn} onPress={handleHost}>
                          <Text style={styles.launchBtnText}>HÉBERGER</Text>
                        </TouchableOpacity>
                        <View style={styles.separator} />
                        <TextInput
                          style={styles.codeInput}
                          placeholder="192.168.1.15"
                          placeholderTextColor={COLORS.textMuted}
                          value={clientInputIp}
                          onChangeText={setClientInputIp}
                          keyboardType="numbers-and-punctuation"
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                        <TouchableOpacity style={[styles.launchBtn, styles.launchBtnSecondary]} onPress={handleJoin} disabled={isConnecting}>
                          {isConnecting ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.launchBtnText}>REJOINDRE</Text>}
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}

                {/* EN LIGNE */}
                <View style={styles.modeCard}>
                  <TouchableOpacity style={styles.modeCardHeader} onPress={() => setExpandedMode(expandedMode === 'online' ? null : 'online')} activeOpacity={0.8}>
                    <Text style={styles.modeIcon}>🌐</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modeTitle}>En Ligne</Text>
                      <Text style={styles.modeDesc}>Partout dans le monde</Text>
                    </View>
                    <Text style={styles.modeChevron}>{expandedMode === 'online' ? '▲' : '▶'}</Text>
                  </TouchableOpacity>
                  {expandedMode === 'online' && (
                    <View style={styles.modeBody}>
                      <TextInput
                        style={styles.codeInput}
                        placeholder="Nom de la room (optionnel)"
                        placeholderTextColor={COLORS.textMuted}
                        value={onlineRoomName}
                        onChangeText={setOnlineRoomName}
                        maxLength={32}
                        autoCorrect={false}
                      />
                      <WinOptions />
                      <TouchableOpacity style={styles.launchBtn} onPress={handleOnlineHost} disabled={isConnecting}>
                        {isConnecting ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.launchBtnText}>CRÉER</Text>}
                      </TouchableOpacity>
                      {isConnecting && <Text style={styles.hintText}>Connexion au serveur… (~30s la 1ère fois)</Text>}
                      <View style={styles.separator} />
                      <TextInput
                        style={styles.codeInput}
                        placeholder="Code (ex: TANA-4892)"
                        placeholderTextColor={COLORS.textMuted}
                        value={clientInputRoomCode}
                        onChangeText={setClientInputRoomCode}
                        autoCapitalize="characters"
                        autoCorrect={false}
                      />
                      <TouchableOpacity style={[styles.launchBtn, styles.launchBtnSecondary]} onPress={handleOnlineJoin} disabled={isConnecting}>
                        {isConnecting ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.launchBtnText}>REJOINDRE</Text>}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

              </View>
            </View>

            {/* ── PARTIES EN COURS ── */}
            <View style={styles.section}>
              <View style={styles.liveHeader}>
                <Text style={styles.sectionLabel}>PARTIES EN COURS</Text>
                <TouchableOpacity onPress={fetchLiveRooms} disabled={isFetchingRooms} style={styles.refreshBtn}>
                  {isFetchingRooms
                    ? <ActivityIndicator size="small" color={COLORS.primary} />
                    : <Text style={styles.refreshBtnText}>↻</Text>}
                </TouchableOpacity>
              </View>
              {liveRooms.length === 0 ? (
                <Text style={styles.hintText}>Aucune partie en cours</Text>
              ) : liveRooms.map(room => (
                <View key={room.roomCode} style={styles.liveRow}>
                  <View style={{ flex: 1, gap: 2 }}>
                    {room.roomName ? <Text style={styles.liveRoomName}>{room.roomName}</Text> : null}
                    <Text style={styles.liveCode}>{room.roomCode}</Text>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 2 }}>
                      <View style={[styles.badge, room.status === 'lobby' ? styles.badgeLobby : styles.badgePlaying]}>
                        <Text style={styles.badgeText}>{room.status === 'lobby' ? 'Lobby' : 'En cours'}</Text>
                      </View>
                      <Text style={styles.liveMeta}>{`${room.playerCount} joueur${room.playerCount > 1 ? 's' : ''}`}</Text>
                    </View>
                  </View>
                  <View style={{ gap: 6, alignItems: 'flex-end' }}>
                    {savedSession?.roomCode === room.roomCode && (
                      <TouchableOpacity style={[styles.joinBtn, { backgroundColor: COLORS.madaGreen }]} disabled={isConnecting} onPress={() => savedSession!.localPlayerId === 'host' ? handleHostRejoin(savedSession!) : handleRejoin(savedSession!)}>
                        <Text style={styles.joinBtnText}>{'▶ Reprendre'}</Text>
                      </TouchableOpacity>
                    )}
                    {room.status === 'lobby' && savedSession?.roomCode !== room.roomCode && (
                      <TouchableOpacity style={styles.joinBtn} disabled={isConnecting} onPress={async () => {
                        setClientInputRoomCode(room.roomCode);
                        setIsConnecting(true);
                        setConnectionError('En attente d\'approbation de l\'hôte...');
                        NetworkManager.setTransport('websocket', RELAY_URL);
                        try {
                          await NetworkManager.joinRoom(room.roomCode, localPlayerName, localPlayerAvatar);
                          setMode('online_client');
                          const playerId = useGameStore.getState().localPlayerId;
                          setNetworkRole('client', 'client-' + Date.now());
                          setConnectionError('');
                          if (playerId) saveSession({ roomCode: room.roomCode, localPlayerId: playerId, playerName: localPlayerName, playerAvatar: localPlayerAvatar });
                        } catch (e: any) {
                          setConnectionError(e?.message || 'Connexion impossible.');
                          NetworkManager.setTransport('tcp');
                        } finally { setIsConnecting(false); }
                      }}>
                        <Text style={styles.joinBtnText}>{'Rejoindre'}</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.watchBtn} onPress={() => handleWatch(room.roomCode)} disabled={isConnecting}>
                      <Text style={styles.watchBtnText}>{'👁 Regarder'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.watchBtn, { borderColor: COLORS.danger }]} onPress={() => handleDeleteRoomFromList(room.roomCode)} disabled={isConnecting}>
                      <Text style={[styles.watchBtnText, { color: COLORS.danger }]}>{'🗑 Supprimer'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

          </View>
        </ScrollView>
      )}

      {/* ════════════════════════ HOST (LAN) ════════════════════════ */}
      {mode === 'host' && (
        <View style={styles.pageCenter}>
          <View style={styles.titleRowSmall}>
            <Text style={styles.titleMada}>MADA</Text>
            <Text style={styles.titlePoly}>POLY</Text>
          </View>
          <View style={styles.content}>
            <Text style={styles.pageTitle}>Héberger — LAN</Text>
            <Text style={styles.ipText}>{hostIp || '…'}</Text>
            <Text style={styles.hintText}>Partagez cette IP avec vos amis</Text>
            <View style={styles.playerCardsList}>
              <PlayerSlot avatar={localPlayerAvatar} name={localPlayerName} role="Hôte 👑" />
              {connectedClients.length === 0
                ? <PlayerSlot waiting />
                : connectedClients.map((c, i) => <PlayerSlot key={c.socketId} avatar={c.avatar} name={c.name || `Joueur ${i+2}`} role="Client" />)}
            </View>
            <BotStepper min={Math.max(0, 2 - 1 - connectedClients.length)} max={4 - 1 - connectedClients.length} />
            <TouchableOpacity style={[styles.launchBtn, { marginTop: 24, width: '100%' }]} onPress={startGame}>
              <Text style={styles.launchBtnText}>{connectedClients.length === 0 ? 'LANCER AVEC BOTS' : 'LANCER'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelLink} onPress={() => { NetworkManager.closeServer(); setMode('select'); }}>
              <Text style={styles.cancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ════════════════════════ CLIENT (LAN) ════════════════════════ */}
      {mode === 'client' && (
        <View style={styles.pageCenter}>
          <View style={styles.titleRowSmall}>
            <Text style={styles.titleMada}>MADA</Text>
            <Text style={styles.titlePoly}>POLY</Text>
          </View>
          <View style={styles.content}>
            <Text style={styles.pageTitle}>Connecté à {clientInputIp}</Text>
            <PlayerSlot avatar={localPlayerAvatar} name={localPlayerName} role="Connecté ✓" />
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 30 }} />
            <Text style={styles.waitText}>En attente de l'hôte…</Text>
            <TouchableOpacity style={styles.cancelLink} onPress={() => { NetworkManager.disconnect(); setMode('select'); }}>
              <Text style={styles.cancelText}>Quitter</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ════════════════════════ ONLINE HOST ════════════════════════ */}
      {mode === 'online_host' && (
        <ScrollView contentContainerStyle={styles.pageScrollCenter}>
          <View style={styles.titleRowSmall}>
            <Text style={styles.titleMada}>MADA</Text>
            <Text style={styles.titlePoly}>POLY</Text>
          </View>
          <View style={styles.content}>
            {onlineRoomName.trim() ? <Text style={styles.roomNameBadge}>"{onlineRoomName.trim()}"</Text> : null}
            <Text style={styles.sectionLabel}>CODE DE LA ROOM</Text>
            <Text style={styles.roomCode}>{roomCode}</Text>
            <TouchableOpacity style={styles.copyBtn} onPress={handleCopyRoomCode}>
              <Text style={styles.copyBtnText}>{roomCodeCopied ? '✓ Copié !' : 'Copier'}</Text>
            </TouchableOpacity>
            <Text style={styles.hintText}>Partagez ce code avec vos amis</Text>

            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>JOUEURS</Text>
            <View style={styles.playerCardsList}>
              <PlayerSlot avatar={localPlayerAvatar} name={localPlayerName} role="Hôte 👑" />
              {connectedClients.length === 0
                ? <PlayerSlot waiting />
                : connectedClients.map((c, i) => <PlayerSlot key={c.socketId} avatar={c.avatar} name={c.name || `Joueur ${i+2}`} role="En ligne" />)}
            </View>

            <BotStepper min={Math.max(0, 2 - 1 - connectedClients.length)} max={4 - 1 - connectedClients.length} />

            {pendingRequests.length > 0 && (
              <View style={styles.pendingBlock}>
                <Text style={styles.pendingTitle}>Demandes en attente</Text>
                {pendingRequests.map(req => (
                  <View key={req.socketId} style={styles.pendingRow}>
                    <Text style={styles.pendingAvatar}>{req.playerAvatar}</Text>
                    <Text style={styles.pendingName}>{req.playerName}</Text>
                    <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(req.socketId)}>
                      <Text style={styles.approveBtnText}>✓</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(req.socketId)}>
                      <Text style={styles.rejectBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity style={[styles.launchBtn, { marginTop: 24, width: '100%' }]} onPress={startGame}>
              <Text style={styles.launchBtnText}>{connectedClients.length === 0 ? 'LANCER AVEC BOTS' : 'LANCER'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelLink} onPress={() => { NetworkManager.cleanup(); setConnectedClients([]); setRoomCode(''); setMode('select'); }}>
              <Text style={styles.cancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.cancelLink, { marginTop: 8 }]} onPress={handleDeleteRoom}>
              <Text style={[styles.cancelText, { color: COLORS.danger }]}>Supprimer la room</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* ════════════════════════ ONLINE CLIENT ════════════════════════ */}
      {mode === 'online_client' && (
        <View style={styles.pageCenter}>
          <View style={styles.titleRowSmall}>
            <Text style={styles.titleMada}>MADA</Text>
            <Text style={styles.titlePoly}>POLY</Text>
          </View>
          <View style={styles.content}>
            <Text style={styles.sectionLabel}>ROOM</Text>
            <Text style={styles.roomCode}>{clientInputRoomCode.toUpperCase()}</Text>
            <PlayerSlot avatar={localPlayerAvatar} name={localPlayerName} role="Connecté ✓" />
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 30 }} />
            <Text style={styles.waitText}>En attente de l'hôte…</Text>
            <TouchableOpacity style={styles.cancelLink} onPress={() => { clearSession(); setSavedSession(null); NetworkManager.cleanup(); setMode('select'); }}>
              <Text style={styles.cancelText}>Quitter</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

    </SafeAreaView>
  );
};

// ─────────────────────────────────────────
// STYLES — Night theme, game-menu aesthetic
// ─────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { flexGrow: 1, alignItems: 'center', paddingBottom: 60 },
  content: { width: '90%', maxWidth: 480, alignItems: 'center' },
  pageCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' },
  pageScrollCenter: { flexGrow: 1, alignItems: 'center', paddingVertical: 40 },

  // ── Logo Header ──
  logoBlock: { alignItems: 'center', paddingTop: 40, paddingBottom: 20 },
  logoStack: { width: 110, height: 110, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  logoFlag: { position: 'absolute', width: 110, height: 110, resizeMode: 'contain', opacity: 0.35 },
  logoLemurImg: { width: 90, height: 90, resizeMode: 'contain' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 0 },
  titleRowSmall: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 20 },
  titleMada: { fontSize: 42, fontFamily: 'Inter_900Black', color: COLORS.madaWhite, letterSpacing: 2 },
  titlePoly: { fontSize: 42, fontFamily: 'Inter_900Black', color: COLORS.madaRed, letterSpacing: 2 },
  subtitle: { fontSize: 12, fontFamily: 'Inter_700Bold', color: COLORS.madaGreen, letterSpacing: 3, marginTop: 3, textTransform: 'uppercase' },

  // ── Section ──
  section: { width: '100%', marginBottom: 16 },
  sectionLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', color: COLORS.textMuted, letterSpacing: 2, marginBottom: 8, textTransform: 'uppercase' },

  // ── Identity ──
  nameInput: {
    width: '100%', backgroundColor: COLORS.surface,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13,
    fontFamily: 'Inter_700Bold', fontSize: 16, color: COLORS.text,
    borderWidth: 1, borderColor: COLORS.surfaceBorder, marginBottom: 12,
  },
  tokenHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  selectedTokenBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.surface, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: COLORS.madaGreen },
  selectedTokenName: { fontSize: 11, fontFamily: 'Inter_700Bold', color: COLORS.madaGreen },
  tokenExpandBtn: { backgroundColor: COLORS.madaGreen, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  tokenExpandBtnText: { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#FFF' },
  tokenGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  tokenBtn: {
    width: 60, alignItems: 'center', paddingVertical: 7,
    borderRadius: 10, backgroundColor: COLORS.surface,
    borderWidth: 1.5, borderColor: COLORS.surfaceBorder,
  },
  tokenBtnActive: { borderColor: COLORS.madaGreen, backgroundColor: 'rgba(0,122,61,0.15)' },
  tokenEmoji: { fontSize: 26 },
  tokenImage: { width: 34, height: 34, resizeMode: 'contain' },
  tokenLabel: { fontSize: 8, fontFamily: 'Inter_700Bold', color: COLORS.textSecondary, marginTop: 3, textAlign: 'center' },

  // ── Mode Cards ──
  modeCards: { gap: 10 },
  modeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.surfaceBorder,
    overflow: 'hidden',
  },
  modeCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  modeBody: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: COLORS.surfaceBorder },
  modeIcon: { fontSize: 26 },
  modeTitle: { fontSize: 17, fontFamily: 'Inter_900Black', color: COLORS.text },
  modeDesc: { fontSize: 11, fontFamily: 'Inter_400Regular', color: COLORS.textSecondary, marginTop: 1 },
  modeChevron: { fontSize: 12, color: COLORS.textMuted, marginLeft: 4 },

  // ── Win condition block ──
  winBlock: { marginTop: 12, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  chip: {
    paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20,
    backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.surfaceBorder,
  },
  chipActive: { backgroundColor: 'rgba(0,122,61,0.2)', borderColor: COLORS.madaGreen },
  chipText: { fontSize: 12, fontFamily: 'Inter_700Bold', color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.madaGreen },

  // ── Bot row ──
  botRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' },
  stepperInline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.madaGreen, justifyContent: 'center', alignItems: 'center' },
  stepBtnDisabled: { backgroundColor: COLORS.surfaceBorder },
  stepBtnText: { color: '#FFF', fontSize: 18, fontFamily: 'Inter_900Black' },
  stepVal: { color: COLORS.text, fontSize: 20, fontFamily: 'Inter_900Black', minWidth: 26, textAlign: 'center' },
  stepHint: { color: COLORS.textMuted, fontSize: 11, fontFamily: 'Inter_400Regular' },

  // ── Launch button ──
  launchBtn: {
    width: '100%', paddingVertical: 13, borderRadius: 12,
    backgroundColor: COLORS.madaGreen, alignItems: 'center',
    shadowColor: COLORS.madaGreen, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 5,
  },
  launchBtnSecondary: { backgroundColor: COLORS.madaRed, shadowColor: COLORS.madaRed },
  launchBtnText: { color: '#FFF', fontFamily: 'Inter_900Black', fontSize: 14, letterSpacing: 2 },

  separator: { height: 1, backgroundColor: COLORS.surfaceBorder, marginVertical: 14 },
  codeInput: {
    width: '100%', backgroundColor: COLORS.surfaceAlt,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
    fontFamily: 'Inter_700Bold', fontSize: 15, color: COLORS.text,
    borderWidth: 1, borderColor: COLORS.surfaceBorder, marginBottom: 10,
    textAlign: 'center', letterSpacing: 1,
  },

  // ── Live rooms ──
  liveHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  refreshBtn: { padding: 6 },
  refreshBtnText: { color: COLORS.primary, fontSize: 22, fontFamily: 'Inter_700Bold' },
  liveRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.surfaceBorder,
  },
  liveRoomName: { color: COLORS.text, fontFamily: 'Inter_700Bold', fontSize: 14 },
  liveCode: { color: COLORS.textSecondary, fontFamily: 'Inter_700Bold', fontSize: 13, letterSpacing: 1 },
  liveMeta: { color: COLORS.textMuted, fontFamily: 'Inter_400Regular', fontSize: 11 },
  badge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  badgeLobby: { backgroundColor: 'rgba(34,197,94,0.2)' },
  badgePlaying: { backgroundColor: 'rgba(239,68,68,0.2)' },
  badgeText: { color: COLORS.text, fontFamily: 'Inter_400Regular', fontSize: 10 },
  joinBtn: { backgroundColor: COLORS.success, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  joinBtnText: { color: '#FFF', fontFamily: 'Inter_700Bold', fontSize: 12 },
  watchBtn: { backgroundColor: COLORS.surfaceAlt, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: COLORS.surfaceBorder },
  watchBtnText: { color: COLORS.textSecondary, fontFamily: 'Inter_700Bold', fontSize: 12 },

  // ── Inner game pages (host/client/waiting) ──
  pageTitle: { fontSize: 22, fontFamily: 'Inter_900Black', color: COLORS.text, marginBottom: 20 },
  ipText: { fontSize: 36, fontFamily: 'Inter_900Black', color: COLORS.gold, letterSpacing: 2, marginVertical: 8 },
  playerCardsList: { width: '100%', gap: 8, marginBottom: 16 },
  playerSlot: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: COLORS.surfaceBorder,
  },
  playerSlotWaiting: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.backgroundAlt, borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: COLORS.surfaceBorder, borderStyle: 'dashed',
  },
  slotAvatar: { fontSize: 26 },
  slotAvatarImage: { width: 36, height: 36, resizeMode: 'contain' },
  slotName: { color: COLORS.text, fontFamily: 'Inter_700Bold', fontSize: 15 },
  slotRole: { color: COLORS.textMuted, fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 1 },
  slotReady: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(34,197,94,0.15)', borderWidth: 1, borderColor: COLORS.success, justifyContent: 'center', alignItems: 'center' },
  slotReadyText: { color: COLORS.success, fontSize: 13, fontFamily: 'Inter_900Black' },

  // ── Room code display ──
  roomNameBadge: { color: COLORS.primary, fontFamily: 'Inter_700Bold', fontSize: 16, marginBottom: 6 },
  roomCode: { fontSize: 38, fontFamily: 'Inter_900Black', color: COLORS.gold, letterSpacing: 5, marginBottom: 12 },
  copyBtn: { backgroundColor: COLORS.surfaceAlt, paddingVertical: 8, paddingHorizontal: 20, borderRadius: 10, marginBottom: 6, borderWidth: 1, borderColor: COLORS.gold },
  copyBtnText: { color: COLORS.gold, fontFamily: 'Inter_700Bold', fontSize: 13 },

  // ── Pending join requests ──
  pendingBlock: { width: '100%', backgroundColor: 'rgba(245,200,66,0.08)', borderRadius: 14, padding: 14, marginTop: 14, borderWidth: 1, borderColor: 'rgba(245,200,66,0.25)' },
  pendingTitle: { color: COLORS.gold, fontFamily: 'Inter_700Bold', fontSize: 13, marginBottom: 10 },
  pendingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  pendingAvatar: { fontSize: 22, marginRight: 8 },
  pendingName: { flex: 1, color: COLORS.text, fontFamily: 'Inter_400Regular', fontSize: 14 },
  approveBtn: { backgroundColor: COLORS.success, borderRadius: 8, width: 34, height: 34, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  approveBtnText: { color: '#FFF', fontFamily: 'Inter_700Bold', fontSize: 16 },
  rejectBtn: { backgroundColor: COLORS.danger, borderRadius: 8, width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  rejectBtnText: { color: '#FFF', fontFamily: 'Inter_700Bold', fontSize: 16 },

  // ── Misc ──
  waitText: { color: COLORS.textSecondary, fontFamily: 'Inter_400Regular', fontSize: 15, textAlign: 'center', marginBottom: 8 },
  hintText: { color: COLORS.textMuted, fontFamily: 'Inter_400Regular', fontSize: 12, textAlign: 'center', marginBottom: 8 },
  errorText: { color: COLORS.danger, fontFamily: 'Inter_700Bold', fontSize: 14, textAlign: 'center', paddingHorizontal: 20, marginBottom: 10 },
  cancelLink: { marginTop: 16, padding: 8 },
  cancelText: { color: COLORS.textMuted, fontFamily: 'Inter_400Regular', fontSize: 14, textDecorationLine: 'underline' },

  // ── Legacy (used in startSolo / stepper stubs) ──
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 6 },
  stepperButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  stepperButtonDisabled: { opacity: 0.3 },
  stepperButtonActive: { borderColor: COLORS.primary },
  stepperButtonText: { color: '#FFF', fontSize: 22, fontFamily: 'Inter_900Black' },
  stepperValue: { color: COLORS.text, fontSize: 32, fontFamily: 'Inter_900Black', minWidth: 40, textAlign: 'center' },
  stepperInfo: { color: COLORS.textMuted, fontFamily: 'Inter_400Regular', fontSize: 13, marginBottom: 16 },
  stepperLabel: { color: COLORS.text, fontFamily: 'Inter_700Bold', fontSize: 14, marginBottom: 8 },
  winConditionRow: { flexDirection: 'row', gap: 8, marginBottom: 8, width: '100%' },
  winConditionChip: { flex: 1, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.surfaceBorder, paddingVertical: 8, alignItems: 'center' },
  winConditionChipActive: { borderColor: COLORS.primary },
  winConditionChipText: { color: COLORS.textSecondary, fontFamily: 'Inter_700Bold', fontSize: 12 },
  winConditionChipTextActive: { color: COLORS.primary },
  winConditionSub: { width: '100%', marginBottom: 8 },
  identityRow: { flexDirection: 'row', marginBottom: 10, width: '100%' },
  avatarList: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginBottom: 10 },
  avatarBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  avatarBtnActive: { borderColor: COLORS.primary },
  avatarEmoji: { fontSize: 24 },
  divider: { height: 1, backgroundColor: COLORS.surfaceBorder, width: '100%', marginVertical: 20 },
  buttonTextOnly: { marginTop: 10, padding: 10 },
  linkText: { color: COLORS.textMuted, fontFamily: 'Inter_400Regular', fontSize: 15, textDecorationLine: 'underline' },
  button: { backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 14, width: '100%', alignItems: 'center', marginVertical: 8 },
  buttonSecondary: { backgroundColor: COLORS.primaryDark },
  buttonText: { color: '#FFF', fontFamily: 'Inter_700Bold', fontSize: 16 },
  buttonOnline: { backgroundColor: COLORS.primary },
  buttonOnlineSecondary: { backgroundColor: COLORS.primaryDark },
  input: { backgroundColor: COLORS.surface, width: '100%', padding: 14, borderRadius: 12, fontSize: 16, fontFamily: 'Inter_400Regular', marginBottom: 10, textAlign: 'center', color: COLORS.text, borderWidth: 1, borderColor: COLORS.surfaceBorder },
  sectionTitle: { fontSize: 14, fontFamily: 'Inter_700Bold', color: COLORS.textSecondary, marginBottom: 10, alignSelf: 'flex-start' },
  centeredContent: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' },
  title: { fontSize: 38, fontFamily: 'Inter_900Black', color: COLORS.madaRed, marginBottom: 24 },
  roomNameDisplay: { color: COLORS.primary, fontFamily: 'Inter_700Bold', fontSize: 16, marginBottom: 6 },
  roomCodeText: { fontSize: 38, fontFamily: 'Inter_900Black', color: COLORS.gold, letterSpacing: 4, marginVertical: 12 },
  copyButton: { backgroundColor: COLORS.surfaceAlt, paddingVertical: 8, paddingHorizontal: 20, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: COLORS.gold },
  copyButtonText: { color: COLORS.gold, fontFamily: 'Inter_700Bold', fontSize: 13 },
  liveRoomsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 4 },
  refreshButton: { padding: 6 },
  refreshButtonText: { color: COLORS.primary, fontSize: 22, fontFamily: 'Inter_700Bold' },
  liveRoomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', backgroundColor: COLORS.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8, borderWidth: 1, borderColor: COLORS.surfaceBorder },
  liveRoomCode: { color: COLORS.text, fontFamily: 'Inter_700Bold', fontSize: 15, letterSpacing: 1 },
  liveRoomMeta: { color: COLORS.textMuted, fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  statusBadgeLobby: { backgroundColor: 'rgba(34,197,94,0.2)' },
  statusBadgePlaying: { backgroundColor: 'rgba(239,68,68,0.2)' },
  statusBadgeText: { color: COLORS.text, fontFamily: 'Inter_400Regular', fontSize: 11 },
  joinLiveButton: { backgroundColor: COLORS.success, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  joinLiveButtonText: { color: '#FFF', fontFamily: 'Inter_700Bold', fontSize: 12 },
  watchButton: { backgroundColor: COLORS.surfaceAlt, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: COLORS.surfaceBorder },
  watchButtonText: { color: COLORS.textSecondary, fontFamily: 'Inter_700Bold', fontSize: 12 },
  pendingSection: { width: '100%', backgroundColor: 'rgba(245,200,66,0.08)', borderRadius: 12, padding: 12, marginTop: 16, borderWidth: 1, borderColor: 'rgba(245,200,66,0.25)' },
  pendingSectionTitle: { color: COLORS.gold, fontFamily: 'Inter_700Bold', fontSize: 13, marginBottom: 8 },
  approveButton: { backgroundColor: COLORS.success, borderRadius: 8, width: 34, height: 34, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  approveButtonText: { color: '#FFF', fontFamily: 'Inter_700Bold', fontSize: 16 },
  rejectButton: { backgroundColor: COLORS.danger, borderRadius: 8, width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  rejectButtonText: { color: '#FFF', fontFamily: 'Inter_700Bold', fontSize: 16 },
  connectingHint: { color: COLORS.textMuted, fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 6, textAlign: 'center' },
  waitingSlot: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.backgroundAlt, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: COLORS.surfaceBorder, borderStyle: 'dashed' },
  waitingSlotText: { color: COLORS.textMuted, fontFamily: 'Inter_400Regular', fontSize: 14 },
  playerCardItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, gap: 12, borderWidth: 1, borderColor: COLORS.surfaceBorder },
  playerCardAvatar: { fontSize: 26 },
  playerCardInfo: { flex: 1 },
  playerCardName: { color: COLORS.text, fontFamily: 'Inter_700Bold', fontSize: 15 },
  playerCardRole: { color: COLORS.textMuted, fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 1 },
  playerCardReady: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(34,197,94,0.15)', borderWidth: 1, borderColor: COLORS.success, justifyContent: 'center', alignItems: 'center' },
  playerCardReadyText: { color: COLORS.success, fontSize: 13, fontFamily: 'Inter_900Black' },
});
