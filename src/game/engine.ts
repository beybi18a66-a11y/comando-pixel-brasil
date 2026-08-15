import { sfx } from "./audio";
import { MISSIONS, drawBackground, drawTile, type Mission } from "./levels";
import {
  PAL,
  drawBarrel,
  drawCrate,
  drawDrop,
  drawEnemy,
  drawMuzzle,
  drawPow,
  drawSoldier,
  outlined,
  type PlayerState,
} from "./sprites";

export const VIEW_W = 820;
export const VIEW_H = 1180;
const GROUND_Y = 1010;
const GRAVITY = 2600;

export type WeaponId = "PISTOL" | "HEAVY" | "SHOTGUN" | "ROCKET" | "FLAME";

export const WEAPONS: Record<WeaponId, { label: string; rate: number; ammo: number }> = {
  PISTOL: { label: "PISTOLA", rate: 0.18, ammo: Infinity },
  HEAVY: { label: "HEAVY MG", rate: 0.07, ammo: 250 },
  SHOTGUN: { label: "SHOTGUN", rate: 0.5, ammo: 30 },
  ROCKET: { label: "ROCKET", rate: 0.75, ammo: 12 },
  FLAME: { label: "LANÇA-CHAMAS", rate: 0.035, ammo: 300 },
};

export type Stats = {
  hearts: number;
  weapon: WeaponId;
  ammo: number;
  grenades: number;
  score: number;
  coins: number;
  progress: number;
  pows: number;
  powsTotal: number;
  kills: number;
};

type Rect = { x: number; y: number; w: number; h: number };
type Platform = Rect & { type: "solid" };
type Bullet = {
  x: number; y: number; vx: number; vy: number; dmg: number; life: number;
  kind: "pistol" | "heavy" | "pellet" | "rocket" | "flame" | "enemy"; r: number; homing?: boolean;
};
type Enemy = { x: number; y: number; vx: number; hp: number; kind: "rifle" | "grenadier"; cool: number; facing: 1 | -1; hit: number; vy: number; onGround: boolean };
type Pow = { x: number; y: number; freed: boolean; salute: number; drop: string };
type Drop = { x: number; y: number; kind: string; vy: number };
type Prop = Rect & { kind: "barrel" | "crate" | "tires"; hp: number };
type Grenade = { x: number; y: number; vx: number; vy: number; fuse: number; fromEnemy: boolean };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number; grav: number };

function aabb(a: Rect, b: Rect) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function mulberry(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Game {
  private ctx: Ctx2;
  private raf = 0;
  private last = 0;
  private t = 0;
  private running = false;
  private keys: Record<string, boolean> = {};
  private mission: Mission;

  private plats: Platform[] = [];
  private enemies: Enemy[] = [];
  private bullets: Bullet[] = [];
  private pows: Pow[] = [];
  private drops: Drop[] = [];
  private props: Prop[] = [];
  private grenades: Grenade[] = [];
  private parts: Particle[] = [];

  private p = {
    x: 120, y: GROUND_Y, vx: 0, vy: 0, onGround: true, facing: 1 as 1 | -1,
    state: "idle" as PlayerState, cool: 0, recoil: 0, inv: 0, hearts: 3,
  };
  private weapon: WeaponId = "PISTOL";
  private ammo = Infinity;
  private grenadesLeft = 5;
  private score = 0;
  private coins = 0;
  private kills = 0;
  private powsFreed = 0;
  private powsTotal = 0;
  private camX = 0;
  private shake = 0;
  private ended = false;

  constructor(
    private canvas: HTMLCanvasElement,
    missionIndex: number,
    private handlers: { onStats: (s: Stats) => void; onWin: (s: Stats) => void; onLose: (s: Stats) => void },
  ) {
    const c = canvas.getContext("2d");
    if (!c) throw new Error("no 2d context");
    this.ctx = c;
    this.ctx.imageSmoothingEnabled = false;
    this.mission = MISSIONS[missionIndex] ?? (MISSIONS[0] as Mission);
    this.build();
  }

  // ---------- level generation ----------
  private build() {
    const m = this.mission;
    const r = mulberry(1337 + m.id * 97);
    this.plats.push({ x: -200, y: GROUND_Y, w: m.length + 800, h: 200, type: "solid" });
    let x = 500;
    while (x < m.length - 400) {
      const gap = 240 + r() * 260;
      if (r() < 0.7) {
        const w = 150 + r() * 190;
        const y = GROUND_Y - (150 + r() * 620);
        this.plats.push({ x, y, w, h: 34, type: "solid" });
        if (x > 900 && r() < 0.45) {
          this.enemies.push(this.mkEnemy(x + w / 2, y, r));
        }
        if (r() < 0.3) this.props.push({ x: x + 20, y: y - 46, w: 44, h: 46, kind: "crate", hp: 3 });
      }
      if (x > 900 && r() < 0.7) this.enemies.push(this.mkEnemy(x + 80 + r() * 200, GROUND_Y, r));
      if (r() < 0.35) this.props.push({ x: x + 120, y: GROUND_Y - 56, w: 40, h: 56, kind: "barrel", hp: 2 });
      if (r() < 0.25) this.props.push({ x: x + 200, y: GROUND_Y - 44, w: 46, h: 44, kind: "crate", hp: 3 });
      if (r() < 0.22) this.props.push({ x: x + 260, y: GROUND_Y - 40, w: 70, h: 40, kind: "tires", hp: 5 });
      x += gap;
    }
    const kinds = ["HEAVY", "SHOTGUN", "ROCKET", "FLAME", "GRENADE", "LIFE"];
    for (let i = 0; i < 6; i++) {
      const px = 700 + (m.length - 1400) * (i / 6) + r() * 200;
      this.pows.push({ x: px, y: GROUND_Y, freed: false, salute: 0, drop: kinds[i % kinds.length] ?? "HEAVY" });
    }
    this.powsTotal = this.pows.length;
  }

  private mkEnemy(x: number, y: number, r: () => number): Enemy {
    return {
      x, y, vx: 0, vy: 0, onGround: true, hp: 3,
      kind: r() < 0.35 ? "grenadier" : "rifle",
      cool: 1.4 + r() * 1.6, facing: -1, hit: 0,
    };
  }

  // ---------- lifecycle ----------
  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    window.addEventListener("keydown", this.onKey);
    window.addEventListener("keyup", this.onKeyUp);
    this.canvas.addEventListener("pointerdown", this.onPointer);
    this.canvas.addEventListener("pointerup", this.onPointerUp);
    this.raf = requestAnimationFrame(this.loop);
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("keydown", this.onKey);
    window.removeEventListener("keyup", this.onKeyUp);
    this.canvas.removeEventListener("pointerdown", this.onPointer);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
  }

  setBtn(name: string, down: boolean) {
    this.keys[name] = down;
    if (name === "grenade" && down) this.throwGrenade();
  }

  private onPointer = () => {
    this.keys["fire"] = true;
  };
  private onPointerUp = () => {
    this.keys["fire"] = false;
  };

  private onKey = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) e.preventDefault();
    if (k === "a" || k === "arrowleft") this.keys["left"] = true;
    if (k === "d" || k === "arrowright") this.keys["right"] = true;
    if (k === "w" || k === "arrowup") this.keys["jump"] = true;
    if (k === "s" || k === "arrowdown") this.keys["down"] = true;
    if (k === " ") this.keys["fire"] = true;
    if (k === "g" && !e.repeat) this.throwGrenade();
  };
  private onKeyUp = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (k === "a" || k === "arrowleft") this.keys["left"] = false;
    if (k === "d" || k === "arrowright") this.keys["right"] = false;
    if (k === "w" || k === "arrowup") this.keys["jump"] = false;
    if (k === "s" || k === "arrowdown") this.keys["down"] = false;
    if (k === " ") this.keys["fire"] = false;
  };

  private loop = (now: number) => {
    if (!this.running) return;
    const dt = Math.min(0.033, (now - this.last) / 1000);
    this.last = now;
    this.t += dt;
    this.update(dt);
    this.render();
    this.raf = requestAnimationFrame(this.loop);
  };

  private stats(): Stats {
    return {
      hearts: this.p.hearts,
      weapon: this.weapon,
      ammo: this.ammo,
      grenades: this.grenadesLeft,
      score: this.score,
      coins: this.coins,
      progress: Math.min(1, this.p.x / this.mission.length),
      pows: this.powsFreed,
      powsTotal: this.powsTotal,
      kills: this.kills,
    };
  }

  // ---------- particles ----------
  private burst(x: number, y: number, n: number, colors: string[], speed = 220, grav = 900, size = 4, life = 0.5) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = speed * (0.3 + Math.random());
      this.parts.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
        life: life * (0.6 + Math.random()), max: life, grav, size: size * (0.6 + Math.random()),
        color: colors[Math.floor(Math.random() * colors.length)] ?? "#fff",
      });
    }
  }

  private explode(x: number, y: number, radius = 130, dmg = 5) {
    sfx.explosion();
    this.shake = 16;
    this.burst(x, y, 26, ["#ffe066", "#ff8c1a", "#e04a1a"], 380, 700, 9, 0.55);
    this.burst(x, y, 20, ["#3a3a3a", "#5a5a5a", "#222"], 180, 120, 12, 1.1);
    this.burst(x, y, 14, ["#9aa1a8", "#c9b27a"], 420, 1200, 4, 0.8);
    for (const e of this.enemies) {
      if (Math.hypot(e.x - x, e.y - 40 - y) < radius) this.damageEnemy(e, dmg, Math.sign(e.x - x) || 1);
    }
    for (const pr of this.props) {
      if (pr.hp > 0 && Math.hypot(pr.x + pr.w / 2 - x, pr.y - y) < radius) this.damageProp(pr, dmg);
    }
    if (Math.hypot(this.p.x - x, this.p.y - 40 - y) < radius * 0.8) this.hurt();
  }

  private damageProp(pr: Prop, dmg: number) {
    pr.hp -= dmg;
    if (pr.hp <= 0) {
      const cx = pr.x + pr.w / 2;
      const cy = pr.y + pr.h / 2;
      if (pr.kind === "barrel") this.explode(cx, cy);
      else {
        sfx.explosion();
        this.burst(cx, cy, 18, ["#8a6234", "#c9b27a", "#5c3f20"], 300, 1100, 6, 0.7);
        this.score += 50;
        this.coins += 1;
      }
      pr.hp = -999;
    }
  }

  private damageEnemy(e: Enemy, dmg: number, knock = 0) {
    e.hp -= dmg;
    e.hit = 0.12;
    e.x += knock * 12;
    this.burst(e.x, e.y - 50, 5, [PAL.blood, "#ff6b4a"], 160, 700, 4, 0.35);
    if (e.hp <= 0) {
      this.kills++;
      this.score += 200;
      this.coins += 2;
      this.burst(e.x, e.y - 40, 16, [PAL.blood, "#7a5c3a", "#ffe066"], 300, 900, 6, 0.6);
      e.hp = -999;
    }
  }

  private hurt() {
    if (this.p.inv > 0 || this.ended) return;
    this.p.hearts--;
    this.p.inv = 2.2;
    this.shake = 12;
    sfx.hurt();
    if (this.p.hearts <= 0) {
      this.ended = true;
      sfx.defeat();
      this.handlers.onLose(this.stats());
    }
  }

  // ---------- firing ----------
  private muzzleX() {
    return this.p.x + this.p.facing * 54;
  }
  private muzzleY() {
    return this.p.y - (this.p.state === "crouch" ? 46 : 62);
  }

  private fire() {
    if (this.p.cool > 0) return;
    const w = WEAPONS[this.weapon];
    if (this.ammo <= 0) {
      this.weapon = "PISTOL";
      this.ammo = Infinity;
    }
    this.p.cool = WEAPONS[this.weapon].rate;
    this.p.recoil = 1;
    const mx = this.muzzleX();
    const my = this.muzzleY();
    const f = this.p.facing;
    if (this.ammo !== Infinity) this.ammo--;

    // ejected golden casing
    if (this.weapon !== "ROCKET" && this.weapon !== "FLAME") {
      this.parts.push({ x: mx - f * 26, y: my, vx: -f * 120, vy: -220, life: 0.6, max: 0.6, grav: 1300, size: 3, color: PAL.gold });
    }

    if (this.weapon === "SHOTGUN") {
      sfx.shotgun();
      for (let i = 0; i < 7; i++) {
        const spread = (i - 3) * 0.09;
        this.bullets.push({ x: mx, y: my, vx: Math.cos(spread) * 820 * f, vy: Math.sin(spread) * 820, dmg: 2, life: 0.34, kind: "pellet", r: 5 });
      }
      this.burst(mx + f * 20, my, 12, ["#666", "#999", PAL.flash], 260, 200, 5, 0.4);
      this.p.vx -= f * 120;
    } else if (this.weapon === "ROCKET") {
      sfx.rocket();
      this.bullets.push({ x: mx, y: my, vx: 620 * f, vy: 0, dmg: 6, life: 2.5, kind: "rocket", r: 10, homing: true });
    } else if (this.weapon === "FLAME") {
      sfx.flame();
      this.bullets.push({ x: mx, y: my, vx: (620 + Math.random() * 160) * f, vy: (Math.random() - 0.5) * 120, dmg: 0.6, life: 0.35, kind: "flame", r: 14 });
    } else if (this.weapon === "HEAVY") {
      sfx.heavy();
      const spread = (Math.random() - 0.5) * 0.18;
      this.bullets.push({ x: mx, y: my, vx: Math.cos(spread) * 1150 * f, vy: Math.sin(spread) * 1150, dmg: 1, life: 0.7, kind: "heavy", r: 5 });
    } else {
      sfx.pistol();
      this.bullets.push({ x: mx, y: my, vx: 1050 * f, vy: 0, dmg: 1, life: 0.8, kind: "pistol", r: 4 });
      this.burst(mx + f * 14, my, 3, [PAL.flash, PAL.white], 120, 200, 3, 0.2);
    }
  }

  private throwGrenade() {
    if (this.grenadesLeft <= 0 || this.ended) return;
    this.grenadesLeft--;
    sfx.beep();
    this.grenades.push({ x: this.p.x, y: this.p.y - 50, vx: 520 * this.p.facing, vy: -720, fuse: 1.3, fromEnemy: false });
  }

  // ---------- update ----------
  private update(dt: number) {
    if (this.ended) return;
    const p = this.p;
    const speed = 330;
    const left = this.keys["left"];
    const right = this.keys["right"];
    const crouch = !!this.keys["down"] && p.onGround;

    if (left && !crouch) {
      p.vx = -speed;
      p.facing = -1;
    } else if (right && !crouch) {
      p.vx = speed;
      p.facing = 1;
    } else {
      p.vx *= 0.75;
    }

    if (this.keys["jump"] && p.onGround) {
      p.vy = -1080;
      p.onGround = false;
      sfx.jump();
      this.burst(p.x, p.y, 6, ["#c9b27a", "#8a8a8a"], 120, 500, 4, 0.3);
    }

    p.vy += GRAVITY * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.onGround = false;

    const pw = 46;
    const ph = crouch ? 66 : 88;
    for (const pl of this.plats) {
      const box = { x: p.x - pw / 2, y: p.y - ph, w: pw, h: ph };
      if (!aabb(box, pl)) continue;
      const ovX = Math.min(box.x + box.w, pl.x + pl.w) - Math.max(box.x, pl.x);
      const ovY = Math.min(box.y + box.h, pl.y + pl.h) - Math.max(box.y, pl.y);
      if (ovY <= ovX) {
        if (box.y + box.h / 2 < pl.y + pl.h / 2) {
          p.y = pl.y;
          p.vy = 0;
          p.onGround = true;
        } else {
          p.y = pl.y + pl.h + ph;
          p.vy = 60;
        }
      } else {
        p.x = box.x + box.w / 2 < pl.x + pl.w / 2 ? pl.x - pw / 2 : pl.x + pl.w + pw / 2;
        p.vx = 0;
      }
    }
    p.x = Math.max(40, Math.min(this.mission.length + 200, p.x));

    p.state = !p.onGround ? "jump" : crouch ? "crouch" : Math.abs(p.vx) > 40 ? "run" : "idle";
    if (p.state === "run" && p.onGround && Math.random() < 0.35) {
      this.parts.push({ x: p.x - p.facing * 14, y: p.y - 2, vx: -p.facing * 60 * Math.random(), vy: -60 * Math.random(), life: 0.4, max: 0.4, grav: 300, size: 4, color: "#c9b27a" });
    }

    p.cool -= dt;
    p.recoil = Math.max(0, p.recoil - dt * 6);
    p.inv = Math.max(0, p.inv - dt);
    if (this.keys["fire"]) this.fire();
    this.shake = Math.max(0, this.shake - dt * 60);

    // bullets
    for (const b of this.bullets) {
      if (b.kind === "rocket" && b.homing) {
        let best: Enemy | null = null;
        let bd = 520;
        for (const e of this.enemies) {
          if (e.hp <= 0) continue;
          const d = Math.hypot(e.x - b.x, e.y - 40 - b.y);
          if (d < bd) {
            bd = d;
            best = e;
          }
        }
        if (best) {
          const ang = Math.atan2(best.y - 40 - b.y, best.x - b.x);
          const sp = Math.hypot(b.vx, b.vy);
          b.vx += Math.cos(ang) * sp * dt * 3;
          b.vy += Math.sin(ang) * sp * dt * 3;
          const ns = Math.hypot(b.vx, b.vy);
          b.vx = (b.vx / ns) * 700;
          b.vy = (b.vy / ns) * 700;
        }
        this.parts.push({ x: b.x, y: b.y, vx: (Math.random() - 0.5) * 60, vy: -30 - Math.random() * 40, life: 0.7, max: 0.7, grav: -40, size: 7, color: Math.random() < 0.5 ? "#8a8a8a" : "#c8c8c8" });
      }
      if (b.kind === "flame") {
        b.vx *= 0.94;
        b.vy -= 120 * dt;
        this.parts.push({ x: b.x, y: b.y, vx: 0, vy: -60, life: 0.3, max: 0.3, grav: -100, size: 10, color: Math.random() < 0.4 ? "#ffe066" : "#ff7a1a" });
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      const rect = { x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 };

      if (b.kind === "enemy") {
        if (aabb(rect, { x: p.x - 23, y: p.y - (p.state === "crouch" ? 66 : 88), w: 46, h: p.state === "crouch" ? 66 : 88 })) {
          this.hurt();
          b.life = 0;
        }
      } else {
        for (const e of this.enemies) {
          if (e.hp <= 0) continue;
          if (aabb(rect, { x: e.x - 28, y: e.y - 80, w: 56, h: 80 })) {
            if (b.kind === "rocket") {
              this.explode(b.x, b.y);
              b.life = 0;
            } else {
              this.damageEnemy(e, b.dmg, Math.sign(b.vx) * (b.kind === "pellet" ? 2 : 1));
              if (b.kind !== "flame") b.life = 0;
            }
            break;
          }
        }
        for (const pr of this.props) {
          if (pr.hp <= 0) continue;
          if (aabb(rect, pr)) {
            if (b.kind === "rocket") {
              this.explode(b.x, b.y);
              b.life = 0;
            } else {
              this.damageProp(pr, b.kind === "flame" ? b.dmg : b.dmg);
              if (b.kind !== "flame") b.life = 0;
            }
            break;
          }
        }
      }
      if (b.y > GROUND_Y + 40) {
        if (b.kind === "rocket") this.explode(b.x, GROUND_Y);
        b.life = 0;
      }
    }
    this.bullets = this.bullets.filter((b) => b.life > 0);

    // grenades
    for (const g of this.grenades) {
      g.vy += GRAVITY * dt;
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      if (g.y > GROUND_Y) {
        g.y = GROUND_Y;
        g.vy *= -0.4;
        g.vx *= 0.6;
      }
      g.fuse -= dt;
      if (g.fuse <= 0) {
        this.explode(g.x, g.y - 10, g.fromEnemy ? 100 : 150, g.fromEnemy ? 0 : 6);
        if (g.fromEnemy && Math.hypot(this.p.x - g.x, this.p.y - 40 - g.y) < 110) this.hurt();
      }
    }
    this.grenades = this.grenades.filter((g) => g.fuse > 0);

    // enemies
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const dx = p.x - e.x;
      const dist = Math.abs(dx);
      if (dist > 1400) continue;
      e.facing = dx > 0 ? 1 : -1;
      e.hit = Math.max(0, e.hit - dt);
      if (dist > 380) e.vx = e.facing * 70;
      else e.vx = 0;
      e.x += e.vx * dt;
      e.vy += GRAVITY * dt;
      e.y += e.vy * dt;
      for (const pl of this.plats) {
        if (aabb({ x: e.x - 26, y: e.y - 78, w: 52, h: 78 }, pl) && e.vy >= 0 && e.y - e.vy * dt <= pl.y + 14) {
          e.y = pl.y;
          e.vy = 0;
        }
      }
      e.cool -= dt;
      if (e.cool <= 0 && dist < 900) {
        e.cool = e.kind === "rifle" ? 1.6 + Math.random() * 1.2 : 2.6 + Math.random();
        if (e.kind === "rifle") {
          this.bullets.push({ x: e.x + e.facing * 46, y: e.y - 44, vx: 560 * e.facing, vy: 0, dmg: 1, life: 2, kind: "enemy", r: 5 });
          tinyShot();
        } else {
          this.grenades.push({ x: e.x, y: e.y - 60, vx: 320 * e.facing, vy: -620, fuse: 1.4, fromEnemy: true });
        }
      }
      if (aabb({ x: e.x - 26, y: e.y - 78, w: 52, h: 78 }, { x: p.x - 23, y: p.y - 80, w: 46, h: 80 })) this.hurt();
    }
    this.enemies = this.enemies.filter((e) => e.hp > 0);

    // POWs
    for (const pw2 of this.pows) {
      if (!pw2.freed && Math.abs(pw2.x - p.x) < 60 && Math.abs(pw2.y - p.y) < 100) {
        pw2.freed = true;
        pw2.salute = 1.6;
        this.score += 500;
        this.powsFreed++;
        sfx.pow();
        this.drops.push({ x: pw2.x + 40, y: pw2.y - 120, kind: pw2.drop, vy: 0 });
        this.burst(pw2.x, pw2.y - 60, 10, ["#f6f4ea", PAL.gold], 200, 700, 4, 0.5);
      }
      if (pw2.freed) pw2.salute = Math.max(0, pw2.salute - dt * 0.4);
    }

    // drops
    for (const d of this.drops) {
      d.vy += GRAVITY * dt;
      d.y = Math.min(GROUND_Y, d.y + d.vy * dt);
      if (d.y >= GROUND_Y) d.vy = 0;
      if (Math.abs(d.x - p.x) < 64 && Math.abs(d.y - p.y) < 110) {
        sfx.pickup();
        this.score += 100;
        if (d.kind === "GRENADE") this.grenadesLeft += 3;
        else if (d.kind === "LIFE") this.p.hearts = Math.min(5, this.p.hearts + 1);
        else {
          this.weapon = d.kind as WeaponId;
          this.ammo = WEAPONS[this.weapon].ammo;
        }
        d.y = -9999;
      }
    }
    this.drops = this.drops.filter((d) => d.y > -1000);

    for (const pt of this.parts) {
      pt.vy += pt.grav * dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.life -= dt;
    }
    this.parts = this.parts.filter((pt) => pt.life > 0);

    this.camX = Math.max(0, Math.min(this.mission.length - VIEW_W + 300, p.x - VIEW_W * 0.38));

    if (p.x >= this.mission.length) {
      this.ended = true;
      this.score += this.p.hearts * 300;
      sfx.victory();
      this.handlers.onWin(this.stats());
      return;
    }
    this.handlers.onStats(this.stats());
  }

  // ---------- render ----------
  private render() {
    const ctx = this.ctx;
    const m = this.mission;
    ctx.save();
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    drawBackground(ctx, m, this.camX, this.t, VIEW_W, VIEW_H);
    const sh = this.shake;
    ctx.translate(-this.camX + (Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);

    for (const pl of this.plats) drawTile(ctx, pl.x, pl.y, pl.w, Math.min(pl.h, 240), m.tile);

    // goal marker
    const gx = m.length;
    ctx.fillStyle = "#141118";
    ctx.fillRect(gx, GROUND_Y - 220, 8, 220);
    ctx.fillStyle = Math.floor(this.t * 4) % 2 ? "#2f9e44" : "#f2c14a";
    ctx.fillRect(gx + 8, GROUND_Y - 220, 90, 56);
    ctx.fillStyle = "#141118";
    ctx.font = "bold 20px monospace";
    ctx.fillText("EXTRA", gx + 14, GROUND_Y - 186);

    for (const pr of this.props) {
      if (pr.hp <= 0) continue;
      if (pr.kind === "barrel") drawBarrel(ctx, pr.x, pr.y, pr.w, pr.h, this.t);
      else if (pr.kind === "crate") drawCrate(ctx, pr.x, pr.y, pr.w, pr.h);
      else {
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = i % 2 ? "#232323" : "#2e2e2e";
          ctx.fillRect(pr.x + i * 22, pr.y, 24, pr.h);
          ctx.fillStyle = "#4a4a4a";
          ctx.fillRect(pr.x + i * 22 + 7, pr.y + 10, 10, pr.h - 20);
        }
      }
    }

    for (const pw2 of this.pows)
      outlined(ctx, pw2.x - 40, pw2.y - 84, 80, 88, (c) => drawPow(c, pw2.x, pw2.y, this.t, pw2.freed, pw2.salute));
    for (const d of this.drops) drawDrop(ctx, d.x, d.y, d.kind, this.t);
    for (const e of this.enemies)
      outlined(ctx, e.x - 46, e.y - 84, 110, 90, (c) =>
        drawEnemy(c, e.x, e.y, e.facing, this.t, e.kind, e.cool < 0.4, e.hit > 0),
      );

    for (const g of this.grenades) {
      ctx.fillStyle = g.fromEnemy ? "#5c3f20" : "#3f4a26";
      ctx.fillRect(g.x - 8, g.y - 14, 16, 18);
      ctx.fillStyle = "#9aa1a8";
      ctx.fillRect(g.x - 4, g.y - 18, 8, 5);
      if (Math.floor(this.t * 12) % 2) {
        ctx.fillStyle = "#ffe066";
        ctx.fillRect(g.x - 2, g.y - 22, 4, 4);
      }
    }

    for (const b of this.bullets) {
      if (b.kind === "rocket") {
        ctx.fillStyle = "#9aa1a8";
        ctx.fillRect(b.x - 14, b.y - 5, 28, 10);
        ctx.fillStyle = "#c8443a";
        ctx.fillRect(b.x + (b.vx > 0 ? 10 : -16), b.y - 5, 6, 10);
        ctx.fillStyle = "#ffe066";
        ctx.fillRect(b.x + (b.vx > 0 ? -20 : 14), b.y - 3, 8, 6);
      } else if (b.kind === "flame") {
        ctx.fillStyle = Math.random() < 0.5 ? "#ffb238" : "#ff6b1a";
        ctx.fillRect(b.x - 12, b.y - 12, 24, 24);
      } else if (b.kind === "enemy") {
        ctx.fillStyle = "#ff6b4a";
        ctx.fillRect(b.x - 6, b.y - 3, 12, 6);
      } else if (b.kind === "pellet") {
        ctx.fillStyle = "#f6f4ea";
        ctx.fillRect(b.x - 5, b.y - 3, 10, 5);
      } else {
        ctx.fillStyle = "#ffe066";
        ctx.fillRect(b.x - 9, b.y - 3, 18, 6);
        ctx.fillStyle = "#fff";
        ctx.fillRect(b.x - 3, b.y - 2, 6, 3);
      }
    }

    const p = this.p;
    outlined(ctx, p.x - 46, p.y - 96, 130, 100, (c) =>
      drawSoldier(c, p.x, p.y, p.facing, p.state, this.t, {
        recoil: p.recoil,
        weapon: this.weapon,
        hit: p.inv > 0 && Math.floor(this.t * 20) % 2 === 0,
      }),
    );
    if (p.recoil > 0.5) drawMuzzle(ctx, this.muzzleX(), this.muzzleY(), p.facing, this.weapon === "SHOTGUN" ? 1.7 : 1);

    for (const pt of this.parts) {
      ctx.globalAlpha = Math.max(0, Math.min(1, pt.life / pt.max));
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
    }
    ctx.globalAlpha = 1;

    // rain in the Amazon stage
    if (m.theme === "amazonas") {
      ctx.strokeStyle = "#bfe9ff44";
      ctx.lineWidth = 2;
      for (let i = 0; i < 70; i++) {
        const x = this.camX + ((i * 137 + this.t * 900) % VIEW_W);
        const y = (i * 271 + this.t * 1600) % VIEW_H;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 8, y + 26);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}

type Ctx2 = CanvasRenderingContext2D;

function tinyShot() {
  sfx.pistol();
}
