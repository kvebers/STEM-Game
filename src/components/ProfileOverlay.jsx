import { useEffect, useState } from 'react';
import { supabase } from '../api/supabaseClient.js';
import { useCollectionStore } from '../state/useCollectionStore.js';
import { useT } from '../i18n/translations.js';
import { useLanguageStore } from '../state/useLanguageStore.js';
import { localizeTopicName } from '../i18n/topicNames.js';

/**
 * Aggregates completed matches into per-topic accuracy. Grouped purely by
 * whatever stage_tier values actually show up in match history and
 * resolved against the live stage_animals list — no hardcoded tier count,
 * so this keeps working as new topics get added to the tree.
 */
function aggregateTopicStats(matches, userId, stageAnimalsByTier) {
  const byTier = new Map();

  for (const m of matches) {
    const isPlayer1 = m.player1_id === userId;
    const myScore = isPlayer1 ? m.player1_score : m.player2_score;
    if (myScore == null || !m.question_count) continue;

    const entry = byTier.get(m.stage_tier) ?? { correct: 0, total: 0, matches: 0 };
    entry.correct += myScore;
    entry.total += m.question_count;
    entry.matches += 1;
    byTier.set(m.stage_tier, entry);
  }

  return Array.from(byTier.entries())
    .map(([tier, { correct, total, matches: matchCount }]) => ({
      tier,
      topicName: stageAnimalsByTier.get(tier)?.topic_name ?? `Tier ${tier}`,
      artKey: stageAnimalsByTier.get(tier)?.art_key ?? '❓',
      accuracy: correct / total,
      matches: matchCount,
    }))
    .sort((a, b) => b.accuracy - a.accuracy);
}

function TopicRow({ topic, language }) {
  return (
    <div className="profile-topic-row">
      <span className="profile-topic-emoji">{topic.artKey}</span>
      <span className="profile-topic-name">{localizeTopicName(topic.topicName, language)}</span>
      <span className="profile-topic-accuracy">{Math.round(topic.accuracy * 100)}%</span>
    </div>
  );
}

export function ProfileOverlay({ onClose }) {
  const { profile, stageAnimals } = useCollectionStore();
  const [loading, setLoading] = useState(true);
  const [topics, setTopics] = useState([]);
  const [error, setError] = useState(null);
  const t = useT();
  const language = useLanguageStore((s) => s.language);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error: fetchError } = await supabase
        .from('matches')
        .select('stage_tier, player1_id, player2_id, player1_score, player2_score, question_count')
        .eq('status', 'completed')
        .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`);

      if (cancelled) return;
      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      const stageAnimalsByTier = new Map(stageAnimals.map((sa) => [sa.tier, sa]));
      setTopics(aggregateTopicStats(data ?? [], user.id, stageAnimalsByTier));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [stageAnimals]);

  const strengths = topics.slice(0, 3);
  const weaknesses = topics.length > 1 ? topics.slice(-3).reverse() : [];

  return (
    <div className="profile-overlay-backdrop" onClick={onClose}>
      <div className="card profile-overlay" onClick={(e) => e.stopPropagation()}>
        <h2>{t('yourProfile')}</h2>
        {profile && <p className="muted">{t('peakElly', { count: profile.peak_elo })}</p>}

        {loading && <p className="muted">{t('loadingMatchHistory')}</p>}
        {error && <p className="error-text">{error}</p>}

        {!loading && !error && topics.length === 0 && <p className="muted">{t('noMatchesYet')}</p>}

        {!loading && topics.length === 1 && (
          <>
            <h4>{t('onlyTopicPlayed')}</h4>
            <TopicRow topic={topics[0]} language={language} />
          </>
        )}

        {!loading && topics.length > 1 && (
          <>
            <h4>{t('strengths')}</h4>
            {strengths.map((topic) => (
              <TopicRow key={topic.tier} topic={topic} language={language} />
            ))}
            <h4>{t('weaknesses')}</h4>
            {weaknesses.map((topic) => (
              <TopicRow key={topic.tier} topic={topic} language={language} />
            ))}
          </>
        )}

        <button className="btn btn-secondary profile-overlay-close" onClick={onClose}>
          {t('close')}
        </button>
      </div>
    </div>
  );
}
