/** The box score line, as Sleeper prints it. */
export function boxLine(pos: string, l: Record<string, number>): string {
  const out: string[] = [];
  const n = (k: string) => l[k] ?? 0;
  if (pos === 'QB' && n('pass_att')) out.push(`${n('pass_cmp')}/${n('pass_att')} CMP`, `${n('pass_yd')} YD`, ...(n('pass_td') ? [`${n('pass_td')} TD`] : []), ...(n('pass_int') ? [`${n('pass_int')} INT`] : []));
  if (n('rush_att')) out.push(`${n('rush_att')} CAR`, `${n('rush_yd')} YD`, ...(n('rush_td') ? [`${n('rush_td')} TD`] : []));
  if (n('rec_tgt') || n('rec')) out.push(`${n('rec')}/${n('rec_tgt')} REC`, `${n('rec_yd')} YD`, ...(n('rec_td') ? [`${n('rec_td')} TD`] : []));
  if (pos === 'K') out.push(`${n('fgm')}/${n('fga')} FG`, `${n('xpm')}/${n('xpa')} XP`);
  return out.join(', ');
}

