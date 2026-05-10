import React from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { STATIC_BOARD, COLOR_GROUPS, BoardSpace } from '../../constants';
import { COLORS, BORDER_RADIUS, SPACING } from '../../styles/theme';

export const PlayerPropertiesModal = () => {
  const selectedPlayerIdForProps = useGameStore(s => s.selectedPlayerIdForProps);
  const setSelectedPlayerIdForProps = useGameStore(s => s.setSelectedPlayerIdForProps);
  const players = useGameStore(s => s.players);
  const board = useGameStore(s => s.board);

  if (!selectedPlayerIdForProps) return null;

  const player = players.find(p => p.id === selectedPlayerIdForProps);
  if (!player) return null;

  // Find all properties owned by this player
  const ownedSpaces: BoardSpace[] = STATIC_BOARD.filter(space => {
    const record = board[space.id];
    return record && record.ownerId === player.id;
  });

  const getSpaceColor = (space: BoardSpace) => {
    if (space.type === 'railroad') return '#333';
    if (space.type === 'utility') return '#999';
    return space.color || '#333';
  };

  return (
    <Modal
      visible={true}
      transparent
      animationType="fade"
      onRequestClose={() => setSelectedPlayerIdForProps(null)}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Propriétés de {player.name}</Text>
            <TouchableOpacity onPress={() => setSelectedPlayerIdForProps(null)} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            style={styles.listContainer}
            contentContainerStyle={styles.listContent}
          >
            {ownedSpaces.length === 0 ? (
              <Text style={styles.emptyText}>Aucune propriété possedée.</Text>
            ) : (
              ownedSpaces.map((space) => {
                const record = board[space.id];
                const houseText = record.houseCount === 5 ? 'Hôtel' : `${record.houseCount} maison(s)`;
                
                return (
                  <View key={space.id} style={styles.propertyItem}>
                    <View style={[styles.colorBar, { backgroundColor: getSpaceColor(space) }]} />
                    <View style={styles.propertyInfo}>
                      <Text style={styles.propertyName}>{space.name}</Text>
                      {space.type === 'property' && (
                        <Text style={styles.propertyDetails}>{houseText}</Text>
                      )}
                      {space.type !== 'property' && (
                        <Text style={styles.propertyDetails}>
                          {space.type === 'railroad' ? 'Gare' : 'Service public'}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    width: '85%',
    maxHeight: '70%',
    padding: 20,
    borderWidth: 1,
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
  listContainer: {
    flexGrow: 0,
  },
  listContent: {
    gap: 12,
    paddingBottom: 20,
  },
  propertyItem: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BORDER_RADIUS.sm,
    overflow: 'hidden',
  },
  colorBar: {
    width: 12,
  },
  propertyInfo: {
    flex: 1,
    padding: 12,
  },
  propertyName: {
    color: '#FFF',
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    marginBottom: 4,
  },
  propertyDetails: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginTop: 20,
  }
});
