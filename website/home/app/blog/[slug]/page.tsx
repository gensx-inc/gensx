import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllPosts, getPostBySlug } from "@/lib/api";
import MarkdownToHTML from "@/components/markdown-to-html";
import AnimatedPage from "@/components/AnimatedPage";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { HyperText } from "@/components/ui/hyper-text";

// Calculate reading time based on content length (average reading speed: 200 words per minute)
function calculateReadingTime(content: string): string {
  const words = content.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / 200);
  return `${minutes} min read`;
}

export default async function Post(props: Params) {
  const params = await props.params;
  const post = getPostBySlug(params.slug);

  if (!post) {
    return notFound();
  }

  const readingTime = calculateReadingTime(post.content);

  return (
    <AnimatedPage>
      {/* Main content section */}
      <div className="min-h-screen w-full max-w-7xl mx-auto pt-52 px-6 md:px-8 pb-20 relative">
        {/* Horizontal top line */}
        <div className="hidden md:block absolute left-[calc(1.5rem-30px)] lg:left-[calc(4rem-30px)] right-[calc(1.5rem-30px)] lg:right-[calc(4rem-30px)] top-32 h-px bg-gray-200"></div>

        {/* Horizontal bottom line */}
        <div className="hidden md:block absolute left-[calc(1.5rem-30px)] lg:left-[calc(4rem-30px)] right-[calc(1.5rem-30px)] lg:right-[calc(4rem-30px)] bottom-20 h-px bg-gray-200"></div>

        {/* Left vertical line */}
        <div className="hidden md:block absolute left-6 lg:left-16 top-[calc(8rem-30px)] bottom-[calc(5rem-30px)] w-px bg-gray-200"></div>
        {/* Right vertical line */}
        <div className="hidden md:block absolute right-6 lg:right-16 top-[calc(8rem-30px)] bottom-[calc(5rem-30px)] w-px bg-gray-200"></div>

        {/* Top-left corner */}
        <div className="hidden md:block absolute left-6 lg:left-16 top-32 h-px w-[100px] bg-gray-800"></div>
        <div className="hidden md:block absolute left-6 lg:left-16 top-32 h-[100px] w-px bg-gray-800"></div>

        {/* Top-right corner */}
        <div className="hidden md:block absolute right-6 lg:right-16 top-32 h-px w-[100px] bg-gray-800"></div>
        <div className="hidden md:block absolute right-6 lg:right-16 top-32 h-[100px] w-px bg-gray-800"></div>

        {/* Bottom-left corner */}
        <div className="hidden md:block absolute left-6 lg:left-16 bottom-20 h-px w-[100px] bg-gray-800"></div>
        <div className="hidden md:block absolute left-6 lg:left-16 bottom-20 h-[100px] w-px bg-gray-800 origin-bottom"></div>

        {/* Bottom-right corner */}
        <div className="hidden md:block absolute right-6 lg:right-16 bottom-20 h-px w-[100px] bg-gray-800"></div>
        <div className="hidden md:block absolute right-6 lg:right-16 bottom-20 h-[100px] w-px bg-gray-800 origin-bottom"></div>

        <div className="max-w-[720px] mx-auto relative">
          <div className="text-center mb-8">
            <Link
              href="/blog"
              className="inline-flex items-center text-sm hover:underline"
            >
              <svg
                className="w-4 h-4 mr-1"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M15 18L9 12L15 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Blog
            </Link>
          </div>

          <article className="relative">
            <header className="mb-12 text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-9">
                {post.title}
              </h1>

              {post.author && (
                <div className="flex items-center justify-center mb-[92px]">
                  {post.author.picture && (
                    <div className="w-6 h-6 rounded-full overflow-hidden mr-2">
                      <Image
                        src={post.author.picture}
                        alt={post.author.name || "Author"}
                        width={24}
                        height={24}
                        className="object-cover"
                      />
                    </div>
                  )}
                  <span className="text-sm text-gray-700">
                    {post.author.name}
                  </span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full mb-10">
                <div className="flex items-center text-sm text-gray-600 justify-center sm:justify-start">
                  <span className="inline-flex items-center">
                    <svg
                      className="w-4 h-4 mr-2"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12 8V12L15 15"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <circle
                        cx="12"
                        cy="12"
                        r="9"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                    </svg>
                    {readingTime}
                  </span>
                </div>

                {post.date && (
                  <time
                    className="text-sm text-gray-600 mt-2 sm:mt-0 text-center sm:text-right"
                    dateTime={post.date}
                  >
                    {new Date(post.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                )}
              </div>

              {post.excerpt && (
                <div className="border-l-4 border-gray-200 pl-6 mb-12 mt-8">
                  <p className="text-xl text-gray-600 leading-[1.3] max-w-2xl text-left font-semibold italic">
                    {post.excerpt}
                  </p>
                </div>
              )}
            </header>

            <MarkdownToHTML
              markdown={post.content || ""}
              className="prose md:prose-lg max-w-none [&>*]:my-6 [&_p]:leading-relaxed [&_p]:leading-[1.3] [&_p+p]:mt-6 [&_li]:leading-relaxed [&_li]:leading-[1.3] [&_h2]:text-3xl [&_h2]:font-bold [&_h2]:mt-16 [&_h2]:mb-6 [&_h3]:text-2xl [&_h3]:font-bold [&_h3]:mt-12 [&_h3]:mb-4 [&_ul]:my-6 [&_ol]:my-6 [&_li]:my-2 [&_blockquote]:my-8 [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_blockquote]:italic [&_a]:text-blue-600 [&_a]:underline [&_a:hover]:text-blue-800 [&_hr]:my-10 [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_pre]:mt-4 [&_pre]:mb-0 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_img]:my-10 [&_img]:mx-auto [&_figure]:my-10 mb-24"
            />
          </article>
        </div>
      </div>

      {/* CTA Section with corner styling */}
      <div className="w-full max-w-7xl mx-auto py-24 px-6 md:px-8 relative mb-20">
        {/* Horizontal top line */}
        <div className="hidden md:block absolute left-[calc(1.5rem-30px)] lg:left-[calc(4rem-30px)] right-[calc(1.5rem-30px)] lg:right-[calc(4rem-30px)] top-0 h-px bg-gray-200"></div>

        {/* Horizontal bottom line */}
        <div className="hidden md:block absolute left-[calc(1.5rem-30px)] lg:left-[calc(4rem-30px)] right-[calc(1.5rem-30px)] lg:right-[calc(4rem-30px)] bottom-0 h-px bg-gray-200"></div>

        {/* Left vertical line */}
        <div className="hidden md:block absolute left-6 lg:left-16 top-[calc(0rem-30px)] bottom-[calc(0rem-30px)] w-px bg-gray-200"></div>
        {/* Right vertical line */}
        <div className="hidden md:block absolute right-6 lg:right-16 top-[calc(0rem-30px)] bottom-[calc(0rem-30px)] w-px bg-gray-200"></div>

        {/* Top-left corner */}
        <div className="hidden md:block absolute left-6 lg:left-16 top-0 h-px w-[100px] bg-gray-800"></div>
        <div className="hidden md:block absolute left-6 lg:left-16 top-0 h-[100px] w-px bg-gray-800"></div>

        {/* Top-right corner */}
        <div className="hidden md:block absolute right-6 lg:right-16 top-0 h-px w-[100px] bg-gray-800"></div>
        <div className="hidden md:block absolute right-6 lg:right-16 top-0 h-[100px] w-px bg-gray-800"></div>

        {/* Bottom-left corner */}
        <div className="hidden md:block absolute left-6 lg:left-16 bottom-0 h-px w-[100px] bg-gray-800"></div>
        <div className="hidden md:block absolute left-6 lg:left-16 bottom-0 h-[100px] w-px bg-gray-800 origin-bottom"></div>

        {/* Bottom-right corner */}
        <div className="hidden md:block absolute right-6 lg:right-16 bottom-0 h-px w-[100px] bg-gray-800"></div>
        <div className="hidden md:block absolute right-6 lg:right-16 bottom-0 h-[100px] w-px bg-gray-800 origin-bottom"></div>

        <div className="max-w-[720px] mx-auto relative">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-6">Ready to get started?</h2>
            <p className="text-lg text-gray-700 mb-10 max-w-xl mx-auto leading-[1.3]">
              Join developers building the next generation of AI-powered
              applications with GenSX.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/docs/quickstart">
                <Button variant="primary">
                  <HyperText>Quickstart Guide</HyperText>
                </Button>
              </Link>
              <Link href="https://signin.gensx.com/sign-up">
                <Button variant="ghost">
                  <HyperText>Sign up for free</HyperText>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AnimatedPage>
  );
}

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata(props: Params): Promise<Metadata> {
  const params = await props.params;
  const post = getPostBySlug(params.slug);

  if (!post) {
    return notFound();
  }

  return {
    title: post.title,
    description: post.excerpt || undefined,
  };
}

export async function generateStaticParams() {
  const posts = getAllPosts();

  return posts.map((post) => ({
    slug: post.slug,
  }));
}
