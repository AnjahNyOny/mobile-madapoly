import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { STATIC_BOARD } from '../../constants';
import { getTileLayout, BOARD_SIZE, CORNER_TILE_SIZE } from '../../utils/mathHelpers';

const PLAYER_COLORS = ['#E10214', '#0069AF', '#1FB25A', '#FEDB01'];
const DEPTH = 14; // épaisseur de la bande au bord intérieur
const GAP = 0;    // collé au bord

/**
 * Cases adjacentes aux coins qui prennent une forme de trapèze.
 * La valeur indique le côté qui devient pointu (celui qui touche l'autre plaque).
 */
const CORNER_CASES: Record<number, 'right' | 'left' | 'top' | 'bottom'> = {
  1: 'right',
  39: 'bottom',
  9: 'left',
  11: 'bottom',
  19: 'top',
  21: 'left',
  29: 'right',
  31: 'top',
};

const getInitials = (name: string): string => {
  return name.slice(0, 2).toUpperCase();
};

/**
 * OwnershipPlaques — bande colorée (initiales + couleur)
 * dans la zone centrale du plateau, au bord intérieur de chaque propriété.
 * Le rectangle prend toute la largeur/hauteur de la case.
 * Aux coins, les plaques se transforment en trapèzes pour éviter la superposition.
 */
export const OwnershipPlaques = () => {
  const board = useGameStore(s => s.board);
  const players = useGameStore(s => s.players);

  const plaques: React.JSX.Element[] = [];

  STATIC_BOARD.forEach((space, index) => {
    if (space.type !== 'property' && space.type !== 'railroad' && space.type !== 'utility') return;

    const record = board[space.id];
    if (!record || !record.ownerId) return;

    const playerIndex = players.findIndex(p => p.id === record.ownerId);
    if (playerIndex < 0) return;

    const player = players[playerIndex];
    const color = PLAYER_COLORS[playerIndex % PLAYER_COLORS.length];
    const initials = getInitials(player.name);

    const layout = getTileLayout(index);
    const pointySide = CORNER_CASES[index];

    let x = 0, y = 0, w = 0, h = 0;

    switch (layout.side) {
      case 'bottom':
        w = layout.width;
        h = DEPTH;
        x = layout.x;
        y = BOARD_SIZE - CORNER_TILE_SIZE - DEPTH;
        break;
      case 'left':
        w = DEPTH;
        h = layout.height;
        x = CORNER_TILE_SIZE;
        y = layout.y;
        break;
      case 'top':
        w = layout.width;
        h = DEPTH;
        x = layout.x;
        y = CORNER_TILE_SIZE;
        break;
      case 'right':
        w = DEPTH;
        h = layout.height;
        x = BOARD_SIZE - CORNER_TILE_SIZE - DEPTH;
        y = layout.y;
        break;
    }

    plaques.push(
      <View
        key={space.id}
        style={[
          styles.plaqueWrapper,
          { left: x, top: y, width: w, height: h },
        ]}
      >
        {pointySide ? (
          <TrapezePlaque
            color={color}
            initials={initials}
            pointySide={pointySide}
            w={w}
            h={h}
          />
        ) : (
          <View style={[styles.plaqueRect, { backgroundColor: color }]}>
            <Text style={styles.plaqueText}>{initials}</Text>
          </View>
        )}
      </View>
    );
  });

  return (
    <View style={styles.overlay} pointerEvents="none">
      {plaques}
    </View>
  );
};

// ─── Trapèze avec skew + overflow:hidden ───
const TrapezePlaque = ({
  color,
  initials,
  pointySide,
  w,
  h,
}: {
  color: string;
  initials: string;
  pointySide: 'right' | 'left' | 'top' | 'bottom';
  w: number;
  h: number;
}) => {
  const isHorizontal = pointySide === 'left' || pointySide === 'right';
  const skewValue =
    pointySide === 'right' ? '-14deg' :
    pointySide === 'left' ? '14deg' :
    pointySide === 'top' ? '14deg' :
    '-14deg';
  const counterSkew =
    pointySide === 'right' ? '14deg' :
    pointySide === 'left' ? '-14deg' :
    pointySide === 'top' ? '-14deg' :
    '14deg';

  const extra = 10;

  return (
    <View style={styles.trapezeOuter}>
      <View
        style={[
          styles.trapezeInner,
          {
            backgroundColor: color,
            width: isHorizontal ? w + extra : w,
            height: isHorizontal ? h : h + extra,
            marginLeft: isHorizontal ? -extra / 2 : 0,
            marginTop: isHorizontal ? 0 : -extra / 2,
            transform: isHorizontal
              ? [{ skewX: skewValue }]
              : [{ skewY: skewValue }],
          },
        ]}
      >
        <Text
          style={[
            styles.plaqueText,
            {
              transform: isHorizontal
                ? [{ skewX: counterSkew }]
                : [{ skewY: counterSkew }],
            },
          ]}
        >
          {initials}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    pointerEvents: 'none',
  },
  plaqueWrapper: {
    position: 'absolute',
    overflow: 'hidden',
  },
  plaqueRect: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.25)',
  },
  plaqueText: {
    color: '#FFF',
    fontSize: 8,
    fontFamily: 'Inter_900Black',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  trapezeOuter: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  trapezeInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
