'use client';

import { AnimatePresence, motion, useDragControls, type PanInfo } from 'motion/react';
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { haptic } from './haptics';
import { SPRING } from './motion';
import s from './lab.module.css';

/**
 * The bottom sheet: the one surface v4 opens over a page instead of leaving
 * it. It rises on the glide spring, follows the finger from its grabber or
 * its head, and goes when flicked down or pulled past a third of its height.
 * The page behind eases back (scaled, dimmed) so the sheet reads as on top,
 * the way iOS does it. Escape and the scrim close it too.
 */
export default function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const drag = useDragControls();
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    root.dataset.sheetOpen = '';
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', key);
    return () => {
      delete root.dataset.sheetOpen;
      window.removeEventListener('keydown', key);
    };
  }, [open, onClose]);

  const end = (_: unknown, info: PanInfo) => {
    if (info.velocity.y > 500 || info.offset.y > 180) {
      haptic('tick');
      onClose();
    }
  };

  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className={s.sheetLayer} key="sheet">
          <motion.button
            type="button"
            aria-label="Close"
            className={s.sheetScrim}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={s.sheet}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={SPRING.glide}
            drag="y"
            dragListener={false}
            dragControls={drag}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.06, bottom: 0.9 }}
            onDragEnd={end}
          >
            <div className={s.sheetGrab} onPointerDown={(e) => drag.start(e)}>
              <span className={s.grabber} aria-hidden />
              {title ? <div className={s.sheetTitle}>{title}</div> : null}
            </div>
            <div className={s.sheetBody}>{children}</div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
