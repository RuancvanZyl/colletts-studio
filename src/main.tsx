  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import "./lib/install";
  import { registerSW } from "virtual:pwa-register";
  import { toast } from "sonner";

  createRoot(document.getElementById("root")!).render(<App />);

  // Offline-capable app shell. A new version never replaces the screen under someone's hands:
  // they get a notice and switch when it suits them.
  if (import.meta.env.PROD) {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        toast("A new version of the app is ready", {
          duration: Infinity,
          action: { label: "Update now", onClick: () => updateSW(true) },
        });
      },
      onRegisteredSW(_url, reg) {
        // look for a new version every 30 minutes while the app stays open
        if (reg) setInterval(() => { reg.update().catch(() => {}); }, 30 * 60 * 1000);
      },
    });
  }
