import { Poppins } from "next/font/google";
import "./globals.css";
import LanguageProvider from "@/providers/LanguageProvider";
import NextTopLoader from "nextjs-toploader";
import ScreenSizeGate from "@/components/shared/ScreenSizeGate";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import ChunkLoadRecovery from "@/components/providers/ChunkLoadRecovery";
import { cookies } from "next/headers";
import { normalizeLanguage } from "@/lib/i18n-utils";

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"], // barcha qalinliklar
});

export const metadata = {
  title: "BCT ERP — Бизнес Контрол ва Трекинг",
  description: "Ягона тизимда савдо, омбор, молия ва ишлаб чиқаришни бошқариш.",
};

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const initialLanguage = normalizeLanguage(cookieStore.get("i18nextLng")?.value || "ru");

  return (
    <html lang={initialLanguage} suppressHydrationWarning>
      <body className={`${poppins.variable} antialiased font-poppins`}>
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
