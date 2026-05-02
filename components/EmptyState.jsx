export function EmptyState({ icon = '🔍', title = 'No data', description = '', action = null }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3 className="empty-heading">{title}</h3>
      {description && <p className="empty-text">{description}</p>}
      {action && <div style={{ marginTop: '16px' }}>{action}</div>}
    </div>
  );
}
