/** The "1 in 40" mark: forty squares, one gold. 2.5% made visible. */
export function Mark() {
  return (
    <span className="mark" aria-hidden="true">
      {Array.from({ length: 40 }, (_, i) => (
        <span key={i} className={i === 0 ? 'on' : undefined} />
      ))}
    </span>
  );
}
