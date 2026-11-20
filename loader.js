/* =========================================================
   Intro loader logic — Focus + Split (no libraries)
   - real progress: waits for fonts + the 3D scene ("scene:ready")
   - shows at least MIN_MS so it never flickers
   - fires "loader:exit" when it starts splitting open (the 3D intro starts then)
   ========================================================= */
(function () {
  const el = document.getElementById("loader");
  if (!el) return;
  document.documentElement.classList.add("is-loading");

  const NAME = el.dataset.name || "SAI KIRAN";
  const MIN_MS = 1800;            // minimum time on screen
  const SAFETY_MS = 12000;        // never block longer than this
  const EXIT_MS = 1250;           // length of the split animation

  // ---- build the letters ----
  const nameEl = el.querySelector(".ld-name");
  nameEl.innerHTML = NAME.split("").map((c, i) =>
    c === " " ? '<span class="ld-sp"></span>' : `<span class="ld-ch" style="--i:${i}"><span>${c}</span></span>`
  ).join("");

  const numEl = el.querySelector(".ld-num");
  const barEl = el.querySelector(".ld-bar i");

  // ---- readiness ----
  let sceneReady = !!window.__sceneReady, fontsReady = false;
  addEventListener("scene:ready", () => { sceneReady = true; }, { once: true });
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { fontsReady = true; });

  const start = performance.now();
  let shown = 0, exiting = false;

  // start the blur-to-sharp reveal on the next frame so CSS transitions run
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("go")));

  function frame(now) {
    if (exiting) return;
    const t = now - start;

    // progress: ease toward ~88% while waiting, then to 100% once ready
    const ready = (sceneReady && fontsReady) || t > SAFETY_MS;
    const creep = (fontsReady ? 88 : 60) * (1 - Math.exp(-t / 1300));
    const target = ready ? 100 : creep;
    shown += (target - shown) * (ready ? 0.1 : 0.06);
    if (ready && target - shown < 0.5) shown = 100;

    numEl.textContent = String(Math.floor(shown));
    barEl.style.transform = `scaleX(${shown / 100})`;

    if (shown >= 100 && t >= MIN_MS) return exit();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  function exit() {
    exiting = true;
    setTimeout(() => {
      window.__loaderExit = true;
      dispatchEvent(new Event("loader:exit"));
      el.classList.add("exit");
      document.documentElement.classList.remove("is-loading");
      setTimeout(() => {
        el.remove();
        window.__loaderDone = true;
        dispatchEvent(new Event("loader:done"));
      }, EXIT_MS);
    }, 250);   // tiny pause on 100% so it reads as "done"
  }

  // debug helper: __loader.finish() jumps to the end
  window.__loader = { finish: () => { sceneReady = fontsReady = true; shown = 100; } };
})();
