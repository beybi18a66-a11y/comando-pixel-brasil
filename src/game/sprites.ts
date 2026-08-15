// 16-bit style pixel-art sprite renderer. Everything is drawn from a pixel
// grid (no smoothing) so shapes read as authentic Neo-Geo / SNK arcade art.

export type Ctx = CanvasRenderingContext2D;

export const PAL = {
  skin: "#f7c79b",
  skinDark: "#c07a52",
  bandana: "#d92b2b",
  bandanaDark: "#8f1616",
  camoA: "#6f7d3d",
  camoB: "#4a5527",
  camoC: "#93a25c",
  vest: "#2f3524",
  boot: "#33291f",
  glove: "#4a3b2a",
  metal: "#9aa1a8",
  metalDark: "#4c545c",
  gunDark: "#23272b",
  gold: "#f2c14a",
  flash: "#ffe066",
  flash2: "#ff8c1a",
  enemy: "#8d6b41",
  enemyDark: "#4d3823",
  helmet: "#6b6b5a",
  helmetDark: "#3d3d31",
  powShirt: "#d9c9a3",
  powPants: "#6b6a4a",
  hair: "#4a3320",
  rope: "#c9a24a",
  blood: "#b1241f",
  white: "#f6f4ea",
  black: "#141118",
  smoke: "#5a5a5a",
};

/** Pixel rect helper bound to a sprite origin, scale and horizontal flip. */
let INK = false;
export function pen(ctx: Ctx, ox: number, oy: number, s: number, flip: boolean, w: number) {
  return (x: number, y: number, rw: number, rh: number, color: string) => {
    const fx = flip ? w - x - rw : x;
    ctx.fillStyle = INK ? "#0d0b10" : color;
    ctx.fillRect(Math.round(ox + fx * s), Math.round(oy + y * s), Math.ceil(rw * s), Math.ceil(rh * s));
  };
}


// --- SNK-style black contour: every character is drawn onto a scratch buffer
// and stamped around itself in dark ink before the coloured sprite goes down.
export function outlined(
  ctx: Ctx,
  _bx: number,
  _by: number,
  _bw: number,
  _bh: number,
  fn: (c: Ctx) => void,
  th = 3,
) {
  INK = true;
  for (const off of [[-th, 0], [th, 0], [0, -th], [0, th], [-th, -th], [th, th], [-th, th], [th, -th]]) {
    ctx.save();
    ctx.translate(off[0] ?? 0, off[1] ?? 0);
    fn(ctx);
    ctx.restore();
  }
  INK = false;
  fn(ctx);
}

export type PlayerState = "idle" | "run" | "jump" | "crouch";

/**
 * Protagonist: arcade proportions (big expressive head/torso, dynamic legs),
 * camo fatigues, tactical vest, fingerless gloves and red bandana.
 * Origin = bottom-center of the character.
 */
export function drawSoldier(
  ctx: Ctx,
  cx: number,
  cy: number,
  facing: 1 | -1,
  state: PlayerState,
  t: number,
  opts: { recoil?: number; weapon?: string; aimUp?: boolean; hit?: boolean } = {},
) {
  const s = 4;
  const W = 16;
  const H = 22;
  const crouch = state === "crouch";
  const h = crouch ? 17 : H;
  const ox = cx - (W * s) / 2;
  const oy = cy - h * s;
  const p = pen(ctx, ox, oy, s, facing === -1, W);
  const run = state === "run";
  const f = Math.floor(t * 12) % 4;
  const bob = run ? ([0, -1, 0, 1][f] ?? 0) : state === "idle" ? (Math.floor(t * 3) % 2 ? 0 : 1) : 0;
  const recoil = opts.recoil ?? 0;

  if (opts.hit) ctx.globalAlpha = 0.75;

  const legY = crouch ? 12 : 15;
  // legs
  if (state === "jump") {
    p(3, legY, 4, 4, PAL.camoB);
    p(2, legY + 3, 4, 3, PAL.boot);
    p(9, legY - 1, 4, 5, PAL.camoB);
    p(10, legY + 3, 4, 3, PAL.boot);
  } else if (run) {
    const a = [0, 2, 0, -2][f] ?? 0;
    p(3 - a, legY, 4, 5, PAL.camoB);
    p(2 - a, legY + 4, 5, 3, PAL.boot);
    p(8 + a, legY, 4, 5, PAL.camoA);
    p(8 + a, legY + 4, 5, 3, PAL.boot);
  } else {
    p(3, legY, 4, crouch ? 3 : 5, PAL.camoB);
    p(2, legY + (crouch ? 2 : 4), 5, 3, PAL.boot);
    p(9, legY, 4, crouch ? 3 : 5, PAL.camoA);
    p(9, legY + (crouch ? 2 : 4), 5, 3, PAL.boot);
  }

  const ty = (crouch ? 5 : 6) + bob;
  // torso + camo blotches + vest
  p(3, ty, 10, 7, PAL.camoA);
  p(4, ty + 1, 3, 2, PAL.camoC);
  p(9, ty + 3, 3, 2, PAL.camoB);
  p(6, ty + 4, 2, 2, PAL.camoC);
  p(4, ty + 1, 8, 4, PAL.vest);
  p(4, ty + 2, 8, 1, PAL.camoB);
  p(11, ty + 1, 1, 4, PAL.metalDark);
  p(5, ty + 5, 2, 1, PAL.gold);

  // head + bandana
  const hy = ty - 6;
  p(5, hy, 7, 6, PAL.skin);
  p(5, hy + 4, 7, 2, PAL.skinDark);
  p(11, hy + 2, 2, 1, PAL.skin);
  p(4, hy - 1, 9, 3, PAL.bandana);
  p(4, hy + 1, 9, 1, PAL.bandanaDark);
  p(2, hy, 3, 2, PAL.bandana); // knot tail
  p(1, hy + 1, 2, 3, PAL.bandanaDark);
  p(10, hy + 2, 1, 1, PAL.black); // eye
  p(5, hy + 1, 4, 1, PAL.hair);

  // arms + weapon
  const armY = ty + 2 - Math.round(recoil * 1.5);
  const gunX = 12 - Math.round(recoil * 2);
  p(2, armY, 3, 3, PAL.camoA); // back arm
  p(11, armY, 3, 3, PAL.camoA);
  p(13, armY, 2, 2, PAL.glove); // fingerless glove

  const wpn = opts.weapon ?? "PISTOL";
  if (wpn === "ROCKET") {
    p(gunX - 3, armY - 2, 9, 4, PAL.camoB);
    p(gunX + 4, armY - 2, 2, 4, PAL.metalDark);
    p(gunX - 3, armY - 3, 3, 1, PAL.metal);
  } else if (wpn === "SHOTGUN") {
    p(gunX, armY, 7, 2, PAL.gunDark);
    p(gunX, armY + 2, 4, 1, PAL.glove);
    p(gunX + 5, armY - 1, 2, 1, PAL.metal);
  } else if (wpn === "HEAVY") {
    p(gunX - 1, armY - 1, 8, 3, PAL.gunDark);
    p(gunX + 6, armY, 2, 1, PAL.metal);
    p(gunX - 1, armY + 2, 3, 2, PAL.gold); // ammo cartridge
  } else if (wpn === "FLAME") {
    p(gunX, armY, 6, 3, PAL.metalDark);
    p(gunX + 5, armY + 1, 2, 1, PAL.metal);
    p(1, ty, 3, 5, PAL.metal);
    p(1, ty + 1, 3, 1, PAL.blood);
  } else {
    p(gunX, armY, 5, 2, PAL.gunDark);
    p(gunX + 4, armY, 2, 1, PAL.metal);
    p(gunX, armY + 2, 2, 2, PAL.glove);
  }
  ctx.globalAlpha = 1;
}

/** Muzzle flash + ejected golden casing burst. */
export function drawMuzzle(ctx: Ctx, x: number, y: number, facing: 1 | -1, size = 1) {
  const s = 4 * size;
  const p = pen(ctx, x - (facing === -1 ? 6 * s : 0), y - 3 * s, s, facing === -1, 6);
  p(0, 2, 4, 2, PAL.flash);
  p(3, 1, 2, 4, PAL.flash2);
  p(1, 0, 2, 1, PAL.flash2);
  p(1, 5, 2, 1, PAL.flash2);
  p(0, 3, 2, 1, PAL.white);
}

export function drawEnemy(
  ctx: Ctx,
  cx: number,
  cy: number,
  facing: 1 | -1,
  t: number,
  kind: "rifle" | "grenadier",
  throwing = false,
  hit = false,
) {
  const s = 4;
  const W = 16;
  const ox = cx - (W * s) / 2;
  const oy = cy - 20 * s;
  const p = pen(ctx, ox, oy, s, facing === -1, W);
  const f = Math.floor(t * 8) % 2;
  if (hit) ctx.globalAlpha = 0.6;

  p(4, 15, 4, 4, PAL.enemyDark);
  p(3, 18, 5, 2, PAL.boot);
  p(9, 15 - f, 4, 4, PAL.enemyDark);
  p(9, 18, 5, 2, PAL.boot);

  p(4, 7, 9, 8, PAL.enemy);
  p(5, 8, 7, 3, PAL.enemyDark);
  p(11, 8, 1, 6, PAL.metalDark);

  p(5, 2, 7, 5, PAL.skin);
  p(5, 5, 7, 2, PAL.skinDark);
  p(10, 4, 1, 1, PAL.black);
  if (kind === "rifle") {
    p(4, 0, 9, 3, PAL.helmet); // combat helmet
    p(4, 2, 9, 1, PAL.helmetDark);
    p(12, 2, 2, 1, PAL.helmetDark);
  } else {
    p(4, 1, 9, 2, PAL.camoB); // beret
    p(3, 1, 2, 1, PAL.camoB);
    p(11, 0, 2, 2, PAL.blood);
  }

  if (kind === "rifle") {
    p(11, 9, 3, 3, PAL.enemy);
    p(13, 9, 6, 2, PAL.gunDark);
    p(18, 9, 2, 1, PAL.metal);
  } else if (throwing) {
    p(11, 4, 3, 3, PAL.enemy);
    p(13, 2, 3, 3, PAL.camoB);
  } else {
    p(11, 9, 4, 3, PAL.enemy);
    p(14, 10, 3, 3, PAL.camoB);
  }
  ctx.globalAlpha = 1;
}

/** Prisoner of war: long hair/beard, torn fatigues, tied with rope. */
export function drawPow(ctx: Ctx, cx: number, cy: number, t: number, freed: boolean, salute: number) {
  const s = 4;
  const W = 14;
  const ox = cx - (W * s) / 2;
  const oy = cy - 20 * s;
  const p = pen(ctx, ox, oy, s, false, W);
  const wob = freed ? 0 : Math.sin(t * 6) < 0 ? 0 : 1;

  p(4, 15, 3, 4, PAL.powPants);
  p(8, 15, 3, 4, PAL.powPants);
  p(4, 18, 3, 1, PAL.powPants);
  p(3, 19, 4, 1, PAL.boot);
  p(8, 19, 4, 1, PAL.boot);
  p(4, 17, 2, 1, PAL.skin); // rips
  p(9, 16, 2, 1, PAL.skin);

  p(3 + wob, 7, 9, 8, PAL.powShirt);
  p(4 + wob, 9, 7, 1, PAL.rope);
  p(4 + wob, 12, 7, 1, PAL.rope);

  const hy = 1;
  p(4 + wob, hy + 1, 7, 6, PAL.skin);
  p(3 + wob, hy, 9, 3, PAL.hair);
  p(2 + wob, hy + 1, 2, 6, PAL.hair);
  p(11 + wob, hy + 1, 2, 5, PAL.hair);
  p(5 + wob, hy + 5, 6, 3, PAL.hair); // beard
  p(9 + wob, hy + 3, 1, 1, PAL.black);

  if (freed && salute > 0) {
    p(9, 2, 3, 2, PAL.skin); // saluting arm to brow
    p(11, 4, 2, 3, PAL.powShirt);
  } else {
    p(2 + wob, 9, 2, 4, PAL.skin);
    p(11 + wob, 9, 2, 4, PAL.skin);
    p(1 + wob, 12, 12, 1, PAL.rope);
  }
}

export const WEAPON_LETTER: Record<string, string> = {
  HEAVY: "H",
  SHOTGUN: "S",
  ROCKET: "R",
  FLAME: "F",
  GRENADE: "G",
  LIFE: "+",
};

export function drawDrop(ctx: Ctx, cx: number, cy: number, kind: string, t: number) {
  const s = 4;
  const W = 12;
  const bob = Math.sin(t * 4) * 2;
  const ox = cx - (W * s) / 2;
  const oy = cy - 12 * s + bob;
  const p = pen(ctx, ox, oy, s, false, W);
  p(0, 2, 12, 10, "#8a6234");
  p(0, 2, 12, 1, "#b98a4c");
  p(0, 11, 12, 1, "#5c3f20");
  p(0, 6, 12, 1, "#5c3f20");
  p(5, 2, 2, 10, "#5c3f20");
  p(1, 0, 10, 2, PAL.metalDark);
  ctx.fillStyle = kind === "LIFE" ? PAL.blood : PAL.flash;
  ctx.font = `bold ${9 * 2}px monospace`;
  ctx.textAlign = "center";
  ctx.fillText(WEAPON_LETTER[kind] ?? "?", cx, cy - 10 + bob);
  ctx.textAlign = "left";
}

/** Military wooden crate with stencilled inscriptions. */
export function drawCrate(ctx: Ctx, x: number, y: number, w: number, h: number) {
  const ctxp = ctx;
  ctxp.fillStyle = "#7a5628";
  ctxp.fillRect(x, y, w, h);
  ctxp.fillStyle = "#9c7038";
  ctxp.fillRect(x, y, w, 4);
  ctxp.fillStyle = "#553a19";
  ctxp.fillRect(x, y + h - 5, w, 5);
  ctxp.fillRect(x + w / 2 - 2, y, 4, h);
  ctxp.fillStyle = "#c9b27a";
  ctxp.font = "bold 10px monospace";
  ctxp.fillText("MUNIÇÃO", x + 4, y + h / 2 + 4);
  ctxp.fillStyle = "#3a2711";
  ctxp.fillRect(x, y, w, 2);
}

/** Fuel barrel with hazard logo, weld marks and rust. */
export function drawBarrel(ctx: Ctx, x: number, y: number, w: number, h: number, t: number) {
  ctx.fillStyle = "#b4463a";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#d9604f";
  ctx.fillRect(x + 3, y, 5, h);
  ctx.fillStyle = "#7d2a22";
  ctx.fillRect(x, y + 6, w, 3);
  ctx.fillRect(x, y + h - 12, w, 3);
  ctx.fillStyle = "#6b4a2a";
  ctx.fillRect(x + w - 8, y + 14, 5, 9); // rust
  ctx.fillRect(x + 2, y + h - 20, 4, 5);
  ctx.fillStyle = "#14111855";
  ctx.fillRect(x + w - 4, y, 4, h);
  ctx.fillStyle = PAL.flash;
  ctx.fillRect(x + w / 2 - 7, y + h / 2 - 7, 14, 14);
  ctx.fillStyle = PAL.black;
  ctx.font = "bold 12px monospace";
  ctx.fillText("☠", x + w / 2 - 5, y + h / 2 + 5);
  if (Math.floor(t * 3) % 2) {
    ctx.fillStyle = "#ffffff22";
    ctx.fillRect(x + 2, y + 2, 3, h - 4);
  }
}
