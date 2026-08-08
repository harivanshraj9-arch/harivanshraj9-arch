/**
 * Capacitor integrations for the Android app shell.
 * Safe no-ops when running in a regular web browser.
 */
export async function initCapacitor() {
  if (typeof window === "undefined") return;
  // Only run inside a Capacitor native shell
  const isNative =
    !!(window && (window).Capacitor && (window).Capacitor.isNativePlatform && (window).Capacitor.isNativePlatform());
  if (!isNative) return;

  try {
    const { App } = await import("@capacitor/app");
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    const { SplashScreen } = await import("@capacitor/splash-screen");

    // Status bar → dark navy to match brand
    try {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: "#0B1E3F" });
    } catch {}

    // Hardware back button — go back in history or minimize app on home
    App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack && window.history.length > 1) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });

    // Hide splash after boot
    setTimeout(() => SplashScreen.hide().catch(() => {}), 500);
  } catch (e) {
    // Plugins missing (running as plain PWA) — ignore
    // eslint-disable-next-line no-console
    console.warn("Capacitor plugins init skipped:", e?.message);
  }
}
