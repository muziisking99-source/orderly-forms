import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const src = path.join("public", "golden-fresh-logo.png");
const outDir = path.join("public", "icons");
fs.mkdirSync(outDir, { recursive: true });

const navy = { r: 11, g: 31, b: 58, alpha: 1 };

async function make(size, name) {
  const logoSize = Math.round(size * 0.62);
  const logo = await sharp(src)
    .resize(logoSize, logoSize, { fit: "contain", background: navy })
    .png()
    .toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: navy },
  })
    .composite([{ input: logo, gravity: "centre" }])
    .png()
    .toFile(path.join(outDir, name));
}

await make(192, "icon-192.png");
await make(512, "icon-512.png");
await make(180, "apple-touch-icon.png");
console.log("PWA icons generated");
