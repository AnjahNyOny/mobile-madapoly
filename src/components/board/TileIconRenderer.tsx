import React from 'react';
import { Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BoardSpace } from '../../constants';
import { hasSpecialIcon, SPECIAL_TILE_SOURCES } from '../../constants/specialTileIcons';

interface TileIconRendererProps {
  spaceId: string;
  type: BoardSpace['type'];
  size?: number;
  color?: string;
}

/**
 * TileIconRenderer — Renders custom WEBP icons for special board spaces.
 * Falls back to vector icons when no custom asset is available.
 */
export const TileIconRenderer = React.memo(({ spaceId, type, size = 16, color = '#333333' }: TileIconRendererProps) => {
  if (hasSpecialIcon(spaceId)) {
    return (
      <Image
        source={SPECIAL_TILE_SOURCES[spaceId]}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    );
  }

  // ── Fallback vector icons ──
  switch (type) {
    case 'start':
      return <MaterialCommunityIcons name="flag-checkered" size={size} color={color} />;
    case 'property':
    default:
      return null;
  }
});
