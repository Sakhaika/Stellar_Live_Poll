function shorten(address) {
  if (!address) return "unknown";
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export default function ActivityFeed({ events, options }) {
  if (!events || events.length === 0) {
    return (
      <div className="card activity-card">
        <h3>Live Activity</h3>
        <p className="muted small">Belum ada vote masuk. Jadilah yang pertama!</p>
      </div>
    );
  }

  return (
    <div className="card activity-card">
      <h3>Live Activity</h3>
      <ul className="activity-list">
        {events.slice(0, 8).map((e) => (
          <li key={e.id}>
            <span className="pulse-dot" />
            <span>
              <code>{shorten(e.voter)}</code> voted{" "}
              <strong>{options?.[e.optionIndex] ?? `option ${e.optionIndex}`}</strong>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
