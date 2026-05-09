import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { COLORS } from '../../styles/theme';

interface DiceDisplayProps {
  diceRoll: [number, number] | null;
}

// Unicode dice faces for visual representation
const DICE_FACES: Record<number, string> = {
  1: '⚀',
  2: '⚁',
  3: '⚂',
  4: '⚃',
  5: '⚄',
  6: '⚅',
};

/**
 * DiceDisplay renders two dice with their values.
 * Shows the unicode dice faces for a premium feel.
 * When no roll has been made, shows placeholder dashes.
 */
export const DiceDisplay = React.memo(({ diceRoll }: DiceDisplayProps) => {
  if (!diceRoll) {
    return (
      <View style={styles.container}>
        <View style={styles.die}>
          <Text style={styles.diePlaceholder}>-</Text>
        </View>
        <View style={styles.die}>
          <Text style={styles.diePlaceholder}>-</Text>
        </View>
      </View>
    );
  }

  const [die1, die2] = diceRoll;
  const total = die1 + die2;
  const isDouble = die1 === die2;

  return (
    <View style={styles.container}>
      <View style={[styles.die, isDouble && styles.dieDouble]}>
        <Text style={styles.dieFace}>{DICE_FACES[die1]}</Text>
        <Text style={styles.dieValue}>{die1}</Text>
      </View>
      <View style={styles.totalContainer}>
        <Text style={[styles.totalValue, isDouble && styles.totalDouble]}>
          {total}
        </Text>
        {isDouble && (
          <Text style={styles.doubleLabel}>DOUBLE!</Text>
        )}
      </View>
      <View style={[styles.die, isDouble && styles.dieDouble]}>
        <Text style={styles.dieFace}>{DICE_FACES[die2]}</Text>
        <Text style={styles.dieValue}>{die2}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  die: {
    width: 52,
    height: 52,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    // Subtle 3D effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  dieDouble: {
    backgroundColor: '#FFF9C4',
    borderColor: COLORS.accent,
    borderWidth: 1.5,
  },
  dieFace: {
    fontSize: 28,
    color: '#1a1a1a',
  },
  dieValue: {
    fontSize: 8,
    color: '#999',
    fontFamily: 'Inter_400Regular',
    marginTop: -2,
  },
  diePlaceholder: {
    fontSize: 24,
    color: '#ccc',
    fontFamily: 'Inter_700Bold',
  },
  totalContainer: {
    alignItems: 'center',
    minWidth: 36,
  },
  totalValue: {
    fontSize: 22,
    color: COLORS.white,
    fontFamily: 'Inter_900Black',
  },
  totalDouble: {
    color: COLORS.accent,
  },
  doubleLabel: {
    fontSize: 8,
    color: COLORS.accent,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
    marginTop: 2,
  },
});
