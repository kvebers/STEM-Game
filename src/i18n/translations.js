import { useLanguageStore } from '../state/useLanguageStore.js';

// UI copy only — math question prompts are localized separately in
// shared/questions (they're generated server-side too, see i18n.js there).
const TRANSLATIONS = {
  en: {
    signOut: 'Sign out',
    printNav: 'Print',
    loadingGeneric: 'Loading…',

    authTitle: 'Sign in to Elly',
    authSubtitle: 'Climb the ladder, keep your animals fed, and earn Elly by racing through math challenges.',
    authImageAlt: 'Elly, the mascot elephant',
    continueWithGoogle: 'Continue with Google',

    pvpSearchTitle: 'Live Match',
    modePractice: 'Practice (vs AI)',
    modeCompete: 'Compete (Live PvP)',
    modeLearn: '📖 Learn',
    searchingOpponent: 'Searching for an opponent…',
    cancel: 'Cancel',
    loadingCollection: 'Loading your collection…',
    animalsNeedRehatchOne: 'One animal needs re-hatching, play with it to earn Elly back and revive it.',
    animalsNeedRehatchMany: '{count} animals need re-hatching, play with them to earn Elly back and revive them.',
    starting: 'Starting…',

    loadingChallenge: 'Loading challenge…',
    opponentDisconnectedNotice: "Your opponent seems to have disconnected, resolving shortly if they don't return…",
    waitingOpponentFinish: 'Waiting for your opponent to finish…',
    scoringRun: 'Scoring your run…',
    you: 'You',
    opponent: 'Opponent',
    ai: 'AI',

    resultWon: '🎉 You won!',
    resultDraw: '🤝 Draw',
    resultEffort: '💪 Good effort',
    resultScoreLine: 'You scored {score1}/{total} against {opponent} which scored {score2}.',
    vsAiBaseline: 'an AI baseline',
    yourOpponentFallback: 'your opponent',
    unlocked: 'unlocked!',
    rehatched: 're-hatched!',
    backToDashboard: 'Back to Dashboard',

    needsElly: 'needs {count} Elly',
    needsRehatch: 'Needs re-hatching, play to revive',
    atRiskOfDecay: 'at risk of decay!',
    atRiskTitle: 'At risk of decay, play soon to keep it alive',

    whyItMatters: 'Why it matters',
    whereYoullSeeIt: "Where you'll see it",
    howToSolveIt: 'How to solve it',
    practiceNow: 'Practice this now',
    needsToUnlock: 'Needs {count} Elly to unlock for practice.',
    close: 'Close',

    yourProfile: 'Your profile',
    peakElly: 'Peak Elly: {count}',
    loadingMatchHistory: 'Loading match history…',
    noMatchesYet: 'Play some matches to see your strengths and weaknesses.',
    onlyTopicPlayed: 'Only topic played so far',
    strengths: 'Strengths',
    weaknesses: 'Weaknesses',

    questionProgress: 'Question {index} of {total}',
    yourAnswerPlaceholder: 'Your answer',
    submitting: 'Submitting…',
    submit: 'Submit',

    printMocupAlt: 'Elly board game box mockup',
    printTitle: 'Print a practice sheet',
    backToTopics: '← Back to topics',
    newSheet: '🔀 New sheet',
    hideTips: 'Hide tips',
    showTips: '💡 Show tips',
    hideAnswerKey: 'Hide answer key',
    showAnswerKey: 'Show answer key',
    printBtn: '🖨️ Print',
    nameLabel: 'Name:',
    dateLabel: 'Date:',
    challengeTitle: "{name}'s {topic} Challenge",
    answerKeyTitle: "Answer key — {name}'s {topic}",
  },
  fr: {
    signOut: 'Se déconnecter',
    printNav: 'Imprimer',
    loadingGeneric: 'Chargement…',

    authTitle: 'Se connecter à Elly',
    authSubtitle:
      "Grimpez dans le classement, nourrissez vos animaux et gagnez des Elly en résolvant des défis de maths.",
    authImageAlt: 'Elly, la mascotte éléphant',
    continueWithGoogle: 'Continuer avec Google',

    pvpSearchTitle: 'Match en direct',
    modePractice: "Entraînement (contre l'IA)",
    modeCompete: 'Compétition (JcJ en direct)',
    modeLearn: '📖 Apprendre',
    searchingOpponent: "Recherche d'un adversaire…",
    cancel: 'Annuler',
    loadingCollection: 'Chargement de votre collection…',
    animalsNeedRehatchOne: 'Un animal doit être ré-éclos, jouez avec lui pour regagner des Elly et le raviver.',
    animalsNeedRehatchMany: '{count} animaux doivent être ré-éclos, jouez avec eux pour regagner des Elly et les raviver.',
    starting: 'Démarrage…',

    loadingChallenge: 'Chargement du défi…',
    opponentDisconnectedNotice: "Votre adversaire semble s'être déconnecté, la partie sera résolue sous peu s'il ne revient pas…",
    waitingOpponentFinish: 'En attente que votre adversaire termine…',
    scoringRun: 'Calcul de votre score…',
    you: 'Vous',
    opponent: 'Adversaire',
    ai: 'IA',

    resultWon: '🎉 Vous avez gagné !',
    resultDraw: '🤝 Match nul',
    resultEffort: '💪 Bel effort',
    resultScoreLine: 'Vous avez marqué {score1}/{total} contre {opponent}, qui a marqué {score2}.',
    vsAiBaseline: 'une IA de référence',
    yourOpponentFallback: 'votre adversaire',
    unlocked: 'débloqué !',
    rehatched: 'ré-éclos !',
    backToDashboard: 'Retour au tableau de bord',

    needsElly: 'nécessite {count} Elly',
    needsRehatch: 'À ré-éclore, jouez pour le raviver',
    atRiskOfDecay: 'risque de dépérir !',
    atRiskTitle: 'Risque de dépérir, jouez bientôt pour le garder en vie',

    whyItMatters: "Pourquoi c'est important",
    whereYoullSeeIt: 'Où vous le verrez',
    howToSolveIt: 'Comment le résoudre',
    practiceNow: "S'entraîner maintenant",
    needsToUnlock: "Nécessite {count} Elly pour débloquer l'entraînement.",
    close: 'Fermer',

    yourProfile: 'Votre profil',
    peakElly: 'Elly maximum : {count}',
    loadingMatchHistory: "Chargement de l'historique des parties…",
    noMatchesYet: 'Jouez quelques parties pour découvrir vos points forts et vos points faibles.',
    onlyTopicPlayed: 'Seul sujet joué jusqu’à présent',
    strengths: 'Points forts',
    weaknesses: 'Points faibles',

    questionProgress: 'Question {index} sur {total}',
    yourAnswerPlaceholder: 'Votre réponse',
    submitting: 'Envoi…',
    submit: 'Valider',

    printMocupAlt: 'Maquette de la boîte du jeu Elly',
    printTitle: "Imprimer une fiche d'exercices",
    backToTopics: '← Retour aux sujets',
    newSheet: '🔀 Nouvelle fiche',
    hideTips: 'Masquer les astuces',
    showTips: '💡 Afficher les astuces',
    hideAnswerKey: 'Masquer le corrigé',
    showAnswerKey: 'Afficher le corrigé',
    printBtn: '🖨️ Imprimer',
    nameLabel: 'Nom :',
    dateLabel: 'Date :',
    challengeTitle: 'Défi {topic} de {name}',
    answerKeyTitle: 'Corrigé — {topic} de {name}',
  },
};

function interpolate(str, vars) {
  if (!vars) return str;
  return Object.entries(vars).reduce((acc, [key, value]) => acc.replaceAll(`{${key}}`, value), str);
}

export function translate(language, key, vars) {
  const dict = TRANSLATIONS[language] ?? TRANSLATIONS.en;
  const str = dict[key] ?? TRANSLATIONS.en[key] ?? key;
  return interpolate(str, vars);
}

export function useT() {
  const language = useLanguageStore((s) => s.language);
  return (key, vars) => translate(language, key, vars);
}
