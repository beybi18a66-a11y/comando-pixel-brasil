import { useCallback, useEffect, useRef, useState } from "react";
import { BrazilMap } from "@/components/BrazilMap";
import { sfx, setMuted, unlockAudio } from "@/game/audio";
import { Game, VIEW_H, VIEW_W, WEAPONS, type Stats, type WeaponId } from "@/game/engine";
import { MISSIONS } from "@/game/levels";

type Screen = "title" | "map" | "countdown" | "play" | "win" | "lose";

const EMPTY: Stats = {
  hearts: 3, weapon: "PISTOL", ammo: Infinity, grenades: 5, score: 0,
  coins: 0, progress: 0, pows: 0, powsTotal: 0, kills: 0,
};

function Hearts({ n }: { n: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: Math.max(3, n) }).map((_, i) => (
        <span key={i} className={i < n ? "text-hud-heart" : "text-hud-dim"}>
          ♥
        </span>
      ))}
    </div>
  );
}

export function ArcadeGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Game | null>(null);
  const [screen, setScreen] = useState<Screen>("title");
  const [mission, setMission] = useState(0);
  const [unlocked, setUnlocked] = useState(0);
  const [stats, setStats] = useState<Stats>(EMPTY);
  const [count, setCount] = useState(3);
  const [muted, setM] = useState(false);

  const stop = useCallback(() => {
    gameRef.current?.destroy();
    gameRef.current = null;
  }, []);

  useEffect(() => () => stop(), [stop]);

  const launch = useCallback(
    (idx: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      stop();
      const g = new Game(canvas, idx, {
        onStats: setStats,
        onWin: (s) => {
          setStats(s);
          setScreen("win");
          setUnlocked((u) => Math.max(u, Math.min(MISSIONS.length - 1, idx + 1)));
          stop();
        },
        onLose: (s) => {
          setStats(s);
          setScreen("lose");
          stop();
        },
      });
      gameRef.current = g;
      g.start();
      setScreen("play");
    },
    [stop],
  );

  // Mission countdown after radio confirmation
  useEffect(() => {
    if (screen !== "countdown") return;
    if (count <= 0) {
      launch(mission);
      return;
    }
    sfx.beep();
    const id = setTimeout(() => setCount((c) => c - 1), 700);
    return () => clearTimeout(id);
  }, [screen, count, mission, launch]);

  const selectMission = (i: number) => {
    unlockAudio();
    setMission(i);
    sfx.radio();
    setCount(3);
    setScreen("countdown");
  };

  const btn = (name: string) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      gameRef.current?.setBtn(name, true);
    },
    onPointerUp: () => gameRef.current?.setBtn(name, false),
    onPointerLeave: () => gameRef.current?.setBtn(name, false),
    onPointerCancel: () => gameRef.current?.setBtn(name, false),
  });

  const m = MISSIONS[mission] ?? MISSIONS[0]!;
  const wep = WEAPONS[stats.weapon as WeaponId];

  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col">
      <div className="relative aspect-[820/1180] w-full overflow-hidden border-4 border-hud-frame bg-black shadow-arcade">
        <canvas
          ref={canvasRef}
          width={VIEW_W}
          height={VIEW_H}
          className="h-full w-full touch-none [image-rendering:pixelated]"
        />

        {/* ---------- HUD ---------- */}
        {screen === "play" && (
          <>
            <div className="pointer-events-none absolute inset-x-0 top-0 p-2 font-pixel text-[10px] leading-relaxed text-hud-text">
              <div className="flex items-center justify-between gap-2 border-2 border-hud-frame bg-hud-panel/85 px-3 py-2 pr-24">
                <div className="space-y-1">
                  <Hearts n={stats.hearts} />
                  <div className="text-hud-dim">{m.code}</div>
                </div>
                <div className="space-y-1 text-center">
                  <div className="text-hud-accent">{wep?.label ?? "PISTOLA"}</div>
                  <div>{stats.ammo === Infinity ? "∞" : stats.ammo} BAL</div>
                </div>
                <div className="space-y-1 text-right">
                  <div>PTS {String(stats.score).padStart(6, "0")}</div>
                  <div className="text-hud-accent">
                    ✱{stats.grenades} ◎{stats.coins}
                  </div>
                </div>
              </div>
              <div className="mt-1 h-2 border-2 border-hud-frame bg-hud-panel/85">
                <div className="h-full bg-hud-accent" style={{ width: `${stats.progress * 100}%` }} />
              </div>
            </div>

            {/* mobile controls */}
            <div className="absolute inset-x-0 bottom-0 flex select-none items-end justify-between p-3 font-pixel text-[11px] md:hidden">
              <div className="flex gap-2">
                <TouchBtn label="◀" {...btn("left")} />
                <TouchBtn label="▶" {...btn("right")} />
                <TouchBtn label="▼" {...btn("down")} />
              </div>
              <div className="flex gap-2">
                <TouchBtn label="G" {...btn("grenade")} />
                <TouchBtn label="▲" {...btn("jump")} />
                <TouchBtn label="●" accent {...btn("fire")} />
              </div>
            </div>
          </>
        )}

        {/* ---------- TITLE ---------- */}
        {screen === "title" && (
          <Overlay>
            <p className="font-pixel text-[10px] text-hud-accent">ARCADE RUN &amp; GUN · 16-BIT</p>
            <h1 className="mt-4 font-pixel text-2xl leading-tight text-hud-text drop-shadow-[4px_4px_0_var(--hud-shadow)]">
              COMANDO<br />BRASIL
            </h1>
            <p className="mt-3 font-pixel text-xs text-hud-heart">OPERAÇÃO NACIONAL</p>
            <p className="mt-6 max-w-xs font-pixel text-[9px] leading-loose text-hud-dim">
              A/D CORRER · W PULAR · S AGACHAR<br />ESPAÇO ATIRAR · G GRANADA
            </p>
            <ArcadeButton
              onClick={() => {
                unlockAudio();
                sfx.beep();
                setScreen("map");
              }}
            >
              INSERIR FICHA
            </ArcadeButton>
          </Overlay>
        )}

        {/* ---------- WORLD MAP ---------- */}
        {screen === "map" && (
          <Overlay align="start">
            <p className="font-pixel text-[10px] text-hud-accent">SELECIONAR MISSÃO</p>
            <h2 className="mt-2 font-pixel text-base text-hud-text">MAPA TÁTICO</h2>
            <div className="mt-3 h-[320px] w-full max-w-[300px] border-2 border-hud-frame bg-radar-bg p-1">
              <BrazilMap unlocked={unlocked} selected={mission} onSelect={(i) => setMission(i)} />
            </div>
            <div className="mt-3 w-full max-w-[440px] space-y-2">
              {MISSIONS.map((mi, i) => {
                const locked = i > unlocked;
                return (
                  <button
                    key={mi.id}
                    disabled={locked}
                    onClick={() => setMission(i)}
                    className={`flex w-full items-center gap-3 border-2 px-3 py-2 text-left font-pixel text-[9px] transition-colors ${
                      locked
                        ? "border-hud-dim/40 bg-hud-panel/40 text-hud-dim"
                        : mission === i
                          ? "border-hud-accent bg-hud-accent/20 text-hud-text"
                          : "border-hud-frame bg-hud-panel/70 text-hud-dim hover:border-hud-accent"
                    }`}
                  >
                    <span className={`shrink-0 ${mi.theme}-chip h-10 w-14 border-2 border-hud-frame`} />
                    <span className="min-w-0">
                      <span className="block text-hud-accent">
                        {mi.code}: {mi.name}
                      </span>
                      <span className="block text-hud-dim">{mi.region}</span>
                      <span className="mt-1 block leading-relaxed">{locked ? "🔒 BLOQUEADA" : mi.brief}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <ArcadeButton onClick={() => selectMission(mission)}>INICIAR MISSÃO</ArcadeButton>
          </Overlay>
        )}

        {/* ---------- COUNTDOWN ---------- */}
        {screen === "countdown" && (
          <Overlay>
            <p className="font-pixel text-[10px] text-hud-accent">◤ RÁDIO MILITAR ◢</p>
            <p className="mt-4 font-pixel text-sm text-hud-text">MISSÃO CONFIRMADA!</p>
            <p className="mt-3 font-pixel text-[10px] text-hud-dim">
              {m.code} — {m.name}
            </p>
            <p className="mt-1 font-pixel text-[9px] text-hud-dim">{m.region}</p>
            <p className="mt-8 font-pixel text-5xl text-hud-heart">{count > 0 ? count : "GO!"}</p>
          </Overlay>
        )}

        {/* ---------- WIN / LOSE ---------- */}
        {(screen === "win" || screen === "lose") && (
          <Overlay>
            <h2
              className={`font-pixel text-xl ${screen === "win" ? "text-hud-accent" : "text-hud-heart"} drop-shadow-[3px_3px_0_var(--hud-shadow)]`}
            >
              {screen === "win" ? "MISSÃO CUMPRIDA!" : "SOLDADO ABATIDO!"}
            </h2>
            <div className="mt-6 w-full max-w-[320px] space-y-2 border-2 border-hud-frame bg-hud-panel/80 p-4 font-pixel text-[10px] text-hud-text">
              <Row k="PONTUAÇÃO" v={String(stats.score).padStart(6, "0")} />
              <Row k="INIMIGOS" v={`${stats.kills}`} />
              <Row k="REFÉNS" v={`${stats.pows}/${stats.powsTotal}`} />
              <Row k="MOEDAS" v={`${stats.coins}`} />
              <Row k="VIDAS" v={"♥".repeat(Math.max(0, stats.hearts))} />
            </div>
            {screen === "win" && mission + 1 < MISSIONS.length && (
              <p className="mt-4 font-pixel text-[9px] text-hud-accent">
                DESBLOQUEADA: {MISSIONS[mission + 1]?.name}
              </p>
            )}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {screen === "lose" && <ArcadeButton onClick={() => selectMission(mission)}>TENTAR NOVAMENTE</ArcadeButton>}
              {screen === "win" && mission + 1 < MISSIONS.length && (
                <ArcadeButton
                  onClick={() => {
                    setMission(mission + 1);
                    setScreen("map");
                  }}
                >
                  PRÓXIMA MISSÃO
                </ArcadeButton>
              )}
              <ArcadeButton variant="ghost" onClick={() => setScreen("map")}>
                VOLTAR AO MAPA
              </ArcadeButton>
            </div>
          </Overlay>
        )}

        <button
          onClick={() => {
            const v = !muted;
            setM(v);
            setMuted(v);
          }}
          className="absolute bottom-2 left-2 z-20 border-2 border-hud-frame bg-hud-panel/80 px-2 py-1 font-pixel text-[9px] text-hud-dim"
          aria-label="Alternar som"
        >
          {muted ? "SOM OFF" : "SOM ON"}
        </button>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-hud-dim">{k}</span>
      <span>{v}</span>
    </div>
  );
}

function Overlay({ children, align = "center" }: { children: React.ReactNode; align?: "center" | "start" }) {
  return (
    <div
      className={`absolute inset-0 z-10 flex flex-col items-center overflow-y-auto bg-hud-overlay px-5 py-8 text-center ${
        align === "center" ? "justify-center" : "justify-start"
      }`}
    >
      {children}
    </div>
  );
}

function ArcadeButton({
  children,
  onClick,
  variant = "solid",
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "solid" | "ghost";
}) {
  return (
    <button
      onClick={onClick}
      className={`mt-6 border-4 px-5 py-3 font-pixel text-[11px] transition-transform active:translate-y-1 ${
        variant === "solid"
          ? "border-hud-frame bg-hud-accent text-hud-panel shadow-[4px_4px_0_var(--hud-shadow)]"
          : "border-hud-frame bg-hud-panel/70 text-hud-dim"
      }`}
    >
      {children}
    </button>
  );
}

function TouchBtn({
  label,
  accent,
  ...rest
}: { label: string; accent?: boolean } & React.ComponentProps<"button">) {
  return (
    <button
      {...rest}
      className={`h-16 w-16 border-4 border-hud-frame font-pixel text-sm ${
        accent ? "bg-hud-heart text-hud-text" : "bg-hud-panel/80 text-hud-text"
      } active:translate-y-1`}
    >
      {label}
    </button>
  );
}
