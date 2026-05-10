import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { COLORS, BORDER_RADIUS } from '../../styles/theme';

export const GameLogPanel = () => {
  const isGameLogOpen = useGameStore(s => s.isGameLogOpen);
  const setIsGameLogOpen = useGameStore(s => s.setIsGameLogOpen);
  const gameLog = useGameStore(s => s.gameLog);
  const scrollViewRef = useRef<ScrollView>(null);

  if (!isGameLogOpen) return null;

  return (
    <Modal
      visible={isGameLogOpen}
      transparent
      animationType="slide"
      onRequestClose={() => setIsGameLogOpen(false)}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>📜 Historique de la partie</Text>
            <TouchableOpacity onPress={() => setIsGameLogOpen(false)} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            ref={scrollViewRef}
            style={styles.logContainer}
            contentContainerStyle={styles.logContent}
          >
            {gameLog.length === 0 ? (
              <Text style={styles.emptyText}>Aucun événement pour le moment.</Text>
            ) : (
              gameLog.map((log, index) => (
                <View key={index} style={styles.logItem}>
                  <Text style={styles.logText}>{log}</Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '60%',
    padding: 20,
    borderTopWidth: 1,
    borderColor: '#333',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#FFF',
    fontSize: 18,
    fontFamily: 'Inter_900Black',
  },
  closeBtn: {
    padding: 10,
  },
  closeText: {
    color: '#AAA',
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  logContainer: {
    flex: 1,
  },
  logContent: {
    gap: 12,
    paddingBottom: 40,
  },
  logItem: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 12,
    borderRadius: BORDER_RADIUS.sm,
  },
  logText: {
    color: 'rgba(255,255,255,0.9)',
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginTop: 40,
  }
});
