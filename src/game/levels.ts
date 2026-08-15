import type { Ctx } from "./sprites";

export type Theme = "amazonas" | "sertao" | "capixaba" | "rocinha";
export type TileType = "brick" | "wood" | "sandbag" | "metal";

export type Mission = {
  id: number;
  theme: Theme;
  code: string;
  name: string;
  region: string;
  brief: string;
  length: number;
  pin: { x: number; y: number };
  colors: { sky: [string, string]; far: string; mid: string; near: string; ground: string };
  tile: TileType;
};

export const MISSIONS: Mission[] = [
  {
    id: 0,
    theme: "amazonas",
    code: "MISSÃO 1",
    name: "OPERAÇÃO SELVA",
    region: "Rio Negro / AM",
    brief: "Mata fechada, rios escuros e barcos-gaiola de madeira.",
    length: 5200,
    pin: { x: 0.33, y: 0.24 },
    colors: {
      sky: ["#1d5a41", "#4d9a63"],
      far: "#2a6b47",
      mid: "#215939",
      near: "#0f2c1e",
      ground: "#2c4a24",
    },
    tile: "wood",
  },
  {
    id: 1,
    theme: "sertao",
    code: "MISSÃO 2",
    name: "OPERAÇÃO SERTÃO",
    region: "Cânions do Xingó / NE",
    brief: "Terra rachada, mandacarus e casas de taipa sob sol escaldante.",
    length: 5600,
    pin: { x: 0.72, y: 0.3 },
    colors: {
      sky: ["#e8a33d", "#f3d27a"],
      far: "#b8703a",
      mid: "#94512b",
      near: "#6d3a1f",
      ground: "#8a4f28",
    },
    tile: "brick",
  },
  {
    id: 2,
    theme: "capixaba",
    code: "MISSÃO 3",
    name: "OPERAÇÃO COSTA CAPIXABA",
    region: "Vitória & Guarapari / ES",
    brief: "Terceira Ponte no horizonte, contêineres e guindastes do porto.",
    length: 6000,
    pin: { x: 0.71, y: 0.62 },
    colors: {
      sky: ["#1e4f7a", "#63b3d6"],
      far: "#2f6f96",
      mid: "#245972",
      near: "#153c52",
      ground: "#6c7a86",
    },
    tile: "metal",
  },
  {
    id: 3,
    theme: "rocinha",
    code: "MISSÃO 4",
    name: "OPERAÇÃO MORRO",
    region: "Favela da Rocinha / RJ",
    brief: "Lajes, caixas d'água, fios emaranhados e o Cristo ao fundo.",
    length: 6400,
    pin: { x: 0.63, y: 0.72 },
    colors: {
      sky: ["#2a2140", "#c86a4e"],
      far: "#4a3a52",
      mid: "#3a2c3f",
      near: "#241c28",
      ground: "#7d5a44",
    },
    tile: "brick",
  },
];

function rnd(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/** Textured platform tiles: rustic brick, natural logs, trench sandbags, rusty metal. */
export function drawTile(ctx: Ctx, x: number, y: number, w: number, h: number, type: TileType) {
  const T = 20;
  const ink = "#100d14";
  if (type === "brick") {
    ctx.fillStyle = "#7d4530";
    ctx.fillRect(x, y, w, h);
    for (let ry = 0; ry < h; ry += 12) {
      for (let rx = (ry / 12) % 2 ? -14 : 0; rx < w; rx += 28) {
        ctx.fillStyle = (rx + ry) % 56 === 0 ? "#a3603f" : "#93553a";
        ctx.fillRect(x + rx + 2, y + ry + 2, 24, 8);
        ctx.fillStyle = "#5d2f1f";
        ctx.fillRect(x + rx + 2, y + ry + 9, 24, 2);
      }
    }
    ctx.fillStyle = "#c98a5f";
    ctx.fillRect(x, y, w, 4);
    ctx.fillStyle = "#e0b183";
    for (let rx = 6; rx < w; rx += 46) ctx.fillRect(x + rx, y + 1, 14, 2);
  } else if (type === "wood") {
    // jungle earth ledge: dirt body, grass crown, root speckles
    ctx.fillStyle = "#6a4526";
    ctx.fillRect(x, y, w, h);
    for (let rx = 0; rx < w; rx += T) {
      ctx.fillStyle = rx % (T * 2) === 0 ? "#7d5430" : "#5c3b20";
      ctx.fillRect(x + rx, y, T - 2, h);
      ctx.fillStyle = "#432a15";
      ctx.fillRect(x + rx + 3, y + 12, T - 8, 3);
      ctx.fillStyle = "#8a6238";
      ctx.fillRect(x + rx + 5, y + 26, 5, 5);
    }
    ctx.fillStyle = "#2f6b32";
    ctx.fillRect(x, y, w, 9);
    ctx.fillStyle = "#4f9c40";
    ctx.fillRect(x, y, w, 4);
    ctx.fillStyle = "#63bd4c";
    for (let rx = 4; rx < w; rx += 18) {
      const t2 = (rx / 18) % 3;
      ctx.fillRect(x + rx, y - 6 - t2 * 2, 3, 7 + t2 * 2);
      ctx.fillRect(x + rx + 6, y - 4, 3, 5);
    }
  } else if (type === "sandbag") {
    ctx.fillStyle = "#8f8256";
    ctx.fillRect(x, y, w, h);
    for (let ry = 0; ry < h; ry += 12) {
      for (let rx = (ry / 12) % 2 ? -14 : 0; rx < w; rx += 28) {
        ctx.fillStyle = "#a3945f";
        ctx.fillRect(x + rx + 2, y + ry + 1, 24, 10);
        ctx.fillStyle = "#6f6440";
        ctx.fillRect(x + rx + 2, y + ry + 9, 24, 2);
      }
    }
  } else {
    ctx.fillStyle = "#5f6a72";
    ctx.fillRect(x, y, w, h);
    for (let rx = 0; rx < w; rx += 32) {
      ctx.fillStyle = "#6f7a83";
      ctx.fillRect(x + rx + 2, y + 2, 28, h - 4);
      ctx.fillStyle = "#8a5a32";
      ctx.fillRect(x + rx + 6, y + h - 10, 12, 5);
      ctx.fillRect(x + rx + 18, y + 14, 6, 8);
      ctx.fillStyle = "#3d454b";
      ctx.fillRect(x + rx + 2, y + h - 3, 28, 3);
      ctx.fillStyle = "#2b3238";
      ctx.fillRect(x + rx + 4, y + 6, 3, 3);
      ctx.fillRect(x + rx + 25, y + 6, 3, 3);
    }
    ctx.fillStyle = "#98a3ab";
    ctx.fillRect(x, y, w, 3);
  }
  // hard ink contour, SNK style
  ctx.fillStyle = ink;
  ctx.fillRect(x, y - 3, w, 3);
  ctx.fillRect(x - 3, y - 3, 3, h + 3);
  ctx.fillRect(x + w, y - 3, 3, h + 3);
  ctx.fillStyle = "#14111855";
  ctx.fillRect(x, y + h - 3, w, 3);
}

function palm(ctx: Ctx, x: number, y: number, s: number, trunk: string, leaf: string) {
  ctx.fillStyle = trunk;
  ctx.fillRect(x - 3 * s, y - 40 * s, 6 * s, 40 * s);
  ctx.fillStyle = leaf;
  for (let i = -3; i <= 3; i++) {
    ctx.fillRect(x - 3 * s + i * 6 * s, y - 44 * s + Math.abs(i) * 3 * s, 8 * s, 4 * s);
  }
  ctx.fillRect(x - 8 * s, y - 48 * s, 16 * s, 5 * s);
}

/** Parallax background layers, unique per Brazilian region. */
export function drawBackground(ctx: Ctx, m: Mission, camX: number, t: number, W: number, H: number) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, m.colors.sky[0]);
  g.addColorStop(1, m.colors.sky[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const horizon = H - 300;

  if (m.theme === "amazonas") {
    ctx.fillStyle = "#ffffff10";
    for (let i = 0; i < 8; i++) {
      const x = ((i * 260 - camX * 0.08) % (W + 400) + W + 400) % (W + 400) - 200;
      ctx.fillRect(x, 90 + (i % 3) * 60, 220, 40);
    }
    // far canopy
    ctx.fillStyle = m.colors.far;
    for (let i = 0; i < 24; i++) {
      const x = ((i * 120 - camX * 0.15) % (W + 300) + W + 300) % (W + 300) - 150;
      ctx.fillRect(x, horizon - 180 - (i % 4) * 40, 130, 400);
    }
    // river with reflections
    ctx.fillStyle = "#123a4a";
    ctx.fillRect(0, horizon, W, 150);
    for (let i = 0; i < 40; i++) {
      const x = ((i * 90 - camX * 0.25 + Math.sin(t + i) * 12) % (W + 200) + W + 200) % (W + 200) - 100;
      ctx.fillStyle = i % 2 ? "#2f7d8f55" : "#8fd6d055";
      ctx.fillRect(x, horizon + 12 + (i % 6) * 20, 60, 4);
    }
    // giant samaúma trunks (mid)
    for (let i = 0; i < 10; i++) {
      const x = ((i * 320 - camX * 0.45) % (W + 700) + W + 700) % (W + 700) - 350;
      ctx.fillStyle = m.colors.mid;
      ctx.fillRect(x, horizon - 420, 46, 460);
      ctx.fillStyle = "#0e2a1c";
      ctx.fillRect(x + 34, horizon - 420, 12, 460);
      ctx.fillStyle = "#20573a";
      ctx.fillRect(x - 60, horizon - 440, 170, 60);
    }
    // sun shafts through leaves
    ctx.fillStyle = "#d9f28a12";
    for (let i = 0; i < 6; i++) {
      const x = ((i * 300 - camX * 0.3) % (W + 400) + W + 400) % (W + 400) - 200;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 90, 0);
      ctx.lineTo(x + 200, H);
      ctx.lineTo(x + 40, H);
      ctx.closePath();
      ctx.fill();
    }
  } else if (m.theme === "sertao") {
    ctx.fillStyle = "#fff3b0";
    ctx.beginPath();
    ctx.arc(W - 150, 140, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffe27a33";
    ctx.beginPath();
    ctx.arc(W - 150, 140, 110 + Math.sin(t * 2) * 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = m.colors.far;
    for (let i = 0; i < 12; i++) {
      const x = ((i * 340 - camX * 0.12) % (W + 700) + W + 700) % (W + 700) - 350;
      ctx.fillRect(x, horizon - 260 - (i % 3) * 50, 300, 400); // canyon walls
      ctx.fillStyle = "#a05f31";
      ctx.fillRect(x + 20, horizon - 200, 260, 20);
      ctx.fillStyle = m.colors.far;
    }
    ctx.fillStyle = m.colors.mid;
    ctx.fillRect(0, horizon, W, 200);
    for (let i = 0; i < 14; i++) {
      const x = ((i * 240 - camX * 0.35) % (W + 500) + W + 500) % (W + 500) - 250;
      // mandacaru cactus
      ctx.fillStyle = "#3f6b34";
      ctx.fillRect(x, horizon - 120, 16, 130);
      ctx.fillRect(x - 18, horizon - 80, 16, 60);
      ctx.fillRect(x + 18, horizon - 95, 16, 75);
      ctx.fillStyle = "#57building";
      ctx.fillStyle = "#5b8a45";
      ctx.fillRect(x + 4, horizon - 120, 4, 130);
      // taipa house
      if (i % 4 === 0) {
        ctx.fillStyle = "#c9a06a";
        ctx.fillRect(x + 60, horizon - 90, 120, 90);
        ctx.fillStyle = "#8d5b34";
        ctx.fillRect(x + 50, horizon - 105, 140, 18);
        ctx.fillStyle = "#4a3320";
        ctx.fillRect(x + 105, horizon - 50, 26, 50);
      }
    }
  } else if (m.theme === "capixaba") {
    // Terceira Ponte silhouette
    ctx.fillStyle = m.colors.far;
    const bx = -camX * 0.12;
    ctx.fillRect(0, horizon - 40, W, 40);
    for (let i = 0; i < 14; i++) {
      const x = ((i * 220 + bx) % (W + 500) + W + 500) % (W + 500) - 250;
      ctx.fillStyle = "#20516b";
      ctx.fillRect(x, horizon - 200, 26, 200);
      ctx.fillRect(x, horizon - 210, 220, 16);
      if (i % 3 === 0) {
        ctx.fillRect(x + 8, horizon - 330, 12, 130);
        ctx.fillRect(x - 60, horizon - 300, 150, 8);
      }
    }
    // sea
    ctx.fillStyle = "#1d5f80";
    ctx.fillRect(0, horizon, W, 220);
    for (let i = 0; i < 50; i++) {
      const x = ((i * 70 - camX * 0.3 + Math.sin(t * 1.5 + i) * 10) % (W + 200) + W + 200) % (W + 200) - 100;
      ctx.fillStyle = "#8fd0e055";
      ctx.fillRect(x, horizon + 20 + (i % 7) * 22, 44, 4);
    }
    // port cranes + containers
    for (let i = 0; i < 10; i++) {
      const x = ((i * 380 - camX * 0.45) % (W + 800) + W + 800) % (W + 800) - 400;
      ctx.fillStyle = "#d0782f";
      ctx.fillRect(x, horizon - 250, 14, 250);
      ctx.fillRect(x + 100, horizon - 250, 14, 250);
      ctx.fillRect(x - 30, horizon - 262, 220, 14);
      ctx.fillRect(x + 150, horizon - 262, 10, 90);
      const cols = ["#c8443a", "#2f7d5b", "#3a5fa8"];
      for (let c = 0; c < 3; c++) {
        ctx.fillStyle = cols[c] ?? "#888";
        ctx.fillRect(x + 20 + c * 60, horizon - 60, 56, 56);
      }
      palm(ctx, x + 250, horizon + 10, 1.4, "#6b4a2a", "#2f7d3f");
    }
  } else {
    // Rocinha: Cristo + hillside of brick houses + power lines
    ctx.fillStyle = "#1a1424";
    ctx.fillRect(0, horizon - 60, W, 60);
    const cx = ((-camX * 0.05) % (W * 2) + W * 2) % (W * 2) - 200;
    ctx.fillStyle = "#0f0c16";
    ctx.beginPath();
    ctx.moveTo(cx - 200, horizon);
    ctx.lineTo(cx + 60, horizon - 340);
    ctx.lineTo(cx + 320, horizon);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#efe6d8";
    ctx.fillRect(cx + 54, horizon - 420, 14, 82);
    ctx.fillRect(cx + 26, horizon - 404, 70, 10);
    ctx.fillStyle = "#efe6d855";
    ctx.fillRect(cx + 44, horizon - 430, 34, 14);

    const r = rnd(7);
    for (let i = 0; i < 90; i++) {
      const x = ((i * 92 - camX * 0.3) % (W + 600) + W + 600) % (W + 600) - 300;
      const hh = 60 + Math.floor(r() * 120);
      ctx.fillStyle = i % 3 ? "#5d4436" : "#6b4a38";
      ctx.fillRect(x, horizon - hh, 86, hh + 80);
      ctx.fillStyle = "#e0b23a";
      if (i % 2) ctx.fillRect(x + 12, horizon - hh + 16, 16, 16);
      ctx.fillStyle = "#3f7fb5";
      ctx.fillRect(x + 50, horizon - hh - 16, 24, 16); // caixa d'água
    }
    ctx.strokeStyle = "#12101a";
    ctx.lineWidth = 3;
    for (let i = 0; i < 12; i++) {
      const x = ((i * 260 - camX * 0.5) % (W + 500) + W + 500) % (W + 500) - 250;
      ctx.beginPath();
      ctx.moveTo(x, horizon - 200);
      ctx.quadraticCurveTo(x + 130, horizon - 150, x + 260, horizon - 200);
      ctx.stroke();
    }
  }

  // near foliage / haze layer
  ctx.fillStyle = m.colors.near + "";
  ctx.globalAlpha = 0.35;
  for (let i = 0; i < 14; i++) {
    const x = ((i * 200 - camX * 0.7) % (W + 400) + W + 400) % (W + 400) - 200;
    ctx.fillRect(x, H - 90, 180, 90);
  }
  ctx.globalAlpha = 1;
}
