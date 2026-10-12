import { headers } from 'next/headers';

/**
 * A phone, from the request: the Client Hint when the browser sends one
 * (Chromium does), else the user agent. Tablets count as wide screens: an
 * Android tablet leaves "Mobile" out, and iPadOS Safari reports a Mac.
 */
export async function isPhone(): Promise<boolean> {
  try {
    const h = await headers();
    const hint = h.get('sec-ch-ua-mobile');
    if (hint === '?1') return true;
    if (hint === '?0') return false;
    const ua = h.get('user-agent') ?? '';
    if (/iPad|Tablet/i.test(ua)) return false;
    return /iPhone|iPod|Android.+Mobile|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(ua);
  } catch {
    return false;
  }
}
