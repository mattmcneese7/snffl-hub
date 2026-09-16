import SiteChrome from '@/components/SiteChrome';

export default function HomePage() {
  return (
    <>
      <SiteChrome section="Home" week={1} />
      <main className="snffl-page">
        <h1 className="snffl-headline">Foundation</h1>
        <div className="snffl-placeholder">
          <span className="snffl-placeholder-label">Checkpoint 4</span>
          <span className="snffl-placeholder-note">
            Sleeper, ESPN, projections, manager colors and the odds simulation land next, which is
            what fills the tickers with real scores.
          </span>
        </div>
        <div className="snffl-placeholder">
          <span className="snffl-placeholder-label">Checkpoint 5</span>
          <span className="snffl-placeholder-note">
            Home, Matchups, Standings and the rest arrive here, built from the approved style frame.
          </span>
        </div>
      </main>
    </>
  );
}
