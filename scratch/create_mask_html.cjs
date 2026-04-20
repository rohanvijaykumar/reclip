const fs = require('fs');
const b64 = fs.readFileSync('gold_master_b64.txt', 'utf8').trim();

const html = `
<!DOCTYPE html>
<html>
<body>
<canvas id="c" width="1024" height="1024"></canvas>
<script>
const c = document.getElementById("c");
const ctx = c.getContext("2d");
const img = new Image();
img.onload = () => {
    // Squircle path approximation
    const s = 1024;
    const p = 100; // Match the Gold Master's padding
    const r = 180;
    
    ctx.beginPath();
    ctx.moveTo(p + r, p);
    ctx.lineTo(p + (s - 2 * p) - r, p);
    ctx.quadraticCurveTo(p + (s - 2 * p), p, p + (s - 2 * p), p + r);
    ctx.lineTo(p + (s - 2 * p), p + (s - 2 * p) - r);
    ctx.quadraticCurveTo(p + (s - 2 * p), p + (s - 2 * p), p + (s - 2 * p) - r, p + (s - 2 * p));
    ctx.lineTo(p + r, p + (s - 2 * p));
    ctx.quadraticCurveTo(p, p + (s - 2 * p), p, p + (s - 2 * p) - r);
    ctx.lineTo(p, p + r);
    ctx.quadraticCurveTo(p, p, p + r, p);
    ctx.closePath();
    ctx.clip();
    
    ctx.drawImage(img, 0, 0, 1024, 1024);
    
    // Log the result
    console.log("RESULT:" + c.toDataURL("image/png"));
};
img.src = "data:image/png;base64,${b64}";
</script>
</body>
</html>
`.trim();

fs.writeFileSync('scratch/mask_gold.html', html);
console.log('Successfully created scratch/mask_gold.html');
