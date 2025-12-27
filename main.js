gsap.registerPlugin(ScrollTrigger);
gsap.ticker.lagSmoothing(500, 33);

ScrollTrigger.config({
  ignoreMobileResize: true,
  limitCallbacks: true,
});

window.addEventListener("load", () => {
  ScrollTrigger.refresh();
});

function setBgImage(el, url) {
  if (!el || !url) return;
  const bg = `url("${url}")`;
  // Store on a CSS var so child parallax layers can read it without repaint-heavy background-position tweens.
  el.style.setProperty("--bg-image", bg);
  el.style.backgroundImage = bg;

  const inner = el.querySelector && el.querySelector(":scope > .bg-inner");
  if (inner) inner.style.backgroundImage = bg;
}

function ensureBgInner(el) {
  if (!el) return null;
  let inner = el.firstElementChild;
  if (!inner || !inner.classList || !inner.classList.contains("bg-inner")) {
    inner = document.createElement("div");
    inner.className = "bg-inner";
    el.prepend(inner);
  }
  // Prefer computed background-image if already hydrated
  const computedBg = getComputedStyle(el).backgroundImage;
  if (computedBg && computedBg !== "none") {
    inner.style.backgroundImage = computedBg;
    el.style.setProperty("--bg-image", computedBg);
    // Avoid double-painting (parent background + inner background)
    el.style.backgroundImage = "none";
  }
  return inner;
}

// Hydrate background images from HTML data attributes + optional fallback
document.querySelectorAll("[data-image]").forEach((el) => {
  const primaryUrl = el.getAttribute("data-image");
  const fallbackUrl = el.getAttribute("data-fallback-image");
  if (!primaryUrl) return;

  if (!fallbackUrl) {
    setBgImage(el, primaryUrl);
    return;
  }

  const probe = new Image();
  probe.onload = () => setBgImage(el, primaryUrl);
  probe.onerror = () => setBgImage(el, fallbackUrl);
  probe.src = primaryUrl;
});

// Build transform-based parallax layers for frames (cheaper than animating background-position).
const parallaxFrames = gsap.utils.toArray(".editorial-image, .piece-image, .lifestyle-frame, .product");
parallaxFrames.forEach((el) => {
  ensureBgInner(el);
});

const prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (prefersReducedMotion) {
  // Keep content visible and avoid scroll-driven motion
  gsap.set(
    [
      ".hero-arch__canvas",
      ".hero-arch__headline",
      ".hero-arch__sub",
      ".hero-arch__micro",
      ".hero-arch__cta",
      ".hero-arch__image-inner",
      ".lux-cursor",
      ".reveal",
      ".product",
      ".editorial-image",
      ".piece-image",
      ".lifestyle-frame",
    ],
    { clearProps: "all" }
  );
} else {
  gsap.defaults({ ease: "power1.out", duration: 1.6 });

  // HERO: Ultra-luxury architectural (broken grid + monochrome)
  const hero = document.querySelector(".hero-arch");
  const heroCanvas = document.querySelector(".hero-arch__canvas");
  const heroImageInner = document.querySelector(".hero-arch__image-inner");
  const headline = document.querySelector(".hero-arch__headline");
  const sub = document.querySelector(".hero-arch__sub");
  const micros = gsap.utils.toArray(".hero-arch__micro");
  const cta = document.querySelector(".hero-arch__cta");
  const headlineInner = document.querySelector(".hero-arch__headline .lux-mask__inner");
  const subInner = document.querySelector(".hero-arch__sub .lux-mask__inner");
  const heroType = document.querySelector(".hero-arch__type");
  const heroImage = document.querySelector(".hero-arch__image");

  // Ensure the inner uses the hydrated background-image
  if (heroImageInner) {
    const parent = heroImageInner.closest(".hero-arch__image");
    if (parent) heroImageInner.style.backgroundImage = getComputedStyle(parent).backgroundImage;
  }

  // Entrance: staggered reveal + mask slide-up + image scales down 1.1 -> 1.0
  gsap.set([headline, sub, cta], { opacity: 0, y: 22 });
  gsap.set(micros, { opacity: 0, y: 10 });
  if (heroType) gsap.set(heroType, { x: 0, y: 0 });
  if (heroImage) gsap.set(heroImage, { x: 0, y: 0 });

  if (headlineInner) gsap.set(headlineInner, { yPercent: 110, opacity: 0 });
  if (subInner) gsap.set(subInner, { yPercent: 110, opacity: 0 });

  if (heroImageInner) gsap.set(heroImageInner, { scale: 1.10 });
  if (heroCanvas) gsap.set(heroCanvas, { opacity: 0, scale: 1.06 });

  const heroTL = gsap.timeline({ defaults: { ease: "power2.out" } });
  heroTL
    .to(heroCanvas, { opacity: 1, scale: 1.02, duration: 2.8, ease: "sine.out" }, 0)
    .to(heroImageInner, { scale: 1.0, duration: 3.0, ease: "power1.out" }, 0.15)
    // Create a premium "opening gap" between type and image as the hero settles
    .to(heroType, { x: -14, duration: 2.6, ease: "sine.inOut", force3D: true }, 0.25)
    .to(heroImage, { x: 14, duration: 2.6, ease: "sine.inOut", force3D: true }, 0.25)
    .to(micros, { opacity: 1, y: 0, duration: 1.2, stagger: 0.12 }, 0.35)
    .to(headline, { opacity: 1, y: 0, duration: 1.6 }, 0.55)
    .to(headlineInner, { yPercent: 0, opacity: 1, duration: 1.4, ease: "power3.out" }, 0.55)
    .to(sub, { opacity: 1, y: 0, duration: 1.35 }, 0.82)
    .to(subInner, { yPercent: 0, opacity: 1, duration: 1.2, ease: "power3.out" }, 0.82)
    .to(cta, { opacity: 1, y: 0, duration: 1.4 }, 1.05);

  heroTL.eventCallback("onComplete", () => {
    ScrollTrigger.refresh();
  });

  // Ambient drift for canvas (subtle, GPU-friendly). Avoid animating gradient stops (can feel "laggy").
  if (heroCanvas) {
    gsap.to(heroCanvas, {
      x: 16,
      y: -12,
      duration: 22,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
    });

    gsap.to(heroCanvas, {
      rotation: 0.35,
      duration: 28,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
      transformOrigin: "50% 50%",
    });
  }

  // Scroll interaction: parallax. Foreground moves faster than background.
  if (hero) {
    ScrollTrigger.matchMedia({
      "(min-width: 981px)": function () {
        // No pin: smooth, natural scroll with subtle separation/parallax
        gsap.to(".hero-arch__type", {
          x: -26,
          y: -14,
          ease: "none",
          force3D: true,
          scrollTrigger: {
            trigger: hero,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.85,
            invalidateOnRefresh: true,
          },
        });

        gsap.to(".hero-arch__image", {
          x: 30,
          y: 18,
          ease: "none",
          force3D: true,
          scrollTrigger: {
            trigger: hero,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.85,
            invalidateOnRefresh: true,
          },
        });

        if (heroImageInner) {
          gsap.to(heroImageInner, {
            y: 36,
            scale: 1.015,
            ease: "none",
            force3D: true,
            scrollTrigger: {
              trigger: hero,
              start: "top bottom",
              end: "bottom top",
              scrub: 0.85,
              invalidateOnRefresh: true,
            },
          });
        }

        if (heroCanvas) {
          // Avoid combining scroll-scrub transforms with the infinite drift transforms on the same element.
          // Keeping the drift preserves the premium feel and prevents transform conflicts (jitter).
        }
      },
      "(max-width: 980px)": function () {
        // Mobile: no pin (keep it light)
        if (heroImageInner) {
          gsap.to(heroImageInner, {
            y: 34,
            ease: "none",
            scrollTrigger: {
              trigger: hero,
              start: "top bottom",
              end: "bottom top",
              scrub: 0.9,
              invalidateOnRefresh: true,
            },
          });
        }
        gsap.to([headline, sub, cta], {
          y: -18,
          ease: "none",
          scrollTrigger: {
            trigger: hero,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.9,
            invalidateOnRefresh: true,
          },
        });
      },
    });
  }

  // Magnetic circle cursor (expands on CTA hover)
  const cursor = document.querySelector(".lux-cursor");
  const finePointer = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (cursor && finePointer) {
    const moveX = gsap.quickTo(cursor, "x", { duration: 0.16, ease: "power3.out" });
    const moveY = gsap.quickTo(cursor, "y", { duration: 0.16, ease: "power3.out" });
    const scaleTo = gsap.quickTo(cursor, "scale", { duration: 0.18, ease: "power3.out" });
    const sizeTo = (w, h) => gsap.to(cursor, { width: w, height: h, duration: 0.22, ease: "power3.out" });
    const borderTo = (c) => gsap.to(cursor, { borderColor: c, duration: 0.22, ease: "power2.out" });

    let cursorShown = false;
    window.addEventListener("mousemove", (e) => {
      if (!cursorShown) {
        cursorShown = true;
        gsap.to(cursor, { opacity: 1, duration: 0.25, ease: "power2.out" });
      }
      moveX(e.clientX);
      moveY(e.clientY);
    }, { passive: true });

    if (cta) {
      const ctaX = gsap.quickTo(cta, "x", { duration: 0.35, ease: "power3.out" });
      const ctaY = gsap.quickTo(cta, "y", { duration: 0.35, ease: "power3.out" });
      let rect = null;

      const onEnter = () => {
        rect = cta.getBoundingClientRect();
        scaleTo(1);
        sizeTo(64, 64);
        borderTo("rgba(197,179,88,0.70)");
      };
      const onLeave = () => {
        sizeTo(14, 14);
        borderTo("rgba(26,26,26,0.32)");
        ctaX(0);
        ctaY(0);
      };
      const onMove = (e) => {
        if (!rect) rect = cta.getBoundingClientRect();
        const relX = e.clientX - (rect.left + rect.width / 2);
        const relY = e.clientY - (rect.top + rect.height / 2);
        ctaX(relX * 0.12);
        ctaY(relY * 0.12);
      };
      cta.addEventListener("mouseenter", onEnter);
      cta.addEventListener("mouseleave", onLeave);
      cta.addEventListener("mousemove", onMove);

      window.addEventListener("scroll", () => {
        rect = null;
      }, { passive: true });
      window.addEventListener("resize", () => {
        rect = null;
      });
    }
  }

  // NOTE: all hero motion is handled above; avoid any other hero triggers below.

  // Universal text reveals
  gsap.utils.toArray(".reveal").forEach((el) => {
    gsap.fromTo(
      el,
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 1.9,
        scrollTrigger: {
          trigger: el,
          start: "top 80%",
          end: "bottom 60%",
          toggleActions: "play none none reverse",
        },
      }
    );
  });

  // Editorial split motion
  gsap.fromTo(
    ".editorial-text",
    { opacity: 0, x: -24 },
    {
      opacity: 1,
      x: 0,
      duration: 2.0,
      scrollTrigger: {
        trigger: ".editorial",
        start: "top 72%",
      },
    }
  );

  gsap.fromTo(
    ".editorial-image",
    { opacity: 0, scale: 1.06 },
    {
      opacity: 1,
      scale: 1,
      duration: 2.2,
      scrollTrigger: {
        trigger: ".editorial",
        start: "top 72%",
      },
    }
  );

  // Parallax within image frames (background-position)
  // Parallax within image frames (transform-based)
  parallaxFrames.forEach((frame) => {
    const inner = ensureBgInner(frame);
    if (!inner) return;

    gsap.to(inner, {
      y: 70,
      ease: "none",
      force3D: true,
      scrollTrigger: {
        trigger: frame,
        start: "top bottom",
        end: "bottom top",
        scrub: 1.35,
        invalidateOnRefresh: true,
      },
    });
  });

  // Products: slow reveal + slight lift
  gsap.fromTo(
    ".product",
    { opacity: 0, y: 26 },
    {
      opacity: 1,
      y: 0,
      duration: 1.8,
      stagger: 0.16,
      scrollTrigger: {
        trigger: ".products",
        start: "top 70%",
      },
    }
  );

  // Hero piece: image first, then copy
  gsap.fromTo(
    ".piece-image",
    { opacity: 0, scale: 1.06 },
    {
      opacity: 1,
      scale: 1,
      duration: 2.3,
      scrollTrigger: {
        trigger: ".hero-piece",
        start: "top 72%",
      },
    }
  );

  gsap.fromTo(
    ".piece-text",
    { opacity: 0, y: 22 },
    {
      opacity: 1,
      y: 0,
      duration: 1.9,
      scrollTrigger: {
        trigger: ".hero-piece",
        start: "top 70%",
      },
    }
  );

  // CTA: gentle settle
  gsap.fromTo(
    ".cta .wrap",
    { opacity: 0, y: 18 },
    {
      opacity: 1,
      y: 0,
      duration: 1.9,
      scrollTrigger: {
        trigger: ".cta",
        start: "top 75%",
      },
    }
  );

  // Desktop-only editorial pacing: pin the collection image like a magazine spread
  ScrollTrigger.matchMedia({
    "(min-width: 981px)": function () {
      ScrollTrigger.create({
        trigger: ".editorial",
        start: "top top",
        end: "+=520",
        pin: ".editorial-image",
        pinSpacing: true,
        anticipatePin: 1,
      });

      // Runway spotlight linger: hold hero product slightly longer
      ScrollTrigger.create({
        trigger: ".hero-piece",
        start: "top top",
        end: "+=420",
        pin: ".piece-image",
        pinSpacing: true,
        anticipatePin: 1,
      });
    },
  });
}
