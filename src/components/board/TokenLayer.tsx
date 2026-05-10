import React, { useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { useGameStore } from '../../store/useGameStore';
import { getTileCenter } from '../../utils/mathHelpers';
import { COLORS } from '../../styles/theme';

// ─── CONFIGURATION ───
const TOKEN_SIZE = 28;
const ANIMATION_DURATION = 650; // ms

// Distinct player colors inspired by the Malagasy palette
const PLAYER_COLORS = ['#E10214', '#0069AF', '#1FB25A', '#FEDB01'];
const PLAYER_EMOJIS = ['👤', '🤖', '🎭', '🦊'];

// ─── PLAYER TOKEN COMPONENT ───
interface PlayerTokenProps {
  playerId: string;
  playerName: string;
  avatar: string;
  isBot: boolean;
  position: number;
  playerIndex: number;
  isCurrentPlayer: boolean;
}

const PlayerToken = React.memo(({ 
  playerId,
  playerName,
  avatar,
  isBot,
  position,
  playerIndex, 
  isCurrentPlayer,
}: PlayerTokenProps) => {
  const turnPhase = useGameStore((s) => s.turnPhase);
  const endAnimation = useGameStore((s) => s.endAnimation);

  // Track the last position we animated/snapped to
  const lastPosition = useRef(position);
  const animationTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Small offset so multiple tokens on the same tile don't overlap
  const offsetX = (playerIndex % 2) * 16 - 8;
  const offsetY = Math.floor(playerIndex / 2) * 16 - 8;

  // Initial position
  const initialCenter = getTileCenter(position);
  const animX = useSharedValue(initialCenter.x + offsetX);
  const animY = useSharedValue(initialCenter.y + offsetY);

  // Stable callback for endAnimation
  const onAnimationEnd = useCallback(() => {
    endAnimation();
  }, [endAnimation]);

  useEffect(() => {
    // Position hasn't changed — no action needed
    if (lastPosition.current === position) return;

    const newCenter = getTileCenter(position);
    const targetX = newCenter.x + offsetX;
    const targetY = newCenter.y + offsetY;

    // Clear any pending animation timeout
    if (animationTimeout.current) {
      clearTimeout(animationTimeout.current);
      animationTimeout.current = null;
    }

    if (isCurrentPlayer && turnPhase === 'ANIMATING_MOVEMENT') {
      // ── ANIMATED MOVE ──
      // Organic bouncy animation using withSpring
      const springConfig = { damping: 14, stiffness: 110, mass: 0.8 };
      animX.value = withSpring(targetX, springConfig);
      animY.value = withSpring(targetY, springConfig);

      // Call endAnimation after the animation completes
      // Using timeout as a reliable cross-platform approach (web + native)
      animationTimeout.current = setTimeout(() => {
        onAnimationEnd();
      }, ANIMATION_DURATION + 80);
    } else {
      // ── INSTANT SNAP ──
      // Teleport (e.g., go-to-jail, initial placement)
      animX.value = targetX;
      animY.value = targetY;
    }

    lastPosition.current = position;

    return () => {
      if (animationTimeout.current) {
        clearTimeout(animationTimeout.current);
      }
    };
  }, [position, turnPhase, isCurrentPlayer]);

  // Animated style — only transforms, no layout changes (GPU-accelerated)
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: animX.value - TOKEN_SIZE / 2 },
      { translateY: animY.value - TOKEN_SIZE / 2 },
    ],
  }));

  const color = PLAYER_COLORS[playerIndex % PLAYER_COLORS.length];
  const emoji = avatar || (isBot ? '🤖' : '👤');

  return (
    <Animated.View style={[styles.token, animatedStyle]}>
      {/* Outer glow for active player */}
      {isCurrentPlayer && <View style={[styles.activeGlow, { borderColor: color }]} />}
      
      {/* Token body */}
      <View style={[styles.tokenBody, { backgroundColor: color }]}>
        <Text style={styles.tokenEmoji}>{emoji}</Text>
      </View>

      {/* Player initial label */}
      <View style={[styles.tokenLabel, { backgroundColor: color }]}>
        <Text style={styles.tokenLabelText}>
          {playerName ? playerName.charAt(0).toUpperCase() : '?'}
        </Text>
      </View>
    </Animated.View>
  );
});

// ─── TOKEN LAYER ───
export const TokenLayer = () => {
  const players = useGameStore((s) => s.players);
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);

  if (players.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {players.map((player, index) => (
        <PlayerToken
          key={player.id}
          playerId={player.id}
          playerName={player.name}
          avatar={player.avatar}
          isBot={player.isBot}
          position={player.position}
          playerIndex={index}
          isCurrentPlayer={index === currentPlayerIndex}
        />
      ))}
    </View>
  );
};

// ─── STYLES ───
const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  token: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: TOKEN_SIZE,
    height: TOKEN_SIZE + 10, // Extra space for label
    alignItems: 'center',
    zIndex: 50,
  },
  activeGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    width: TOKEN_SIZE + 8,
    height: TOKEN_SIZE + 8,
    borderRadius: (TOKEN_SIZE + 8) / 2,
    borderWidth: 2,
    opacity: 0.7,
  },
  tokenBody: {
    width: TOKEN_SIZE,
    height: TOKEN_SIZE,
    borderRadius: TOKEN_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    // 3D-style shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  tokenEmoji: {
    fontSize: 14,
  },
  tokenLabel: {
    marginTop: 1,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    minWidth: 14,
    alignItems: 'center',
  },
  tokenLabelText: {
    color: '#FFFFFF',
    fontSize: 7,
    fontFamily: 'Inter_700Bold',
  },
});
