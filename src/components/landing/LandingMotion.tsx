"use client";

import { useEffect, type ReactNode } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Motion shell for the marketing landing page.
 *
 * Content is always visible by default — the engine only *enhances*. Reveals,
 * ambient drift, mouse parallax, magnetic buttons and count-ups all attach to
 * `data-*` hooks rendered by the section components, so the markup stays server
 * rendered and works with JS disabled. Honors `prefers-reduced-motion`: when set,
 * everything renders static and no listeners or rAF loop are installed.
 */
export default function LandingMotion({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();

  useEffect(() => {
    const root = document.getElementById("owely-landing");
    if (!root) return;

    const cleanups: Array<() => void> = [];

    // ---------- scroll reveals: IntersectionObserver + inline toggle ----------
    const showReveal = (el: HTMLElement) => {
      el.style.opacity = "1";
      el.style.transform = "none";
      el.removeAttribute("data-rv");
    };
    const revealEls = [...root.querySelectorAll<HTMLElement>("[data-reveal]")];

    if (reduced) {
      revealEls.forEach(showReveal);
    } else {
      revealEls.forEach((el) => {
        if (el.getBoundingClientRect().top > window.innerHeight * 0.9) {
          el.setAttribute("data-rv", "1");
          const d = parseFloat(el.getAttribute("data-delay") || "0") / 1000;
          el.style.transition =
            `opacity .7s cubic-bezier(.2,.7,.2,1) ${d}s, transform .7s cubic-bezier(.2,.7,.2,1) ${d}s`;
          el.style.opacity = "0";
          el.style.transform = "translateY(34px)";
        }
      });

      if ("IntersectionObserver" in window) {
        const io = new IntersectionObserver(
          (entries, obs) => {
            entries.forEach((e) => {
              if (e.isIntersecting) {
                showReveal(e.target as HTMLElement);
                obs.unobserve(e.target);
              }
            });
          },
          { threshold: 0.12, rootMargin: "0px 0px -7% 0px" },
        );
        revealEls.forEach((el) => {
          if (el.hasAttribute("data-rv")) io.observe(el);
        });
        cleanups.push(() => io.disconnect());
      } else {
        revealEls.forEach(showReveal);
      }

      // failsafe — never leave anything on-screen hidden
      const failsafe = window.setTimeout(() => {
        root.querySelectorAll<HTMLElement>("[data-reveal][data-rv]").forEach((el) => {
          if (el.getBoundingClientRect().top < window.innerHeight * 1.15) showReveal(el);
        });
      }, 2200);
      cleanups.push(() => window.clearTimeout(failsafe));
    }

    // ---------- count-ups (one-shot; final value already present in markup) ----------
    const countUp = (el: HTMLElement) => {
      const target = parseFloat(el.getAttribute("data-count") || "0") || 0;
      const suffix = el.getAttribute("data-suffix") || "";
      const prefix = el.getAttribute("data-prefix") || "";
      if (reduced) {
        el.textContent = prefix + target.toLocaleString("en-IN") + suffix;
        return;
      }
      const dur = 1300;
      const start = performance.now();
      const step = (now: number) => {
        const p = Math.min(1, (now - start) / dur);
        const val = Math.round(target * (1 - Math.pow(1 - p, 3)));
        el.textContent = prefix + val.toLocaleString("en-IN") + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const countEls = [...root.querySelectorAll<HTMLElement & { __counted?: boolean }>("[data-count]")];
    if ("IntersectionObserver" in window && !reduced) {
      const cio = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            const el = e.target as HTMLElement & { __counted?: boolean };
            if (!e.isIntersecting || el.__counted) return;
            el.__counted = true;
            countUp(el);
            cio.unobserve(el);
          });
        },
        { threshold: 0.6 },
      );
      countEls.forEach((el) => cio.observe(el));
      cleanups.push(() => cio.disconnect());
    } else {
      countEls.forEach(countUp);
    }

    // ---------- scroll: nav state + progress bar ----------
    const nav = root.querySelector<HTMLElement>("[data-nav]");
    const progress = root.querySelector<HTMLElement>("[data-progress]");
    const onScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop;
      if (nav) {
        if (y > 40) {
          nav.style.background = "rgba(13,12,17,.82)";
          nav.style.borderBottomColor = "rgba(255,255,255,.08)";
          nav.style.backdropFilter = "blur(16px)";
          nav.style.setProperty("-webkit-backdrop-filter", "blur(16px)");
        } else {
          nav.style.background = "transparent";
          nav.style.borderBottomColor = "transparent";
          nav.style.backdropFilter = "none";
          nav.style.setProperty("-webkit-backdrop-filter", "none");
        }
      }
      if (progress) {
        const h = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.width = (h > 0 ? (y / h) * 100 : 0) + "%";
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    cleanups.push(() => window.removeEventListener("scroll", onScroll));
    onScroll();

    if (!reduced) {
      // ---------- single rAF engine: absolute-time driven ----------
      const TWO_PI = Math.PI * 2;
      const t0 = performance.now();
      let raf = 0;
      let alive = true;
      const frame = (now: number) => {
        if (!alive) return;
        const t = now - t0;

        const marq = root.querySelector<HTMLElement>("[data-marquee]");
        if (marq) marq.style.transform = `translateX(${-((t % 26000) / 26000) * 50}%)`;

        root.querySelectorAll<HTMLElement>("[data-floatloop]").forEach((el) => {
          const k = el.getAttribute("data-floatloop");
          if (k === "B") el.style.transform = `translateY(${Math.sin((t / 6000) * TWO_PI) * 6.5 + 6.5}px)`;
          else if (k === "C")
            el.style.transform = `translateY(${Math.sin((t / 7000) * TWO_PI) * -5.5 - 5.5}px) rotate(-3deg)`;
          else el.style.transform = `translateY(${Math.sin((t / 5000) * TWO_PI) * -7.5 - 7.5}px)`;
        });

        root.querySelectorAll<HTMLElement>("[data-drift]").forEach((el) => {
          const k = el.getAttribute("data-drift");
          const s = Math.sin((t / (k === "2" ? 19000 : 16000)) * TWO_PI) * 0.5 + 0.5;
          el.style.transform =
            k === "2"
              ? `translate(${-40 * s}px,${28 * s}px)`
              : `translate(${46 * s}px,${34 * s}px)`;
        });

        root.querySelectorAll<HTMLElement>("[data-pulse]").forEach((el) => {
          const s = Math.sin((t / 1800) * TWO_PI) * 0.5 + 0.5;
          el.style.opacity = String(0.35 + 0.65 * s);
          el.style.transform = `scale(${0.55 + 0.45 * s})`;
        });

        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
      cleanups.push(() => {
        alive = false;
        cancelAnimationFrame(raf);
      });

      // ---------- hero mouse parallax + spotlight ----------
      const hero = root.querySelector<HTMLElement>("[data-hero]");
      const floats = root.querySelectorAll<HTMLElement>("[data-float]");
      const spot = root.querySelector<HTMLElement>("[data-spotlight]");
      if (hero) {
        const onMove = (ev: MouseEvent) => {
          const r = hero.getBoundingClientRect();
          const mx = (ev.clientX - r.left) / r.width - 0.5;
          const my = (ev.clientY - r.top) / r.height - 0.5;
          floats.forEach((el) => {
            const d = parseFloat(el.getAttribute("data-float") || "0");
            el.style.transform = `translate(${mx * d}px,${my * d}px)`;
          });
          if (spot) {
            spot.style.left = ev.clientX - r.left + "px";
            spot.style.top = ev.clientY - r.top + "px";
          }
        };
        const onLeave = () => {
          floats.forEach((el) => {
            el.style.transform = "translate(0,0)";
          });
          if (spot) spot.style.left = "-9999px";
        };
        hero.addEventListener("mousemove", onMove);
        hero.addEventListener("mouseleave", onLeave);
        cleanups.push(() => {
          hero.removeEventListener("mousemove", onMove);
          hero.removeEventListener("mouseleave", onLeave);
        });
      }

      // ---------- magnetic buttons ----------
      root.querySelectorAll<HTMLElement>("[data-magnet]").forEach((btn) => {
        const move = (ev: MouseEvent) => {
          const r = btn.getBoundingClientRect();
          btn.style.transform =
            `translate(${(ev.clientX - r.left - r.width / 2) * 0.28}px,${(ev.clientY - r.top - r.height / 2) * 0.4}px)`;
        };
        const leave = () => {
          btn.style.transform = "translate(0,0)";
        };
        btn.addEventListener("mousemove", move);
        btn.addEventListener("mouseleave", leave);
        cleanups.push(() => {
          btn.removeEventListener("mousemove", move);
          btn.removeEventListener("mouseleave", leave);
        });
      });
    }

    return () => cleanups.forEach((fn) => fn());
  }, [reduced]);

  return (
    <div
      id="owely-landing"
      className="relative overflow-x-hidden bg-ink text-hi"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      {children}
    </div>
  );
}
