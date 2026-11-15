// Bản thử: đọc location từ file mẫu.
// Khi backend sẵn sàng, thay nội dung hàm này bằng lời gọi API.
export async function searchLocation(address, signal) {
  if (!address.trim()) {
    throw new Error('Please enter an address.')
  }

  const response = await fetch(
    `${import.meta.env.BASE_URL}FReport_Multiple_disease.json`,
    { signal }
  )

  if (!response.ok) {
    throw new Error('Could not load sample-report.json.')
  }

  const report = await response.json()
  const location = report.location

  if (
    !location ||
    !Number.isFinite(location.lat) ||
    !Number.isFinite(location.lon) ||
    Math.abs(location.lat) > 90 ||
    Math.abs(location.lon) > 180
  ) {
    throw new Error('The sample report contains invalid coordinates.')
  }

  return {
    name: location.name || 'Sample location',
    lat: location.lat,
    lon: location.lon,
  }
}