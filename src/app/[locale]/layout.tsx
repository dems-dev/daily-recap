import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "../globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/toast";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";

const inter = Inter({ subsets: ["latin"] });
// Display font for headings — gives the UI a distinct personality while body text stays Inter.
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Dashboard" });

  return {
    title: `Daily Recap | ${t("title")}`,
    description: t("metaDescription"),
    applicationName: "Daily Recap",
    appleWebApp: { capable: true, title: "Daily Recap", statusBarStyle: "default" },
    icons: {
      icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
      apple: "/icons/apple-touch-icon.png",
    },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default async function RootLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${inter.className} ${spaceGrotesk.variable} antialiased`}>
        <SessionProvider>
          <NextIntlClientProvider messages={messages}>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
              <Toaster />
              <ServiceWorkerRegister />
            </ThemeProvider>
          </NextIntlClientProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
