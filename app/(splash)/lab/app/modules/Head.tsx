import { Account, BackLink, type Back } from '../Shell';
import { Mx, type MxName } from './icons';
import s from '../v4.module.css';
import m from './modules.module.css';

/** ../Shell's SectionHead, for sections whose icon lives in this folder's set. */
export default function XHead({ icon, word, week, mine, back }: { icon: MxName; word: string; week: number; mine: number | null; back?: Back }) {
  return (
    <>
      <div className={s.head}>
        <h1 className={s.secHead}>
          <Mx name={icon} className={m.secIcon} />
          {word}
        </h1>
        <span className={s.headR}>
          <span className={s.wk}>Week {week}</span>
          <Account mine={mine} />
        </span>
      </div>
      <BackLink back={back} />
    </>
  );
}
