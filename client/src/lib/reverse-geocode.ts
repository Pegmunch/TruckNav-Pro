export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json` );
    const data = await res.json();
    return data.display_name ?? formatCoordinatesAsAddress(lat, lon);
  } catch {
    return formatCoordinatesAsAddress(lat, lon);
  }
}
export function formatCoordinatesAsAddress(lat: number, lon: number): string {
  return `${Math.abs(lat).toFixed(5)}${lat >= 0 ? "N" : "S"}, ${Math.abs(lon).toFixed(5)}${lon >= 0 ? "E" : "W"}`;
}
