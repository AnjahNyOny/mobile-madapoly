import React from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { STATIC_BOARD } from '../../constants';
import { calculateRent, hasMonopoly } from '../../utils/rentCalculator';
import { COLORS, BORDER_RADIUS } from '../../styles/theme';

export const PropertyDetailModal = () => {
  const selectedSpaceId = useGameStore(s => s.selectedSpaceIdForDetail);
  const setSelectedSpaceId = useGameStore(s => s.setSelectedSpaceIdForDetail);
  const board = useGameStore(s => s.board);
  const players = useGameStore(s => s.players);
  const localPlayerId = useGameStore(s => s.localPlayerId);
  const currentPlayerIndex = useGameStore(s => s.currentPlayerIndex);
  const buildHouse = useGameStore(s => s.buildHouse);
  const sellHouse = useGameStore(s => s.sellHouse);
  const mortgageProperty = useGameStore(s => s.mortgageProperty);
  const unmortgageProperty = useGameStore(s => s.unmortgageProperty);
  const networkRole = useGameStore(s => s.networkRole);
  const connectedClients = useGameStore(s => s.connectedClients);

  if (!selectedSpaceId) return null;

  const space = STATIC_BOARD.find(s => s.id === selectedSpaceId);
  if (!space) return null;

  const record = board[space.id];
  const owner = record?.ownerId ? players.find(p => p.id === record.ownerId) : null;
  const isOwned = !!owner;
  const isHostOrLocal = networkRole === 'host' || networkRole === 'local';
  const currentPlayer = players[currentPlayerIndex];
  const isRemoteClientPlayer = connectedClients.some(c => c.playerId === currentPlayer?.id);
  // isMine: host considers all their non-bot player properties as "theirs"
  const isMine = isHostOrLocal
    ? isOwned && owner && !owner.isBot
    : isOwned && owner?.id === localPlayerId;
  const isMyTurn = isHostOrLocal
    ? !currentPlayer?.isBot && !isRemoteClientPlayer
    : currentPlayer?.id === localPlayerId;

  const hasMono = isMine && space.type === 'property' && space.color ? hasMonopoly(owner.id, space.color, board) : false;
  const canBuild = hasMono && isMyTurn && record.houseCount < 5 && owner.balance >= (space.buildCost || 0) && !record.isMortgaged;
  const canSell = isMine && isMyTurn && space.type === 'property' && record.houseCount > 0;
  
  const canMortgage = isMine && isMyTurn && !record.isMortgaged;
  const canUnmortgage = isMine && isMyTurn && record.isMortgaged && owner.balance >= Math.ceil((space.price || 0) / 2 * 1.1);

  // Render details based on space type
  const renderDetails = () => {
    if (space.type === 'property' && space.rent) {
      return (
        <View style={styles.detailsContainer}>
          <Text style={styles.rentRow}><Text style={styles.rentLabel}>Loyer Terrain Nu :</Text> {space.rent[0]} AR</Text>
          <Text style={styles.rentRow}><Text style={styles.rentLabel}>Avec 1 Maison :</Text> {space.rent[1]} AR</Text>
          <Text style={styles.rentRow}><Text style={styles.rentLabel}>Avec 2 Maisons :</Text> {space.rent[2]} AR</Text>
          <Text style={styles.rentRow}><Text style={styles.rentLabel}>Avec 3 Maisons :</Text> {space.rent[3]} AR</Text>
          <Text style={styles.rentRow}><Text style={styles.rentLabel}>Avec 4 Maisons :</Text> {space.rent[4]} AR</Text>
          <Text style={styles.rentRow}><Text style={styles.rentLabel}>Avec Hôtel :</Text> {space.rent[5]} AR</Text>
          <Text style={styles.infoText}>Le loyer est doublé sur les terrains nus si le joueur possède toutes les propriétés de la même couleur.</Text>
        </View>
      );
    }
    
    if (space.type === 'railroad') {
      return (
        <View style={styles.detailsContainer}>
          <Text style={styles.rentRow}><Text style={styles.rentLabel}>1 Gare :</Text> {space.rent?.[0] || 25} AR</Text>
          <Text style={styles.rentRow}><Text style={styles.rentLabel}>2 Gares :</Text> {space.rent?.[1] || 50} AR</Text>
          <Text style={styles.rentRow}><Text style={styles.rentLabel}>3 Gares :</Text> {space.rent?.[2] || 100} AR</Text>
          <Text style={styles.rentRow}><Text style={styles.rentLabel}>4 Gares :</Text> {space.rent?.[3] || 200} AR</Text>
        </View>
      );
    }
    
    if (space.type === 'utility') {
      return (
        <View style={styles.detailsContainer}>
          <Text style={styles.infoText}>
            Si 1 service public est possédé, le loyer est <Text style={styles.boldText}>4 fois</Text> le montant des dés.
          </Text>
          <Text style={styles.infoText}>
            Si les 2 services publics sont possédés, le loyer est <Text style={styles.boldText}>10 fois</Text> le montant des dés.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.detailsContainer}>
        <Text style={styles.infoText}>Type de case : {space.type}</Text>
      </View>
    );
  };

  return (
    <Modal
      visible={true}
      transparent
      animationType="fade"
      onRequestClose={() => setSelectedSpaceId(null)}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          
          {/* Card Header */}
          <View style={[styles.cardHeader, { backgroundColor: space.color || '#333' }]}>
            <Text style={styles.cardTitle}>{space.name}</Text>
          </View>

          {/* Card Body */}
          <View style={styles.cardBody}>
            {/* Ownership status */}
            <View style={styles.ownerBox}>
              <Text style={styles.ownerLabel}>PROPRIÉTAIRE</Text>
              <Text style={[styles.ownerName, !isOwned && styles.ownerNone]}>
                {isOwned ? owner.name : 'Banque (Libre)'}
              </Text>
            </View>

            {/* Price */}
            {space.price && (
              <View style={styles.priceBox}>
                <Text style={styles.priceLabel}>PRIX D'ACHAT</Text>
                <Text style={styles.priceValue}>{space.price} AR</Text>
              </View>
            )}

            {/* Rent Details */}
            {renderDetails()}

            {/* Current Rent if owned */}
            {isOwned && space.type === 'property' && !record.isMortgaged && (
              <View style={styles.currentRentBox}>
                <Text style={styles.currentRentLabel}>LOYER ACTUEL ({record.houseCount} maisons)</Text>
                <Text style={styles.currentRentValue}>
                  {calculateRent(space, owner.id, record.houseCount, board, null)} AR
                </Text>
              </View>
            )}
            
            {isOwned && record.isMortgaged && (
              <View style={styles.mortgagedBox}>
                <Text style={styles.mortgagedText}>HYPOTHÉQUÉ</Text>
                <Text style={styles.mortgagedSubtext}>Loyer suspendu</Text>
              </View>
            )}

            {/* Actions for Owner */}
            {isMine && space.price && (
              <View style={styles.actionBox}>
                
                {space.type === 'property' && !record.isMortgaged && (
                  <>
                    {!hasMono && <Text style={styles.actionWarning}>Monopole requis pour construire.</Text>}
                    <View style={styles.actionButtonsRow}>
                      <TouchableOpacity 
                        style={[styles.actionBtn, styles.actionBtnSell, !canSell && styles.actionBtnDisabled]}
                        disabled={!canSell}
                        onPress={() => sellHouse(space.id)}
                      >
                        <Text style={styles.actionBtnText}>Vendre Maison</Text>
                        <Text style={styles.actionBtnPrice}>(+{Math.floor((space.buildCost||0) / 2)} AR)</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={[styles.actionBtn, styles.actionBtnBuild, !canBuild && styles.actionBtnDisabled]}
                        disabled={!canBuild}
                        onPress={() => buildHouse(space.id)}
                      >
                        <Text style={styles.actionBtnText}>Construire</Text>
                        <Text style={styles.actionBtnPrice}>(-{space.buildCost} AR)</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                <View style={[styles.actionButtonsRow, { marginTop: 8 }]}>
                  {!record.isMortgaged ? (
                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.actionBtnMortgage, !canMortgage && styles.actionBtnDisabled]}
                      disabled={!canMortgage}
                      onPress={() => mortgageProperty(space.id)}
                    >
                      <Text style={styles.actionBtnText}>Hypothéquer</Text>
                      <Text style={styles.actionBtnPrice}>(+{Math.floor(space.price / 2)} AR)</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.actionBtnUnmortgage, !canUnmortgage && styles.actionBtnDisabled]}
                      disabled={!canUnmortgage}
                      onPress={() => unmortgageProperty(space.id)}
                    >
                      <Text style={styles.actionBtnText}>Lever Hypothèque</Text>
                      <Text style={styles.actionBtnPrice}>(-{Math.ceil((space.price / 2) * 1.1)} AR)</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </View>

          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={() => setSelectedSpaceId(null)}
            activeOpacity={0.8}
          >
            <Text style={styles.closeButtonText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF', // Classic Monopoly card style (white body)
    borderRadius: 16,
    width: '80%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  cardHeader: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#222',
  },
  cardTitle: {
    color: '#FFF',
    fontFamily: 'Inter_900Black',
    fontSize: 22,
    textAlign: 'center',
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  cardBody: {
    padding: 20,
    backgroundColor: '#F9F9F9',
  },
  ownerBox: {
    marginBottom: 16,
    alignItems: 'center',
  },
  ownerLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  ownerName: {
    fontFamily: 'Inter_900Black',
    fontSize: 18,
    color: '#222',
  },
  ownerNone: {
    color: '#1FB25A', // Green for free
  },
  priceBox: {
    marginBottom: 20,
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#DDD',
  },
  priceLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  priceValue: {
    fontFamily: 'Inter_900Black',
    fontSize: 20,
    color: '#222',
  },
  detailsContainer: {
    gap: 8,
  },
  rentRow: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: '#333',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rentLabel: {
    fontFamily: 'Inter_700Bold',
  },
  infoText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginTop: 8,
    textAlign: 'center',
  },
  boldText: {
    fontFamily: 'Inter_700Bold',
    color: '#333',
  },
  currentRentBox: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#DDD',
    alignItems: 'center',
  },
  currentRentLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: '#E10214',
    marginBottom: 4,
  },
  currentRentValue: {
    fontFamily: 'Inter_900Black',
    fontSize: 22,
    color: '#E10214',
  },
  mortgagedBox: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#DDD',
    alignItems: 'center',
  },
  mortgagedText: {
    fontFamily: 'Inter_900Black',
    fontSize: 20,
    color: '#888',
  },
  mortgagedSubtext: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#888',
  },
  closeButton: {
    backgroundColor: '#222',
    paddingVertical: 16,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFF',
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    textTransform: 'uppercase',
  },
  actionBox: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#DDD',
  },
  actionWarning: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginBottom: 8,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  actionBtnDisabled: {
    opacity: 0.5,
  },
  actionBtnBuild: {
    backgroundColor: '#1FB25A',
  },
  actionBtnSell: {
    backgroundColor: '#E10214',
  },
  actionBtnMortgage: {
    backgroundColor: '#333',
  },
  actionBtnUnmortgage: {
    backgroundColor: '#4A90E2',
  },
  actionBtnText: {
    fontFamily: 'Inter_700Bold',
    color: '#FFF',
    fontSize: 14,
  },
  actionBtnPrice: {
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
  }
});
