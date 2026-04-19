// server/utils/quality.ts

interface ListingData {
  title?: string;
  description?: string;
  image_url?: string;
  attributes?: string;
  price?: number;
  location?: string;
}

export function calculateQualityScore(data: ListingData): number {
  let score = 0;

  // Virsraksts (0-25 punkti)
  const titleLen = (data.title || '').length;
  if (titleLen >= 10) score += 10;
  if (titleLen >= 20) score += 10;
  if (titleLen >= 40) score += 5;

  // Apraksts (0-30 punkti)
  const descLen = (data.description || '').length;
  if (descLen >= 50) score += 10;
  if (descLen >= 150) score += 10;
  if (descLen >= 300) score += 10;

  // Foto (0-25 punkti)
  if (data.image_url) {
    const imageUrls = data.image_url.split(',').filter(Boolean);
    if (imageUrls.length >= 1) score += 10;
    if (imageUrls.length >= 3) score += 10;
    if (imageUrls.length >= 5) score += 5;
  }

  // Atribūti (0-10 punkti)
  if (data.attributes) {
    try {
      const attrs = JSON.parse(data.attributes);
      const filledAttrs = Object.values(attrs).filter(v => v !== null && v !== '' && v !== undefined).length;
      if (filledAttrs >= 2) score += 5;
      if (filledAttrs >= 5) score += 5;
    } catch {}
  }

  // Lokācija (0-5 punkti)
  if (data.location && data.location.length > 2) score += 5;

  // Cena (0-5 punkti)
  if (data.price && data.price > 0) score += 5;

  return Math.min(100, score);
}
