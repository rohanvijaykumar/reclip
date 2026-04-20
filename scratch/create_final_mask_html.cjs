const fs = require('fs');
const b64 = fs.readFileSync('gold_master_b64.txt', 'utf8').trim();

const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { margin: 0; padding: 0; background: transparent; overflow: hidden; }
        canvas { display: block; background: transparent; }
    </style>
</head>
<body>
<canvas id="c" width="824" height="824"></canvas>
<script>
const c = document.getElementById("c");
const ctx = c.getContext("2d");
const img = new Image();

img.onload = () => {
    const s = 824;
    const r = 180;
    
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(s - r, 0);
    ctx.quadraticCurveTo(s, 0, s, r);
    ctx.lineTo(s, s - r);
    ctx.quadraticCurveTo(s, s, s - r, s);
    ctx.lineTo(r, s);
    ctx.quadraticCurveTo(0, s, 0, s - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
    ctx.clip();
    
    ctx.drawImage(img, -100, -100, 1024, 1024);
    
    document.body.setAttribute('data-ready', 'true');
};
img.src = "data:image/png;base64,${b64}";
</script>
</body>
</html>
`.trim();

fs.writeFileSync('scratch/mask_gold_final.html', html);
console.log('Successfully created scratch/mask_gold_final.html');
