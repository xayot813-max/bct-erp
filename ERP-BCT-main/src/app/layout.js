import "./globals.css";
import LanguageProvider from "@/providers/LanguageProvider";
import NextTopLoader from "nextjs-toploader";
import ScreenSizeGate from "@/components/shared/ScreenSizeGate";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import ChunkLoadRecovery from "@/components/providers/ChunkLoadRecovery";
import { cookies } from "next/headers";
import { normalizeLanguage } from "@/lib/i18n-utils";

export const metadata = {
  title: "BCT ERP — Бизнес Контрол ва Трекинг",
  description: "Ягона тизимда савдо, омбор, молия ва ишлаб чиқаришни бошқариш.",
};

const chunkRecoveryScript = `
(function () {
  var RECOVERY_KEY = "bct:next-static-recovery:v2";
  var RECOVERY_WINDOW = 15000;
  var MAX_ATTEMPTS = 3;
  var PATTERN = /ChunkLoadError|Loading chunk|_next\\/static|dynamically imported module|module script failed|failed to fetch dynamically imported module|application updated|application update/i;

  function now() {
    return Date.now ? Date.now() : new Date().getTime();
  }

  function readState() {
    try {
      return JSON.parse(sessionStorage.getItem(RECOVERY_KEY) || "{}");
    } catch (_) {
      return {};
    }
  }

  function writeState(state) {
    try {
      sessionStorage.setItem(RECOVERY_KEY, JSON.stringify(state));
    } catch (_) {}
  }

  function cleanRecoveryUrl() {
    var url = new URL(window.location.href);
    if (url.searchParams.has("__bct_reload")) {
      url.searchParams.delete("__bct_reload");
      try {
        window.history.replaceState(window.history.state, "", url.toString());
      } catch (_) {}
    }
    return url;
  }

  function getMessage(event) {
    if (!event) return "";
    var target = event.target || {};
    var reason = event.reason || {};
    var error = event.error || {};
    return [
      event.message,
      error.name,
      error.message,
      reason.name,
      reason.message,
      target.src,
      target.href
    ].filter(Boolean).join(" ");
  }

  function clearBrowserCaches() {
    try {
      if ("caches" in window) {
        caches.keys().then(function (keys) {
          keys.forEach(function (key) { caches.delete(key); });
        });
      }
    } catch (_) {}

    try {
      if (navigator.serviceWorker) {
        navigator.serviceWorker.getRegistrations().then(function (registrations) {
          registrations.forEach(function (registration) { registration.unregister(); });
        });
      }
    } catch (_) {}
  }

  function recover() {
    var state = readState();
    var current = now();
    var attempts = Number(state.attempts || 0);

    if (state.at && current - Number(state.at) < RECOVERY_WINDOW) return;
    if (attempts >= MAX_ATTEMPTS) return;

    writeState({ at: current, attempts: attempts + 1 });
    clearBrowserCaches();

    var url = cleanRecoveryUrl();
    window.location.replace(url.toString());
  }

  cleanRecoveryUrl();

  window.addEventListener("error", function (event) {
    if (PATTERN.test(getMessage(event))) recover();
  }, true);

  window.addEventListener("unhandledrejection", function (event) {
    if (PATTERN.test(getMessage(event))) recover();
  });
})();
`;

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const initialLanguage = normalizeLanguage(cookieStore.get("i18nextLng")?.value || "ru");

  return (
    <html lang={initialLanguage} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: chunkRecoveryScript }} />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <LanguageProvider initialLanguage={initialLanguage}>
            <NextTopLoader
              color="var(--accent)"              // rang
              initialPosition={0.08}    // boshlang‘ich progress
              crawlSpeed={200}
              height={2}                // chiziq balandligi (px)
              crawl                     // sekin “yurish” effekti
              showSpinner={false}       // spinnerni o‘chirib qo‘yish
              easing="ease"
              speed={200}
              shadow={false}
            />
            <ScreenSizeGate>
              <ChunkLoadRecovery />
              <Toaster expand={true} position="top-center" richColors/>
              {children}
            </ScreenSizeGate>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
