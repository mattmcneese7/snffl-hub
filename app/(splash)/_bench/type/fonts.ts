import { Encode_Sans, Google_Sans_Flex, Recursive } from 'next/font/google';

/**
 * Type options, round 3: new faces, each tuned into a house cut on its own
 * variable axes. preload is off on every face, so an option only downloads
 * what its own CSS uses.
 */

// A. Recursive, Linear cut: casual axis held at 0, the MONO axis at 0 for words
// and 1 for figures, so data is monospaced in the same family as the text.
export const recursive = Recursive({
  subsets: ['latin'],
  axes: ['MONO'],
  variable: '--ta-sans',
  preload: false,
});

// B. Google Sans Flex: rounding off, a finer grade, a touch narrow.
export const googleSansFlex = Google_Sans_Flex({
  subsets: ['latin'],
  axes: ['opsz', 'wdth', 'GRAD', 'ROND'],
  variable: '--tb-sans',
  preload: false,
});

// C. Encode Sans: a grotesk with a wide width axis, set semi condensed for
// words and condensed for figures.
export const encodeSans = Encode_Sans({
  subsets: ['latin'],
  axes: ['wdth'],
  variable: '--tc-sans',
  preload: false,
});
