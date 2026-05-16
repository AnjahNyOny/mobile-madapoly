import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import { playSound, playBgMusic, stopBgMusic } from '../utils/soundEffects';

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

  const appScreen = useGameStore((s) => s.appScreen);

  const prevTurnPhaseRef = useRef(turnPhase);
  const prevEventRef = useRef(lastEvent);
  const prevDiceRef = useRef(lastDiceRoll);
  const prevScreenRef = useRef<'lobby' | 'game' | null>(null);

  useEffect(() => {
    const prevScreen = prevScreenRef.current;
    const prevPhase = prevTurnPhaseRef.current;
    const prevEvent = prevEventRef.current;

    // Musique de fond : démarre quand on entre en jeu, s'arrête au lobby
    if (prevScreen !== 'game' && appScreen === 'game') {
      playBgMusic();
    } else if (prevScreen === 'game' && appScreen !== 'game') {
      stopBgMusic();
    }

    // Lancer de dés (une seule fois au début du mouvement)
    if (prevPhase !== 'ANIMATING_MOVEMENT' && turnPhase === 'ANIMATING_MOVEMENT') {
      if (lastDiceRoll && lastDiceRoll !== prevDiceRef.current) {
        playSound('dice-throw');
      }
    }

    // Son d'événement : quand lastEvent change
    if (lastEvent && lastEvent !== prevEvent) {
      switch (lastEvent.type) {
        // go-bonus (départ) est géré dans TokenLayer quand le pion atteint la case 0
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
    prevScreenRef.current = appScreen;
    prevTurnPhaseRef.current = turnPhase;
    prevEventRef.current = lastEvent;
    prevDiceRef.current = lastDiceRoll;
  }, [appScreen, turnPhase, lastEvent, lastDiceRoll]);
}
