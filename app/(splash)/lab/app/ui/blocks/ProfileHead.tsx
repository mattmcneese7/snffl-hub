import type { ReactNode } from 'react';
import u from '../ui.module.css';
import p from './ProfileHead.module.css';

/** The top of a player's or a manager's page: the face, the name at 24/800, one meta line, tags. */
export function ProfileHead({ lead, name, meta, tags }: { lead: ReactNode; name: string; meta?: ReactNode; tags?: ReactNode }) {
  return (
    <div className={p.head}>
      {lead}
      <div className={p.text}>
        <h2 className={p.name}>{name}</h2>
        {meta ? <span className={u.sub}>{meta}</span> : null}
        {tags ? <span className={u.chips}>{tags}</span> : null}
      </div>
    </div>
  );
}
