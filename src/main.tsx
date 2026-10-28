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
        // look for a new version every 30 minutes while the app stays open
        if (reg) setInterval(() => { reg.update().catch(() => {}); }, 30 * 60 * 1000);
      },
    });
    registerUpdater({ apply: () => { updateSW(true); }, check: async () => { await registration?.update(); } });

    // coming back to the app: look for a new version, and apply it if the app has been away for a while
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") { hiddenAt = Date.now(); return; }
      registration?.update().catch(() => {});
      if (hiddenAt && Date.now() - hiddenAt > 5 * 60_000 && updateWaiting()) updateSW(true);
      hiddenAt = null;
    });
  }
