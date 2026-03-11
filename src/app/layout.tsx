import type { Metadata } from "next";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";
import "./themes.css";

import { prisma } from "@/lib/db";
import { getThemeConfig } from "@/lib/themes";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'singleton' }
    });

    return {
      title: settings?.title || "ExploreCMS",
      description: "A modern, self-hosted minimalistic blogging platform.",
      icons: settings?.faviconUrl ? {
        icon: settings.faviconUrl,
      } : undefined,
    };
  } catch (error) {
    // Fallback if DB isn't ready or Prisma throws
    return {
      title: "ExploreCMS",
      description: "A modern, self-hosted minimalistic blogging platform.",
    };
  }
}

export default async function RootLayout({
  children,
  modal
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  let themeId = 'default';
  try {
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'singleton' }
    });
    if (settings?.theme) {
      themeId = settings.theme;
    }
  } catch (error) {
    // Database might not be initialized yet
  }

  const activeTheme = getThemeConfig(themeId);

  return (
    <html lang="en" suppressHydrationWarning data-theme={activeTheme.id}>
      <head>
        {activeTheme.fontUrl && (
          <link href={activeTheme.fontUrl} rel="stylesheet" />
        )}
      </head>
      <body>
        <ThemeProvider>
          {children}
          {modal}
        </ThemeProvider>
      </body>
    </html>
  );
}
