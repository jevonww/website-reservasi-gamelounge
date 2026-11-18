import { getCurrentUser } from "@/src/lib/auth/guards";
import { getSettings, FALLBACK_SETTINGS } from "@/src/lib/settings";
import { GlassNavbar } from "@/src/components/layout/GlassNavbar";
import { SiteFooter } from "@/src/components/layout/SiteFooter";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  let settings = FALLBACK_SETTINGS;
  try {
    settings = await getSettings();
  } catch (error) {
    console.error("Gagal memuat pengaturan lounge", error);
  }

  const user = await getCurrentUser();

  return (
    <>
      <GlassNavbar
        loungeName={settings.loungeName}
        user={user ? { name: user.name, role: user.role } : null}
      />
      <main className="flex-1 pt-24 sm:pt-28">{children}</main>
      <SiteFooter settings={settings} />
    </>
  );
}
