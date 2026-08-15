import { createFileRoute } from "@tanstack/react-router";
import { ArcadeGame } from "@/components/ArcadeGame";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Comando Brasil: Operação Nacional — Run & Gun Arcade" },
      {
        name: "description",
        content:
          "Run and gun 2D em pixel art 16-bit pelo Brasil: Amazônia, Sertão, Costa Capixaba e Rocinha. Liberte reféns, pegue armas e cumpra a missão.",
      },
      { property: "og:title", content: "Comando Brasil: Operação Nacional" },
      {
        property: "og:description",
        content: "Arcade run & gun estilo Metal Slug com 4 missões brasileiras em pixel art 16-bit.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="min-h-screen bg-background px-3 py-6">
      <ArcadeGame />
      <p className="mx-auto mt-4 max-w-[820px] text-center font-pixel text-[9px] leading-loose text-hud-dim">
        COMANDO BRASIL · OPERAÇÃO NACIONAL — 4 MISSÕES · 5 ARMAS · REFÉNS P.O.W.
      </p>
    </main>
  );
}
