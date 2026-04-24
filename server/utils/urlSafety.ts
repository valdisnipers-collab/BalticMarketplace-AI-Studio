// server/utils/urlSafety.ts
//
// Guard against SSRF when the server fetches a URL on behalf of a user.
// Checks both the parsed URL and the resolved DNS answer so an attacker
// cannot point a public hostname at a private IP.

import dns from 'node:dns/promises';
import net from 'node:net';

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata',
  'instance-data',
]);

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = parts;
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local, cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 0) return true;
  if (a >= 224) return true; // multicast + reserved
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === '::1' || normalized === '::') return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true; // fc00::/7
  if (normalized.startsWith('fe80')) return true; // link-local
  if (normalized.startsWith('::ffff:')) {
    const v4 = normalized.slice(7);
    return isPrivateIPv4(v4);
  }
  return false;
}

export interface UrlSafetyOpts {
  allowedProtocols?: string[];
}

/**
 * Returns true if the URL is safe to fetch server-side.
 * Rejects non-https protocols by default, blocked hostnames, and any
 * resolved IP that falls into a private/loopback/link-local range.
 */
export async function isSafeExternalUrl(input: string, opts: UrlSafetyOpts = {}): Promise<boolean> {
  const allowed = opts.allowedProtocols ?? ['https:'];
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return false;
  }

  if (!allowed.includes(url.protocol)) return false;

  const host = url.hostname.toLowerCase();
  if (!host) return false;
  if (BLOCKED_HOSTNAMES.has(host)) return false;

  // Literal IPs in the URL
  if (net.isIP(host)) {
    if (net.isIPv4(host) && isPrivateIPv4(host)) return false;
    if (net.isIPv6(host) && isPrivateIPv6(host)) return false;
    return true;
  }

  // DNS lookup: block if ANY resolved address is private
  try {
    const addresses = await dns.lookup(host, { all: true });
    for (const a of addresses) {
      if (a.family === 4 && isPrivateIPv4(a.address)) return false;
      if (a.family === 6 && isPrivateIPv6(a.address)) return false;
    }
  } catch {
    return false;
  }

  return true;
}
