/**
 * The SquirtRag masthead, from the supplied artwork.
 *
 * Two exports rather than one: the knocked out box is ink on the light theme
 * and paper on the dark one, and an <img> cannot recolor its own contents. CSS
 * shows exactly one of them, keyed to the theme the reader picked.
 *
 * The intrinsic size is the artwork's viewBox, which holds the aspect ratio so
 * the heading does not jump while the file loads.
 */
export default function Masthead() {
  return (
    <span className="snffl-masthead">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="snffl-masthead-art snffl-masthead-art-light"
        src="/squirtrag-masthead-light.svg"
        alt="The SquirtRag"
        width={314}
        height={90}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="snffl-masthead-art snffl-masthead-art-dark"
        src="/squirtrag-masthead-dark.svg"
        alt="The SquirtRag"
        width={314}
        height={90}
      />
    </span>
  );
}
