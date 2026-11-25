// Contrast evaluation helper
function luminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrast(rgb1, rgb2) {
  const l1 = luminance(...rgb1);
  const l2 = luminance(...rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.substring(0, 2), 16),
    parseInt(clean.substring(2, 4), 16),
    parseInt(clean.substring(4, 6), 16),
  ];
}

const white = [255, 255, 255];
const white70 = [255 * 0.7 + 58 * 0.3, 255 * 0.7 + 18 * 0.3, 255 * 0.7 + 6 * 0.3]; // white at 70% over #3A1206
const white80 = [255 * 0.8 + 58 * 0.2, 255 * 0.8 + 18 * 0.2, 255 * 0.8 + 6 * 0.2];
const carnetYellow = hexToRgb('#F5C842');
const bgDarkBrown = hexToRgb('#3A1206');
const bgTerracotta = hexToRgb('#C4451A');
const bgCenterOrange = hexToRgb('#E16722');

console.log('--- Contrast on Dark Brown #3A1206 (Left Column / Auth / Legal / Landing Hero Left) ---');
console.log('White (100%) on #3A1206:', contrast(white, bgDarkBrown).toFixed(2) + ':1');
console.log('White (80%) on #3A1206:', contrast(white80, bgDarkBrown).toFixed(2) + ':1');
console.log('White (70%) on #3A1206:', contrast(white70, bgDarkBrown).toFixed(2) + ':1');
console.log('Carnet Yellow #F5C842 on #3A1206:', contrast(carnetYellow, bgDarkBrown).toFixed(2) + ':1');

console.log('\n--- Contrast on Center Orange #E16722 (Landing Hero Center) ---');
console.log('White (100%) on #E16722:', contrast(white, bgCenterOrange).toFixed(2) + ':1');
console.log('White (80%) on #E16722:', contrast(white80, bgCenterOrange).toFixed(2) + ':1');

console.log('\n--- Contrast on Terracotta #C4451A ---');
console.log('White (100%) on #C4451A:', contrast(white, bgTerracotta).toFixed(2) + ':1');
console.log('Carnet Yellow #F5C842 on #C4451A:', contrast(carnetYellow, bgTerracotta).toFixed(2) + ':1');
