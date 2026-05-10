import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, SafeAreaView, ActivityIndicator } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '../styles/theme';
import { NetworkManager } from '../network/NetworkManager';
import { useGameStore } from '../store/useGameStore';

type LobbyMode = 'select' | 'host' | 'client';

export const LobbyScreen = () => {
  const [mode, setMode] = useState<LobbyMode>('select');
  const [hostIp, setHostIp] = useState<string>('');
  const [clientInputIp, setClientInputIp] = useState<string>('');
  const [connectedClients, setConnectedClients] = useState<{socketId: string, playerId: string}[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  
  const setNetworkRole = useGameStore(s => s.setNetworkRole);
  const setLocalPlayerId = useGameStore(s => s.setLocalPlayerId);
  const setAppScreen = useGameStore(s => s.setAppScreen);
  const syncState = useGameStore(s => s.syncState);
  const initGame = useGameStore(s => s.initGame);

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
      setConnectedClients((prev) => prev.filter(c => c.socketId !== clientId));
      if (clientId === 'host') {
        // We were a client and the host disconnected
        const { appScreen } = useGameStore.getState();
        if (appScreen === 'game') {
          // In-game: set status to disconnected → triggers DisconnectModal
          useGameStore.getState().setNetworkStatus('disconnected');
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

    // Create initial players. Host + connected clients + bots to fill.
    const playersSetup = [
      { id: hostPlayerId, name: 'Hôte', isBot: false },
      ...connectedClients.map((c, i) => ({ id: c.playerId, name: `Joueur ${i + 2}`, isBot: false }))
    ];
    
    // Add bots if < 4 players total
    while (playersSetup.length < 4) {
      playersSetup.push({ id: `bot-${playersSetup.length}`, name: `Bot ${playersSetup.length}`, isBot: true });
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

  const startSolo = () => {
    setNetworkRole('local'); 
    setLocalPlayerId('p1');
    initGame([
      {id:'p1', name:'Joueur 1', isBot:false}, 
      {id:'b1', name:'Bot 1', isBot:true},
      {id:'b2', name:'Bot 2', isBot:true},
      {id:'b3', name:'Bot 3', isBot:true}
    ]); 
    setAppScreen('game'); 
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>MADAPOLY</Text>
      <Text style={styles.badge}>Mode Réseau Local (LAN)</Text>

      {connectionError ? <Text style={styles.errorText}>{connectionError}</Text> : null}

      {mode === 'select' && (
        <View style={styles.content}>
          <TouchableOpacity style={styles.button} onPress={handleHost}>
            <Text style={styles.buttonText}>Héberger une partie</Text>
          </TouchableOpacity>
          
          <View style={styles.divider} />

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
            {isConnecting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Rejoindre</Text>}
          </TouchableOpacity>
          
          <View style={styles.divider} />
          
          <TouchableOpacity style={styles.buttonTextOnly} onPress={startSolo}>
            <Text style={styles.linkText}>Jouer en solo (Local)</Text>
          </TouchableOpacity>
        </View>
      )}

      {mode === 'host' && (
        <View style={styles.content}>
          <Text style={styles.subtitle}>Votre adresse IP :</Text>
          <Text style={styles.ipText}>{hostIp || 'Chargement...'}</Text>
          
          <Text style={styles.subtitle}>Joueurs connectés : {connectedClients.length}</Text>
          {connectedClients.length === 0 ? (
            <Text style={styles.waitText}>En attente de joueurs...</Text>
          ) : (
            connectedClients.map((c, i) => <Text key={c.socketId} style={styles.clientText}>• Joueur {i + 2} ({c.socketId.split(':')[0]})</Text>)
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
      )}

      {mode === 'client' && (
        <View style={styles.content}>
          <Text style={styles.subtitle}>Connecté à {clientInputIp}</Text>
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
          <Text style={styles.waitText}>En attente de l'hôte pour commencer...</Text>
          
          <TouchableOpacity style={[styles.buttonTextOnly, { marginTop: 40 }]} onPress={() => { NetworkManager.disconnect(); setMode('select'); }}>
            <Text style={styles.linkText}>Quitter</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 42, fontFamily: 'Inter_900Black', color: COLORS.primary, marginBottom: 5 },
  badge: { fontSize: 14, fontFamily: 'Inter_700Bold', color: '#FFF', backgroundColor: '#333', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, overflow: 'hidden', marginBottom: 40 },
  subtitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#FFF', marginTop: 20 },
  content: { width: '85%', alignItems: 'center' },
  button: { backgroundColor: COLORS.primary, paddingVertical: 16, paddingHorizontal: 30, borderRadius: BORDER_RADIUS.md, width: '100%', alignItems: 'center', marginVertical: 10 },
  buttonSecondary: { backgroundColor: COLORS.secondary },
  buttonText: { color: '#FFF', fontFamily: 'Inter_700Bold', fontSize: 18 },
  input: { backgroundColor: '#FFF', width: '100%', padding: 18, borderRadius: BORDER_RADIUS.md, fontSize: 18, fontFamily: 'Inter_400Regular', marginBottom: 10, textAlign: 'center' },
  ipText: { fontSize: 38, fontFamily: 'Inter_900Black', color: '#FFF', marginVertical: 15 },
  clientText: { color: COLORS.secondary, fontFamily: 'Inter_700Bold', fontSize: 16, marginVertical: 8 },
  waitText: { color: '#AAA', fontFamily: 'Inter_400Regular', fontSize: 16, marginTop: 15, textAlign: 'center' },
  errorText: { color: '#E10214', fontFamily: 'Inter_700Bold', fontSize: 16, marginBottom: 20, textAlign: 'center' },
  divider: { height: 1, backgroundColor: '#333', width: '100%', marginVertical: 25 },
  buttonTextOnly: { marginTop: 10, padding: 10 },
  linkText: { color: '#999', fontFamily: 'Inter_400Regular', fontSize: 16, textDecorationLine: 'underline' }
});
