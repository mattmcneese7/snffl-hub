'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Mx } from './modules/icons';
import m from './modules/modules.module.css';
import { Frame, SkCard, SkChips, SkList, SkRail, SkStatus, SkTitle } from './Skeleton';

/**
 * Every 4.0 route's loading state, picked by the address. A hard load shows
 * the outermost loading boundary (this folder's) while every page under it
 * renders, so one boundary has to know which page is coming: League's
 * placeholders and League's tab, not Home's. Each segment's loading.tsx is
 * this same component, so client navigations land on the same shapes.
 */
const ROUTES: [RegExp, () => ReactNode][] = [
  [
    /^\/lab\/app\/?$/,
    () => (
      <Frame active="home">
        <SkStatus what="home" />
        <SkTitle link />
        <SkRail n={3} w={150} h={176} />
        <SkTitle />
        <SkCard h={64} />
        <SkCard h={514} />
        <SkTitle />
        <SkList rows={5} h={84} />
      </Frame>
    ),
  ],
  [
    /^\/lab\/app\/scores(\/\d+)?$/,
    () => (
      <Frame active="scores" icon="football" word="scores">
        <SkStatus what="scores" />
        <SkChips n={6} w={70} />
        <SkCard h={314} blue />
        <SkTitle />
        <SkList rows={5} h={120} />
      </Frame>
    ),
  ],
  [
    /^\/lab\/app\/matchup$/,
    () => (
      <Frame active="scores" icon="football" word="scores" back={{ href: '/lab/app/scores', label: 'Scores' }}>
        <SkStatus what="the matchup" />
        <SkCard h={165} blue />
        <SkTitle />
        <SkList rows={8} h={92} />
      </Frame>
    ),
  ],
  [
    /^\/lab\/app\/nfl$/,
    () => (
      <Frame active="scores" icon="football" word="nfl" back={{ href: '/lab/app/scores', label: 'Scores' }}>
        <SkStatus what="the NFL slate" />
        <SkChips n={6} w={70} />
        <SkTitle />
        <SkCard h={190} />
        <SkCard h={190} />
        <SkCard h={190} />
      </Frame>
    ),
  ],
  [
    /^\/lab\/app\/nfl\/[^\/]+$/,
    () => (
      <Frame active="scores" icon="football" word="nfl" back={{ href: '/lab/app/nfl', label: 'NFL' }}>
        <SkStatus what="the game" />
        <SkCard h={385} />
        <SkTitle />
        <SkCard h={190} />
        <SkTitle />
        <SkCard h={241} />
      </Frame>
    ),
  ],
  [
    /^\/lab\/app\/rag\/\d+\/[^\/]+$/,
    () => (
      <Frame active="rag" icon="rag" word="the rag">
        <SkStatus what="the story" />
        <SkCard h={720} />
      </Frame>
    ),
  ],
  [
    /^\/lab\/app\/rag(\/\d+)?$/,
    () => (
      <Frame active="rag" icon="rag" word="the rag">
        <SkStatus what="the Rag" />
        <SkChips n={6} w={60} rows={2} />
        <SkCard h={375} />
        <SkTitle />
        <SkList rows={6} h={72} round={false} />
      </Frame>
    ),
  ],
  [
    /^\/lab\/app\/league$/,
    () => (
      <Frame active="league" icon="league" word="league">
        <SkStatus what="the league" />
        <SkChips n={9} w={70} rows={3} />
        <SkTitle link />
        <SkList rows={14} h={62} />
      </Frame>
    ),
  ],
  [
    /^\/lab\/app\/league\/bracket$/,
    () => (
      <Frame active="league" icon="trophy" word="bracket" back={{ href: '/lab/app/league', label: 'League' }}>
        <SkStatus what="the bracket" />
        <SkTitle w={200} />
        <SkCard h={100} />
        <SkCard h={100} />
        <SkCard h={100} />
      </Frame>
    ),
  ],
  [
    /^\/lab\/app\/rules$/,
    () => (
      <Frame active="league" icon="league" word="rules" back={{ href: '/lab/app/league', label: 'League' }}>
        <SkStatus what="the rules" />
        <SkCard h={486} />
        <SkTitle />
        <SkCard h={254} />
        <SkTitle />
        <SkCard h={577} />
      </Frame>
    ),
  ],
  [
    /^\/lab\/app\/swami$/,
    () => (
      <Frame active="swami" icon="swami" word="swami">
        <SkStatus what="Swami" />
        <SkCard h={60} />
        <SkCard h={60} />
        <SkTitle />
        <SkChips n={6} w={56} rows={2} />
        <SkList rows={10} h={64} round={false} />
      </Frame>
    ),
  ],
  [
    /^\/lab\/app\/account$/,
    () => (
      <Frame active="" icon="account" word="account">
        <SkStatus what="your account" />
        <SkCard h={72} />
        <SkCard h={420} />
        <SkCard h={300} />
      </Frame>
    ),
  ],
  [
    /^\/lab\/app\/players$/,
    () => (
      <Frame active="league" icon="groups" word="players" back={{ href: '/lab/app/league', label: 'League' }}>
        <SkStatus what="players" />
        <SkCard h={300} />
        <SkTitle />
        <SkList rows={10} h={64} round={false} />
      </Frame>
    ),
  ],
  [
    /^\/lab\/app\/players\/[^\/]+$/,
    () => (
      <Frame active="league" icon="person" word="player" back={{ href: '/lab/app/players', label: 'Players' }}>
        <SkStatus what="the player" />
        <SkCard h={302} />
        <SkTitle />
        <SkCard h={287} />
        <SkTitle />
        <SkCard h={306} />
      </Frame>
    ),
  ],
  [
    /^\/lab\/app\/managers$/,
    () => (
      <Frame active="league" icon="groups" word="managers" back={{ href: '/lab/app/league', label: 'League' }}>
        <SkStatus what="managers" />
        <SkList rows={14} h={70} />
      </Frame>
    ),
  ],
  [
    /^\/lab\/app\/managers\/[^\/]+$/,
    () => (
      <Frame active="league" icon="person" word="manager" back={{ href: '/lab/app/managers', label: 'Managers' }}>
        <SkStatus what="the manager" />
        <SkCard h={152} />
        <SkTitle />
        <SkCard h={122} />
        <SkTitle />
        <SkCard h={116} />
        <SkTitle />
        <SkList rows={9} h={78} round={false} />
      </Frame>
    ),
  ],
  [
    /^\/lab\/app\/feed$/,
    () => (
      <Frame active="home" icon={<Mx name="feed" className={m.secIcon} />} word="feed" back={{ href: '/lab/app', label: 'Home' }}>
        <SkStatus what="the feed" />
        <SkTitle />
        <SkRail n={5} w={64} h={64} round />
        <SkTitle />
        <SkList rows={7} h={72} />
      </Frame>
    ),
  ],
  [
    /^\/lab\/app\/trophies$/,
    () => (
      <Frame active="league" icon="trophy" word="trophies" back={{ href: '/lab/app/league', label: 'League' }}>
        <SkStatus what="the trophy case" />
        <SkTitle />
        <SkCard h={685} />
      </Frame>
    ),
  ],
  [
    /^\/lab\/app\/chug$/,
    () => (
      <Frame active="league" icon={<Mx name="beer" className={m.secIcon} />} word="chug" back={{ href: '/lab/app/league', label: 'League' }}>
        <SkStatus what="the Chug Meter" />
        <SkTitle />
        <SkList rows={12} h={66} />
      </Frame>
    ),
  ],
  [
    /^\/lab\/app\/trades$/,
    () => (
      <Frame active="league" icon={<Mx name="swap" className={m.secIcon} />} word="trades" back={{ href: '/lab/app/league', label: 'League' }}>
        <SkStatus what="trades" />
        <SkTitle />
        <SkCard h={180} />
      </Frame>
    ),
  ],
  [
    /^\/lab\/app\/insights$/,
    () => (
      <Frame active="league" icon={<Mx name="insights" className={m.secIcon} />} word="insights" back={{ href: '/lab/app/league', label: 'League' }}>
        <SkStatus what="insights" />
        <SkTitle />
        <SkList rows={10} h={72} />
      </Frame>
    ),
  ],
  [
    /^\/lab\/app\/my-team$/,
    () => (
      <Frame active="" icon={<Mx name="person" className={m.secIcon} />} word="my team" back={{ href: '/lab/app/account', label: 'Account' }}>
        <SkStatus what="your team" />
        <SkCard h={154} blue />
        <SkTitle link />
        <SkList rows={12} h={70} round={false} />
      </Frame>
    ),
  ],
];

export default function RouteSkeleton() {
  const path = (usePathname() ?? '/lab/app').replace(/\/$/, '') || '/lab/app';
  const hit = ROUTES.find(([rx]) => rx.test(path));
  return <>{(hit ?? ROUTES[0])[1]()}</>;
}
