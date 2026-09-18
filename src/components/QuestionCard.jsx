import { useState } from 'react';

export function QuestionCard({ prompt, index, total, onSubmit, submitting }) {
  const [value, setValue] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || submitting) return;
    setValue('');
    onSubmit(trimmed);
  };

  return (
    <form className="card question-card" onSubmit={handleSubmit}>
      <div className="muted question-progress">
        Question {index + 1} of {total}
      </div>
      <div className="question-prompt">{prompt}</div>
      <input
        className="question-input"
        type="text"
        inputMode="decimal"
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Your answer"
        disabled={submitting}
      />
      <button className="btn btn-primary" type="submit" disabled={submitting || !value.trim()}>
        {submitting ? 'Submitting…' : 'Submit'}
      </button>
    </form>
  );
}
