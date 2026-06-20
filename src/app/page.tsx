const repositoryBase = "https://github.com/wadewoo999/bitget-trading-agents/blob/main";

const stages = ["Market data", "AI decision", "User confirmation"];

export default function HomePage() {
  return (
    <main className="foundation-shell">
      <header className="topbar">
        <a className="brand" href="https://github.com/wadewoo999/bitget-trading-agents">
          BITGET / DECISION WORKSPACE
        </a>
        <span className="status">MVP Foundation</span>
      </header>

      <section className="hero" aria-labelledby="product-title">
        <p className="eyebrow">Bitget AI Base Camp Hackathon S1 · Trading Agent</p>
        <h1 id="product-title">BTC Trading Decision Agent</h1>
        <p className="lede">
          A simulation-first workspace for turning conflicting BTC market signals into an
          explainable next action.
        </p>

        <div className="signal-trace" aria-label="Planned decision workflow">
          {stages.map((stage, index) => (
            <div className="signal-stage" key={stage}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{stage}</strong>
            </div>
          ))}
        </div>

        <aside className="foundation-note">
          <span>Current state</span>
          <p>
            The application structure and contracts are being established. Market analysis,
            paper trading, and backtesting are not active yet.
          </p>
        </aside>
      </section>

      <footer className="document-links">
        <a href={`${repositoryBase}/docs/product/PROJECT_SPEC.md`}>Product specification</a>
        <a href={`${repositoryBase}/docs/hackathon/OFFICIAL_HACKATHON_REQUIREMENTS.md`}>
          Hackathon requirements
        </a>
      </footer>
    </main>
  );
}
