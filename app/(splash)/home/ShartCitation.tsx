import { firstNameOf } from "@/config/managers";
import Fly from "../_bench/shart/Fly";
import { getShart } from "../_bench/shart/ShartCard";
import { WidgetHead } from "./Widget";
import w from "./widgets.module.css";
import Squirt from "./Squirt";
import cite from "./citation.module.css";
import styles from "./home.module.css";
import soul from "./soul.module.css";

/**
 * Shart of the Week, as a citation: the week's lowest score written up like
 * an official ticket. White card, the charges as a numbered docket, the
 * score as one big number, and a single deep blue stamp with Squirt in it
 * for the sentence. The joke is how seriously it takes itself. The fly
 * still visits.
 */
export default async function ShartCitation() {
  const shart = await getShart();
  if (!shart) return null;
  const { week, slug, side, other, avatarUrl, charges } = shart;
  const name = firstNameOf(side.rosterId) ?? side.manager;

  return (
    <article className={`${cite.ticket} ${w.l}`}>
      <WidgetHead
        icon="toiletPaper"
        title="Shart of the Week"
        href={slug ? `/rag/${week}/${slug}` : undefined}
        more="The story"
      />
      <div className={cite.top}>
        <span className={cite.label}>Citation</span>
        <span className={cite.label}>Week {week}</span>
      </div>

      <div className={cite.issued}>
        <span className={cite.avatar}>
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" />
          ) : null}
        </span>
        <span className={cite.who}>
          <span className={cite.team}>{side.team}</span>
          <span className={styles.sub}>
            {name}, the week&rsquo;s lowest score
          </span>
        </span>
        <span className={cite.score}>{side.points.toFixed(2)}</span>
      </div>
      <p className={cite.lost}>
        Lost to {other.team}, {other.points.toFixed(2)} to{" "}
        {side.points.toFixed(2)}.
      </p>

      <div className={cite.perf} aria-hidden />

      <span className={cite.label}>Charges</span>
      <ol className={cite.charges}>
        {charges.map((c, i) => (
          <li key={i}>
            <span>{c}</span>
          </li>
        ))}
      </ol>

      <div className={cite.perf} aria-hidden />

      <div className={cite.sentence}>
        <span className={cite.label}>Sentence</span>
        <b>One chug</b>
      </div>

      <Stamp />
      <Fly />
    </article>
  );
}

/** The rubber stamp: two rings, the sentence round the edge, Squirt inside. */
function Stamp() {
  return (
    <span className={cite.stamp} aria-hidden>
      <svg viewBox="0 0 100 100" className={cite.stampRing}>
        <circle cx="50" cy="50" r="46" className={cite.ringOuter} />
        <circle cx="50" cy="50" r="28" className={cite.ringInner} />
        <path
          id="shart-stamp-top"
          d="M 18 50 A 32 32 0 0 1 82 50"
          fill="none"
        />
        <path
          id="shart-stamp-bottom"
          d="M 12 50 A 38 38 0 0 0 88 50"
          fill="none"
        />
        <text className={cite.stampText}>
          <textPath
            href="#shart-stamp-top"
            startOffset="50%"
            textAnchor="middle"
          >
            SENTENCED
          </textPath>
        </text>
        <text className={cite.stampText}>
          <textPath
            href="#shart-stamp-bottom"
            startOffset="50%"
            textAnchor="middle"
          >
            ONE CHUG
          </textPath>
        </text>
      </svg>
      <span className={`${soul.stamp} ${cite.stampFace}`}>
        <Squirt mood="gloom" size={40} />
      </span>
    </span>
  );
}
