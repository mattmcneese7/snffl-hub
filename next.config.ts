import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Next writes its own CLAUDE.md for agents on every dev run, which overwrites
  // the project rules file this repo keeps at that path.
  agentRules: false,

  // The dev badge sits on top of the Home tab on a phone viewport.
  devIndicators: false,

  // The site is public but must stay out of search results entirely, so the
  // header goes on every response, not just the pages that remember a meta tag.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive, nosnippet' }],
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
