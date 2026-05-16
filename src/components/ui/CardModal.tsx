import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useGameStore } from '../../store/useGameStore';
import { GameCard } from '../../constants/cards';
import { BORDER_RADIUS } from '../../styles/theme';

const FLIP_DURATION = 400;
const AUTO_CLOSE_MS = 5000;

export const CardModal = () => {
  const lastEvent = useGameStore(s => s.lastEvent);
  const [visible, setVisible] = useState(false);
  const [card, setCard] = useState<GameCard | null>(null);

  const overlayOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.5);
  const cardRotateY = useSharedValue(0);

  const closeCard = useCallback(() => {
    overlayOpacity.value = withTiming(0, { duration: 200 });
    cardScale.value = withTiming(0.8, { duration: 200 }, () => {
      runOnJS(setVisible)(false);
    });
  }, []);

  useEffect(() => {
    if (lastEvent?.type === 'card' && lastEvent.card) {
      setCard(lastEvent.card);
      setVisible(true);
    }
  }, [lastEvent]);

  useEffect(() => {
    if (!visible || !card) return;
    // Reset values
    overlayOpacity.value = 0;
    cardScale.value = 0.5;
    cardRotateY.value = 0;

    // Animate in
    overlayOpacity.value = withTiming(1, { duration: 250 });
    cardScale.value = withSpring(1, { damping: 12, stiffness: 120 });

    // Flip after short delay
    const flipTimer = setTimeout(() => {
      cardRotateY.value = withTiming(180, { duration: FLIP_DURATION });
    }, 250);

    // Auto close
    const closeTimer = setTimeout(() => {
      runOnJS(closeCard)();
    }, AUTO_CLOSE_MS + 250);

    return () => {
      clearTimeout(flipTimer);
      clearTimeout(closeTimer);
    };
  }, [visible, card]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const cardWrapperStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: cardScale.value },
    ],
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { rotateY: `${cardRotateY.value}deg` },
    ],
    opacity: cardRotateY.value < 90 ? 1 : 0,
  }));

  const frontStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { rotateY: `${cardRotateY.value - 180}deg` },
    ],
    opacity: cardRotateY.value >= 90 ? 1 : 0,
  }));

  if (!visible || !card) return null;

  const isChance = card.type === 'chance';
  const themeColor = isChance ? '#FF9800' : '#2196F3';

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <Pressable style={styles.pressableOverlay} onPress={closeCard}>
          <Animated.View style={[styles.cardWrapper, cardWrapperStyle]}>
            {/* Back of card */}
            <Animated.View
              style={[
                styles.cardFace,
                { backgroundColor: themeColor },
                backStyle,
              ]}
            >
              <View style={styles.cardBackContent}>
                <Text style={styles.cardBackMark}>?</Text>
                <Text style={styles.cardBackLabel}>
                  {isChance ? 'CHANCE' : 'CAISSE'}
                </Text>
              </View>
            </Animated.View>

            {/* Front of card */}
            <Animated.View
              style={[
                styles.cardFace,
                styles.cardFront,
                frontStyle,
              ]}
            >
              <View style={[styles.cardHeader, { backgroundColor: themeColor }]}>
                <Text style={styles.cardHeaderText}>
                  {isChance ? 'CHANCE' : 'CAISSE DE COMMUNAUTÉ'}
                </Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardText} numberOfLines={0}>{card.text}</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={closeCard} activeOpacity={0.7}>
                <Text style={styles.closeButtonText}>OK</Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  pressableOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 340,
    minHeight: 240,
    maxHeight: 400,
    position: 'relative',
  },
  cardFace: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 24,
    backfaceVisibility: 'hidden',
  },
  cardFront: {
    backgroundColor: '#FFF',
  },
  cardBackContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 6,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: BORDER_RADIUS.lg,
    margin: 8,
  },
  cardBackMark: {
    fontFamily: 'Inter_900Black',
    fontSize: 72,
    color: 'rgba(255,255,255,0.9)',
  },
  cardBackLabel: {
    fontFamily: 'Inter_900Black',
    fontSize: 20,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 8,
    letterSpacing: 2,
  },
  cardHeader: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  cardHeaderText: {
    fontFamily: 'Inter_900Black',
    fontSize: 22,
    color: '#FFF',
    textAlign: 'center',
  },
  cardBody: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: '#333',
    textAlign: 'center',
    lineHeight: 22,
    flexShrink: 1,
  },
  closeButton: {
    backgroundColor: '#F5F5F5',
    borderTopWidth: 1,
    borderColor: '#E0E0E0',
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeButtonText: {
    fontFamily: 'Inter_900Black',
    fontSize: 17,
    color: '#333',
  },
});
