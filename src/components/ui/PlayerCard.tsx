import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { Player } from '../../types';
import { COLORS, SPACING, BORDER_RADIUS } from '../../styles/theme';

interface PlayerCardProps {
  player: Player;
  isActive: boolean;
}

/**
 * PlayerCard displays a compact player info chip:
 * Name, Balance, and jail icon if applicable.
 * The active player's card is visually highlighted.
 */
export const PlayerCard = React.memo(({ player, isActive }: PlayerCardProps) => {
  const isBankrupt = player.isBankrupt;
  const setSelectedPlayerIdForProps = useGameStore(s => s.setSelectedPlayerIdForProps);

  return (
    <TouchableOpacity 
      activeOpacity={0.8}
      onPress={() => setSelectedPlayerIdForProps(player.id)}
      style={[
        styles.card,
        isActive && !isBankrupt && styles.cardActive,
        isBankrupt && styles.cardBankrupt,
      ]}
    >
      {/* Active indicator dot */}
      {isActive && !isBankrupt && <View style={styles.activeDot} />}

      {/* Player avatar circle */}
      <View style={[styles.avatar, isActive && !isBankrupt && styles.avatarActive]}>
        <Text style={styles.avatarText}>
          {isBankrupt ? '💀' : player.avatar || (player.isBot ? '🤖' : '👤')}
        </Text>
      </View>

      {/* Player info */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[
            styles.name, 
            isActive && !isBankrupt && styles.nameActive,
            isBankrupt && styles.nameBankrupt,
          ]} numberOfLines={1}>
            {player.name}
          </Text>
          {player.inJail && !isBankrupt && (
            <Text style={styles.jailIcon}>🔒</Text>
          )}
        </View>
        <Text style={[
          styles.balance, 
          isActive && !isBankrupt && styles.balanceActive,
          isBankrupt && styles.balanceBankrupt,
        ]}>
          {isBankrupt ? 'FAILLITE' : `${player.balance.toLocaleString()} AR`}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 30, 30, 0.85)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BORDER_RADIUS.lg,
    marginHorizontal: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    // Glassmorphism shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    position: 'relative',
  },
  cardActive: {
    backgroundColor: 'rgba(225, 2, 20, 0.15)',
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  activeDot: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.secondary,
    borderWidth: 1.5,
    borderColor: COLORS.background,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarActive: {
    backgroundColor: 'rgba(225, 2, 20, 0.25)',
  },
  avatarText: {
    fontSize: 16,
  },
  info: {
    flexShrink: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  nameActive: {
    color: COLORS.white,
    fontFamily: 'Inter_700Bold',
  },
  jailIcon: {
    fontSize: 10,
  },
  balance: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  balanceActive: {
    color: COLORS.accent,
    fontFamily: 'Inter_900Black',
  },

  // ─── BANKRUPT STATE ───
  cardBankrupt: {
    opacity: 0.45,
    backgroundColor: 'rgba(60, 10, 10, 0.85)',
    borderColor: 'rgba(225, 2, 20, 0.3)',
  },
  nameBankrupt: {
    color: 'rgba(255,255,255,0.4)',
    textDecorationLine: 'line-through',
  },
  balanceBankrupt: {
    color: '#E10214',
    fontSize: 11,
    fontFamily: 'Inter_900Black',
    letterSpacing: 1,
  },
});
