import React, { useRef } from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { COLORS, BORDER_RADIUS, SPACING } from '../../styles/theme';
import { GameLogEntry } from '../../types';

// Color mapping per log type
const TYPE_COLORS: Record<GameLogEntry['type'], string> = {
  dice: '#7C3AED',
  move: '#6B7280',
  purchase: '#22C55E',
  rent: '#F59E0B',
  tax: '#EF4444',
  jail: '#DC2626',
  card: '#3B82F6',
  trade: '#8B5CF6',
  build: '#10B981',
  mortgage: '#F97316',
  bankrupt: '#991B1B',
  victory: '#FBBF24',
  info: '#6B7280',
  turn: '#374151',
  'go-bonus': '#22C55E',
};

// Accent bar color (left border)
const TYPE_ACCENT: Record<GameLogEntry['type'], string> = {
  dice: '#A78BFA',
  move: '#9CA3AF',
  purchase: '#4ADE80',
  rent: '#FCD34D',
  tax: '#F87171',
  jail: '#F87171',
  card: '#60A5FA',
  trade: '#A78BFA',
  build: '#34D399',
  mortgage: '#FB923C',
  bankrupt: '#EF4444',
  victory: '#FDE68A',
  info: '#9CA3AF',
  turn: '#6B7280',
  'go-bonus': '#4ADE80',
};

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
};

const LogItem = ({ entry, isFirst }: { entry: GameLogEntry; isFirst: boolean }) => {
  const accentColor = TYPE_ACCENT[entry.type] || '#6B7280';
  const bgColor = TYPE_COLORS[entry.type] || '#6B7280';

  return (
    <View style={[styles.logItem, { borderLeftColor: accentColor }]}>
      <View style={styles.logHeader}>
        <View style={[styles.typeBadge, { backgroundColor: bgColor + '22' }]}>
          <Text style={[styles.typeBadgeText, { color: accentColor }]}>
            {entry.emoji}
          </Text>
        </View>
        <View style={styles.logMeta}>
          <Text style={styles.logTurn}>Tour {entry.turn}</Text>
          <Text style={styles.logTime}>{formatTime(entry.timestamp)}</Text>
        </View>
      </View>
      <Text style={styles.logMessage}>{entry.message}</Text>
      {entry.amount && (
        <Text style={[styles.logAmount, { color: accentColor }]}>
          {entry.amount > 0 ? '+' : ''}{entry.amount.toLocaleString()} AR
        </Text>
      )}
    </View>
  );
};

export const GameLogPanel = () => {
  const isGameLogOpen = useGameStore(s => s.isGameLogOpen);
  const setIsGameLogOpen = useGameStore(s => s.setIsGameLogOpen);
  const gameLog = useGameStore(s => s.gameLog);
  const scrollViewRef = useRef<ScrollView>(null);

  if (!isGameLogOpen) return null;

  // Group logs by turn for section headers
  let lastTurn = -1;

  return (
    <Modal
      visible={isGameLogOpen}
      transparent
      animationType="slide"
      onRequestClose={() => setIsGameLogOpen(false)}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerIcon}>📜</Text>
              <View>
                <Text style={styles.title}>Historique</Text>
                <Text style={styles.subtitle}>{gameLog.length} événement{gameLog.length > 1 ? 's' : ''}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setIsGameLogOpen(false)} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: TYPE_ACCENT.dice }]} /><Text style={styles.legendText}>Dés</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: TYPE_ACCENT.purchase }]} /><Text style={styles.legendText}>Achat</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: TYPE_ACCENT.rent }]} /><Text style={styles.legendText}>Loyer</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: TYPE_ACCENT.jail }]} /><Text style={styles.legendText}>Prison</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: TYPE_ACCENT.card }]} /><Text style={styles.legendText}>Carte</Text></View>
          </View>
          
          {/* Log entries */}
          <ScrollView 
            ref={scrollViewRef}
            style={styles.logContainer}
            contentContainerStyle={styles.logContent}
            showsVerticalScrollIndicator={false}
          >
            {gameLog.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🎲</Text>
                <Text style={styles.emptyText}>Aucun événement pour le moment.</Text>
                <Text style={styles.emptySubtext}>Lancez les dés pour commencer !</Text>
              </View>
            ) : (
              gameLog.map((entry, index) => {
                // Show turn separator when turn changes
                const showTurnSeparator = typeof entry === 'object' && entry.turn !== lastTurn;
                if (typeof entry === 'object') lastTurn = entry.turn;

                // Handle legacy string entries (backward compat)
                if (typeof entry === 'string') {
                  return (
                    <View key={index} style={[styles.logItem, { borderLeftColor: '#6B7280' }]}>
                      <Text style={styles.logMessage}>{entry}</Text>
                    </View>
                  );
                }

                return (
                  <React.Fragment key={index}>
                    {showTurnSeparator && index > 0 && (
                      <View style={styles.turnSeparator}>
                        <View style={styles.turnSeparatorLine} />
                        <Text style={styles.turnSeparatorText}>Tour {entry.turn}</Text>
                        <View style={styles.turnSeparatorLine} />
                      </View>
                    )}
                    <LogItem entry={entry} isFirst={index === 0} />
                  </React.Fragment>
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#111118',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '70%',
    paddingTop: 20,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    fontSize: 28,
  },
  title: {
    color: '#FFF',
    fontSize: 20,
    fontFamily: 'Inter_900Black',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: '#AAA',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },

  // Legend
  legend: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 16,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
  },

  // Log container
  logContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  logContent: {
    gap: 6,
    paddingBottom: 50,
  },

  // Log item
  logItem: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderLeftWidth: 3,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 14,
  },
  logMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logTurn: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
  },
  logTime: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
  },
  logMessage: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    lineHeight: 18,
  },
  logAmount: {
    fontFamily: 'Inter_900Black',
    fontSize: 12,
    marginTop: 4,
  },

  // Turn separator
  turnSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    gap: 10,
  },
  turnSeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  turnSeparatorText: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 16,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    color: 'rgba(255,255,255,0.2)',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 6,
  },
});
