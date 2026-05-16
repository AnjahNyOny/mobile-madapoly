import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { COLORS, BORDER_RADIUS } from '../../styles/theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

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
  const jailTurn = currentPlayer.jailTurns + 1;

  const actions = [
    {
      key: 'pay',
      icon: '💰',
      label: 'Payer la caution',
      detail: canPayBail ? '50 AR' : 'Pas assez (50 AR)',
      onPress: payBail,
      disabled: !canPayBail,
      style: styles.payButton,
    },
    {
      key: 'card',
      icon: '🃏',
      label: 'Utiliser une carte',
      detail: hasCard ? 'Sortir de prison' : 'Aucune carte',
      onPress: useJailCard,
      disabled: !hasCard,
      style: styles.cardButton,
    },
    {
      key: 'roll',
      icon: '🎲',
      label: 'Tenter un double',
      detail: jailTurn === 3 ? 'Dernière chance !' : 'Double = évasion',
      onPress: rollForJailBreak,
      disabled: false,
      style: styles.rollButton,
    },
  ];

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
      <View style={styles.actionsContainer}>
        {/* Main action: Roll Dice */}
        <TouchableOpacity
          style={[styles.actionButton, styles.rollButton]}
          onPress={rollForJailBreak}
          activeOpacity={0.75}
        >
          <Text style={styles.actionIcon}>🎲</Text>
          <View style={styles.actionTextGroup}>
            <Text style={styles.actionLabel}>Tenter un double</Text>
            <Text style={styles.actionDetail}>{jailTurn === 3 ? 'Dernière chance !' : 'Double = évasion gratuite'}</Text>
          </View>
        </TouchableOpacity>

        {/* Secondary actions row */}
        <View style={styles.rowActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton, styles.payButton, !canPayBail && styles.disabledButton]}
            onPress={payBail}
            disabled={!canPayBail}
            activeOpacity={0.75}
          >
            <Text style={styles.actionIconSecondary}>💰</Text>
            <View style={styles.actionTextGroup}>
              <Text style={styles.actionLabelSecondary}>Payer caution</Text>
              <Text style={[styles.actionDetail, !canPayBail && styles.disabledText]}>
                {canPayBail ? '50 AR' : 'Pas assez (50 AR)'}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton, styles.cardButton, !hasCard && styles.disabledButton]}
            onPress={useJailCard}
            disabled={!hasCard}
            activeOpacity={0.75}
          >
            <Text style={styles.actionIconSecondary}>🃏</Text>
            <View style={styles.actionTextGroup}>
              <Text style={styles.actionLabelSecondary}>Utiliser carte</Text>
              <Text style={[styles.actionDetail, !hasCard && styles.disabledText]}>
                {hasCard ? 'Sortir de prison' : 'Aucune carte'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(18, 18, 18, 0.96)',
    borderRadius: BORDER_RADIUS.lg,
    padding: 16,
    width: Math.min(SCREEN_W * 0.9, 420),
    maxHeight: SCREEN_H * 0.55,
    borderWidth: 1,
    borderColor: 'rgba(254, 219, 1, 0.25)',
    shadowColor: '#FEDB01',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
    alignSelf: 'center',
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: '#FEDB01',
    fontSize: 16,
    fontFamily: 'Inter_900Black',
    letterSpacing: 2,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },

  // ── Progress bar ──
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    marginBottom: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FEDB01',
    borderRadius: 2,
  },

  // ── Actions ──
  actionsContainer: {
    gap: 8,
    width: '100%',
  },
  rowActions: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    minHeight: 52,
    width: '100%',
  },
  secondaryButton: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 10,
    minHeight: 48,
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
    opacity: 0.3,
  },
  actionIcon: {
    fontSize: 24,
    marginRight: 12,
    width: 32,
    textAlign: 'center',
  },
  actionIconSecondary: {
    fontSize: 18,
    marginRight: 6,
    width: 24,
    textAlign: 'center',
  },
  actionTextGroup: {
    flex: 1,
    justifyContent: 'center',
  },
  actionLabel: {
    color: COLORS.white,
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
  actionLabelSecondary: {
    color: COLORS.white,
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
  },
  actionDetail: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  disabledText: {
    color: 'rgba(255,255,255,0.25)',
  },
});
