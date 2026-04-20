const fs = require('fs');
const pngPath = 'C:\\Users\\91974\\.gemini\\antigravity\\brain\\10f09ef5-4e76-49e0-89bf-f003bff7a1cc\\declyp_master_icon_gold_large_glow_squircle_final_1776696626382.png';

const data = fs.readFileSync(pngPath);
const b64 = data.toString('base64');

// High-fidelity squircle path for 1024x1024
// Margin: 100px. Box: 824x824. Radius: 180px.
const svg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <clipPath id="s">
    <rect x="100" y="100" width="824" height="824" rx="180" />
  </clipPath>
  <image href="data:image/png;base64,${b64}" width="1024" height="1024" clip-path="url(#s)" />
</svg>
`.trim();

fs.writeFileSync('master_icon.svg', svg, 'utf8');
console.log('Created master_icon.svg (UTF-8)');
