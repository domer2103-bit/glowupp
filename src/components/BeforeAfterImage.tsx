import Image from "next/image";

/**
 * Renders a single wide before/after photo (generated as one composite,
 * see public/homepage/) with the Before/After pill badges and the
 * center slider-icon drawn as real HTML/CSS on top — not baked into the
 * image itself, so they stay crisp and are easy to restyle without
 * regenerating anything.
 */
export function BeforeAfterImage({
  src,
  alt,
  priority,
  width = 1200,
  height = 420,
}: {
  src: string;
  alt: string;
  priority?: boolean;
  width?: number;
  height?: number;
}) {
  return (
    <div className="relative">
      <Image src={src} alt={alt} width={width} height={height} className="w-full" priority={priority} />
      <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-xs font-medium text-white">Before</span>
      <span className="absolute right-3 top-3 rounded-full bg-[#3a6694] px-2.5 py-1 text-xs font-medium text-white">After</span>
      <span className="absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-sm text-zinc-700 shadow">
        ‹›
      </span>
    </div>
  );
}
