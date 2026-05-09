import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { STATIC_BOARD } from '../../constants';
import { BOARD_SIZE, CORNER_TILE_SIZE, getTileLayout } from '../../utils/mathHelpers';
import { SpaceTile } from './SpaceTile';

/**
 * BoardLayer renders the complete 40-tile Monopoly board as a large square.
 * Each tile is positioned absolutely using getTileLayout().
 * The center of the board displays the game logo.
 */
export const BoardLayer = () => {
  return (
    <View style={styles.board}>
      {/* Center area — the "inside" of the board */}
      <View style={styles.centerArea}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoTop}>MONOPOLY</Text>
          <View style={styles.logoDivider} />
          <Text style={styles.logoBottom}>MADAGASCAR</Text>
          <Text style={styles.logoSubtitle}>Ariary Luxe Edition</Text>
        </View>
      </View>

      {/* Render all 40 tiles */}
      {STATIC_BOARD.map((space, index) => {
        const layout = getTileLayout(index);
        return <SpaceTile key={space.id} space={space} layout={layout} />;
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  board: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    backgroundColor: '#C8E6C9', // Classic Monopoly green
    position: 'relative',
    // Subtle shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  centerArea: {
    position: 'absolute',
    top: CORNER_TILE_SIZE,
    left: CORNER_TILE_SIZE,
    right: CORNER_TILE_SIZE,
    bottom: CORNER_TILE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    // Subtle inner gradient effect using border
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.08)',
    borderRadius: 4,
  },
  logoContainer: {
    alignItems: 'center',
    padding: 20,
  },
  logoTop: {
    fontSize: 28,
    fontFamily: 'Inter_900Black',
    color: '#E10214',
    letterSpacing: 6,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
  },
  logoDivider: {
    width: 120,
    height: 3,
    backgroundColor: '#1FB25A',
    marginVertical: 8,
    borderRadius: 2,
  },
  logoBottom: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#1FB25A',
    letterSpacing: 4,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  logoSubtitle: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: '#666666',
    letterSpacing: 3,
    marginTop: 6,
    textTransform: 'uppercase',
  },
});
