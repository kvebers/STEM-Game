import { LEARNING_CONTENT } from '../content/learningContent.js';

export function LearningDetail({ animal, onClose, onPractice }) {
  const content = LEARNING_CONTENT[animal.stage_tier];
  if (!content) return null;

  return (
    <div className="card learning-detail">
      <div className="learning-detail-header">
        <span className="learning-detail-emoji">{animal.art_key}</span>
        <h3>{animal.topic_name}</h3>
      </div>

      <h4>Why it matters</h4>
      <p>{content.why}</p>

      <h4>Where you'll see it</h4>
      <ul>
        {content.realWorld.map((example) => (
          <li key={example}>{example}</li>
        ))}
      </ul>

      <h4>How to solve it</h4>
      <p>{content.howTo}</p>

      <div className="learning-detail-actions">
        {animal.unlocked ? (
          <button className="btn btn-primary" onClick={onPractice}>
            Practice this now
          </button>
        ) : (
          <p className="muted">Needs {animal.elo_threshold} Elly to unlock for practice.</p>
        )}
        <button className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
