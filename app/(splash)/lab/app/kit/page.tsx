import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { ESPN_TEAM_LOGO } from '@/lib/espn';
import { firstNameOf } from '@/config/managers';
import { photosForWeek } from '@/lib/game-photos';
import { teams } from '@/lib/league';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { getV4Data } from '../data';
import Shell, { SectionHead } from '../Shell';
import {
  Art,
  Avatar,
  Card,
  Chip,
  Chips,
  Crest,
  Empty,
  Face,
  Hero,
  Label,
  List,
  LiveTag,
  Media,
  Meter,
  Pill,
  Rail,
  Rank,
  Row,
  Section,
  Seg,
  Stats,
  Tag,
  Tile,
  TileRow,
  ui,
} from '../ui';

export const metadata: Metadata = { title: { absolute: 'Kit, Splash' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

function Spec({ children }: { children: string }) {
  return <p className={ui.spec}>{children}</p>;
}

/**
 * The kit: every building block Splash 4.0 pages are made of, in real
 * league data, with the rule each one follows. Pages are rebuilt from these
 * once Matt approves them. Dark follows the phone.
 */
export default async function Kit() {
  const jar = await cookies();
  const mine = parseTeam(jar.get(TEAM_COOKIE)?.value);
  const data = await getV4Data(mine);
  const t = (i: number) => teams[i % teams.length];
  const face = (i: number) => ({ src: t(i).avatarUrl, color: t(i).colors?.primary });
  const who = (i: number) => firstNameOf(t(i).rosterId) ?? t(i).manager;
  const hero = (i: number) => ({ avatar: t(i).avatarUrl, color: t(i).colors?.primary, team: t(i).teamName, manager: who(i) });
  const photo = photosForWeek(data.week - 1)[0] ?? photosForWeek(data.week)[0];

  return (
    <Shell data={data} active="">
      <SectionHead icon="league" word="kit" week={data.week} mine={data.myRoster} back={{ href: '/account', label: 'Account' }} />

      <Section title="Type">
        <Card>
          <div className={ui.scale}>
            {[
              ['38 / 800', <span key="a" style={{ font: '800 38px/1 var(--ui)', fontVariantNumeric: 'tabular-nums' }}>101.30</span>],
              ['24 / 800 italic, the Rag only', <span key="b" className={ui.display}>Taylor Takes the Shart</span>],
              ['18 / 800', <span key="c" style={{ font: '800 18px/1.1 var(--ui)' }}>All Matchups</span>],
              ['15 / 600', <span key="d" className={ui.title}>Ha Ha Ha, Now Heres A Guy</span>],
              ['13 / 400', <span key="e" className={ui.sub}>Jackson &middot; 130.40 points</span>],
              ['11 / 600', <Label key="f">Week 7 Matchup</Label>],
            ].map(([k, v]) => (
              <span key={k as string} className={ui.scaleRow}>
                <Label>{k}</Label>
                {v}
              </span>
            ))}
          </div>
        </Card>
        <Spec>Seven sizes, four weights, one family. A module uses at most three levels: label, primary, secondary. Numbers are 800 and tabular. 11 is the floor.</Spec>
      </Section>

      <Section title="Color">
        <Card>
          <div className={ui.swatches}>
            {[
              ['Paper', 'var(--paper)'],
              ['Card', 'var(--card)'],
              ['Ink', 'var(--ink)'],
              ['Ink 2', 'var(--ink-2)'],
              ['Brand', 'var(--deep)'],
              ['Hero', 'var(--blue)'],
              ['Live', 'var(--live)'],
              ['Gold', 'var(--gold)'],
              ['Win', 'var(--good-bg)'],
              ['Loss', 'var(--bad-bg)'],
              ['Warn', 'var(--warn-bg)'],
              ['Chip', 'var(--chip-bg)'],
            ].map(([n, c]) => (
              <span key={n} className={ui.swatch}>
                <i style={{ background: c }} />
                <Label>{n}</Label>
              </span>
            ))}
          </div>
        </Card>
        <Spec>Blue is brand, action and your game. Gold is awards only. Win, loss and live always carry a letter or a word, never color alone.</Spec>
      </Section>

      <Section title="Space">
        <Card>
          <div className={ui.spaceRow}>
            {[4, 8, 12, 16, 24, 32, 48].map((n) => (
              <span key={n} style={{ display: 'grid', gap: 4, justifyItems: 'center' }}>
                <i style={{ display: 'block', width: 16, height: n, background: 'var(--powder)' }} />
                <Label>{n}</Label>
              </span>
            ))}
          </div>
        </Card>
        <Spec>4 px grid. 16 from the screen, 14 inside every card, sections 24 apart, a title 8 above its content. Rows 52 tall, everything tappable 44.</Spec>
      </Section>

      <Section title="Your Game">
        <Hero
          href="/matchup"
          label="Week 7 Matchup"
          state={<LiveTag text="Q3 4:12" />}
          sides={[
            { ...hero(0), score: '88.80' },
            { ...hero(1), score: '89.32' },
          ]}
          foot={
            <>
              <Meter pct={46} label="46% to win" />
              <span>
                <b>46%</b> to win &middot; Yet to play (2) WR, K
              </span>
            </>
          }
        />
        <Spec>The hero: one per screen, brand blue, your game. Two rows, the score at 38, one status line. The whole card is one tap into the matchup.</Spec>
      </Section>

      <Section title="Lists" action={{ href: '/league', label: 'Standings' }}>
        <List tap>
          {[0, 1, 2].map((i) => (
            <Row
              key={i}
              href={`/managers/${t(i).rosterId}`}
              lead={
                <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Rank n={i + 1} />
                  <Avatar {...face(i)} />
                </span>
              }
              title={t(i).teamName}
              sub={`${who(i)} · 917.64 PF`}
              value={`${6 - i}-${1 + i}`}
              valueSub={`${99 - i * 7}% playoffs`}
            />
          ))}
        </List>
        <Spec>Like items are one card with divided rows, never a grid of boxes. A row: lead, title 15, sub 13, and a value 18 with its own label on the right.</Spec>
        <List>
 <Row data={{ player: '4046' }} lead={<Face id="4046" team="KC" />} label="QB · KC vs LV" title="P. Mahomes" sub="24/31, 286 YD, 3 TD" value="27.44" valueSub="Proj 21.10" />
 <Row data={{ player: '7564' }} lead={<Face id="7564" team="CIN" />} label="WR · CIN @ PIT" title="J. Chase" sub="9 REC, 148 YD, 1 TD" value="29.80" valueSub="Proj 18.40" />
        </List>
        <Spec>Players in rows: the headshot with his club&rsquo;s badge, K. Cousins style names, box score lines as Sleeper prints them, points over projection. A row opens the player sheet.</Spec>
        <List>
          <Row lead={<Art src="/squirt/crown-480.webp" size={56} />} label={<span style={{ color: 'var(--gold)' }}>Manager of the Week</span>} title={t(2).teamName} sub={`${who(2)} · 130.40 points`} />
          <Row lead={<Art src="/squirt/shart-480.webp" size={56} />} label="The Shart" title={t(3).teamName} sub={`${who(3)} · 63.58 points`} />
        </List>
        <Spec>Awards wear Squirt&rsquo;s pose as their art, then the award, the winner and the number that won it. Gold is for Manager of the Week and the champion only; every other award label is neutral.</Spec>
      </Section>

      <Section title="Tiles" action={{ href: '/nfl', label: 'All games' }}>
        <Rail label="NFL games">
          {[
            ['Final', 'NE', 24, 'CHI', 30],
            ['Q4 2:05', 'PIT', 16, 'NO', 10],
            ['Sun 12:00 PM', 'SF', null, 'ATL', null],
          ].map(([head, a, as, h, hs]) => (
            <Tile key={`${a}${h}`} href="/nfl" head={head === 'Q4 2:05' ? <LiveTag text="Q4 2:05" /> : head} label={`${a} at ${h}`}>
              <TileRow crest={<Crest src={ESPN_TEAM_LOGO(a as string)} size={24} />} name={a} value={as as number | null} lost={as != null && (as as number) < (hs as number)} />
              <TileRow crest={<Crest src={ESPN_TEAM_LOGO(h as string)} size={24} />} name={h} value={hs as number | null} lost={hs != null && (hs as number) < (as as number)} />
            </Tile>
          ))}
        </Rail>
        <Spec>A rail only where tiles are secondary and many. Each tile is sized to what it holds, 12 inside, the clock as its label.</Spec>
      </Section>

      <Section title="Media">
        {photo ? <Media src={photo.url} tag={<Tag tone="gold">Shart of the Week</Tag>} /> : null}
        <Spec>Stills and clips at 16:9, corners 20, a tag on the image when it needs one.</Spec>
      </Section>

      <Section title="Controls">
        <Card>
          <Seg label="Feed type" items={[{ label: 'All', href: '/kit', on: true }, { label: 'NFL Clips', href: '/kit?t=nfl' }, { label: 'League', href: '/kit?t=league' }]} />
          <Chips label="Positions">
            <Chip on>All</Chip>
            <Chip>QB</Chip>
            <Chip>RB</Chip>
            <Chip>WR</Chip>
            <Chip>TE</Chip>
          </Chips>
          <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Pill>Full matchup</Pill>
            <Pill kind="secondary">Open Sleeper</Pill>
          </span>
        </Card>
        <Spec>Segments switch a view, chips filter a list, pills act. Every one is 44 to the finger; the chosen one is brand blue.</Spec>
      </Section>

      <Section title="Tags">
        <Card>
          <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <LiveTag />
            <Tag tone="good">Won</Tag>
            <Tag tone="bad">Lost</Tag>
            <Tag tone="warn">Owes a chug</Tag>
            <Tag tone="gold">MOTW W6</Tag>
            <Tag>Proj</Tag>
          </span>
        </Card>
        <Spec>State at a glance, 22 tall, a word in every one.</Spec>
      </Section>

      <Section title="Stats">
        <Card>
          <Stats
            items={[
              { value: '1-6', label: 'Record' },
              { value: '14th', label: 'Seed' },
              { value: '606.5', label: 'Points' },
              { value: '0%', label: 'Playoffs' },
            ]}
          />
        </Card>
        <Spec>Up to four numbers in a card: the value 18, its label under it.</Spec>
      </Section>

      <Section title="Empty">
        <Empty action={{ href: '/account', label: 'Pick your team' }}>Pick your team and your game leads this page.</Empty>
        <Spec>Says what will appear and how to get it. Never a blank card.</Spec>
      </Section>
    </Shell>
  );
}
