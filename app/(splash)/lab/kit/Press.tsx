'use client';

import { motion, type HTMLMotionProps } from 'motion/react';
import { forwardRef } from 'react';
import { haptic } from './haptics';
import { SPRING } from './motion';

/**
 * Anything tappable in v4: it gives under the finger (scale 0.97 on the snap
 * spring), springs back, and ticks the haptic on release. One press feel
 * across buttons, rows and cards.
 */
const Press = forwardRef<HTMLButtonElement, HTMLMotionProps<'button'> & { feel?: 'tick' | 'thud' | 'none'; depth?: number }>(
  function Press({ feel = 'tick', depth = 0.97, onClick, style, ...rest }, ref) {
    return (
      <motion.button
        ref={ref}
        type="button"
        whileTap={{ scale: depth }}
        transition={SPRING.snap}
        onClick={(e) => {
          if (feel !== 'none') haptic(feel);
          onClick?.(e);
        }}
        style={{ WebkitTapHighlightColor: 'transparent', ...style }}
        {...rest}
      />
    );
  }
);
export default Press;
