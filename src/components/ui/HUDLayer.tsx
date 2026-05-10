import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Platform, StatusBar } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { COLORS, SPACING, BORDER_RADIUS } from '../../styles/theme';
import { PlayerCard } from './PlayerCard';
import { DiceDisplay } from './DiceDisplay';
import { PropertyModal } from './PropertyModal';
import { EventToast } from './EventToast';
import { DisconnectModal } from './DisconnectModal';
import { JailPanel } from './JailPanel';
import { ForfeitButton } from './ForfeitButton';
import { GameLogPanel } from './GameLogPanel';
import { PlayerPropertiesModal } from './PlayerPropertiesModal';
import { PropertyDetailModal } from './PropertyDetailModal';
import { CardModal } from './CardModal';
import { TradeModal } from './TradeModal';

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
  const setIsGameLogOpen = useGameStore(s => s.setIsGameLogOpen);
  const [isTradeModalOpen, setIsTradeModalOpen] = React.useState(false);

  const currentPlayer = players[currentPlayerIndex];
  const isLocalPlayerTurn = currentPlayer?.id === localPlayerId;
  const canRoll = turnPhase === 'WAITING_FOR_DICE' && isLocalPlayerTurn;
  const isGameOver = turnPhase === 'GAME_OVER';
  const isBotDecision = turnPhase === 'WAITING_FOR_DECISION' && currentPlayer?.isBot;
  const isJailDecision = turnPhase === 'IN_JAIL_DECISION';
  const isLocalJailDecision = isJailDecision && isLocalPlayerTurn;
  const isBotJailDecision = isJailDecision && currentPlayer?.isBot;

  // Find the winner for GAME_OVER display
  const winner = isGameOver ? players.find(p => !p.isBankrupt) : null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <SafeAreaView style={styles.safeArea} pointerEvents="box-none">
        {/* ─── TOP: Player Cards + Settings ─── */}
        <View style={styles.topBar} pointerEvents="box-none">
          <TouchableOpacity 
            style={styles.logButton}
            onPress={() => setIsGameLogOpen(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.logButtonIcon}>📜</Text>
          </TouchableOpacity>
          <ForfeitButton />
          <View style={styles.playerCardsRow}>
            {players.map((player, index) => (
              <PlayerCard
                key={player.id}
                player={player}
                isActive={index === currentPlayerIndex}
              />
            ))}
          </View>
        </View>

        <EventToast />

        {/* ─── CENTER: Transparent (pass-through) ─── */}
        <View style={styles.centerSpacer} pointerEvents="none">
          {/* ── GAME OVER BANNER ── */}
          {isGameOver && winner && (
            <View style={styles.gameOverBanner}>
              <Text style={styles.gameOverCrown}>👑</Text>
              <Text style={styles.gameOverTitle}>VICTOIRE !</Text>
              <Text style={styles.gameOverName}>{winner.name}</Text>
              <Text style={styles.gameOverBalance}>
                Fortune finale : {winner.balance.toLocaleString()} AR
              </Text>
            </View>
          )}
        </View>

        {/* ─── BOTTOM: Dice & Controls ─── */}
        <View style={styles.bottomBar} pointerEvents="box-none">
          {/* Dice result display */}
          {!isGameOver && (
            <View style={styles.diceContainer}>
              <DiceDisplay diceRoll={lastDiceRoll} />
            </View>
          )}

          {/* Roll button — only visible when it's time to roll */}
          {canRoll && !isGameOver && (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={styles.rollButton}
                onPress={rollDice}
                activeOpacity={0.8}
              >
                <Text style={styles.rollButtonIcon}>🎲</Text>
                <Text style={styles.rollButtonText}>LANCER</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.rollButton, { backgroundColor: '#333' }]}
                onPress={() => setIsTradeModalOpen(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.rollButtonIcon}>🤝</Text>
                <Text style={styles.rollButtonText}>ÉCHANGER</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Phase indicator (for non-interactive phases only) */}
          {!canRoll && !isGameOver && !isJailDecision && turnPhase !== 'END_OF_TURN' && turnPhase !== 'WAITING_FOR_DECISION' && (
            <View style={styles.phaseIndicator}>
              <Text style={styles.phaseText}>
                {turnPhase === 'ANIMATING_MOVEMENT' && '⏳ Déplacement...'}
                {turnPhase === 'RESOLVING_SPACE' && '🔍 Résolution...'}
                {turnPhase === 'WAITING_FOR_DICE' && !isLocalPlayerTurn && `⏳ ${currentPlayer?.name || 'Joueur'} réfléchit...`}
              </Text>
            </View>
          )}

          {/* Bot thinking indicator */}
          {(isBotDecision || isBotJailDecision) && (
            <View style={styles.phaseIndicator}>
              <Text style={styles.phaseText}>🤖 Le bot réfléchit...</Text>
            </View>
          )}

          {/* Jail panel for local human player */}
          {isLocalJailDecision && <JailPanel />}

          {/* Waiting for opponent's jail decision */}
          {isJailDecision && !isLocalPlayerTurn && !currentPlayer?.isBot && (
            <View style={styles.phaseIndicator}>
              <Text style={styles.phaseText}>⛓️ {currentPlayer?.name} est en prison...</Text>
            </View>
          )}
        </View>
      </SafeAreaView>

      {/* ─── EVENT TOAST (slides from top) ─── */}
      <EventToast />

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
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  topBar: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.md,
    alignItems: 'center',
    position: 'relative',
    zIndex: 10,
  },
  logButton: {
    position: 'absolute',
    top: 8 + (Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0),
    left: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  logButtonIcon: {
    fontSize: 20,
  },
  playerCardsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  centerSpacer: {
    flex: 1,
  },

  // ─── BOTTOM BAR ───
  bottomBar: {
    alignItems: 'center',
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
    gap: 12,
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
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: BORDER_RADIUS.xl,
    gap: 10,
    // Premium shadow
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
    // Subtle border for depth
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  rollButtonIcon: {
    fontSize: 22,
  },
  rollButtonText: {
    color: COLORS.white,
    fontSize: 18,
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
});
