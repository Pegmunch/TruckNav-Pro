export async function geocodeUKPostcode(postcode: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode )}`);
    const data = await res.json();
    if (data.status === 200) {
      return { lat: data.result.latitude, lon: data.result.longitude };
    }
    return null;
  } catch {
    return null;
  }
}
