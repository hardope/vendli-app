import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

const STORAGE_KEY = 'vendli_pwa';

function read() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}
function write(patch) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...read(), ...patch })); } catch {}
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

function isIOS() {
  const ua = window.navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) && /safari/i.test(ua) && !/crios|chrome|fxios/i.test(ua);
}

export function usePWAInstall() {
  const location = useLocation();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [ios, setIos] = useState(false);
  const navCount = useRef(0);
  const shownThisSession = useRef(false);

  // Capture Chrome's install event before it fires automatically
  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  // Clear state once actually installed
  useEffect(() => {
    const onInstalled = () => { write({ installed: true }); setShowBanner(false); };
    window.addEventListener('appinstalled', onInstalled);
    return () => window.removeEventListener('appinstalled', onInstalled);
  }, []);

  useEffect(() => { setIos(isIOS()); }, []);

  // Decide whether to show the banner on each navigation
  useEffect(() => {
    navCount.current += 1;
    if (shownThisSession.current) return;
    if (navCount.current < 2) return; // wait for second page view
    if (isStandalone()) return;

    const stored = read();
    if (stored.installed || stored.dismissed) return;
    if (stored.snoozedUntil && Date.now() < stored.snoozedUntil) return;

    const t = setTimeout(() => {
      setShowBanner(true);
      shownThisSession.current = true;
    }, 1500);

    return () => clearTimeout(t);
  }, [location.pathname]);

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowBanner(false);
    if (outcome === 'dismissed') {
      // Declined the native prompt — try again in 30 days
      write({ snoozedUntil: Date.now() + 30 * 24 * 60 * 60 * 1000 });
    }
  };

  const dismiss = () => {
    setShowBanner(false);
    write({ dismissed: true }); // never show again on this device
  };

  const canShow = showBanner && (deferredPrompt !== null || ios);

  return { showBanner: canShow, ios, install, dismiss };
}
