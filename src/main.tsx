  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import "./lib/install";
  import { registerSW } from "virtual:pwa-register";
  import { toast } from "sonner";
  import { markUpdateWaiting, registerUpdater, updateWaiting } from "./lib/appUpdate";

  createRoot(document.getElementById("root")!).render(<App />);

  // Offline-capable app shell. A new version is applied by itself when that cannot disturb anyone's work:
  // right after the app is opened, or when it comes back from the background. Otherwise a banner offers it.
  if (import.meta.env.PROD) {
    const startedAt = Date.now();
    let hiddenAt: number | null = null;
    let registration: ServiceWorkerRegistration | undefined;

    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        markUpdateWaiting();
        if (Date.now() - startedAt < 20_000) { updateSW(true); return; }      // just opened: nothing to lose
        toast("A new version of the app is ready", {
          duration: Infinity,
          action: { label: "Update now", onClick: () => updateSW(true) },
        });
      },
      onRegisteredSW(_url, reg) {
        registration = reg;
        // look for a new version every 2 minutes while the app stays open (a tiny request), so a change reaches everyone quickly
        if (reg) setInterval(() => { reg.update().catch(() => {}); }, 2 * 60 * 1000);
      },
    });
    registerUpdater({ apply: () => { updateSW(true); }, check: async () => { await registration?.update(); } });

    // a waiting version is applied once the person has been idle for 45 seconds, unless they are in the middle of something
    // (a pop-up is open, or they are typing in a box). Queued photos and actions are kept on the device, so a reload loses nothing.
    let lastActive = Date.now();
    for (const ev of ["pointerdown", "keydown", "touchstart", "scroll", "input"]) window.addEventListener(ev, () => { lastActive = Date.now(); }, { passive: true });
    const busy = () => {
      if (document.querySelector('[role="dialog"]')) return true;
      const el = document.activeElement as HTMLElement | null;
      if (!el) return false;
      const typing = el.tagName === "TEXTAREA" || el.isContentEditable || (el.tagName === "INPUT" && !["button", "checkbox", "radio", "submit"].includes((el as HTMLInputElement).type));
      return typing && !!((el as HTMLInputElement).value ?? el.textContent);
    };
    setInterval(() => {
      if (updateWaiting() && document.visibilityState === "visible" && Date.now() - lastActive > 45_000 && !busy()) updateSW(true);
    }, 15_000);

    // coming back to the app: look for a new version, and apply it if the app has been away for a while
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") { hiddenAt = Date.now(); return; }
      registration?.update().catch(() => {});
      if (hiddenAt && Date.now() - hiddenAt > 5 * 60_000 && updateWaiting()) updateSW(true);
      hiddenAt = null;
    });
  }
