// Generates the placeholder portrait SVGs in /public/portraits. Run: node scripts/make-portraits.mjs
import { writeFileSync } from "node:fs";

const people = {
  aristotle: ["Aristotle", "#c9a46a", "beard"],
  plato: ["Plato", "#b8a3d6", "beard"],
  socrates: ["Socrates", "#e7d9b8", "beard"],
  diogenes: ["Diogenes", "#9c8a6a", "beard"],
  epicurus: ["Epicurus", "#8fb98a", "curls"],
  heraclitus: ["Heraclitus", "#d08a5b", "hair"],
  pythagoras: ["Pythagoras", "#e6c75a", "cap"],
  epictetus: ["Epictetus", "#a35b5b", "beard"],
  hypatia: ["Hypatia", "#7fb2d9", "bun"],
  thucydides: ["Thucydides", "#7f9bb3", "laurel"],
};

const initials = (name) =>
  name.replace(/^(The|Prof\.)\s+/, "").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

const extras = {
  beard: `<path d="M206 250 q50 70 100 0 q-8 55 -50 62 q-42 -7 -50 -62z" fill="#0f0c0a" opacity=".55"/>`,
  laurel: Array.from({ length: 7 }, (_, i) => {
    const a = (-150 + i * 20) * (Math.PI / 180);
    const x = 256 + Math.cos(a) * 92, y = 200 + Math.sin(a) * 92;
    return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="13" ry="6" transform="rotate(${(-150 + i * 20 + 90).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="#9aa25a"/>`;
  }).join(""),
  turtleneck: `<rect x="216" y="290" width="80" height="40" rx="14" fill="#0b0908"/>`,
  glasses: `<g fill="none" stroke="#e8dcc4" stroke-width="5" opacity=".75"><circle cx="232" cy="212" r="18"/><circle cx="280" cy="212" r="18"/><path d="M250 212h12"/></g>`,
  hair: `<path d="M168 210 q0 -100 88 -100 q88 0 88 100 q-10 -60 -88 -62 q-78 2 -88 62z" fill="#0f0c0a" opacity=".6"/>`,
  curls: `<g fill="#0f0c0a" opacity=".55">${[180, 205, 230, 256, 282, 307, 332].map((x, i) => `<circle cx="${x}" cy="${140 + Math.abs(3 - i) * 10}" r="22"/>`).join("")}</g>`,
  cap: `<path d="M178 160 q78 -70 156 0 l-6 18 q-72 -40 -144 0z" fill="#3a1414"/>`,
  bun: `<circle cx="256" cy="110" r="32" fill="#d9d0c4" opacity=".85"/><path d="M176 205 q0 -90 80 -92 q80 2 80 92 q-20 -50 -80 -52 q-60 2 -80 52z" fill="#d9d0c4" opacity=".7"/>`,
};

for (const [id, [name, color, extra]] of Object.entries(people)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="bg" cx="50%" cy="38%" r="70%">
      <stop offset="0%" stop-color="${color}" stop-opacity=".95"/>
      <stop offset="55%" stop-color="${color}" stop-opacity=".45"/>
      <stop offset="100%" stop-color="#1a1512"/>
    </radialGradient>
    <linearGradient id="bust" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2a221c"/>
      <stop offset="100%" stop-color="#120e0b"/>
    </linearGradient>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .08 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <path d="M86 512 q10 -150 170 -170 q160 20 170 170z" fill="url(#bust)"/>
  <ellipse cx="256" cy="215" rx="82" ry="98" fill="url(#bust)"/>
  ${extras[extra] ?? ""}
  <text x="256" y="408" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="58" font-weight="700" fill="#f2e8d5" opacity=".92" letter-spacing="4">${initials(name)}</text>
  <rect width="512" height="512" filter="url(#grain)" opacity=".9"/>
</svg>
`;
  writeFileSync(new URL(`../public/portraits/${id}.svg`, import.meta.url), svg);
}
console.log("wrote", Object.keys(people).length, "portraits");
