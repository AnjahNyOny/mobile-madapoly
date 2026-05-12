import { Audio } from 'expo-av';

// Map des sons disponibles
const SOUND_MAP: Record<string, any> = {
  'dice-throw': require('../../assets/sounds/dice-throw.wav'),
  rebound2: require('../../assets/sounds/rebound2.wav'),
  'last-rebound': require('../../assets/sounds/last-rebound.wav'),
  loyer: require('../../assets/sounds/loyer.wav'),
  jail: require('../../assets/sounds/jail.wav'),
  depart: require('../../assets/sounds/depart.wav'),
  'buy-property': require('../../assets/sounds/buy-property.wav'),
  win: require('../../assets/sounds/win.wav'),
};

let preloadedSounds: Map<string, Audio.Sound> = new Map();

/**
 * Précharge tous les sons au démarrage de l'app (optionnel mais recommandé)
 */
export const preloadSounds = async () => {
  for (const [key, file] of Object.entries(SOUND_MAP)) {
    try {
      const { sound } = await Audio.Sound.createAsync(file, { shouldPlay: false });
      preloadedSounds.set(key, sound);
    } catch {
      // ignore si un fichier manque
    }
  }
};

/**
 * Joue un son par son identifiant
 */
export const playSound = async (key: string) => {
  try {
    // Si préchargé, rejoue depuis le début
    const preloaded = preloadedSounds.get(key);
    if (preloaded) {
      await preloaded.setPositionAsync(0);
      await preloaded.playAsync();
      return;
    }

    // Sinon charge à la volée
    const file = SOUND_MAP[key];
    if (!file) return;
    const { sound } = await Audio.Sound.createAsync(file);
    sound.setOnPlaybackStatusUpdate((status: any) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
      }
    });
    await sound.playAsync();
  } catch {
    // Silencieux en cas d'erreur
  }
};

/**
 * Libère les sons préchargés (appeler au cleanup)
 */
export const unloadSounds = async () => {
  for (const sound of preloadedSounds.values()) {
    try { await sound.unloadAsync(); } catch {}
  }
  preloadedSounds.clear();
};
