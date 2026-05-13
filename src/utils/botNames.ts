// ─── Noms de bots (style malgache rigolo) ───

export const BOT_NAMES = [
  'LeBoto',
  'LeKoto',
  'LeKotoKely',
  'BotoBe',
  'Raboto',
  'RakotoBot',
  'BotoKely',
  'BotyBoty',
  'KotoBe',
  'KotoMena',
  'BotoMaitso',
  'KotoVola',
  'BotoSoa',
  'KotoTia',
  'LeBotoBe',
];

/**
 * Tire `count` noms aléatoires sans remise depuis la liste.
 * Si count > noms disponibles, les noms reprennent du début.
 */
export const getRandomBotNames = (count: number): string[] => {
  const shuffled = [...BOT_NAMES].sort(() => Math.random() - 0.5);
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(shuffled[i % shuffled.length]);
  }
  return result;
};
