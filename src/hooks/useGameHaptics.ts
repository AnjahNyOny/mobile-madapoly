/**
 * useGameHaptics.ts
 *
 * Hook qui ajoute du game feel via des retours haptiques (vibrations)
 * en écoutant les changements d'état du store Zustand.
 */
import { useEffect, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { useGameStore } from '../store/useGameStore';

export const useGameHaptics = () => {
  const turnPhase = useGameStore((s) => s.turnPhase);
  const lastEvent = useGameStore((s) => s.lastEvent);
  const lastDiceRoll = useGameStore((s) => s.lastDiceRoll);

  // Refs to prevent double-firing
  const prevTurnPhase = useRef(turnPhase);
  const prevDiceRoll = useRef(lastDiceRoll);
  const prevEventStr = useRef(lastEvent ? JSON.stringify(lastEvent) : null);

  // 1. Impact moyen : Lancer des dés
  useEffect(() => {
    if (lastDiceRoll && lastDiceRoll !== prevDiceRoll.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      prevDiceRoll.current = lastDiceRoll;
    }
  }, [lastDiceRoll]);

  // 2. Impact léger : Fin du mouvement (arrivée sur une case)
  useEffect(() => {
    if (turnPhase === 'RESOLVING_SPACE' && prevTurnPhase.current === 'ANIMATING_MOVEMENT') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    prevTurnPhase.current = turnPhase;
  }, [turnPhase]);

  // 3. Notifications : Événements du jeu
  useEffect(() => {
    const currentEventStr = lastEvent ? JSON.stringify(lastEvent) : null;
    
    if (lastEvent && currentEventStr !== prevEventStr.current) {
      switch (lastEvent.type) {
        case 'purchase':
        case 'victory':
        case 'go-bonus':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'jail':
        case 'bankruptcy':
        case 'tax':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        case 'rent':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        default:
          break;
      }
      prevEventStr.current = currentEventStr;
    }
  }, [lastEvent]);
};
