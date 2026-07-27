"use client";

import { useEffect, useRef } from "react";

// Fundo real do hero: vídeo em loop (movimento) com foto de fallback (poster).
// Coloque os arquivos em /public:
//   public/hero-farm.mp4  -> vídeo curto, mudo, em loop
//   public/hero-farm.jpg  -> imagem de fallback/poster (opcional)
// Alguns navegadores pausam vídeos de fundo depois de um tempo — aqui forçamos
// o replay (no fim, ao pausar inesperadamente e ao voltar o foco da aba).
export function HeroMedia() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;

    const play = () => {
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    };
    play();

    const onEnded = () => {
      v.currentTime = 0;
      play();
    };
    const onPause = () => {
      // Se pausou sozinho (aba visível), retoma
      if (!document.hidden && !v.ended) play();
    };
    const onVisible = () => {
      if (!document.hidden) play();
    };

    v.addEventListener("ended", onEnded);
    v.addEventListener("pause", onPause);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      v.removeEventListener("ended", onEnded);
      v.removeEventListener("pause", onPause);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <video
        ref={ref}
        className="h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster="/hero-farm.jpg"
      >
        <source src="/hero-farm.mp4" type="video/mp4" />
      </video>

      {/* Overlay para legibilidade do texto + blend com o conteúdo abaixo */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/75 via-background/55 to-background" />
      <div className="absolute inset-0 bg-background/15" />
    </div>
  );
}
