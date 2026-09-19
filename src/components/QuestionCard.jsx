import { useEffect, useState } from 'react';
import { useT } from '../i18n/translations.js';

export function QuestionCard({ prompt, options, index, total, onSubmit, submitting, feedback, streak }) {
  const [value, setValue] = useState('');
  const [flashClass, setFlashClass] = useState('');
  const t = useT();

  // `feedback` is a fresh object each time a new answer lands (bumped by
  // its `key`), so this only re-fires on an actual new hit — the flash is
  // purely decorative and never delays the next question from appearing.
  useEffect(() => {
    if (!feedback) return;
    setFlashClass(feedback.correct ? 'flash-correct' : 'flash-wrong');
    const timeout = setTimeout(() => setFlashClass(''), 500);
    return () => clearTimeout(timeout);
  }, [feedback]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || submitting) return;
    setValue('');
    onSubmit(trimmed);
  };

  const hasOptions = Array.isArray(options) && options.length > 0;

  return (
    <form className={`card question-card ${flashClass}`} onSubmit={handleSubmit}>
      <div className="question-card-header">
        <div className="muted question-progress">{t('questionProgress', { index: index + 1, total })}</div>
        {streak >= 2 && <div className="chip streak-chip">🔥 ×{streak}</div>}
      </div>
      <div className="question-prompt" key={index}>
        {prompt}
      </div>
      {hasOptions ? (
        <div className="answer-choices">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              className="btn btn-secondary answer-choice-btn"
              disabled={submitting}
              onClick={() => onSubmit(option)}
            >
              {option}
            </button>
          ))}
        </div>
      ) : (
        <>
          <input
            className="question-input"
            type="text"
            inputMode="decimal"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t('yourAnswerPlaceholder')}
            disabled={submitting}
          />
          <button className="btn btn-primary" type="submit" disabled={submitting || !value.trim()}>
            {submitting ? t('submitting') : t('submit')}
          </button>
        </>
      )}
    </form>
  );
}
