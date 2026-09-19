// French display names for learning-tree topics, keyed by the canonical
// English name (see shared/questions/index.js LEARNING_TREE / DB
// stage_animals.topic_name — that's the single source of truth for which
// topic a match is actually about). Keying by name rather than tier id
// avoids ever showing a name for the wrong topic in a broadened PvP match,
// where the tier the client requested and the tier actually played can
// differ. Unknown names fall back to whatever name the caller already has.
const TOPIC_NAMES_FR = {
  Addition: 'Addition',
  'Addition & Subtraction': 'Addition et soustraction',
  Multiplication: 'Multiplication',
  Division: 'Division',
  'Order of Operations': 'Ordre des opérations',
  'Basic Algebra': 'Algèbre de base',
  'Two-Step Equations': 'Équations à deux étapes',
  'Advanced Equations': 'Équations avancées',
  Fractions: 'Fractions',
  Decimals: 'Décimaux',
  Percentages: 'Pourcentages',
  'Statistics & Probability': 'Statistiques et probabilités',
  'Quadratic Equations': 'Équations quadratiques',
  'Exponential Equations': 'Équations exponentielles',
  'Ratios & Proportions': 'Rapports et proportions',
  'Standard Deviation': 'Écart type',
  'Perimeter & Area': 'Périmètre et aire',
  Angles: 'Angles',
  Circles: 'Cercles',
  'Volume & Surface Area': 'Volume et aire de surface',
};

export function localizeTopicName(englishName, language) {
  if (language === 'fr' && TOPIC_NAMES_FR[englishName]) return TOPIC_NAMES_FR[englishName];
  return englishName;
}
