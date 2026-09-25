// Renders PWA icons from public/icons/icon.svg. Run: node scripts/generate-icons.mjs
import sharp from "sharp";
import { readFile } from "node:fs/promises";

const svg = await readFile("public/icons/icon.svg");
const out = (name) => `public/icons/${name}`;

for (const size of [192, 512]) {
  await sharp(svg).resize(size, size).png().toFile(out(`icon-${size}.png`));
}
await sharp(svg).resize(180, 180).png().toFile(out("apple-touch-icon.png"));

// Maskable: full-bleed background with the glyph inside the 80% safe zone.
const inner = await sharp(svg).resize(410, 410).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: "#171717" } })
  .composite([{ input: inner, gravity: "center" }])
  .png()
  .toFile(out("maskable-512.png"));

// Monochrome badge for Android notifications.
const badgeSvg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="#fff" d="M256 64c20 128 64 172 192 192-128 20-172 64-192 192-20-128-64-172-192-192 128-20 172-64 192-192z"/></svg>`
);
await sharp(badgeSvg).resize(96, 96).png().toFile(out("badge-96.png"));
console.log("icons written");
