import React from 'react';
import { StyleSheet, View, Text, Image } from 'react-native';
import { STATIC_BOARD } from '../../constants';
import { BOARD_SIZE, CORNER_TILE_SIZE, getTileLayout } from '../../utils/mathHelpers';
import { SpaceTile } from './SpaceTile';
import { OwnershipPlaques } from './OwnershipPlaques';

/**
 * BoardLayer renders the complete 40-tile Monopoly board as a large square.
 * Each tile is positioned absolutely using getTileLayout().
 * The center of the board displays the game logo.
 */
export const BoardLayer = () => {
  return (
    <View style={styles.board}>
      {/* Center area — custom central board image */}
      <View style={styles.centerArea}>
        <Image
          source={require('../../../assets/images/special-icons/central-board.webp')}
          style={styles.centerImage}
          resizeMode="contain"
        />
      </View>

      {/* Render all 40 tiles */}
      {STATIC_BOARD.map((space, index) => {
        const layout = getTileLayout(index);
        return <SpaceTile key={space.id} space={space} layout={layout} />;
      })}

      {/* Ownership plaques in the center area */}
      <OwnershipPlaques />
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
    borderColor: 'rgba(0,0,0,0.15)',
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  centerImage: {
    width: '100%',
    height: '100%',
  },
});
