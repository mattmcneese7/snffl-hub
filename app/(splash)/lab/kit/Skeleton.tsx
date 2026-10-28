import s from './lab.module.css';

/** A loading stand in, the shape of what is coming, with one slow sheen. */
export function Skeleton({ w = '100%', h = 14, r = 6 }: { w?: number | string; h?: number; r?: number }) {
  return <span className={s.skel} style={{ width: w, height: h, borderRadius: r }} aria-hidden />;
}

/** A widget sized skeleton: head, then rows. */
export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <section className={s.card} aria-busy="true" aria-label="Loading">
      <span className={s.skelHead}>
        <Skeleton w={20} h={20} r={6} />
        <Skeleton w={120} h={15} />
      </span>
      {Array.from({ length: rows }, (_, i) => (
        <span key={i} className={s.skelRow}>
          <Skeleton w={40} h={40} r={20} />
          <span className={s.skelLines}>
            <Skeleton w="70%" h={14} />
            <Skeleton w="45%" h={11} />
          </span>
          <Skeleton w={44} h={17} />
        </span>
      ))}
    </section>
  );
}
