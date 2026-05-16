import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { BoardSpace } from '../../constants';
import { TileLayout } from '../../utils/mathHelpers';

interface SpaceTileProps {
  space: BoardSpace;
  layout: TileLayout;
}

import { TileIconRenderer } from './TileIconRenderer';

// Background colors per tile type
const BG_COLORS: Record<string, string> = {
  'start':           '#E8F8EE',
  'jail':            '#FFF3E0',
  'free-parking':    '#F0F4F8',
  'go-to-jail':      '#FFEBEE',
  'community-chest': '#FFFDE7',
  'chance':          '#E3F2FD',
  'tax':             '#FCE4EC',
  'railroad':        '#FAFAFA',
  'utility':         '#E8F5E9',
  'property':        '#FEFEFE',
};

/**
 * SpaceTile renders a single board space with appropriate styling
 * based on its type (property, railroad, utility, tax, special).
 * 
 * Color strips are placed at the INNER edge of each tile (facing the center of the board):
 *   - Bottom tiles → strip at TOP
 *   - Left tiles   → strip at RIGHT
 *   - Top tiles    → strip at BOTTOM
 *   - Right tiles  → strip at LEFT
 *
 * Text is NOT rotated — always reads left-to-right for mobile readability.
 */
export const SpaceTile = React.memo(({ space, layout }: SpaceTileProps) => {
  const { x, y, width, height, isCorner, side } = layout;
  const setSelectedSpaceIdForDetail = useGameStore(s => s.setSelectedSpaceIdForDetail);
  const houseCount = useGameStore(s => s.board[space.id]?.houseCount || 0);
  const isMortgaged = useGameStore(s => s.board[space.id]?.isMortgaged || false);

  const isProperty = space.type === 'property';
  const hasColor = isProperty && !!space.color;
  const bgColor = BG_COLORS[space.type] || '#FFFFFF';

  // Color strip thickness as percentage of tile dimension
  const STRIP_RATIO = 0.26;

  const renderColorStrip = () => {
    if (!hasColor || isCorner) return null;

    const stripStyle: any = {
      backgroundColor: space.color,
      position: 'absolute' as const,
    };

    const isHorizontal = side === 'bottom' || side === 'top';
    const isVertical = side === 'left' || side === 'right';
    
    let content = null;
    if (houseCount === 5) {
      content = <View style={[styles.building, styles.hotel, isVertical && styles.buildingVertical]} />;
    } else if (houseCount > 0) {
      content = Array.from({ length: houseCount }).map((_, i) => (
        <View key={i} style={[styles.building, styles.house, isVertical && styles.buildingVertical]} />
      ));
    }

    const containerStyle = [
      stripStyle,
      side === 'bottom' && { top: 0, left: 0, right: 0, height: height * STRIP_RATIO },
      side === 'left' && { top: 0, right: 0, bottom: 0, width: width * STRIP_RATIO },
      side === 'top' && { bottom: 0, left: 0, right: 0, height: height * STRIP_RATIO },
      side === 'right' && { top: 0, left: 0, bottom: 0, width: width * STRIP_RATIO },
      { flexDirection: isHorizontal ? 'row' : 'column', justifyContent: 'center', alignItems: 'center', gap: 2 }
    ];

    return <View style={containerStyle as any}>{content}</View>;
  };

  // Calculate content padding to avoid overlapping the color strip
  const getContentPadding = () => {
    if (!hasColor || isCorner) return {};
    const offset = side === 'bottom' || side === 'top' 
      ? height * STRIP_RATIO 
      : width * STRIP_RATIO;

    switch (side) {
      case 'bottom': return { paddingTop: offset + 2 };
      case 'left':   return { paddingRight: offset + 2 };
      case 'top':    return { paddingBottom: offset + 2 };
      case 'right':  return { paddingLeft: offset + 2 };
    }
  };

  // Font sizes & icon size (proportional to tile dimensions)
  const nameFontSize = isCorner ? 11 : 7;
  const priceFontSize = isCorner ? 9 : 6;
  const iconRatio =
    space.id === '10' ? 0.95   // Prison (fills tile, no text)
    : ['20', '30'].includes(space.id) ? 0.80   // Top corners
    : space.id === '25' ? 0.85   // Posy-posy
    : 0.60;
  const iconSize = Math.min(width, height) * iconRatio;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => setSelectedSpaceIdForDetail(space.id)}
      style={[
        styles.tile,
        {
          left: x,
          top: y,
          width,
          height,
          backgroundColor: bgColor,
          opacity: isMortgaged ? 0.5 : 1,
        },
      ]}
    >
      {renderColorStrip()}

      <View style={[styles.contentContainer, getContentPadding()]}>
        {!isProperty && (
          <View style={{ marginBottom: 2 }}>
            <TileIconRenderer spaceId={space.id} type={space.type} size={iconSize} color="#333333" />
          </View>
        )}
        {space.id !== '10' && (
          <Text
            style={[
              styles.tileName, 
              { fontSize: nameFontSize },
              isMortgaged && { textDecorationLine: 'line-through' }
            ]}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.5}
          >
            {space.name}
          </Text>
        )}
        {space.price !== undefined && (
          <Text style={[styles.tilePrice, { fontSize: priceFontSize }]}>
            {space.price} AR
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  tile: {
    position: 'absolute',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.15)',
    overflow: 'hidden',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  tileName: {
    color: '#1a1a1a',
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
  tilePrice: {
    color: '#555555',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginTop: 1,
  },
  building: {
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.5)',
    borderRadius: 1,
  },
  house: {
    backgroundColor: '#1FB25A', // Monopoly green
    width: 6,
    height: 6,
  },
  hotel: {
    backgroundColor: '#E10214', // Monopoly red
    width: 14,
    height: 6,
  },
  buildingVertical: {
    width: 6,
    height: 6,
  }
});
