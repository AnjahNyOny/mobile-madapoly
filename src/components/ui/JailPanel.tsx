import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { COLORS, BORDER_RADIUS } from '../../styles/theme';

/**
 * JailPanel — Panneau d'actions affiché dans le HUD quand
 * le joueur local est en prison (turnPhase === 'IN_JAIL_DECISION').
 *
 * 3 options :
 *  1. Payer 50 AR de caution
 *  2. Utiliser une carte "Sortir de prison" (si disponible)
 *  3. Tenter un double aux dés
 */
export const JailPanel = () => {
  const turnPhase = useGameStore((s) => s.turnPhase);
  const players = useGameStore((s) => s.players);
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const payBail = useGameStore((s) => s.payBail);
  const useJailCard = useGameStore((s) => s.useJailCard);
  const rollForJailBreak = useGameStore((s) => s.rollForJailBreak);

  const currentPlayer = players[currentPlayerIndex];
  if (!currentPlayer) return null;
  if (turnPhase !== 'IN_JAIL_DECISION') return null;
  // Host/local controls all non-bot players; client only controls their own assigned player
  const networkRole = useGameStore((s) => s.networkRole);
  const connectedClients = useGameStore((s) => s.connectedClients);
  const isHostOrLocal = networkRole === 'host' || networkRole === 'local';
  const isRemoteClientPlayer = connectedClients.some(c => c.playerId === currentPlayer?.id);
  const isLocalPlayer = isHostOrLocal
    ? !currentPlayer?.isBot && !isRemoteClientPlayer
    : currentPlayer?.id === localPlayerId;
  if (!isLocalPlayer) return null;

  const canPayBail = currentPlayer.balance >= 50;
  const hasCard = currentPlayer.hasGetOutOfJailCard;
  const jailTurn = currentPlayer.jailTurns + 1; // Display 1-based

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>⛓️</Text>
        <View style={styles.headerText}>
          <Text style={styles.title}>EN PRISON</Text>
          <Text style={styles.subtitle}>Tour {jailTurn} / 3</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${(jailTurn / 3) * 100}%` }]} />
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        {/* Pay Bail */}
        <TouchableOpacity
          style={[styles.actionButton, styles.payButton, !canPayBail && styles.disabledButton]}
          onPress={payBail}
          disabled={!canPayBail}
          activeOpacity={0.8}
        >
          <Text style={styles.actionIcon}>💰</Text>
          <View style={styles.actionTextGroup}>
            <Text style={styles.actionLabel}>Payer la caution</Text>
            <Text style={[styles.actionDetail, !canPayBail && styles.disabledText]}>
              {canPayBail ? '50 AR' : 'Pas assez (50 AR)'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Use Card */}
        <TouchableOpacity
          style={[styles.actionButton, styles.cardButton, !hasCard && styles.disabledButton]}
          onPress={useJailCard}
          disabled={!hasCard}
          activeOpacity={0.8}
        >
          <Text style={styles.actionIcon}>🃏</Text>
          <View style={styles.actionTextGroup}>
            <Text style={styles.actionLabel}>Utiliser une carte</Text>
            <Text style={[styles.actionDetail, !hasCard && styles.disabledText]}>
              {hasCard ? 'Sortir de prison' : 'Aucune carte'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Roll for double */}
        <TouchableOpacity
          style={[styles.actionButton, styles.rollButton]}
          onPress={rollForJailBreak}
          activeOpacity={0.8}
        >
          <Text style={styles.actionIcon}>🎲</Text>
          <View style={styles.actionTextGroup}>
            <Text style={styles.actionLabel}>Tenter un double</Text>
            <Text style={styles.actionDetail}>
              {jailTurn === 3 ? 'Dernière chance !' : 'Double = évasion'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(18, 18, 18, 0.95)',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(254, 219, 1, 0.25)',
    // Glow
    shadowColor: '#FEDB01',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  headerIcon: {
    fontSize: 28,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: '#FEDB01',
    fontSize: 18,
    fontFamily: 'Inter_900Black',
    letterSpacing: 2,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },

  // ── Progress bar ──
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    marginBottom: 14,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FEDB01',
    borderRadius: 2,
  },

  // ── Actions ──
  actions: {
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: BORDER_RADIUS.md,
    gap: 12,
    borderWidth: 1,
  },
  payButton: {
    backgroundColor: 'rgba(31, 178, 90, 0.12)',
    borderColor: 'rgba(31, 178, 90, 0.3)',
  },
  cardButton: {
    backgroundColor: 'rgba(0, 105, 175, 0.12)',
    borderColor: 'rgba(0, 105, 175, 0.3)',
  },
  rollButton: {
    backgroundColor: 'rgba(225, 2, 20, 0.12)',
    borderColor: 'rgba(225, 2, 20, 0.3)',
  },
  disabledButton: {
    opacity: 0.35,
  },
  actionIcon: {
    fontSize: 22,
  },
  actionTextGroup: {
    flex: 1,
  },
  actionLabel: {
    color: COLORS.white,
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  actionDetail: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  disabledText: {
    color: 'rgba(255,255,255,0.3)',
  },
});
