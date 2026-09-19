export function EllyBadge({ current, onClick }) {
  return (
    <button type="button" className="elly-badge" onClick={onClick}>
      <span className="elly-badge-icon">⚡</span>
      <div className="elly-badge-value">{current} Elly</div>
    </button>
  );
}
