import React, { useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useGameStore } from '../../store/useGameStore';
import { getTileCenter } from '../../utils/mathHelpers';
import { COLORS } from '../../styles/theme';
import { CameraController } from '../../utils/CameraController';
import { playSound } from '../../utils/soundEffects';

// Helpers appelés depuis les callbacks Reanimated (doivent être stables)
const playReboundSound = () => playSound('rebound2');
const playLastReboundSound = () => playSound('last-rebound');

// ─── CONFIGURATION ───
const TOKEN_SIZE = 28;
const PRE_MOVE_DELAY = 1000;    // ms pause after dice result before moving
const STEP_DURATION = 380;     // ms per tile step
const STEP_EASING = Easing.out(Easing.quad);
const FINAL_SPRING = { damping: 8, stiffness: 160, mass: 0.6 }; // bouncy landing
const LEVITATE_DURATION = 600; // ms for teleport arc
const MAX_ANIMATED_STEPS = 12; // beyond this, levitate directly (avoid very long animations)

// Distinct player colors inspired by the Malagasy palette
const PLAYER_COLORS = ['#E10214', '#0069AF', '#1FB25A', '#FEDB01'];

const TOKEN_IMAGES: Record<string, any> = {
  'lemur-madagascar': require('../../../assets/images/tokens/lemur-madagascar.png'),
  'cow':              require('../../../assets/images/tokens/cow.png'),
  'chameleon':        require('../../../assets/images/tokens/chameleon.png'),
  'crocodile':        require('../../../assets/images/tokens/crocodile.png'),
  'eagle':            require('../../../assets/images/tokens/eagle.png'),
  'lion':             require('../../../assets/images/tokens/lion.png'),
  'turtle':           require('../../../assets/images/tokens/turtle.png'),
  'frog':             require('../../../assets/images/tokens/frog.png'),
  'angler-fish':      require('../../../assets/images/tokens/angler-fish.png'),
  'anteater':         require('../../../assets/images/tokens/anteater.png'),
  'baboon':           require('../../../assets/images/tokens/baboon.png'),
  'bear':             require('../../../assets/images/tokens/bear.png'),
  'beaver':           require('../../../assets/images/tokens/beaver.png'),
  'bee':              require('../../../assets/images/tokens/bee.png'),
  'bison':            require('../../../assets/images/tokens/bison.png'),
  'boar':             require('../../../assets/images/tokens/boar.png'),
  'butterfly':        require('../../../assets/images/tokens/butterfly.png'),
  'capybara':         require('../../../assets/images/tokens/capybara.png'),
  'cat':              require('../../../assets/images/tokens/cat.png'),
  'chimpanzee':       require('../../../assets/images/tokens/chimpanzee.png'),
  'crab':             require('../../../assets/images/tokens/crab.png'),
  'deer':             require('../../../assets/images/tokens/deer.png'),
  'dolphin':          require('../../../assets/images/tokens/dolphin.png'),
  'dove':             require('../../../assets/images/tokens/dove.png'),
  'elephant':         require('../../../assets/images/tokens/elephant.png'),
  'fennec':           require('../../../assets/images/tokens/fennec.png'),
  'fox':              require('../../../assets/images/tokens/fox.png'),
  'goat':             require('../../../assets/images/tokens/goat.png'),
  'goldfish':         require('../../../assets/images/tokens/goldfish.png'),
  'guinea-pig':       require('../../../assets/images/tokens/guinea-pig.png'),
  'hedgehog':         require('../../../assets/images/tokens/hedgehog.png'),
  'hippopotamus':     require('../../../assets/images/tokens/hippopotamus.png'),
  'horse':            require('../../../assets/images/tokens/horse.png'),
  'hyena':            require('../../../assets/images/tokens/hyena.png'),
  'kangaroo':         require('../../../assets/images/tokens/kangaroo.png'),
  'koala':            require('../../../assets/images/tokens/koala.png'),
  'llama':            require('../../../assets/images/tokens/llama.png'),
  'mouse':            require('../../../assets/images/tokens/mouse.png'),
  'owl':              require('../../../assets/images/tokens/owl.png'),
  'panda-bear-panda': require('../../../assets/images/tokens/panda-bear-panda.png'),
  'penguin-bird':     require('../../../assets/images/tokens/penguin-bird.png'),
  'pig':              require('../../../assets/images/tokens/pig.png'),
  'rabbit':           require('../../../assets/images/tokens/rabbit.png'),
  'raccoon':          require('../../../assets/images/tokens/raccoon.png'),
  'shark':            require('../../../assets/images/tokens/shark.png'),
  'sheep':            require('../../../assets/images/tokens/sheep.png'),
  'sloth':            require('../../../assets/images/tokens/sloth.png'),
  'snake':            require('../../../assets/images/tokens/snake.png'),
  'spider':           require('../../../assets/images/tokens/spider.png'),
  'squirrel':         require('../../../assets/images/tokens/squirrel.png'),
  'tiger':            require('../../../assets/images/tokens/tiger.png'),
  'wolf':             require('../../../assets/images/tokens/wolf.png'),
};

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

// Build the step-by-step path from oldPos to newPos (wrapping around 40 tiles)
function buildPath(from: number, to: number): number[] {
  if (from === to) return [];
  const path: number[] = [];
  let cur = from;
  while (cur !== to) {
    cur = (cur + 1) % 40;
    path.push(cur);
  }
  return path;
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
  const animScale = useSharedValue(1);

  // Guard against double endAnimation call (withSpring callback + safety timeout)
  const animationEnded = useRef(false);
  const onAnimationEnd = useCallback(() => {
    if (animationEnded.current) return;
    animationEnded.current = true;
    if (animationTimeout.current) {
      clearTimeout(animationTimeout.current);
      animationTimeout.current = null;
    }
    endAnimation();
  }, [endAnimation]);

  useEffect(() => {
    if (lastPosition.current === position) return;

    const prevPos = lastPosition.current;
    lastPosition.current = position;

    const newCenter = getTileCenter(position);
    const targetX = newCenter.x + offsetX;
    const targetY = newCenter.y + offsetY;

    animationEnded.current = false;

    if (animationTimeout.current) {
      clearTimeout(animationTimeout.current);
      animationTimeout.current = null;
    }

    if (!isCurrentPlayer || turnPhase !== 'ANIMATING_MOVEMENT') {
      // ── INSTANT SNAP (other players or non-animation phases) ──
      animX.value = targetX;
      animY.value = targetY;
      return;
    }

    const path = buildPath(prevPos, position);

    if (path.length === 0 || path.length > MAX_ANIMATED_STEPS) {
      // ── TELEPORT / LEVITATION ARC ──
      const midY = Math.min(animY.value, targetY) - 60;
      // Pan camera after delay to destination
      const panToTarget = () => CameraController.panTo(position);
      animScale.value = withSequence(
        withTiming(1, { duration: PRE_MOVE_DELAY }),
        withTiming(1.35, { duration: LEVITATE_DURATION * 0.4, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: LEVITATE_DURATION * 0.6, easing: Easing.in(Easing.quad) }),
      );
      animX.value = withSequence(
        withTiming(animX.value, { duration: PRE_MOVE_DELAY }, () => { runOnJS(panToTarget)(); }),
        withTiming(targetX, { duration: LEVITATE_DURATION, easing: Easing.inOut(Easing.quad) }),
      );
      animY.value = withSequence(
        withTiming(animY.value, { duration: PRE_MOVE_DELAY }),
        withTiming(midY, { duration: LEVITATE_DURATION * 0.45, easing: Easing.out(Easing.quad) }),
        withTiming(targetY, { duration: LEVITATE_DURATION * 0.55, easing: Easing.in(Easing.cubic) }, () => {
          runOnJS(onAnimationEnd)();
        }),
      );
      return;
    }

    // ── CASE PAR CASE avec rebond ──
    // Chain withSpring per step, call endAnimation on last step
    const stepTargets = path.map(idx => {
      const c = getTileCenter(idx);
      return { x: c.x + offsetX, y: c.y + offsetY };
    });

    // Build per-step camera pan callbacks
    const panFns = path.map(stepPos => () => CameraController.panTo(stepPos));

    // Scale: hold during delay, then bounce on last step
    animScale.value = withSequence(
      withTiming(1, { duration: PRE_MOVE_DELAY + (stepTargets.length - 1) * STEP_DURATION }),
      withTiming(1.25, { duration: STEP_DURATION * 0.3 }),
      withSpring(1, { damping: 7, stiffness: 250 }),
    );

    // X: pause then step-by-step, pan camera on each step via callback
    const xSeq = [
      withTiming(animX.value, { duration: PRE_MOVE_DELAY }),
      ...stepTargets.map((t, i) => {
        const isLast = i === stepTargets.length - 1;
        return withTiming(t.x, { duration: STEP_DURATION, easing: STEP_EASING }, () => {
          runOnJS(panFns[i])();
          runOnJS(isLast ? playLastReboundSound : playReboundSound)();
        });
      }),
    ];
    animX.value = withSequence(...xSeq);

    // Y: pause then step-by-step, withSpring on last for bounce landing
    const ySeq = [
      withTiming(animY.value, { duration: PRE_MOVE_DELAY }),
      ...stepTargets.map((t, i) => {
        const isLast = i === stepTargets.length - 1;
        if (isLast) {
          return withSpring(t.y, FINAL_SPRING, () => { runOnJS(onAnimationEnd)(); });
        }
        return withTiming(t.y, { duration: STEP_DURATION, easing: STEP_EASING });
      }),
    ];
    animY.value = withSequence(...ySeq);

    // Safety fallback
    const totalMs = PRE_MOVE_DELAY + stepTargets.length * STEP_DURATION + 600;
    animationTimeout.current = setTimeout(onAnimationEnd, totalMs);

  }, [position, turnPhase, isCurrentPlayer]);

  // Animated style — only transforms, no layout changes (GPU-accelerated)
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: animX.value - TOKEN_SIZE / 2 },
      { translateY: animY.value - TOKEN_SIZE / 2 },
      { scale: animScale.value },
    ],
  }));

  const color = PLAYER_COLORS[playerIndex % PLAYER_COLORS.length];
  const tokenImg = TOKEN_IMAGES[avatar];

  return (
    <Animated.View style={[styles.token, animatedStyle]}>
      {/* Outer glow for active player */}
      {isCurrentPlayer && <View style={[styles.activeGlow, { borderColor: color }]} />}
      
      {/* Token body */}
      <View style={[styles.tokenBody, { backgroundColor: color }]}>
        {tokenImg ? (
          <Image source={tokenImg} style={styles.tokenImg} />
        ) : (
          <Text style={styles.tokenEmoji}>{avatar || (isBot ? '🤖' : '👤')}</Text>
        )}
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
  tokenImg: {
    width: TOKEN_SIZE - 6,
    height: TOKEN_SIZE - 6,
    resizeMode: 'contain',
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
