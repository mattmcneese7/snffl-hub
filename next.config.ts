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
      { source: '/power-rankings', destination: '/standings#power', permanent: true },
      { source: '/playoffs', destination: '/standings#playoffs', permanent: true },
    ];
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
