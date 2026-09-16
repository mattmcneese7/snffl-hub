// Sleeper id to ESPN id mapping, used for player cutout art.
// Public, free, and only read by the nightly job, so this is node side only.

const SOURCE =
  'https://raw.githubusercontent.com/dynastyprocess/data/master/files/db_playerids.csv';

export type IdMap = Record<string, string>;

/** Minimal CSV reader. The source has quoted fields but no embedded newlines. */
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split('\n').filter((l) => l.trim());
  if (!lines.length) return [];

  const split = (line: string) => {
    const cells: string[] = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (quoted && line[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = !quoted;
      } else if (ch === ',' && !quoted) {
        cells.push(cell);
        cell = '';
      } else cell += ch;
    }
    cells.push(cell);
    return cells;
  };

  const headers = split(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = split(line);
    return Object.fromEntries(headers.map((h, i) => [h, (cells[i] ?? '').trim()]));
  });
}

/**
 * Returns { sleeperId: espnId }. Rows missing either id are skipped, so a
 * shifting upstream schema degrades to a smaller map rather than throwing.
 */
export async function getSleeperToEspn(): Promise<IdMap> {
  try {
    const res = await fetch(SOURCE);
    if (!res.ok) return {};
    const rows = parseCsv(await res.text());

    const map: IdMap = {};
    for (const row of rows) {
      const sleeper = row.sleeper_id;
      const espn = row.espn_id;
      if (sleeper && espn) map[sleeper] = espn;
    }
    return map;
  } catch {
    // Player pages fall back to the Sleeper headshot when this is empty.
    return {};
  }
}
