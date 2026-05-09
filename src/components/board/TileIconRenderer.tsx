import React from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { BoardSpace } from '../../constants';

interface TileIconRendererProps {
  type: BoardSpace['type'];
  size?: number;
  color?: string;
}

/**
 * TileIconRenderer — Renders vector icons for special board spaces.
 * This is a modular component designed to be easily swappable with 
 * final custom SVG assets once they are ready for Sprint 4.
 */
export const TileIconRenderer = React.memo(({ type, size = 16, color = '#333333' }: TileIconRendererProps) => {
  switch (type) {
    case 'start':
      return <MaterialCommunityIcons name="flag-checkered" size={size} color={color} />;
    case 'jail':
      return <MaterialCommunityIcons name="lock-alert" size={size} color={color} />;
    case 'go-to-jail':
      return <MaterialCommunityIcons name="police-badge-outline" size={size} color={color} />;
    case 'free-parking':
      return <MaterialCommunityIcons name="parking" size={size} color={color} />;
    case 'community-chest':
      return <MaterialCommunityIcons name="treasure-chest" size={size} color={color} />;
    case 'chance':
      return <MaterialCommunityIcons name="help-rhombus" size={size} color={color} />;
    case 'tax':
      return <MaterialCommunityIcons name="cash-multiple" size={size} color={color} />;
    case 'railroad':
      return <MaterialCommunityIcons name="train" size={size} color={color} />;
    case 'utility':
      return <MaterialCommunityIcons name="lightning-bolt" size={size} color={color} />;
    case 'property':
    default:
      return null;
  }
});
