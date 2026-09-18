import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../state/useAuthStore.js';
import { useCollectionStore } from '../state/useCollectionStore.js';
import { useMatchStore } from '../state/useMatchStore.js';
import { AnimalTree } from '../components/AnimalTree.jsx';
import { LEARNING_CONTENT } from '../content/learningContent.js';

export function LearningScreen() {
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const { animals, fetchCollection } = useCollectionStore();
  const startAiMatch = useMatchStore((s) => s.startAiMatch);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (session?.user?.id && animals.length === 0) fetchCollection(session.user.id);
  }, [session?.user?.id, animals.length, fetchCollection]);

  const content = selected ? LEARNING_CONTENT[selected.stage_tier] : null;
  const canPracticeNow = selected?.unlocked;

  const handlePractice = async () => {
    await startAiMatch(selected.stage_tier);
    navigate('/challenge');
  };

  return (
    <div>
      <h2 className="section-title">Learn a topic</h2>
      <p className="muted">Tap any animal — locked or not — to see why its topic matters and how to solve it.</p>
      <AnimalTree animals={animals} selectable alwaysClickable selectedTier={selected?.stage_tier ?? null} onSelect={setSelected} />

      {selected && content && (
        <div className="card learning-detail">
          <div className="learning-detail-header">
            <span className="learning-detail-emoji">{selected.art_key}</span>
            <h3>{selected.topic_name}</h3>
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
            {canPracticeNow ? (
              <button className="btn btn-primary" onClick={handlePractice}>
                Practice this now
              </button>
            ) : (
              <p className="muted">Needs {selected.elo_threshold} Elly to unlock for practice.</p>
            )}
            <button className="btn btn-secondary" onClick={() => setSelected(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
