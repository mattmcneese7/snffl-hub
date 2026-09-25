import Link from 'next/link';

/** The proposed bottom bar. The mark is Home, the way an app does it. */
const TABS = [
  { href: '/lab/home', label: 'Home', icon: 'mark' },
  { href: '/lab/matchup', label: 'Matchup', icon: 'shield' },
  { href: '/lab/feed', label: 'Feed', icon: 'bolt' },
  { href: '/lab', label: 'System', icon: 'grid' },
] as const;

function Icon({ kind }: { kind: string }) {
  if (kind === 'mark') {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="lab-tab-icon" src="/logo-mark-v2-128.png" alt="" />;
  }
  const paths: Record<string, string> = {
    shield: 'M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z',
    bolt: 'M13 2L4 14h6l-1 8 9-12h-6z',
    paper: 'M5 3h11l3 3v15H5z M8 9h8 M8 13h8 M8 17h5',
    grid: 'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z',
  };
  return (
    <svg className="lab-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d={paths[kind]} strokeLinejoin="round" />
    </svg>
  );
}

export default function LabTabs({ active }: { active: string }) {
  return (
    <nav className="lab-tabs">
      {TABS.map((tab) => (
        <Link key={tab.href} href={tab.href} className={`lab-tab${tab.label === active ? ' lab-tab-on' : ''}`}>
          <Icon kind={tab.icon} />
          <span>{tab.label}</span>
        </Link>
      ))}
    </nav>
  );
}
