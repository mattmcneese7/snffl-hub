import {
  Afacad_Flux,
  Anybody,
  Exo_2,
  Geologica,
  Jost,
  Saira,
  Science_Gothic,
  Sora,
  Stack_Sans_Text,
  SUSE,
  Ysabeau_Office,
  Zalando_Sans,
} from 'next/font/google';

/**
 * The faces wall: twelve thin, sleek faces with more character than the
 * standard grotesks, several with unusual axes to cut a house instance from
 * later (sharpness, contrast, extreme width). Bench only.
 */
// next/font needs every option written as a literal, so no shared spread.
export const geologica = Geologica({ subsets: ['latin'], preload: false, axes: ['SHRP'], variable: '--f-geologica' });
export const saira = Saira({ subsets: ['latin'], preload: false, axes: ['wdth'], variable: '--f-saira' });
export const scienceGothic = Science_Gothic({ subsets: ['latin'], preload: false, axes: ['wdth', 'CTRS'], variable: '--f-science' });
export const anybody = Anybody({ subsets: ['latin'], preload: false, axes: ['wdth'], variable: '--f-anybody' });
export const zalando = Zalando_Sans({ subsets: ['latin'], preload: false, axes: ['wdth'], variable: '--f-zalando' });
export const afacad = Afacad_Flux({ subsets: ['latin'], preload: false, variable: '--f-afacad' });
export const stack = Stack_Sans_Text({ subsets: ['latin'], preload: false, variable: '--f-stack' });
export const suse = SUSE({ subsets: ['latin'], preload: false, variable: '--f-suse' });
export const jost = Jost({ subsets: ['latin'], preload: false, variable: '--f-jost' });
export const sora = Sora({ subsets: ['latin'], preload: false, variable: '--f-sora' });
export const exo = Exo_2({ subsets: ['latin'], preload: false, variable: '--f-exo' });
export const ysabeau = Ysabeau_Office({ subsets: ['latin'], preload: false, variable: '--f-ysabeau' });

export const allFaces = [
  geologica, saira, scienceGothic, anybody, zalando, afacad, stack, suse, jost, sora, exo, ysabeau,
]
  .map((f) => f.variable)
  .join(' ');
