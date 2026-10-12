/**
 * Switzer for the image renderer. Satori wants real font files (TrueType,
 * not woff2), one per weight, so this reads Fontshare's stylesheet for the
 * three weights the images use, follows each @font-face to its .ttf, and
 * keeps the bytes in memory for the life of the server.
 */
type Weight = 500 | 800 | 900;
export type ImageFont = { name: string; data: ArrayBuffer; weight: Weight; style: 'normal' };

let cache: Promise<ImageFont[]> | null = null;

export function switzer(): Promise<ImageFont[]> {
  cache ??= (async () => {
    const css = await fetch('https://api.fontshare.com/v2/css?f[]=switzer@500,800,900&display=swap', {
      next: { revalidate: 86400 },
    }).then((r) => r.text());
    const faces = css.split('@font-face').slice(1);
    const out: ImageFont[] = [];
    for (const face of faces) {
      const weight = Number(/font-weight:\s*(\d+)/.exec(face)?.[1]) as Weight;
      const ttf = /url\('([^']+\.ttf)'\)/.exec(face)?.[1];
      if (!ttf || ![500, 800, 900].includes(weight)) continue;
      const data = await fetch(ttf.startsWith('//') ? `https:${ttf}` : ttf).then((r) => r.arrayBuffer());
      out.push({ name: 'Switzer', data, weight, style: 'normal' });
    }
    return out;
  })().catch((err) => {
    cache = null;
    throw err;
  });
  return cache;
}
