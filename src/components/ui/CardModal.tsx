import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { GameCard } from '../../constants/cards';
import { COLORS, BORDER_RADIUS } from '../../styles/theme';

export const CardModal = () => {
  const lastEvent = useGameStore(s => s.lastEvent);
  const [visible, setVisible] = useState(false);
  const [card, setCard] = useState<GameCard | null>(null);

  useEffect(() => {
    if (lastEvent?.type === 'card' && lastEvent.card) {
      setCard(lastEvent.card);
      setVisible(true);
    }
  }, [lastEvent]);

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        setVisible(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible || !card) return null;

  const isChance = card.type === 'chance';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => setVisible(false)}
    >
      <View style={styles.overlay}>
        <View style={[styles.cardContainer, isChance ? styles.cardChance : styles.cardCommunity]}>
          <Text style={styles.cardHeader}>{isChance ? 'CHANCE' : 'CAISSE DE COMMUNAUTÉ'}</Text>
          <View style={styles.cardBody}>
            <Text style={styles.cardText}>{card.text}</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={() => setVisible(false)}>
            <Text style={styles.closeButtonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContainer: {
    width: '80%',
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  cardChance: {
    backgroundColor: '#FF9800', // Orange for chance
  },
  cardCommunity: {
    backgroundColor: '#2196F3', // Blue for community chest
  },
  cardHeader: {
    fontFamily: 'Inter_900Black',
    fontSize: 24,
    color: '#FFF',
    textAlign: 'center',
    paddingVertical: 16,
  },
  cardBody: {
    backgroundColor: '#FFF',
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
  },
  cardText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    lineHeight: 26,
  },
  closeButton: {
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderColor: '#EEE',
    paddingVertical: 16,
    alignItems: 'center',
  },
  closeButtonText: {
    fontFamily: 'Inter_900Black',
    fontSize: 18,
    color: '#333',
  }
});
