// Every way the site names a manager, for turning names in prose into links:
// team name, Sleeper handle and first name, each pointing at his roster.

import { firstNameOf } from '../config/managers.ts';
import { teams } from './league.ts';

export type NameEntry = { name: string; rosterId: number };

export function managerNames(): NameEntry[] {
  return teams.flatMap((team) => {
    const names = [team.teamName.trim(), team.manager, firstNameOf(team.rosterId)];
    return names
      .filter((name): name is string => Boolean(name))
      .map((name) => ({ name, rosterId: team.rosterId }));
  });
}
