import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Platform, StatusBar, ScrollView, Image } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { COLORS, SPACING, BORDER_RADIUS } from '../../styles/theme';
import { PlayerCard } from './PlayerCard';
import { DiceDisplay } from './DiceDisplay';
import { PropertyModal } from './PropertyModal';
import { EventToast } from './EventToast';
import { DisconnectModal } from './DisconnectModal';
import { JailPanel } from './JailPanel';
import { SettingsButton } from './ForfeitButton';
import { GameLogPanel } from './GameLogPanel';
import { PlayerPropertiesModal } from './PlayerPropertiesModal';
import { PropertyDetailModal } from './PropertyDetailModal';
import { CardModal } from './CardModal';
import { TradeModal } from './TradeModal';
import { NetworkManager } from '../../network/NetworkManager';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, Easing, interpolateColor } from 'react-native-reanimated';

const HALO_COLORS = ['#D0021B', '#007A3D', '#FFFFFF'] as const;

const AnimatedHalo = () => {
  const colorProgress = useSharedValue(0);

  useEffect(() => {
    colorProgress.value = withRepeat(
      withTiming(3, { duration: 6000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const mistStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      colorProgress.value,
      [0, 1, 2, 3],
      ['#D0021B', '#007A3D', '#FFFFFF', '#D0021B']
    );
    return {
      shadowColor: color,
    };
  });

  return (
    <Animated.View style={[styles.logoMist, mistStyle]} />
  );
};

/**
 * HUDLayer is an absolute overlay on top of the entire GameScreen.
 * It uses pointerEvents='box-none' so that touch events pass through
 * to the board underneath, except on interactive HUD elements.
 *
 * Layout:
 *   TOP    → Player cards row + Event toast
 *   CENTER → (transparent — board visible through)
 *   BOTTOM → Dice display + Roll button / Phase indicator
 *   MODAL  → PropertyModal (when WAITING_FOR_DECISION for human)
 */
export const HUDLayer = () => {
  const players = useGameStore((s) => s.players);
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);
  const turnPhase = useGameStore((s) => s.turnPhase);
  const lastDiceRoll = useGameStore((s) => s.lastDiceRoll);
  const rollDice = useGameStore((s) => s.rollDice);
  const localPlayerId = useGameStore(s => s.localPlayerId);
  const networkRole = useGameStore(s => s.networkRole);
  const connectedClients = useGameStore(s => s.connectedClients);
  const setIsGameLogOpen = useGameStore(s => s.setIsGameLogOpen);
  const chronoEndTime = useGameStore(s => s.chronoEndTime);
  const checkChronoExpired = useGameStore(s => s.checkChronoExpired);
  const turnTimeRemaining = useGameStore(s => s.turnTimeRemaining);
  const [isTradeModalOpen, setIsTradeModalOpen] = React.useState(false);
  const [chronoDisplay, setChronoDisplay] = useState<string | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  useEffect(() => {
    if (!chronoEndTime) { setChronoDisplay(null); return; }
    const update = () => {
      const remaining = chronoEndTime - Date.now();
      if (remaining <= 0) {
        setChronoDisplay('00:00');
        checkChronoExpired();
        return;
      }
      const m = Math.floor(remaining / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      setChronoDisplay(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [chronoEndTime]);

  const currentPlayer = players[currentPlayerIndex];
  // Determine if current player is controlled by a remote client (not the host)
  const isRemoteClientPlayer = connectedClients.some(c => c.playerId === currentPlayer?.id);
  // Host/local: controls non-bot players that are NOT remote clients
  // Client: controls only their own assigned player
  const isHostOrLocal = networkRole === 'host' || networkRole === 'local';
  const isLocalPlayerTurn = isHostOrLocal
    ? !currentPlayer?.isBot && !isRemoteClientPlayer
    : currentPlayer?.id === localPlayerId;
  const canRoll = turnPhase === 'WAITING_FOR_DICE' && isLocalPlayerTurn && !isRolling;
  const isGameOver = turnPhase === 'GAME_OVER';
  const isBotDecision = turnPhase === 'WAITING_FOR_DECISION' && currentPlayer?.isBot;
  const isJailDecision = turnPhase === 'IN_JAIL_DECISION';
  const isLocalJailDecision = isJailDecision && isLocalPlayerTurn;
  const isBotJailDecision = isJailDecision && currentPlayer?.isBot;

  // Find the winner for GAME_OVER display
  const winner = isGameOver ? players.find(p => !p.isBankrupt) : null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      
      {/* ─── TOP BAR (Stretches to absolute top) ─── */}
      <View style={styles.topBar} pointerEvents="box-none">
        <View style={styles.topHeader}>
          {/* Left: Logo + Title */}
          <View style={styles.topLeft}>
            <View style={styles.logoWrapper}>
              <AnimatedHalo />
              <Image source={require('../../../assets/images/logo-lemur.webp')} style={styles.logoImageOnly} resizeMode="contain" />
            </View>
          </View>

          {/* Right: Room/Mode & Settings */}
          <View style={styles.topRightGroup}>
            <View style={styles.topSubInfo}>
              <View style={styles.subInfoCol}>
                <Text style={styles.subInfoLabel}>ROOM</Text>
                <Text style={styles.subInfoValue}>
                  {NetworkManager.getRoomCode() ? `#${NetworkManager.getRoomCode()}` : '#Locale'}
                </Text>
              </View>
              
              <View style={styles.subInfoDivider} />
              
              <View style={styles.subInfoCol}>
                <Text style={styles.subInfoLabel}>MODE</Text>
                <Text style={[styles.subInfoValue, { color: networkRole === 'local' ? COLORS.gold : COLORS.success }]}>
                  {networkRole === 'local' ? 'Solo' : 'En ligne'}
                </Text>
              </View>
            </View>

            <View style={styles.topActions}>
              {chronoDisplay && (
                <View style={[styles.chronoBadge, chronoDisplay <= '00:30' && styles.chronoBadgeUrgent]}>
                  <Text style={[styles.chronoText, chronoDisplay <= '00:30' && styles.chronoTextUrgent]}>⏱ {chronoDisplay}</Text>
                </View>
              )}
              <SettingsButton />
            </View>
          </View>
        </View>
      </View>

      {/* ─── CENTER AREA (Transparent) ─── */}
      <View style={styles.centerArea} pointerEvents="box-none">
        
        <EventToast />

        <View style={styles.centerSpacer} pointerEvents="box-none">
          {/* ── GAME OVER BANNER ── */}
          {isGameOver && winner && (
            <View style={styles.gameOverBanner} pointerEvents="auto">
              <Text style={styles.gameOverCrown}>👑</Text>
              <Text style={styles.gameOverTitle}>VICTOIRE !</Text>
              <Text style={styles.gameOverName}>{winner.name}</Text>
              <Text style={styles.gameOverBalance}>
                Fortune finale : {winner.balance.toLocaleString()} AR
              </Text>

              <View style={styles.gameOverActions}>
                {isHostOrLocal && (
                  <TouchableOpacity 
                    style={styles.gameOverBtn}
                    onPress={() => useGameStore.getState().returnToRoomLobby()}
                  >
                    <Text style={styles.gameOverBtnText}>NOUVELLE PARTIE</Text>
                  </TouchableOpacity>
                )}
                {!isHostOrLocal && (
                  <Text style={styles.gameOverWaitText}>En attente de l'hôte...</Text>
                )}
                <TouchableOpacity 
                  style={[styles.gameOverBtn, styles.gameOverBtnSecondary]}
                  onPress={() => useGameStore.getState().resetToLobby()}
                >
                  <Text style={styles.gameOverBtnTextSecondary}>QUITTER</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* ─── FLOATING CONTROLS (Dice, then Players) just above bottom bar ─── */}
        <View style={styles.floatingControlsContainer} pointerEvents="box-none">
          
          {/* Dice & Status */}
          <View style={styles.centerControl} pointerEvents="auto">
            {!isGameOver && (
              <View style={styles.diceContainer}>
                <DiceDisplay diceRoll={lastDiceRoll} isRolling={isRolling} />
              </View>
            )}
            
            {/* Status messages in center */}
            {!canRoll && !isGameOver && !isJailDecision && turnPhase !== 'END_OF_TURN' && turnPhase !== 'WAITING_FOR_DECISION' && (
              <View style={styles.phaseIndicator}>
                <Text style={styles.phaseText}>
                  {turnPhase === 'ANIMATING_MOVEMENT' && '⏳ Déplacement...'}
                  {turnPhase === 'RESOLVING_SPACE' && '🔍 Résolution...'}
                  {turnPhase === 'WAITING_FOR_DICE' && !isLocalPlayerTurn && `⏳ ${currentPlayer?.name || 'Joueur'} réfléchit...`}
                </Text>
              </View>
            )}
            {(isBotDecision || isBotJailDecision) && (
              <View style={styles.phaseIndicator}>
                <Text style={styles.phaseText}>🤖 Le bot réfléchit...</Text>
              </View>
            )}
            {isJailDecision && !isLocalPlayerTurn && !currentPlayer?.isBot && (
              <View style={styles.phaseIndicator}>
                <Text style={styles.phaseText}>⛓️ {currentPlayer?.name} est en prison...</Text>
              </View>
            )}
            {isLocalJailDecision && <JailPanel />}
          </View>

          {/* Players Row */}
          <View style={styles.playersWrapper} pointerEvents="auto">
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.playersScrollContent}
              style={styles.playersScroll}
            >
              {players.map((player, index) => (
                <View key={player.id} style={styles.playerCardContainer}>
                  <PlayerCard
                    player={player}
                    isActive={index === currentPlayerIndex}
                  />
                  {/* Timer display under active player card */}
                  {index === currentPlayerIndex && turnTimeRemaining !== null && !player.isBot && (
                    <View style={[styles.timerContainer, turnTimeRemaining <= 5000 && styles.timerUrgent]}>
                      <Text style={[styles.timerText, turnTimeRemaining <= 5000 && styles.timerTextUrgent]}>
                        ⏱ {Math.ceil(turnTimeRemaining / 1000)}s
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>

      </View>

      {/* ─── BOTTOM BAR (Stretches to absolute bottom) ─── */}
      <View style={styles.bottomBar} pointerEvents="box-none">
        <View style={styles.controlsRow} pointerEvents="box-none">
          {/* Left: Log */}
          <View style={styles.sideControl} pointerEvents="auto">
            <TouchableOpacity style={styles.actionCircleBtn} onPress={() => setIsGameLogOpen(true)} activeOpacity={0.7}>
              <Text style={styles.actionCircleIcon}>📜</Text>
            </TouchableOpacity>
            <Text style={styles.actionCircleLabel}>Logs</Text>
          </View>

          {/* Center: Roll Button (if available) */}
          <View style={styles.bottomCenterControl} pointerEvents="auto">
            {canRoll && !isGameOver && (
              <TouchableOpacity
                style={styles.rollButton}
                onPress={() => {
                  if (isRolling) return;
                  setIsRolling(true);
                  setTimeout(() => { rollDice(true); setIsRolling(false); }, 800);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.rollButtonIcon}>🎲</Text>
                <Text style={styles.rollButtonText}>LANCER</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Right: Trade */}
          <View style={styles.sideControl} pointerEvents="auto">
            <TouchableOpacity style={styles.actionCircleBtn} onPress={() => setIsTradeModalOpen(true)} activeOpacity={0.7}>
              <Text style={styles.actionCircleIcon}>🤝</Text>
            </TouchableOpacity>
            <Text style={styles.actionCircleLabel}>Échange</Text>
          </View>
        </View>
      </View>

      {/* ─── PROPERTY MODAL (full-screen overlay for human decisions) ─── */}
      <PropertyModal />

      {/* ─── DISCONNECT MODAL (blocks screen on connection loss) ─── */}
      <DisconnectModal />
      <GameLogPanel />
      <PlayerPropertiesModal />
      <PropertyDetailModal />
      <CardModal />
      <TradeModal 
        visible={isTradeModalOpen} 
        onClose={() => setIsTradeModalOpen(false)} 
        onCounterOffer={() => setIsTradeModalOpen(true)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    justifyContent: 'space-between',
  },
  centerArea: {
    flex: 1,
    width: '100%',
    zIndex: 20, // Assure que les éléments flottants sont au-dessus du fond
  },
  topBar: {
    paddingTop: Platform.OS === 'ios' ? 48 : StatusBar.currentHeight || 24,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: 'rgba(18, 18, 18, 0.95)',
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    position: 'relative',
    zIndex: 10,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoWrapper: {
    position: 'relative',
    width: 42,
    height: 42,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoMist: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    top: 16,
    left: 16,
    zIndex: -1,
    backgroundColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 25,
    elevation: 20,
  },
  logoImageOnly: {
    width: 42,
    height: 42,
  },
  madapolyTitle: {
    fontSize: 20,
    fontFamily: 'Inter_900Black',
    letterSpacing: 2,
  },
  topRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topSubInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.md,
  },
  subInfoCol: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  subInfoLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 8,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
    marginBottom: 2,
  },
  subInfoValue: {
    color: COLORS.white,
    fontSize: 10,
    fontFamily: 'Inter_900Black',
  },
  subInfoDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chronoBadge: {
    backgroundColor: 'rgba(18,18,18,0.85)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  chronoBadgeUrgent: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239,68,68,0.15)',
  },
  chronoText: {
    color: '#FFF',
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    letterSpacing: 1,
  },
  chronoTextUrgent: {
    color: '#EF4444',
  },
  centerSpacer: {
    flex: 1,
  },

  // ─── BOTTOM BAR ───
  bottomBar: {
    paddingTop: SPACING.sm,
    paddingBottom: Platform.OS === 'ios' ? 34 : SPACING.md,
    width: '100%',
    backgroundColor: 'rgba(18, 18, 18, 0.95)',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 10,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    width: '100%',
  },
  bottomCenterControl: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideControl: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── FLOATING CONTROLS ───
  floatingControlsContainer: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: SPACING.md,
    zIndex: 20,
  },
  playersWrapper: {
    width: '100%',
    marginBottom: 8,
  },
  playersScroll: {
    flexGrow: 0,
  },
  playersScrollContent: {
    paddingHorizontal: SPACING.md,
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '100%',
  },
  centerControl: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 8, // Ajout d'une marge sous les dés
  },
  actionCircleBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  actionCircleIcon: {
    fontSize: 20,
  },
  actionCircleLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  diceContainer: {
    backgroundColor: 'rgba(18, 18, 18, 0.85)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    // Glassmorphism
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },

  // ─── ROLL BUTTON ───
  rollButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 11,
    paddingHorizontal: 22,
    borderRadius: BORDER_RADIUS.xl,
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  rollButtonIcon: {
    fontSize: 18,
  },
  rollButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: 'Inter_900Black',
    letterSpacing: 2,
  },

  // ─── PHASE INDICATOR ───
  phaseIndicator: {
    backgroundColor: 'rgba(18, 18, 18, 0.7)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: BORDER_RADIUS.md,
  },
  phaseText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },

  // ─── GAME OVER BANNER ───
  gameOverBanner: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(18, 18, 18, 0.95)',
    paddingVertical: 30,
    paddingHorizontal: 40,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FEDB01',
    // Gold glow
    shadowColor: '#FEDB01',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 20,
  },
  gameOverCrown: {
    fontSize: 48,
    marginBottom: 8,
  },
  gameOverTitle: {
    color: '#FEDB01',
    fontSize: 32,
    fontFamily: 'Inter_900Black',
    letterSpacing: 4,
  },
  gameOverName: {
    color: COLORS.white,
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    marginTop: 8,
  },
  gameOverBalance: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginTop: 6,
  },
  gameOverActions: {
    marginTop: 24,
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  gameOverBtn: {
    backgroundColor: COLORS.madaGreen,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  gameOverBtnSecondary: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  gameOverBtnText: {
    color: '#FFF',
    fontFamily: 'Inter_900Black',
    fontSize: 14,
    letterSpacing: 1,
  },
  gameOverBtnTextSecondary: {
    color: COLORS.textSecondary,
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    letterSpacing: 1,
  },
  gameOverWaitText: {
    color: COLORS.gold,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginBottom: 8,
  },

  // ─── TIMER STYLES ───
  playerCardContainer: {
    alignItems: 'center',
  },
  timerContainer: {
    backgroundColor: 'rgba(18, 18, 18, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  timerUrgent: {
    backgroundColor: 'rgba(225, 29, 20, 0.8)',
    borderColor: 'rgba(225, 29, 20, 0.3)',
  },
  timerText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  timerTextUrgent: {
    color: COLORS.white,
  },
});
