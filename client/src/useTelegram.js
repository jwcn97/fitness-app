// src/useTelegram.js
import { useEffect, useState } from "react";

/**
 * Waits for window.Telegram.WebApp to exist (Telegram injects it inside the Mini App).
 * Retries every 300ms until available. Returns the WebApp object or null while waiting.
 */
export function useTelegram(retries = 50, interval = 300) {
  const [tg, setTg] = useState(null);

  useEffect(() => {
    let attempts = 0;
    let mounted = true;

    const check = () => {
      attempts++;
      if (window.Telegram && window.Telegram.WebApp) {
        if (mounted) setTg(window.Telegram.WebApp);
        return;
      }
      if (attempts < retries) {
        setTimeout(check, interval);
      } else {
        // give up — remain null (useful for local dev)
        if (mounted) setTg(null);
      }
    };

    check();
    return () => {
      mounted = false;
    };
  }, [retries, interval]);

  return tg;
}
