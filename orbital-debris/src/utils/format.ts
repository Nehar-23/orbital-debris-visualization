export function fmtCount(n: number): string {
  return n.toLocaleString('en-US');
}

export function fmtKm(km: number, decimals = 1): string {
  return `${km.toFixed(decimals)} km`;
}

export function fmtDeg(deg: number, decimals = 2): string {
  return `${deg >= 0 ? '+' : ''}${deg.toFixed(decimals)}°`;
}

export function fmtEpoch(date: Date): string {
  return date.toISOString().replace('T', ' ').replace(/\.\d+Z$/, 'Z');
}

export function fmtDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${String(h).padStart(2, '0')}:${mm}:${ss}`;
}

export function fmtFps(fps: number): string {
  return fps.toFixed(1);
}

export function fmtVelocity(kmPerS: number): string {
  return `${kmPerS.toFixed(2)} km/s`;
}
