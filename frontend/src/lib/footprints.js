const KM_PER_DEG = 111.32

// What each NASA dataset actually covers around an address. Grid geometry, not data:
// MERRA-2 cells are 0.5° × 0.625° centred on multiples of those; OMI NO2 cells are 0.25°;
// fires are counted within 50 km; MODIS surface heat uses a 3 × 3 km box against an 11 × 11 km box.
export function footprints(lat, lon) {
  const mLat = Math.round(lat / 0.5) * 0.5
  const mLon = -180 + Math.round((lon + 180) / 0.625) * 0.625
  const nLat = Math.floor(lat / 0.25) * 0.25
  const nLon = Math.floor(lon / 0.25) * 0.25
  const box = (km) => {
    const dLat = km / 2 / KM_PER_DEG
    const dLon = km / 2 / (KM_PER_DEG * Math.cos((lat * Math.PI) / 180))
    return [[lat - dLat, lon - dLon], [lat + dLat, lon + dLon]]
  }
  return [
    { key: 'power', color: '--accent', label: 'Heat, cold, rain, humidity and PM2.5: one ~50 km grid cell (MERRA-2)', rect: [[mLat - 0.25, mLon - 0.3125], [mLat + 0.25, mLon + 0.3125]] },
    { key: 'no2', color: '--falling', label: 'NO₂: one ~25 km grid cell (OMI)', rect: [[nLat, nLon], [nLat + 0.25, nLon + 0.25]] },
    { key: 'fires', color: '--compare', label: 'Fire detections: counted within 50 km', circle: 50000, dashed: true },
    { key: 'heat', color: '--ink', label: 'Surface heat: 3 × 3 km around the address, compared with 11 × 11 km', rect: box(3), outer: box(11) },
  ]
}
