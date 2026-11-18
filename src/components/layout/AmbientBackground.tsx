/**
 * Lapisan paling belakang untuk seluruh halaman (landing, dashboard member,
 * dan admin). Ganti path di bawah dengan file gambar Anda, misalnya
 * "/images/bg-lounge.jpg" setelah file ditaruh di public/images/.
 */
const BACKGROUND_IMAGE = "/images/hero-lounge.svg";

export function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-55"
        style={{ backgroundImage: `url("${BACKGROUND_IMAGE}")` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-ink/85 via-ink/75 to-ink" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(155,123,255,0.16),transparent_65%)]" />
      <div className="absolute inset-0 hero-light opacity-70" />
      <div className="orb animate-float-slow left-[-12%] top-[8%] h-[34rem] w-[34rem] bg-violet/35" />
      <div
        className="orb animate-float-slow right-[-14%] top-[26%] h-[28rem] w-[28rem] bg-cyan/20"
        style={{ animationDelay: "-4s" }}
      />
      <div
        className="orb animate-pulse-glow bottom-[-18%] left-[30%] h-[32rem] w-[32rem] bg-violet/25"
        style={{ animationDelay: "-2s" }}
      />
      <div className="ambient-grid absolute inset-0" />
      <div className="noise-overlay absolute inset-0" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
    </div>
  );
}
