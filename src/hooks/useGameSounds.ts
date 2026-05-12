import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import { playSound } from '../utils/soundEffects';

/**
 * Hook qui joue les effets sonores en fonction des événements de jeu.
 * Fonctionne pour tout le monde (hôte + clients) car il écoute le state.
 *
 * NOTE: le son de rebond case-par-case est géré directement dans
 * TokenLayer (animation Reanimated) pour rester parfaitement synchronisé
 * avec le mouvement visuel du pion.
 */
export function useGameSounds() {
  const turnPhase = useGameStore((s) => s.turnPhase);
  const lastEvent = useGameStore((s) => s.lastEvent);
  const lastDiceRoll = useGameStore((s) => s.lastDiceRoll);

  const prevTurnPhaseRef = useRef(turnPhase);
  const prevEventRef = useRef(lastEvent);
  const prevDiceRef = useRef(lastDiceRoll);

  useEffect(() => {
    const prevPhase = prevTurnPhaseRef.current;
    const prevEvent = prevEventRef.current;

    // Lancer de dés (une seule fois au début du mouvement)
    if (prevPhase !== 'ANIMATING_MOVEMENT' && turnPhase === 'ANIMATING_MOVEMENT') {
      if (lastDiceRoll && lastDiceRoll !== prevDiceRef.current) {
        playSound('dice-throw');
      }
    }

    // Son d'événement : quand lastEvent change
    if (lastEvent && lastEvent !== prevEvent) {
      switch (lastEvent.type) {
        case 'go-bonus':
          playSound('depart');
          break;
        case 'jail':
          playSound('jail');
          break;
        case 'rent':
          playSound('loyer');
          break;
        case 'purchase':
          playSound('buy-property');
          break;
        case 'victory':
          playSound('win');
          break;
      }
    }

    // Mettre à jour les refs
    prevTurnPhaseRef.current = turnPhase;
    prevEventRef.current = lastEvent;
    prevDiceRef.current = lastDiceRoll;
  }, [turnPhase, lastEvent, lastDiceRoll]);
}
