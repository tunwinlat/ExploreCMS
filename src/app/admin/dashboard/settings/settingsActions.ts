/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

"use server";

import { verifySession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { normalizeUrl } from "@/lib/urlUtils";

export async function updateSiteSettings(
  title: string,
  faviconUrlInput: string | null,
  headerTitle: string,
  headerDescription: string,
  theme: string,
  footerText: string,
  sidebarAbout: string,
  dynamicPattern: boolean = true,
) {
  const payload = await verifySession();
  if (!payload || payload.role !== "OWNER") {
    throw new Error("Unauthorized");
  }

  const faviconUrl = faviconUrlInput ? normalizeUrl(faviconUrlInput) : null;

  try {
    await prisma.siteSettings.upsert({
      where: { id: "singleton" },
      update: {
        title,
        faviconUrl,
        headerTitle,
        headerDescription,
        theme,
        footerText,
        sidebarAbout,
        dynamicPattern,
      },
      create: {
        id: "singleton",
        title,
        faviconUrl,
        headerTitle,
        headerDescription,
        theme,
        footerText,
        sidebarAbout,
        dynamicPattern,
      },
    });

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    return { error: "Failed to update site settings" };
  }
}
