// Shared chrome and data loading for the Checkpoint 2 style frame.
// Real Sleeper data, rendered at runtime so markup stays small.

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

  wordmark(id) {
    return `
      <svg class="snffl-wordmark-svg" viewBox="0 0 320 76" role="img" aria-label="SNFFL">
        <defs>
          <clipPath id="snffl-water-clip-${id}">
            <text x="160" y="56" text-anchor="middle" class="snffl-wordmark-text">SNFFL</text>
          </clipPath>
        </defs>
        <path class="snffl-wordmark-fill-stripe" d="M6 66 L40 6 L58 6 L24 66 Z"></path>
        <text x="160" y="56" text-anchor="middle" class="snffl-wordmark-text snffl-wordmark-fill-ink">SNFFL</text>
        <g clip-path="url(#snffl-water-clip-${id})">
          <rect class="snffl-wordmark-fill-water" x="0" y="38" width="320" height="38"></rect>
          <path class="snffl-wordmark-fill-water-deep" d="M0 40 q 20 -6 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 v 8 H0 Z"></path>
        </g>
        <circle class="snffl-wordmark-fill-water" cx="292" cy="20" r="4"></circle>
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
