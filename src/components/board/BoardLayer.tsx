import React from 'react';
import { StyleSheet, View, Text, Image } from 'react-native';
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
          {/* Lemur + flag superposés */}
          <View style={styles.logoStack}>
            <Image
              source={require('../../../assets/images/flag-for-madagascar-svgrepo-com.png')}
              style={styles.logoFlag}
            />
            <Image
              source={require('../../../assets/images/lemur-madagascar-svgrepo-com.png')}
              style={styles.logoLemur}
            />
          </View>
          <View style={styles.titleRow}>
            <Text style={styles.logoMada}>MADA</Text>
            <Text style={styles.logoPoly}>POLY</Text>
          </View>
          <View style={styles.logoDivider} />
          <Text style={styles.logoSubtitle}>Édition Ariary Luxe</Text>
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
    backgroundColor: '#0A2E14',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 14,
  },
  centerArea: {
    position: 'absolute',
    top: CORNER_TILE_SIZE,
    left: CORNER_TILE_SIZE,
    right: CORNER_TILE_SIZE,
    bottom: CORNER_TILE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 6,
    backgroundColor: '#0D3518',
  },
  logoContainer: {
    alignItems: 'center',
    padding: 12,
  },
  logoStack: {
    width: BOARD_SIZE * 0.16,
    height: BOARD_SIZE * 0.16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoFlag: {
    position: 'absolute',
    width: BOARD_SIZE * 0.16,
    height: BOARD_SIZE * 0.16,
    resizeMode: 'contain',
    opacity: 0.30,
  },
  logoLemur: {
    width: BOARD_SIZE * 0.13,
    height: BOARD_SIZE * 0.13,
    resizeMode: 'contain',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  logoMada: {
    fontSize: BOARD_SIZE * 0.038,
    fontFamily: 'Inter_900Black',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  logoPoly: {
    fontSize: BOARD_SIZE * 0.038,
    fontFamily: 'Inter_900Black',
    color: '#D0021B',
    letterSpacing: 2,
  },
  logoDivider: {
    width: BOARD_SIZE * 0.12,
    height: 2,
    backgroundColor: '#007A3D',
    marginVertical: 6,
    borderRadius: 2,
  },
  logoSubtitle: {
    fontSize: BOARD_SIZE * 0.018,
    fontFamily: 'Inter_700Bold',
    color: '#007A3D',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
});
