import { useEffect, useMemo, useState } from 'react';
import { useCollectionStore } from '../state/useCollectionStore.js';
import { generateQuestionSetForNode } from '../../shared/questions/index.js';
import { getLearningContent } from '../content/learningContent.js';
import { useT } from '../i18n/translations.js';
import { useLanguageStore } from '../state/useLanguageStore.js';
import { localizeTopicName } from '../i18n/topicNames.js';

// Kept modest since some topics (geometry, algebra) generate long,
// sentence-style prompts rather than short expressions — a single-column
// list of these needs more vertical room per row to stay on one A4 page.
const QUESTION_COUNT = 12;

function newSeed() {
  return Math.floor(Math.random() * 1e9);
}

export function PrintScreen() {
  const stageAnimals = useCollectionStore((s) => s.stageAnimals);
  const loadStaticData = useCollectionStore((s) => s.loadStaticData);
  const [tier, setTier] = useState(null);
  const [seed, setSeed] = useState(newSeed);
  const [showAnswers, setShowAnswers] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const t = useT();
  const language = useLanguageStore((s) => s.language);

  useEffect(() => {
    loadStaticData();
  }, [loadStaticData]);

  const animal = stageAnimals.find((a) => a.tier === tier) ?? null;

  // Purely client-side and answer-inclusive (unlike a real match's question
  // set, which never ships the answer to the browser) — fine here since a
  // printout is only ever for the person holding the pencil.
  const questions = useMemo(
    () => (animal ? generateQuestionSetForNode(animal.tier, seed, QUESTION_COUNT, language) : []),
    [animal, seed, language]
  );

  const pickTopic = (a) => {
    setTier(a.tier);
    setSeed(newSeed());
    setShowAnswers(false);
    setShowTips(false);
  };

  if (!animal) {
    return (
      <div>
        <img src="/mocup.jpg" alt={t('printMocupAlt')} className="print-mocup no-print" />
        <h2 className="card-title">{t('printTitle')}</h2>
        <div className="animal-grid">
          {stageAnimals.map((a) => (
            <button key={a.tier} type="button" className="animal-card" onClick={() => pickTopic(a)}>
              <div className="animal-card-emoji">{a.art_key}</div>
              <div className="animal-card-name">{a.name}</div>
              <div className="animal-card-status">{localizeTopicName(a.topic_name, language)}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const topicName = localizeTopicName(animal.topic_name, language);
  const tips = getLearningContent(animal.tier, language);

  return (
    <div>
      <div className="print-toolbar no-print">
        <button type="button" className="btn-link" onClick={() => setTier(null)}>
          {t('backToTopics')}
        </button>
        <div className="print-toolbar-actions">
          <button className="btn btn-secondary" onClick={() => setSeed(newSeed())}>
            {t('newSheet')}
          </button>
          {tips && (
            <button className="btn btn-secondary" onClick={() => setShowTips((v) => !v)}>
              {showTips ? t('hideTips') : t('showTips')}
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => setShowAnswers((v) => !v)}>
            {showAnswers ? t('hideAnswerKey') : t('showAnswerKey')}
          </button>
          <button className="btn btn-primary btn-icon" onClick={() => window.print()} title={t('printBtn')}>
            🖨️
          </button>
        </div>
      </div>

      {showTips && tips && (
        <div className="card print-tips">
          <h3>{t('whyItMatters')}</h3>
          <p>{tips.why}</p>
          <h3>{t('howToSolveIt')}</h3>
          <p>{tips.howTo}</p>
        </div>
      )}

      <div className="card print-sheet">
        <div className="print-sheet-header">
          <span className="print-sheet-emoji">{animal.art_key}</span>
          <div>
            <h2>{t('challengeTitle', { name: animal.name, topic: topicName })}</h2>
            <p className="print-sheet-fields">
              {t('nameLabel')} _______________________&emsp;{t('dateLabel')} ___________
            </p>
          </div>
        </div>
        <ol className="print-question-list">
          {questions.map((q, i) => (
            <li key={i}>
              <span className="print-question-prompt">{q.prompt} =</span>
              <span className="print-answer-blank" />
            </li>
          ))}
        </ol>
      </div>

      {showAnswers && (
        <div className="card print-answer-key">
          <h3>{t('answerKeyTitle', { name: animal.name, topic: topicName })}</h3>
          <ol className="print-answer-list">
            {questions.map((q, i) => (
              <li key={i}>{q.answer}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
