// 1 unit = 1000 km
export const EARTH_RADIUS_KM = 6371;
export const EARTH_RADIUS = 6.371; // scene units

export const SCALE = 1 / 1000; // km → scene units

export const LEO_MIN_KM = 200;
export const LEO_MAX_KM = 2000;
export const MEO_MAX_KM = 35786;
export const GEO_KM = 35786;

export const EARTH_ROTATION_SPEED = 0.005; // rad/s (exaggerated for visual)

export const PROPAGATION_INTERVAL_MS = 100;
export const TLE_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
export const TLE_STALE_WARN_DAYS = 14;

export const CAMERA_INTRO_END = 4000; // ms
export const IDLE_TIMEOUT_MS = 8000;
