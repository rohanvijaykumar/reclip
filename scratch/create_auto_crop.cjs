const fs = require('fs');
const b64 = fs.readFileSync('src/assets/logo.png').toString('base64');

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
<canvas id="c"></canvas>
<script>
const img = new Image();
img.onload = () => {
    const c = document.getElementById("c");
    const ctx = c.getContext("2d");
    
    // Draw briefly to find bounding box
    c.width = img.width;
    c.height = img.height;
    ctx.drawImage(img, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, c.width, c.height);
    const data = imageData.data;
    
    let left = c.width, right = 0, top = c.height, bottom = 0;
    
    for (let y = 0; y < c.height; y++) {
        for (let x = 0; x < c.width; x++) {
            const alpha = data[(y * c.width + x) * 4 + 3];
            if (alpha > 0) {
                if (x < left) left = x;
                if (x > right) right = x;
                if (y < top) top = y;
                if (y > bottom) bottom = y;
            }
        }
    }
    
    const width = (right - left) + 1;
    const height = (bottom - top) + 1;
    
    // Resize canvas to exact bounding box (No Padding)
    c.width = width;
    c.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, left, top, width, height, 0, 0, width, height);
    
    document.body.setAttribute('data-ready', 'true');
};
img.src = "data:image/png;base64,${b64}";
</script>
</body>
</html>
`.trim();

fs.writeFileSync('scratch/auto_crop.html', html);
