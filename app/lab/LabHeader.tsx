/** The proposed header: where you are, the mark, the week. */
export default function LabHeader({ section, week = 3 }: { section: string; week?: number }) {
  return (
    <header className="lab-header">
      <span className="lab-display lab-h2">{section}</span>
      <span className="lab-header-mark">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark-v2-128.png" alt="Squirtnite FFL" />
      </span>
      <span className="lab-week lab-num">WK {week}</span>
    </header>
  );
}
