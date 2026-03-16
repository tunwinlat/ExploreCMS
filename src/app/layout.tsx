/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { Metadata } from "next";
import { cache } from "react";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";
import "./themes.css";

import { prisma } from "@/lib/db";
import { getThemeConfig } from "@/lib/themes";
import { ensureMigrations } from "@/lib/db-init";

// ⚡ Bolt: Memoize the siteSettings query to avoid duplicate database calls
// between generateMetadata and the RootLayout component during a single request.
const getSettings = cache(async () => {
  try {
    return await prisma.siteSettings.findUnique({
      where: { id: 'singleton' }
    });
  } catch {
    return null;
  }
});

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await getSettings();

    return {
      title: settings?.title || "ExploreCMS",
      description: "A modern, self-hosted minimalistic blogging platform.",
    };
  } catch (error) {
    // Fallback if DB isn't ready or Prisma throws
    return {
      title: "ExploreCMS",
      description: "A modern, self-hosted minimalistic blogging platform.",
    };
  }
}

function faviconType(url: string) {
  const lowerUrl = url.toLowerCase()
  if (lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg')) return 'image/jpeg'
  if (lowerUrl.endsWith('.png')) return 'image/png'
  if (lowerUrl.endsWith('.svg')) return 'image/svg+xml'
  if (lowerUrl.endsWith('.webp')) return 'image/webp'
  if (lowerUrl.endsWith('.gif')) return 'image/gif'
  return 'image/x-icon'
}

export default async function RootLayout({
  children,
  modal
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  // Ensure schema migrations are applied for LibSQL/Turso deployments
  await ensureMigrations();

  let themeId = 'default';
  let faviconUrl = '/favicon.ico';
  try {
    const settings = await getSettings();
    if (settings?.theme) themeId = settings.theme;
    if (settings?.faviconUrl) faviconUrl = settings.faviconUrl;
    console.log('[Layout] Favicon URL:', faviconUrl);
  } catch (error) {
    // Database might not be initialized yet
    console.log('[Layout] Error loading settings:', error);
  }

  const activeTheme = getThemeConfig(themeId);

  return (
    <html lang="en" suppressHydrationWarning data-theme={activeTheme.id}>
      <head>
        <meta charSet="utf-8" />
        <link rel="icon" href={faviconUrl} type={faviconType(faviconUrl)} sizes="any" />
        <link rel="shortcut icon" href={faviconUrl} type={faviconType(faviconUrl)} />
        <link rel="apple-touch-icon" href={faviconUrl} sizes="180x180" />
        <meta name="msapplication-TileImage" content={faviconUrl} />
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
