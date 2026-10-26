import Image from "next/image";
import Link from "next/link";
import { BLOG_POSTS, blogPath } from "@/lib/blog";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Home improvement ideas and guides | GlowUpp blog",
  description: "Practical guides and ideas for your kitchen, bathroom, garden and home exterior, from GlowUpp.",
  path: "/blog",
});

export default function BlogIndexPage() {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-gradient-to-b from-blue-50 to-white text-[#132a4d]">
      <div className="pointer-events-none absolute -top-16 -right-20 h-96 w-96 rounded-full bg-blue-300/45 blur-2xl" />
      <section className="relative mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-6 py-16 text-center">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">GlowUpp blog</span>
        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
          Ideas and guides for <span className="text-[#3a6694]">your home.</span>
        </h1>
        <p className="max-w-xl text-zinc-600">Practical tips for planning your next project, with ideas you can try on your own photos.</p>
      </section>

      <section className="relative mx-auto grid w-full max-w-4xl gap-6 px-6 pb-20 sm:grid-cols-2">
        {BLOG_POSTS.map((post) => (
          <Link key={post.slug} href={blogPath(post.slug)} className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <Image src={post.heroSrc} alt={post.heroAlt} width={1200} height={420} className="h-40 w-full object-cover" />
            <div className="flex flex-1 flex-col gap-2 p-5">
              <h2 className="text-lg font-semibold leading-snug group-hover:text-[#3a6694]">{post.title}</h2>
              <p className="text-sm text-zinc-600">{post.description}</p>
              <span className="mt-auto pt-2 text-xs text-zinc-500">
                {new Date(post.published).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              </span>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
