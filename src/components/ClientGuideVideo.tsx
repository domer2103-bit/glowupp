/**
 * The 50-second "how to use GlowUpp" guide for homeowners who arrive through a tradesperson's
 * link or QR code. Plain <video>: no autoplay, nothing downloads until the viewer presses play.
 */
export const CLIENT_GUIDE_VIDEO = "/videos/client-how-to-use.mp4";
export const CLIENT_GUIDE_POSTER = "/videos/client-how-to-use-poster.jpg";

export function ClientGuideVideo({ className = "" }: { className?: string }) {
  return (
    <video
      className={`mx-auto aspect-[9/16] w-full max-w-[280px] rounded-2xl bg-[#132a4d] shadow-lg ${className}`}
      controls
      playsInline
      preload="none"
      poster={CLIENT_GUIDE_POSTER}
    >
      <source src={CLIENT_GUIDE_VIDEO} type="video/mp4" />
      Your browser can&apos;t play this video.
    </video>
  );
}
