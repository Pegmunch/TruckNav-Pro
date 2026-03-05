export async function robustGeocode(query: string): Promise<{ lat: number; lon: number; display_name: string } | null> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query )}&format=json&limit=1`);
    const data = await res.json();
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), display_name: data[0].display_name };
    }
    return null;
  } catch {
    return null;
  }
}
