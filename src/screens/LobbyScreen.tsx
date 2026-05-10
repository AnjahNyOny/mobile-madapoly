import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, SafeAreaView, ActivityIndicator, Clipboard, ScrollView, Platform } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '../styles/theme';
import { NetworkManager } from '../network/NetworkManager';
import { useGameStore, ConnectedClient } from '../store/useGameStore';
import { RELAY_URL } from '../constants/config';

type LobbyMode = 'select' | 'host' | 'client' | 'online_host' | 'online_client';

const AVATARS = ['🎩', '🚗', '🐕', '🚢', '👟', '🛒', '🐴', '🚜'];

export const LobbyScreen = () => {
  const [mode, setMode] = useState<LobbyMode>('select');
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
  
  const setNetworkRole = useGameStore(s => s.setNetworkRole);
  const setLocalPlayerId = useGameStore(s => s.setLocalPlayerId);
  const setLocalPlayerInfo = useGameStore(s => s.setLocalPlayerInfo);
  const localPlayerName = useGameStore(s => s.localPlayerName);
  const localPlayerAvatar = useGameStore(s => s.localPlayerAvatar);
  const setAppScreen = useGameStore(s => s.setAppScreen);
  const syncState = useGameStore(s => s.syncState);
  const initGame = useGameStore(s => s.initGame);
  const appScreen = useGameStore(s => s.appScreen);

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
          console.log(`[Lobby] Triggering bankruptcy for player ${client.playerId}`);
          setTimeout(() => {
            useGameStore.getState().handleBankruptcy(client.playerId, null);
          }, 0);
        }
      }

      setConnectedClients((prev) => prev.filter(c => c.socketId !== clientId));

      if (clientId === 'host' || clientId === 'host_left') {
        // We were a client and the host disconnected
        const { appScreen } = useGameStore.getState();
        if (appScreen === 'game') {
          // 'host_left' = intentional (HOST_LEFT relay msg) → offer bot choice
          // 'host'      = network drop → fatal disconnect modal
          const status = clientId === 'host_left' ? 'host_disconnected' : 'disconnected';
          useGameStore.getState().setNetworkStatus(status);
        } else {
          // In lobby: just show error and go back to select
          setConnectionError('Hôte déconnecté');
          setMode('select');
        }
      }
    });

    NetworkManager.onMessage((packet, clientId) => {
      // Client: receive our assigned player ID from the host
      if (packet.type === 'ASSIGN_PLAYER_ID') {
        const { playerId } = packet.payload;
        // Store our local player ID
        useGameStore.getState().setLocalPlayerId(playerId);
        
        // Send our info to the host
        const state = useGameStore.getState();
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
        syncState(packet.payload);
        setAppScreen('game');
      } else if (packet.type === 'STATE_UPDATE') {
        syncState(packet.payload);
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

  const handleOnlineHost = async () => {
    setIsConnecting(true);
    setConnectionError('');
    NetworkManager.setTransport('websocket', RELAY_URL);
    setNetworkRole('host', 'host');
    try {
      const code = await NetworkManager.createRoom();
      setRoomCode(code);
      setMode('online_host');
    } catch (e) {
      setConnectionError('Impossible de créer la room. Vérifiez votre connexion.');
      NetworkManager.setTransport('tcp');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleOnlineJoin = async () => {
    const code = clientInputRoomCode.trim().toUpperCase();
    if (!code) return;
    setIsConnecting(true);
    setConnectionError('');
    NetworkManager.setTransport('websocket', RELAY_URL);
    try {
      await NetworkManager.joinRoom(code);
      setMode('online_client');
      setNetworkRole('client', 'client-' + Date.now());
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
    const { players, board, currentPlayerIndex, turnPhase, consecutiveDoubles, lastDiceRoll, actionDeadline, lastEvent } = state;
    NetworkManager.broadcast({
      type: 'GAME_START',
      payload: { players, board, currentPlayerIndex, turnPhase, consecutiveDoubles, lastDiceRoll, actionDeadline, lastEvent }
    });

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

  return (
    <SafeAreaView style={styles.container}>
      {connectionError ? <Text style={styles.errorText}>{connectionError}</Text> : null}

      {mode === 'select' && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>MADAPOLY</Text>
          <View style={styles.content}>
            <Text style={styles.stepperLabel}>Votre Identité</Text>
            <View style={styles.identityRow}>
              <TextInput
                style={styles.nameInput}
                value={localPlayerName}
                onChangeText={(t) => setLocalPlayerInfo(t, localPlayerAvatar)}
                placeholder="Votre pseudo"
                placeholderTextColor="#999"
                maxLength={12}
              />
            </View>
            <View style={styles.avatarList}>
              {AVATARS.map(a => (
                <TouchableOpacity
                  key={a}
                  style={[styles.avatarBtn, localPlayerAvatar === a && styles.avatarBtnActive]}
                  onPress={() => setLocalPlayerInfo(localPlayerName, a)}
                >
                  <Text style={styles.avatarEmoji}>{a}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>🏠  Solo</Text>

            {/* Bot count selector */}
            <Text style={styles.stepperLabel}>🤖 Nombre de Bots</Text>
            <View style={styles.stepper}>
              <TouchableOpacity
                style={[styles.stepperButton, botCount <= 1 && styles.stepperButtonDisabled]}
                onPress={() => setBotCount(Math.max(1, botCount - 1))}
                disabled={botCount <= 1}
              >
                <Text style={styles.stepperButtonText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{botCount}</Text>
              <TouchableOpacity
                style={[styles.stepperButton, botCount >= 3 && styles.stepperButtonDisabled]}
                onPress={() => setBotCount(Math.min(3, botCount + 1))}
                disabled={botCount >= 3}
              >
                <Text style={styles.stepperButtonText}>+</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.stepperInfo}>{botCount + 1} joueurs au total</Text>

            <TouchableOpacity style={styles.button} onPress={startSolo}>
              <Text style={styles.buttonText}>Lancer la partie Solo</Text>
            </TouchableOpacity>

            {Platform.OS !== 'web' && (
              <>
                <View style={styles.divider} />
                <Text style={styles.sectionTitle}>📶  Partie Locale (Wi-Fi)</Text>

                <TouchableOpacity style={styles.button} onPress={handleHost}>
                  <Text style={styles.buttonText}>Héberger (LAN)</Text>
                </TouchableOpacity>

                <TextInput
                  style={styles.input}
                  placeholder="Ex: 192.168.1.15"
                  placeholderTextColor="#999"
                  value={clientInputIp}
                  onChangeText={setClientInputIp}
                  keyboardType="numbers-and-punctuation"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={handleJoin} disabled={isConnecting}>
                  {isConnecting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Rejoindre (LAN)</Text>}
                </TouchableOpacity>
              </>
            )}

            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>🌐  Jouer en Ligne</Text>

            <TouchableOpacity style={[styles.button, styles.buttonOnline]} onPress={handleOnlineHost} disabled={isConnecting}>
              {isConnecting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Créer une partie en ligne</Text>}
            </TouchableOpacity>
            {isConnecting && <Text style={styles.connectingHint}>Connexion au relay... (peut prendre ~30s la 1ère fois)</Text>}

            <TextInput
              style={styles.input}
              placeholder="Code de room (ex: TANA-4892)"
              placeholderTextColor="#999"
              value={clientInputRoomCode}
              onChangeText={setClientInputRoomCode}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <TouchableOpacity style={[styles.button, styles.buttonOnlineSecondary]} onPress={handleOnlineJoin} disabled={isConnecting}>
              {isConnecting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Rejoindre en ligne</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {mode === 'host' && (
        <View style={styles.centeredContent}>
          <Text style={styles.title}>MADAPOLY</Text>
          <View style={styles.content}>
          <Text style={styles.subtitle}>Votre adresse IP :</Text>
          <Text style={styles.ipText}>{hostIp || 'Chargement...'}</Text>
          
          <Text style={styles.subtitle}>Joueurs connectés : {connectedClients.length}</Text>
          <View style={styles.playerCardsList}>
            {/* Host card (always first) */}
            <View style={styles.playerCardItem}>
              <Text style={styles.playerCardAvatar}>{localPlayerAvatar || '🎩'}</Text>
              <View style={styles.playerCardInfo}>
                <Text style={styles.playerCardName}>{localPlayerName || 'Hôte'}</Text>
                <Text style={styles.playerCardRole}>Hôte</Text>
              </View>
              <View style={styles.playerCardReady}>
                <Text style={styles.playerCardReadyText}>✓</Text>
              </View>
            </View>
            {connectedClients.length === 0 ? (
              <View style={styles.waitingSlot}>
                <Text style={styles.waitingSlotText}>En attente de joueurs...</Text>
              </View>
            ) : (
              connectedClients.map((c, i) => (
                <View key={c.socketId} style={styles.playerCardItem}>
                  <Text style={styles.playerCardAvatar}>{c.avatar || '🎮'}</Text>
                  <View style={styles.playerCardInfo}>
                    <Text style={styles.playerCardName}>{c.name || `Joueur ${i + 2}`}</Text>
                    <Text style={styles.playerCardRole}>Client</Text>
                  </View>
                  <View style={styles.playerCardReady}>
                    <Text style={styles.playerCardReadyText}>✓</Text>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Bot count selector for host */}
          {maxBotsForHost > 0 && (
            <>
              <Text style={[styles.stepperLabel, { marginTop: 20 }]}>🤖 Bots supplémentaires</Text>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={[styles.stepperButton, botCount <= minBotsForHost && styles.stepperButtonDisabled]}
                  onPress={() => setBotCount(Math.max(minBotsForHost, botCount - 1))}
                  disabled={botCount <= minBotsForHost}
                >
                  <Text style={styles.stepperButtonText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{botCount}</Text>
                <TouchableOpacity
                  style={[styles.stepperButton, botCount >= maxBotsForHost && styles.stepperButtonDisabled]}
                  onPress={() => setBotCount(Math.min(maxBotsForHost, botCount + 1))}
                  disabled={botCount >= maxBotsForHost}
                >
                  <Text style={styles.stepperButtonText}>+</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.stepperInfo}>{1 + connectedClients.length + botCount} joueurs au total</Text>
            </>
          )}
          
          <TouchableOpacity 
            style={[styles.button, { marginTop: 40 }]} 
            onPress={startGame}
          >
            <Text style={styles.buttonText}>
              {connectedClients.length === 0 ? 'Lancer avec des Bots' : 'Lancer la partie'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.buttonTextOnly} onPress={() => { NetworkManager.closeServer(); setMode('select'); }}>
            <Text style={styles.linkText}>Annuler</Text>
          </TouchableOpacity>
          </View>
        </View>
      )}

      {mode === 'client' && (
        <View style={styles.centeredContent}>
          <Text style={styles.title}>MADAPOLY</Text>
          <View style={styles.content}>
          <Text style={styles.subtitle}>Connecté à {clientInputIp}</Text>
          <View style={[styles.playerCardItem, { marginTop: 30, width: '100%' }]}>
            <Text style={styles.playerCardAvatar}>{localPlayerAvatar || '🎮'}</Text>
            <View style={styles.playerCardInfo}>
              <Text style={styles.playerCardName}>{localPlayerName || 'Vous'}</Text>
              <Text style={styles.playerCardRole}>Connecté ✓</Text>
            </View>
          </View>
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 30 }} />
          <Text style={styles.waitText}>En attente de l'hôte pour commencer...</Text>

          <TouchableOpacity style={[styles.buttonTextOnly, { marginTop: 40 }]} onPress={() => { NetworkManager.disconnect(); setMode('select'); }}>
            <Text style={styles.linkText}>Quitter</Text>
          </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── ONLINE HOST VIEW ── */}
      {mode === 'online_host' && (
        <View style={styles.centeredContent}>
          <Text style={styles.title}>MADAPOLY</Text>
          <View style={styles.content}>
          <Text style={styles.subtitle}>Code de la room :</Text>
          <Text style={styles.roomCodeText}>{roomCode}</Text>
          <TouchableOpacity style={styles.copyButton} onPress={handleCopyRoomCode}>
            <Text style={styles.copyButtonText}>{roomCodeCopied ? '✓ Copié !' : 'Copier le code'}</Text>
          </TouchableOpacity>
          <Text style={styles.waitText}>Partagez ce code avec vos amis</Text>

          <Text style={[styles.subtitle, { marginTop: 30 }]}>Joueurs connectés : {connectedClients.length}</Text>
          <View style={styles.playerCardsList}>
            {/* Host card */}
            <View style={styles.playerCardItem}>
              <Text style={styles.playerCardAvatar}>{localPlayerAvatar || '🎩'}</Text>
              <View style={styles.playerCardInfo}>
                <Text style={styles.playerCardName}>{localPlayerName || 'Hôte'}</Text>
                <Text style={styles.playerCardRole}>Hôte 👑</Text>
              </View>
              <View style={styles.playerCardReady}>
                <Text style={styles.playerCardReadyText}>✓</Text>
              </View>
            </View>
            {connectedClients.length === 0 ? (
              <View style={styles.waitingSlot}>
                <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 10 }} />
                <Text style={styles.waitingSlotText}>En attente de joueurs...</Text>
              </View>
            ) : (
              connectedClients.map((c, i) => (
                <View key={c.socketId} style={styles.playerCardItem}>
                  <Text style={styles.playerCardAvatar}>{c.avatar || '🎮'}</Text>
                  <View style={styles.playerCardInfo}>
                    <Text style={styles.playerCardName}>{c.name || `Joueur ${i + 2}`}</Text>
                    <Text style={styles.playerCardRole}>En ligne</Text>
                  </View>
                  <View style={styles.playerCardReady}>
                    <Text style={styles.playerCardReadyText}>✓</Text>
                  </View>
                </View>
              ))
            )}
          </View>

          {maxBotsForHost > 0 && (
            <>
              <Text style={[styles.stepperLabel, { marginTop: 20 }]}>🤖 Bots supplémentaires</Text>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={[styles.stepperButton, botCount <= minBotsForHost && styles.stepperButtonDisabled]}
                  onPress={() => setBotCount(Math.max(minBotsForHost, botCount - 1))}
                  disabled={botCount <= minBotsForHost}
                >
                  <Text style={styles.stepperButtonText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{botCount}</Text>
                <TouchableOpacity
                  style={[styles.stepperButton, botCount >= maxBotsForHost && styles.stepperButtonDisabled]}
                  onPress={() => setBotCount(Math.min(maxBotsForHost, botCount + 1))}
                  disabled={botCount >= maxBotsForHost}
                >
                  <Text style={styles.stepperButtonText}>+</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.stepperInfo}>{1 + connectedClients.length + botCount} joueurs au total</Text>
            </>
          )}

          <TouchableOpacity
            style={[styles.button, styles.buttonOnline, { marginTop: 30 }]}
            onPress={startGame}
          >
            <Text style={styles.buttonText}>
              {connectedClients.length === 0 ? 'Lancer avec des Bots' : 'Lancer la partie'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.buttonTextOnly} onPress={() => { NetworkManager.cleanup(); setConnectedClients([]); setRoomCode(''); setMode('select'); }}>
            <Text style={styles.linkText}>Annuler</Text>
          </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── ONLINE CLIENT VIEW ── */}
      {mode === 'online_client' && (
        <View style={styles.centeredContent}>
          <Text style={styles.title}>MADAPOLY</Text>
          <View style={styles.content}>
          <Text style={styles.subtitle}>🌐 Connecté à la room</Text>
          <Text style={styles.roomCodeText}>{clientInputRoomCode.toUpperCase()}</Text>
          <View style={[styles.playerCardItem, { marginTop: 10, width: '100%' }]}>
            <Text style={styles.playerCardAvatar}>{localPlayerAvatar || '🎮'}</Text>
            <View style={styles.playerCardInfo}>
              <Text style={styles.playerCardName}>{localPlayerName || 'Vous'}</Text>
              <Text style={styles.playerCardRole}>Connecté ✓</Text>
            </View>
          </View>
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
          <Text style={styles.waitText}>En attente de l'hôte pour commencer...</Text>

          <TouchableOpacity style={[styles.buttonTextOnly, { marginTop: 40 }]} onPress={() => { NetworkManager.cleanup(); setMode('select'); }}>
            <Text style={styles.linkText}>Quitter</Text>
          </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  title: { fontSize: 42, fontFamily: 'Inter_900Black', color: COLORS.primary, marginBottom: 30 },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', color: COLORS.textSecondary, marginBottom: 12, alignSelf: 'flex-start' },
  badge: { fontSize: 14, fontFamily: 'Inter_700Bold', color: '#FFF', backgroundColor: '#333', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, overflow: 'hidden', marginBottom: 40 },
  subtitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#FFF', marginTop: 20 },
  content: { width: '85%', alignItems: 'center' },
  centeredContent: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' },
  button: { backgroundColor: COLORS.primary, paddingVertical: 16, paddingHorizontal: 30, borderRadius: BORDER_RADIUS.md, width: '100%', alignItems: 'center', marginVertical: 10 },
  buttonSecondary: { backgroundColor: COLORS.secondary },
  buttonText: { color: '#FFF', fontFamily: 'Inter_700Bold', fontSize: 18 },
  input: { backgroundColor: '#FFF', width: '100%', padding: 18, borderRadius: BORDER_RADIUS.md, fontSize: 18, fontFamily: 'Inter_400Regular', marginBottom: 10, textAlign: 'center' },
  ipText: { fontSize: 38, fontFamily: 'Inter_900Black', color: '#FFF', marginVertical: 15 },
  clientText: { color: COLORS.secondary, fontFamily: 'Inter_700Bold', fontSize: 16, marginVertical: 8 },
  // ── Player cards in lobby ──
  playerCardsList: { width: '100%', gap: 10, marginTop: 12 },
  playerCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  playerCardAvatar: { fontSize: 28 },
  playerCardInfo: { flex: 1 },
  playerCardName: { color: '#FFF', fontFamily: 'Inter_700Bold', fontSize: 16 },
  playerCardRole: { color: 'rgba(255,255,255,0.45)', fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 2 },
  playerCardReady: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(31, 178, 90, 0.2)',
    borderWidth: 1, borderColor: '#1FB25A',
    justifyContent: 'center', alignItems: 'center',
  },
  playerCardReadyText: { color: '#1FB25A', fontSize: 14, fontFamily: 'Inter_900Black' },
  waitingSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderStyle: 'dashed',
  },
  waitingSlotText: { color: 'rgba(255,255,255,0.35)', fontFamily: 'Inter_400Regular', fontSize: 14 },
  waitText: { color: '#AAA', fontFamily: 'Inter_400Regular', fontSize: 16, marginTop: 15, textAlign: 'center' },
  connectingHint: { color: 'rgba(255,255,255,0.35)', fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 6, textAlign: 'center' },
  identityRow: {
    flexDirection: 'row',
    marginBottom: 10,
    width: '100%',
  },
  nameInput: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  avatarList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 10,
  },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#E8F5E9',
  },
  avatarEmoji: {
    fontSize: 24,
  },
  errorText: { color: '#E10214', fontFamily: 'Inter_700Bold', fontSize: 16, marginBottom: 20, textAlign: 'center', paddingHorizontal: 20 },
  divider: { height: 1, backgroundColor: '#333', width: '100%', marginVertical: 25 },
  buttonTextOnly: { marginTop: 10, padding: 10 },
  linkText: { color: '#999', fontFamily: 'Inter_400Regular', fontSize: 16, textDecorationLine: 'underline' },
  // ── Bot Stepper ──
  stepperLabel: { color: '#FFF', fontFamily: 'Inter_700Bold', fontSize: 15, marginBottom: 10, textAlign: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 6 },
  stepperButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  stepperButtonDisabled: { backgroundColor: '#333', opacity: 0.5 },
  stepperButtonText: { color: '#FFF', fontSize: 22, fontFamily: 'Inter_900Black' },
  stepperValue: { color: '#FFF', fontSize: 32, fontFamily: 'Inter_900Black', minWidth: 40, textAlign: 'center' },
  stepperInfo: { color: '#AAA', fontFamily: 'Inter_400Regular', fontSize: 13, marginBottom: 16, textAlign: 'center' },
  // ── Online ──
  buttonOnline: { backgroundColor: '#1565C0' },
  buttonOnlineSecondary: { backgroundColor: '#0D47A1' },
  roomCodeText: { fontSize: 40, fontFamily: 'Inter_900Black', color: COLORS.accent, letterSpacing: 4, marginVertical: 12, textAlign: 'center' },
  copyButton: { backgroundColor: '#2A2A2A', paddingVertical: 8, paddingHorizontal: 20, borderRadius: BORDER_RADIUS.md, marginBottom: 8, borderWidth: 1, borderColor: COLORS.accent },
  copyButtonText: { color: COLORS.accent, fontFamily: 'Inter_700Bold', fontSize: 14 },
});
