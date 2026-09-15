// Shared chrome and data loading for the Checkpoint 2 style frame.
// Real Sleeper data, rendered at runtime so markup stays small.

const SNFFL_LETTERS =
  'M43.24 66.91Q38.3 66.91 34.04 66.37Q29.78 65.82 26.63 64.45Q23.47 63.08 21.68 60.54Q19.9 58.01 19.9 54.1Q19.9 52.89 20.11 51.56Q20.32 50.23 20.78 48.69H38.96Q38.57 50.1 38.47 50.77Q38.37 51.44 38.37 51.92Q38.37 53.22 39.03 53.9Q39.69 54.57 40.88 54.81Q42.06 55.05 43.55 55.05Q44.63 55.05 45.71 54.82Q46.8 54.58 47.74 54.07Q48.67 53.57 49.22 52.74Q49.76 51.92 49.76 50.75Q49.76 49.59 48.81 48.74Q47.86 47.89 46.22 47.24Q44.58 46.6 42.55 46.01Q40.52 45.41 38.35 44.75Q36.03 44.02 33.71 43.04Q31.4 42.07 29.55 40.65Q27.7 39.23 26.6 37.16Q25.5 35.09 25.5 32.2Q25.5 26.71 27.89 23Q30.27 19.29 34.22 17.02Q38.18 14.75 42.88 13.75Q47.59 12.75 52.23 12.75Q56.75 12.75 60.61 13.42Q64.48 14.1 67.36 15.54Q70.24 16.99 71.84 19.31Q73.45 21.63 73.45 24.93Q73.45 25.64 73.35 26.62Q73.25 27.61 72.63 29.62H54.65Q54.94 28.54 55.04 28Q55.13 27.46 55.13 27.06Q55.13 25.91 54.26 25.2Q53.38 24.5 51.27 24.5Q49.46 24.5 48.19 25.05Q46.93 25.59 46.33 26.46Q45.74 27.34 45.74 28.43Q45.74 29.61 46.52 30.47Q47.3 31.33 48.64 32.03Q49.98 32.72 51.73 33.29Q53.47 33.86 55.4 34.44Q57.87 35.15 60.45 36.07Q63.03 36.99 65.2 38.39Q67.37 39.78 68.7 41.85Q70.03 43.92 70.03 46.87Q70.03 51.56 68.09 55.23Q66.14 58.89 62.54 61.47Q58.95 64.05 54.05 65.43Q49.15 66.81 43.24 66.91ZM73.94 66 85.73 13.71H103.02L110.28 30.9Q110.77 31.97 111.29 33.22Q111.8 34.48 112.28 35.76Q112.76 37.04 113.09 38.2L113.58 38.15Q113.91 36.33 114.41 34.15Q114.91 31.97 115.27 30.21L118.93 13.71H136.82L124.95 66H107.64L99.77 48.09Q99.34 46.62 98.72 44.7Q98.09 42.78 97.59 41.27L97.11 41.29Q96.91 42.86 96.5 44.86Q96.1 46.85 95.71 48.31L91.75 66ZM135.14 66 146.93 13.71H188.49L185.72 25.9H163.32L161.14 35.52H179.65L176.91 47.63H158.4L154.23 66ZM183.33 66 195.13 13.71H236.69L233.92 25.9H211.52L209.34 35.52H227.85L225.11 47.63H206.6L202.43 66ZM231.53 66 243.33 13.71H262.49L253.46 53.52H277.73L274.9 66Z';

const SNFFL_WAVE =
  'M-40 44 Q-30.0 40 -20 44 T0 44 T20 44 T40 44 T60 44 T80 44 T100 44 T120 44 T140 44 T160 44 T180 44 T200 44 T220 44 T240 44 T260 44 T280 44 T300 44 T320 44 T340 44';

const SNFFL = {
  data: null,
  colors: null,

  async load() {
    const [data, colors] = await Promise.all([
      fetch('./data.json').then((r) => r.json()),
      fetch('./colors.json').then((r) => r.json()),
    ]);
    this.data = data;
    this.colors = colors;
    return data;
  },

  team(rosterId) {
    return this.data.teams.find((t) => t.rosterId === rosterId);
  },

  color(rosterId) {
    const t = this.team(rosterId);
    return this.colors[t?.userId] || { primary: '#72809f', secondary: '#9aa4bb' };
  },

  // Initials on the manager's color when an avatar fails, per the brief's fallbacks.
  avatarTag(team, className) {
    const c = this.color(team.rosterId);
    const initials = (team.teamName || team.manager).slice(0, 2).toUpperCase();
    const fallback = `this.replaceWith(Object.assign(document.createElement('span'),{className:'${className} snffl-avatar-fallback',textContent:'${initials}',style:'background:${c.primary}'}))`;
    return team.avatarUrl
      ? `<img class="${className}" src="${team.avatarUrl}" alt="" onerror="${fallback}">`
      : `<span class="${className} snffl-avatar-fallback" style="background:${c.primary}">${initials}</span>`;
  },

  // Ported from logos/SnfflWordmark.tsx. Letters use currentColor, so one asset
  // serves both themes. Animation CSS lives in frame.css, not an inline <style>,
  // because the wordmark renders twice per page.
  wordmark(id) {
    const water = `snffl-water-${id}`;
    const clip = `snffl-clip-${id}`;
    const drop = `snffl-drop-${id}`;
    return `
      <svg class="snffl-wordmark-svg" viewBox="0 0 300 130" role="img" aria-label="SNFFL" overflow="visible">
        <defs>
          <linearGradient id="${water}" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#C9EEFF"></stop>
            <stop offset=".45" stop-color="#5BB6F2"></stop>
            <stop offset="1" stop-color="#1F74C9"></stop>
          </linearGradient>
          <clipPath id="${clip}"><path d="${SNFFL_LETTERS}"></path></clipPath>
          <g id="${drop}">
            <path d="M0 -9C2.5 -4 6 -1 6 3.5A6 6 0 0 1 -6 3.5C-6 -1 -2.5 -4 0 -9Z" fill="url(#${water})" stroke="#1F74C9" stroke-width="0.7"></path>
            <ellipse cx="-2" cy="3" rx="1.2" ry="1.9" fill="#FFFFFF" opacity="0.85"></ellipse>
          </g>
        </defs>

        <path d="${SNFFL_LETTERS}" fill="currentColor"></path>

        <g clip-path="url(#${clip})">
          <g class="snffl-wordmark-tilt">
            <g class="snffl-wordmark-wave">
              <path d="${SNFFL_WAVE} L340 110 L-40 110 Z" fill="url(#${water})"></path>
              <path d="${SNFFL_WAVE}" fill="none" stroke="#FFFFFF" stroke-width="2"></path>
            </g>
          </g>
        </g>

        <rect x="24" y="76" width="200" height="7" fill="#E3182D" transform="skewX(-12)"></rect>
        <rect x="236" y="76" width="36" height="7" fill="#E3182D" opacity="0.5" transform="skewX(-12)"></rect>

        <g fill="url(#${water})">
          <path d="M78 62C78 72 76 78 77 84C79 78 82 72 82 62Z"></path>
          <path d="M131 62C131 76 129 84 130 92C132 84 135 76 135 62Z"></path>
        </g>
        <use href="#${drop}" transform="translate(77.5 91) scale(.9)"></use>
        <g transform="translate(130.5 99)">
          <g class="snffl-wordmark-fall"><use href="#${drop}"></use></g>
        </g>
      </svg>`;
  },

  ticker(games) {
    const items = games
      .map((g) => {
        const home = this.team(g.home.rosterId);
        const away = this.team(g.away.rosterId);
        const homeWon = g.winner === g.home.rosterId;
        return `<span class="snffl-ticker-item">
          <span class="${homeWon ? 'snffl-ticker-bad' : 'snffl-ticker-good'}">${away.manager}</span>
          <span class="snffl-ticker-score">${g.away.points.toFixed(2)}</span>
          <span class="snffl-ticker-item-at">at</span>
          <span class="${homeWon ? 'snffl-ticker-good' : 'snffl-ticker-bad'}">${home.manager}</span>
          <span class="snffl-ticker-score">${g.home.points.toFixed(2)}</span>
          <span class="snffl-ticker-item-status">FINAL</span>
        </span>`;
      })
      .join('');
    return items + items; // duplicated so the scroll loops seamlessly
  },

  async nflTicker() {
    const el = document.querySelector('.snffl-ticker-track-nfl');
    if (!el) return;
    try {
      const r = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard');
      const j = await r.json();
      const items = (j.events || [])
        .slice(0, 12)
        .map((e) => {
          const c = e.competitions[0];
          const [a, b] = c.competitors;
          const status = c.status.type.shortDetail;
          return `<span class="snffl-ticker-item">
            <span>${b.team.abbreviation}</span><span class="snffl-ticker-score">${b.score ?? ''}</span>
            <span>${a.team.abbreviation}</span><span class="snffl-ticker-score">${a.score ?? ''}</span>
            <span class="snffl-ticker-item-status">${status}</span>
          </span>`;
        })
        .join('');
      // Degrade quietly if ESPN changes shape, per the brief's fallback rule.
      el.innerHTML = items ? items + items : '<span class="snffl-ticker-item">NFL scores appear during game windows</span>';
    } catch {
      el.innerHTML = '<span class="snffl-ticker-item">NFL scores appear during game windows</span>';
    }
  },

  chrome({ section, sub, week, activeTab }) {
    const tabs = [
      ['Home', 'ph-football', 'index.html'],
      ['Matchups', 'ph-football-helmet', 'matchups.html'],
      ['Feed', 'ph-monitor-play', '#'],
      ['The Rag', 'ph-newspaper-clipping', '#'],
      ['More', 'ph-strategy', '#'],
    ];
    const navLinks = ['Home', 'Matchups', 'Feed', 'The Rag', 'More']
      .map((name, i) => {
        const active = name === activeTab ? ' snffl-desktop-nav-link-active' : '';
        return `<a class="snffl-desktop-nav-link${active}" href="${tabs[i][2]}">${name}</a>`;
      })
      .join('');

    document.body.insertAdjacentHTML(
      'afterbegin',
      `
      <header class="snffl-header">
        <button class="snffl-header-slot" aria-label="Alerts"><i class="ph-duotone ph-siren snffl-header-icon"></i></button>
        ${this.wordmark('phone')}
        <button class="snffl-header-slot snffl-theme-toggle" aria-label="Switch theme"><i class="ph-duotone ph-moon snffl-header-icon"></i></button>
      </header>

      <nav class="snffl-desktop-nav">
        ${this.wordmark('desktop')}
        <div class="snffl-desktop-nav-links">${navLinks}</div>
        <div class="snffl-desktop-nav-actions">
          <button class="snffl-header-slot" aria-label="Alerts"><i class="ph-duotone ph-siren snffl-header-icon"></i></button>
          <button class="snffl-header-slot snffl-theme-toggle" aria-label="Switch theme"><i class="ph-duotone ph-moon snffl-header-icon"></i></button>
        </div>
      </nav>

      <div class="snffl-section-strip">
        <div>
          <span class="snffl-section-strip-name">${section}</span>
          <span class="snffl-section-strip-sub">${sub}</span>
        </div>
        <span class="snffl-week-tag"><span>WEEK ${week}</span></span>
      </div>

      <div class="snffl-ticker-stack">
        <div class="snffl-ticker-row snffl-ticker-row-league">
          <span class="snffl-ticker-tag snffl-ticker-tag-league">LEAGUE</span>
          <div class="snffl-ticker-track snffl-ticker-track-league">${this.ticker(this.data.games)}</div>
        </div>
        <div class="snffl-ticker-row snffl-ticker-row-nfl">
          <span class="snffl-ticker-tag snffl-ticker-tag-nfl">NFL</span>
          <div class="snffl-ticker-track snffl-ticker-track-nfl"></div>
        </div>
      </div>`
    );

    document.body.insertAdjacentHTML(
      'beforeend',
      `<nav class="snffl-tabbar">
        ${tabs
          .map(([label, icon, href]) => {
            const active = label === activeTab;
            return `<a class="snffl-tab${active ? ' snffl-tab-active' : ''}" href="${href}">
              <i class="${active ? 'ph-fill' : 'ph-duotone'} ${icon} snffl-tab-icon"></i>
              <span>${label}</span>
            </a>`;
          })
          .join('')}
      </nav>`
    );

    this.nflTicker();
    this.themeToggle();
  },

  themeToggle() {
    const root = document.documentElement;
    const saved = localStorage.getItem('snffl.theme');
    if (saved) root.dataset.theme = saved;
    const sync = () => {
      const dark = root.dataset.theme
        ? root.dataset.theme === 'dark'
        : matchMedia('(prefers-color-scheme: dark)').matches;
      document.querySelectorAll('.snffl-theme-toggle i').forEach((i) => {
        i.className = `ph-duotone ${dark ? 'ph-sun' : 'ph-moon'} snffl-header-icon`;
      });
    };
    document.querySelectorAll('.snffl-theme-toggle').forEach((btn) =>
      btn.addEventListener('click', () => {
        const dark = root.dataset.theme
          ? root.dataset.theme === 'dark'
          : matchMedia('(prefers-color-scheme: dark)').matches;
        root.dataset.theme = dark ? 'light' : 'dark';
        localStorage.setItem('snffl.theme', root.dataset.theme);
        sync();
      })
    );
    sync();
  },
};
