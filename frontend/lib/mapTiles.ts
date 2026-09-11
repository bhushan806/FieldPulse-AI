/**
 * Leaflet tile configuration.
 * CARTO basemaps now require an API key (tiles show "API KEY REQUIRED" without one).
 * Prefer a key via NEXT_PUBLIC_CARTO_API_KEY, or a full URL via NEXT_PUBLIC_MAP_TILE_URL.
 * Falls back to OpenStreetMap, which works without a key.
 */
const CARTO_KEY = process.env.NEXT_PUBLIC_CARTO_API_KEY || "";
const CUSTOM_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL || "";

export function getMapTileLayer() {
  if (CUSTOM_URL) {
    return {
      url: CUSTOM_URL,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    };
  }

  if (CARTO_KEY) {
    return {
      url: `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?apikey=${CARTO_KEY}`,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    };
  }

  return {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  };
}
