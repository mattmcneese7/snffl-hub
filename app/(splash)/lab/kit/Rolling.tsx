'use client';

import NumberFlow from '@number-flow/react';

/**
 * A number that rolls to its new value digit by digit, the way a broadcast
 * score bug does, instead of snapping. Tabular, so nothing beside it shifts.
 * Two decimals for fantasy points; pass decimals={0} for whole numbers and
 * suffix="%" for percentages.
 */
export default function Rolling({
  value,
  decimals = 2,
  suffix,
  prefix,
  className,
  trend = 0,
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
  /** Spin direction: 1 always up, -1 always down, 0 by the change. */
  trend?: 1 | 0 | -1;
}) {
  return (
    <NumberFlow
      className={className}
      value={value}
      format={{ minimumFractionDigits: decimals, maximumFractionDigits: decimals }}
      suffix={suffix}
      prefix={prefix}
      trend={trend}
      willChange
      style={{ fontVariantNumeric: 'tabular-nums' }}
      spinTiming={{ duration: 700, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }}
    />
  );
}
