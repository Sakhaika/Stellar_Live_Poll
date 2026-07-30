export default function PollCard({
  question,
  options,
  results,
  hasVoted,
  selectedOption,
  onSelect,
  onVote,
  isVoting,
  isConnected,
  isLoading,
}) {
  const totalVotes = results?.reduce((a, b) => a + b, 0) || 0;

  if (isLoading) {
    return (
      <div className="card poll-card">
        <p className="muted">Loading poll...</p>
      </div>
    );
  }

  return (
    <div className="card poll-card">
      <h2 className="poll-question">{question || "-"}</h2>
      <p className="muted small">{totalVotes} total votes</p>

      <div className="options-list">
        {options?.map((opt, i) => {
          const count = results?.[i] || 0;
          const pct = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
          const isSelected = selectedOption === i;

          return (
            <button
              key={i}
              className={`option-row ${isSelected ? "option-selected" : ""} ${
                hasVoted ? "option-disabled" : ""
              }`}
              onClick={() => !hasVoted && onSelect(i)}
              disabled={hasVoted}
            >
              <div className="option-bar" style={{ width: `${pct}%` }} />
              <div className="option-content">
                <span>{opt}</span>
                <span className="option-stats">
                  {count} · {pct}%
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {hasVoted ? (
        <p className="muted small">✅ Kamu sudah vote di poll ini.</p>
      ) : (
        <button
          className="btn btn-primary"
          onClick={onVote}
          disabled={!isConnected || selectedOption === null || isVoting}
        >
          {!isConnected
            ? "Connect wallet dulu"
            : isVoting
            ? "Mengirim vote..."
            : "Submit Vote"}
        </button>
      )}
    </div>
  );
}
