import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BeforeAfterImage } from "@/components/BeforeAfterImage";
import { JsonLd } from "@/components/JsonLd";
import { BLOG_POSTS, blogPath, getBlogPost } from "@/lib/blog";
import { getHomepageCategory } from "@/lib/homepage-categories";
import { articleJsonLd, breadcrumbJsonLd, categoryPath, faqJsonLd, pageMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(props: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const post = getBlogPost(slug);
  if (!post) return {};
  return pageMetadata({ title: `${post.title} | GlowUpp`, description: post.description, path: blogPath(post.slug) });
}

export default async function BlogPostPage(props: PageProps<"/blog/[slug]">) {
  const { slug } = await props.params;
  const post = getBlogPost(slug);
  if (!post) notFound();
  const category = getHomepageCategory(post.category);
  const related = post.related.map((s) => getBlogPost(s)).filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-gradient-to-b from-blue-50 to-white text-[#132a4d]">
      <JsonLd data={articleJsonLd(post)} />
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Blog", path: "/blog" }, { name: post.title, path: blogPath(post.slug) }])} />
      <JsonLd data={faqJsonLd(post.faq)} />

      <article className="relative mx-auto w-full max-w-2xl px-6 py-12">
        <Link href="/blog" className="text-sm text-zinc-600 underline">
          ← All guides
        </Link>
        <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">{post.title}</h1>
        <p className="mt-2 text-xs text-zinc-500">
          By the GlowUpp team · {new Date(post.published).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
        </p>

        <div className="mt-6 overflow-hidden rounded-2xl border-4 border-white shadow-xl shadow-blue-900/10">
          <BeforeAfterImage src={post.heroSrc} alt={post.heroAlt} width={1200} height={420} priority />
        </div>
        <p className="mt-2 text-xs text-zinc-500">An AI-generated example. Real results depend on your own space.</p>

        <p className="mt-6 text-lg text-zinc-700">{post.intro}</p>

        <div className="mt-6 flex flex-col gap-4 text-zinc-700">
          {post.blocks.map((b, i) =>
            b.type === "h2" ? (
              <h2 key={i} className="mt-6 text-2xl font-semibold text-[#132a4d]">
                {b.text}
              </h2>
            ) : b.type === "p" ? (
              <p key={i}>{b.text}</p>
            ) : (
              <ul key={i} className="list-disc space-y-1 pl-6">
                {b.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            ),
          )}
        </div>

        {category && (
          <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-[#3a6694] bg-blue-50 p-6 text-center">
            <p className="font-semibold">See your own {category.displayName.toLowerCase()} redesigned</p>
            <p className="text-sm text-zinc-600">Upload a photo and see AI-generated ideas in about two minutes. Free for homeowners, no sign-up needed to start.</p>
            <Link href={categoryPath(category.key)} className="rounded-full bg-[#3a6694] px-6 py-3 text-sm font-medium text-white hover:bg-[#2c5075]">
              Try it with your photo
            </Link>
          </div>
        )}

        <section className="mt-12">
          <h2 className="text-2xl font-semibold">Common questions</h2>
          <dl className="mt-4 flex flex-col gap-4">
            {post.faq.map((f) => (
              <div key={f.question} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <dt className="font-semibold">{f.question}</dt>
                <dd className="mt-1 text-sm text-zinc-600">{f.answer}</dd>
              </div>
            ))}
          </dl>
        </section>

        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-semibold">More guides</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link href={blogPath(r.slug)} className="text-[#3a6694] underline">
                    {r.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </div>
  );
}
