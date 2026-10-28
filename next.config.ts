import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Next writes its own CLAUDE.md for agents on every dev run, which overwrites
  // the project rules file this repo keeps at that path.
  agentRules: false,

  // The dev badge sits on top of the Home tab on a phone viewport.
  devIndicators: false,

  // The site is public but must stay out of search results entirely, so the
  // header goes on every response, not just the pages that remember a meta tag.
  // Standings, Power Rankings and Playoffs merged into one page. These were
  // real URLs people have open, so they land on the section they asked for
  // rather than on a 404.
  async redirects() {
    return [
      // Splash 4.0. v3's paths that v4 named differently land on their v4
      // page, in one hop: saved links, and push alerts already sent. The
      // older v2 and /testing links follow the same map. Not permanent, so
      // the paths can still change.
      { source: '/power-rankings', destination: '/league', permanent: false },
      { source: '/playoffs', destination: '/league/bracket', permanent: false },
      { source: '/standings', destination: '/league', permanent: false },
      { source: '/scoreboard', destination: '/scores', permanent: false },
      { source: '/scoreboard/:week', destination: '/scores/:week', permanent: false },
      { source: '/scoreboard/:week/:matchupId', destination: '/matchup?id=:matchupId&week=:week', permanent: false },
      { source: '/matchups', destination: '/scores', permanent: false },
      { source: '/matchups/:week', destination: '/scores/:week', permanent: false },
      { source: '/matchups/:week/:matchupId', destination: '/matchup?id=:matchupId&week=:week', permanent: false },
      { source: '/settings', destination: '/account', permanent: false },
      { source: '/more', destination: '/league', permanent: false },
      { source: '/home', destination: '/', permanent: false },
      { source: '/testing', destination: '/', permanent: false },
      { source: '/testing/home', destination: '/', permanent: false },
      { source: '/testing/:path*', destination: '/:path*', permanent: false },
      // The 4.0 preview links Matt has land on the real page. The kit stays
      // where it is (the reference for future work), and so does the invite's
      // chat card, whose URL Next builds from the file's own path.
      { source: '/lab/app', destination: '/', permanent: false },
      { source: '/lab/app/:path((?!kit|modules|join/opengraph-image).*)', destination: '/:path', permanent: false },
    ];
  },

  // Splash 4.0 swap, Phase A (app/(splash)/lab/GOLIVE-v4.md). The v4 pages
  // still live under app/(splash)/lab/app; these serve them at the public
  // paths, ahead of v3's page files at the same paths, so the address bar
  // shows /scores while v4 answers. Undo: revert this commit. Phase B moves
  // the files and retires these.
  async rewrites() {
    const v4 = ['scores', 'matchup', 'nfl', 'rag', 'league', 'swami', 'players', 'managers', 'chug', 'feed', 'insights', 'trades', 'trophies', 'rules', 'my-team', 'account', 'pickem', 'join'];
    return {
      beforeFiles: [
        { source: '/', destination: '/lab/app' },
        ...v4.flatMap((p) => [
          { source: `/${p}`, destination: `/lab/app/${p}` },
          { source: `/${p}/:path*`, destination: `/lab/app/${p}/:path*` },
        ]),
      ],
    };
  },

  async headers() {
    return [
      // Everything but the invite. The negative lookahead is what keeps this
      // off /join: two matching rules would send two X-Robots-Tag headers and
      // a crawler combines them, so the nosnippet would apply anyway.
      {
        source: '/:path((?!join).*)',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive, nosnippet' }],
      },
      // The invite is the one page meant to be passed around, so it keeps
      // noindex, which is what actually keeps it out of search, and drops
      // noarchive and nosnippet, which are the two that stop a chat app from
      // building a card for it.
      {
        source: '/join',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/join/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'sleepercdn.com' },
      { protocol: 'https', hostname: 'a.espncdn.com' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
    ],
  },
};

export default nextConfig;
