/**
 * Generate PWA icons for Reporte Ciudadano
 *
 * This script creates placeholder icons for PWA support.
 * For production, replace with properly designed icons.
 *
 * Usage: node scripts/generate-icons.mjs
 */

import { writeFileSync } from 'fs';

// Simple SVG template with municipality green color
const createSVG = (size) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#1B4332" rx="${size * 0.15}"/>
  <text
    x="50%"
    y="55%"
    dominant-baseline="middle"
    text-anchor="middle"
    font-family="system-ui, -apple-system, sans-serif"
    font-weight="bold"
    font-size="${size * 0.35}"
    fill="white"
  >RC</text>
</svg>`;

// Generate SVG icons
const sizes = [192, 512];

sizes.forEach((size) => {
  const svg = createSVG(size);
  writeFileSync(`public/icon-${size}.svg`, svg);
  console.log(`Created public/icon-${size}.svg`);
});

// Create favicon.svg
writeFileSync('public/favicon.svg', createSVG(32));
console.log('Created public/favicon.svg');

// Try to generate PNG icons using sharp
async function generatePNGs() {
  try {
    const sharp = await import('sharp');

    for (const size of sizes) {
      const svg = createSVG(size);
      await sharp.default(Buffer.from(svg)).png().toFile(`public/icon-${size}.png`);
      console.log(`Created public/icon-${size}.png`);
    }

    // Create Apple touch icon (180x180)
    const appleSVG = createSVG(180);
    await sharp.default(Buffer.from(appleSVG)).png().toFile('public/apple-touch-icon.png');
    console.log('Created public/apple-touch-icon.png');

    // Create favicon.ico from 32x32 PNG
    const faviconSVG = createSVG(32);
    await sharp.default(Buffer.from(faviconSVG)).png().toFile('public/favicon.png');
    console.log('Created public/favicon.png');

    console.log('\nPNG icons generated successfully!');
  } catch (err) {
    console.log('\nNote: Could not generate PNG icons (sharp not available).');
    console.log('SVG icons created. For full PWA support:');
    console.log('1. Run: pnpm approve-builds (select sharp)');
    console.log('2. Run this script again');
    console.log('Or use https://svgtopng.com to convert manually.\n');
  }
}

generatePNGs();
