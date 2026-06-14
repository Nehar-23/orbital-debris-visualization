// Returns classification code: 0=debris, 1=active, 2=rocket body, 3=starlink
export function classify(name: string, forceClass?: 0 | 1 | 2 | 3): 0 | 1 | 2 | 3 {
  if (forceClass !== undefined) return forceClass;
  const n = name.toUpperCase();
  if (n.startsWith('STARLINK')) return 3;
  if (n.includes('DEB') || n.includes('DEBRIS') || n.includes('FRAG') || n.includes('COOLANT')) return 0;
  if (n.includes('R/B') || n.endsWith(' R') || n.includes('ROCKET') || n.includes('AKM') || n.includes('PKM')) return 2;
  return 1; // active satellite
}

export const CLASS_LABELS = ['Debris', 'Active Satellite', 'Rocket Body', 'Starlink'];
export const CLASS_COLORS = ['#707070', '#FFFFFF', '#C8C8C8', '#F0F4FF'];
