const fs = require('fs');
const path = 'C:\\Users\\91974\\.gemini\\antigravity\\brain\\10f09ef5-4e76-49e0-89bf-f003bff7a1cc\\declyp_master_icon_gold_large_glow_squircle_final_1776696626382.png';

try {
  const data = fs.readFileSync(path);
  const b64 = data.toString('base64');
  
  const svg = `
<svg width="824" height="824" viewBox="100 100 824 824" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="squircle">
      <rect x="100" y="100" width="824" height="824" rx="180" />
    </clipPath>
  </defs>
  <image 
    href="data:image/png;base64,${b64}" 
    width="1024" 
    height="1024" 
    clip-path="url(#squircle)" 
  />
</svg>
  `.trim();

  fs.writeFileSync('master_icon.svg', svg);
  console.log('Successfully created master_icon.svg with embedded Base64');
} catch (err) {
  console.error('Error creating SVG:', err);
  process.exit(1);
}
