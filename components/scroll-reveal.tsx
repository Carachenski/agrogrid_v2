"use client";

import { useEffect } from "react";

// Revela elementos conforme entram na viewport (estilo Apple): o que já está
// visível aparece imediatamente; o que está abaixo da dobra sobe/aparece ao rolar.
// Observa [data-slot="card"] e qualquer [data-reveal], inclusive os adicionados
// dinamicamente (após carregar os dados).
export function ScrollReveal() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const io = new IntersectionObserver(
      (entries, obs) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("reveal-in");
            obs.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );

    const seen = new WeakSet<Element>();
    const scan = () => {
      const els = document.querySelectorAll<HTMLElement>('[data-slot="card"], [data-reveal]');
      els.forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        const top = el.getBoundingClientRect().top;
        if (top < window.innerHeight * 0.92) {
          // Já na área visível: sem estado escondido, aparece direto (sem flash).
          el.classList.add("reveal", "reveal-in");
        } else {
          el.classList.add("reveal");
          io.observe(el);
        }
      });
    };

    scan();
    const mo = new MutationObserver(() => scan());
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return null;
}
