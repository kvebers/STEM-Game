import { getLearningContent } from '../content/learningContent.js';
import { useT } from '../i18n/translations.js';
import { useLanguageStore } from '../state/useLanguageStore.js';
import { localizeTopicName } from '../i18n/topicNames.js';

export function LearningDetail({ animal, onClose, onPractice }) {
  const t = useT();
  const language = useLanguageStore((s) => s.language);
  const content = getLearningContent(animal.stage_tier, language);
  if (!content) return null;

  return (
    <div className="card learning-detail">
      <div className="learning-detail-header">
        <span className="learning-detail-emoji">{animal.art_key}</span>
        <h3>{localizeTopicName(animal.topic_name, language)}</h3>
      </div>

      <h4>{t('whyItMatters')}</h4>
      <p>{content.why}</p>

      <h4>{t('whereYoullSeeIt')}</h4>
      <ul>
        {content.realWorld.map((example) => (
          <li key={example}>{example}</li>
        ))}
      </ul>

      <h4>{t('howToSolveIt')}</h4>
      <p>{content.howTo}</p>

      <div className="learning-detail-actions">
        {animal.unlocked ? (
          <button className="btn btn-primary" onClick={onPractice}>
            {t('practiceNow')}
          </button>
        ) : (
          <p className="muted">{t('needsToUnlock', { count: animal.elo_threshold })}</p>
        )}
        <button className="btn btn-secondary" onClick={onClose}>
          {t('close')}
        </button>
      </div>
    </div>
  );
}
