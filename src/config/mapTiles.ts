// Tile serveri — o'z infratuzilmamiz (TileServer GL). API kalit talab qilmaydi.
const TILE_BASE = (import.meta.env.VITE_TILE_BASE_URL || 'https://osm.megago.uz').replace(/\/$/, '')

export const mapTiles = {
  light: {
    name: 'MegaMaps Light',
    url: `${TILE_BASE}/ts/styles/client-light/{z}/{x}/{y}{r}.png`,
    attribution: '&copy; OpenMapTiles &copy; OpenStreetMap contributors',
  },
  dark: {
    name: 'MegaMaps Dark',
    url: `${TILE_BASE}/ts/styles/client-dark/{z}/{x}/{y}{r}.png`,
    attribution: '&copy; OpenMapTiles &copy; OpenStreetMap contributors',
  },
  satellite: {
    name: 'Satellite',
    url: `${TILE_BASE}/ts/data/satellite/{z}/{x}/{y}.jpg`,
    attribution: '&copy; Google',
  },
  osm: {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
} as const

export type MapTileKey = keyof typeof mapTiles
