import {
  Caveat_Brush,
  Covered_By_Your_Grace,
  Edu_SA_Hand,
  Just_Another_Hand,
  Mansalva,
  Mynerve,
  Nanum_Pen_Script,
  Nothing_You_Could_Do,
  Playpen_Sans,
  Reenie_Beanie,
  Sedgwick_Ave,
  Shadows_Into_Light_Two,
} from 'next/font/google';

/**
 * Candidates for the handwritten voice, to replace Permanent Marker. Bench
 * only; next/font needs literal options, so each call is written out.
 */

// Fine pen and felt tip.
export const reenie = Reenie_Beanie({ subsets: ['latin'], weight: '400', preload: false, variable: '--h-reenie' });
export const nanumPen = Nanum_Pen_Script({ subsets: ['latin'], weight: '400', preload: false, variable: '--h-nanum' });
export const shadows = Shadows_Into_Light_Two({ subsets: ['latin'], weight: '400', preload: false, variable: '--h-shadows' });
export const nothing = Nothing_You_Could_Do({ subsets: ['latin'], weight: '400', preload: false, variable: '--h-nothing' });
export const covered = Covered_By_Your_Grace({ subsets: ['latin'], weight: '400', preload: false, variable: '--h-covered' });
export const mynerve = Mynerve({ subsets: ['latin'], weight: '400', preload: false, variable: '--h-mynerve' });
export const eduSa = Edu_SA_Hand({ subsets: ['latin'], preload: false, variable: '--h-edusa' });
export const playpen = Playpen_Sans({ subsets: ['latin'], preload: false, variable: '--h-playpen' });

// Marker and brush.
export const caveatBrush = Caveat_Brush({ subsets: ['latin'], weight: '400', preload: false, variable: '--h-caveat' });
export const mansalva = Mansalva({ subsets: ['latin'], weight: '400', preload: false, variable: '--h-mansalva' });
export const sedgwick = Sedgwick_Ave({ subsets: ['latin'], weight: '400', preload: false, variable: '--h-sedgwick' });
export const justAnother = Just_Another_Hand({ subsets: ['latin'], weight: '400', preload: false, variable: '--h-justanother' });

export const allHands = [
  reenie, nanumPen, shadows, nothing, covered, mynerve, eduSa, playpen, caveatBrush, mansalva, sedgwick, justAnother,
]
  .map((f) => f.variable)
  .join(' ');
