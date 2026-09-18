export function EllyBadge({ current, peak }) {
  return (
    <div className="elly-badge">
      <span className="elly-badge-icon">⚡</span>
      <div>
        <div className="elly-badge-value">{current} Elly</div>
        {typeof peak === 'number' && peak > current && <div className="elly-badge-peak">peak {peak}</div>}
      </div>
    </div>
  );
}
