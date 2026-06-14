export interface GeoLocation {
  name: string;
  kind: 'city' | 'country' | 'site';
  lat: number;
  lon: number;
}

// Curated set of major cities, countries (capital/centroid), and notable space sites.
export const LOCATIONS: GeoLocation[] = [
  // Space / launch sites
  { name: 'Kennedy Space Center', kind: 'site', lat: 28.573, lon: -80.649 },
  { name: 'Baikonur Cosmodrome', kind: 'site', lat: 45.965, lon: 63.305 },
  { name: 'Guiana Space Centre', kind: 'site', lat: 5.169, lon: -52.690 },
  { name: 'Vandenberg SFB', kind: 'site', lat: 34.742, lon: -120.572 },
  { name: 'Jiuquan Launch Center', kind: 'site', lat: 40.958, lon: 100.291 },
  { name: 'Sriharikota (SDSC)', kind: 'site', lat: 13.733, lon: 80.235 },
  { name: 'Tanegashima', kind: 'site', lat: 30.400, lon: 130.969 },
  { name: 'Starbase (Boca Chica)', kind: 'site', lat: 25.997, lon: -97.156 },

  // Cities
  { name: 'New York', kind: 'city', lat: 40.713, lon: -74.006 },
  { name: 'Los Angeles', kind: 'city', lat: 34.052, lon: -118.244 },
  { name: 'London', kind: 'city', lat: 51.507, lon: -0.128 },
  { name: 'Paris', kind: 'city', lat: 48.857, lon: 2.352 },
  { name: 'Berlin', kind: 'city', lat: 52.520, lon: 13.405 },
  { name: 'Moscow', kind: 'city', lat: 55.756, lon: 37.617 },
  { name: 'Tokyo', kind: 'city', lat: 35.690, lon: 139.692 },
  { name: 'Beijing', kind: 'city', lat: 39.904, lon: 116.407 },
  { name: 'Shanghai', kind: 'city', lat: 31.230, lon: 121.474 },
  { name: 'Delhi', kind: 'city', lat: 28.614, lon: 77.209 },
  { name: 'Mumbai', kind: 'city', lat: 19.076, lon: 72.878 },
  { name: 'Bengaluru', kind: 'city', lat: 12.972, lon: 77.595 },
  { name: 'Singapore', kind: 'city', lat: 1.352, lon: 103.820 },
  { name: 'Sydney', kind: 'city', lat: -33.869, lon: 151.209 },
  { name: 'Dubai', kind: 'city', lat: 25.205, lon: 55.271 },
  { name: 'São Paulo', kind: 'city', lat: -23.551, lon: -46.633 },
  { name: 'Rio de Janeiro', kind: 'city', lat: -22.907, lon: -43.173 },
  { name: 'Cape Town', kind: 'city', lat: -33.925, lon: 18.424 },
  { name: 'Cairo', kind: 'city', lat: 30.044, lon: 31.236 },
  { name: 'Lagos', kind: 'city', lat: 6.524, lon: 3.380 },
  { name: 'Mexico City', kind: 'city', lat: 19.433, lon: -99.133 },
  { name: 'Toronto', kind: 'city', lat: 43.653, lon: -79.383 },
  { name: 'Chicago', kind: 'city', lat: 41.878, lon: -87.630 },
  { name: 'San Francisco', kind: 'city', lat: 37.775, lon: -122.419 },
  { name: 'Seattle', kind: 'city', lat: 47.606, lon: -122.332 },
  { name: 'Miami', kind: 'city', lat: 25.762, lon: -80.192 },
  { name: 'Reykjavik', kind: 'city', lat: 64.147, lon: -21.942 },
  { name: 'Istanbul', kind: 'city', lat: 41.008, lon: 28.978 },
  { name: 'Seoul', kind: 'city', lat: 37.567, lon: 126.978 },
  { name: 'Jakarta', kind: 'city', lat: -6.208, lon: 106.846 },
  { name: 'Bangkok', kind: 'city', lat: 13.756, lon: 100.502 },
  { name: 'Buenos Aires', kind: 'city', lat: -34.604, lon: -58.382 },
  { name: 'Nairobi', kind: 'city', lat: -1.292, lon: 36.822 },
  { name: 'Honolulu', kind: 'city', lat: 21.307, lon: -157.858 },
  { name: 'Anchorage', kind: 'city', lat: 61.218, lon: -149.900 },

  // Countries (approx centroid)
  { name: 'United States', kind: 'country', lat: 39.5, lon: -98.35 },
  { name: 'Canada', kind: 'country', lat: 56.13, lon: -106.35 },
  { name: 'Brazil', kind: 'country', lat: -14.24, lon: -51.93 },
  { name: 'United Kingdom', kind: 'country', lat: 54.0, lon: -2.0 },
  { name: 'France', kind: 'country', lat: 46.6, lon: 2.2 },
  { name: 'Germany', kind: 'country', lat: 51.17, lon: 10.45 },
  { name: 'Russia', kind: 'country', lat: 61.52, lon: 105.32 },
  { name: 'China', kind: 'country', lat: 35.86, lon: 104.20 },
  { name: 'India', kind: 'country', lat: 20.59, lon: 78.96 },
  { name: 'Japan', kind: 'country', lat: 36.20, lon: 138.25 },
  { name: 'Australia', kind: 'country', lat: -25.27, lon: 133.78 },
  { name: 'South Africa', kind: 'country', lat: -30.56, lon: 22.94 },
  { name: 'Egypt', kind: 'country', lat: 26.82, lon: 30.80 },
  { name: 'Indonesia', kind: 'country', lat: -0.79, lon: 113.92 },
  { name: 'Antarctica', kind: 'country', lat: -82.0, lon: 0.0 },
  { name: 'Greenland', kind: 'country', lat: 71.71, lon: -42.60 },
];

export function searchLocations(query: string): GeoLocation[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return LOCATIONS.filter((l) => l.name.toLowerCase().includes(q)).slice(0, 8);
}

// Parse "lat, lon" or "lat lon" free-form input.
export function parseLatLon(input: string): GeoLocation | null {
  const m = input.trim().match(/^(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lon = parseFloat(m[2]);
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { name: `${lat.toFixed(2)}, ${lon.toFixed(2)}`, kind: 'site', lat, lon };
}
