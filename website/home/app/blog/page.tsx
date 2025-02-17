import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getAllPosts } from "@/lib/api";
import AnimatedArticle from "@/components/ui/AnimatedArticle";
import AnimatedTitle from "@/components/ui/AnimatedTitle";

export const metadata: Metadata = {
  title: "Blog - GenSX",
  description: "Latest updates, guides, and insights about GenSX",
};

export default function BlogIndex() {
  const posts = getAllPosts();

  return (
    <div className="min-h-screen w-full max-w-7xl mx-auto pt-32 px-8 md:px-8 pb-20">
      <div className="max-w-4xl mx-auto">
        <AnimatedTitle>
          News, tips and resources <br /> about GenSX
        </AnimatedTitle>
        <div className="space-y-6 md:space-y-8">
          {posts.map((post, index) => (
            <AnimatedArticle key={post.slug} index={index}>
              <Link
                href={`/blog/${post.slug}`}
                className="relative group flex flex-col md:flex-row gap-4 md:gap-6 items-start mb-12 md:mb-0" 
              >
                {post.coverImage ? (
                  <div className="w-full md:w-48 h-48 md:h-32 flex-shrink-0 overflow-hidden rounded-lg">
                    <Image
                      src={post.coverImage}
                      alt={post.title}
                      width={800}
                      height={400}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                ) : (
                  <div className="w-full md:w-48 h-48 md:h-32 flex-shrink-0 bg-gray-100 rounded-lg" />
                )}
                <div className="flex-1 min-w-0 space-y-2">
                  <h2 className="text-xl md:text-2xl font-bold group-hover:text-primary transition-colors">
                    {post.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 md:gap-3">
                    {post.author?.picture && (
                      <Image
                        src={post.author.picture}
                        alt={post.author.name}
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                      <span>{post.author?.name}</span>
                      {post.date && (
                        <>
                          <span>•</span>
                          <time dateTime={post.date}>
                            {new Date(post.date).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </time>
                        </>
                      )}
                    </div>
                  </div>
                  {post.excerpt && (
                    <p className="text-gray-600 mt-2 line-clamp-2">
                      {post.excerpt}
                    </p>
                  )}
                </div>
                {/* Decorative corner elements with increased size */}
                <span className="absolute inset-0 pointer-events-none">
                  <span
                    className="absolute top-[-6px] left-[-6px] h-3 w-3 border-t border-l border-current
                    opacity-0 transform translate-x-[3px] translate-y-[3px] transition-all duration-300
                    group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0
                    group-active:opacity-0 group-active:translate-x-[3px] group-active:translate-y-[3px] group-active:duration-150"
                  />
                  <span
                    className="absolute top-[-6px] right-[-6px] h-3 w-3 border-t border-r border-current
                    opacity-0 transform -translate-x-[3px] translate-y-[3px] transition-all duration-300
                    group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0
                    group-active:opacity-0 group-active:-translate-x-[3px] group-active:translate-y-[3px] group-active:duration-150"
                  />
                  <span
                    className="absolute bottom-[-6px] left-[-6px] h-3 w-3 border-b border-l border-current
                    opacity-0 transform translate-x-[3px] -translate-y-[3px] transition-all duration-300
                    group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0
                    group-active:opacity-0 group-active:translate-x-[3px] group-active:-translate-y-[3px] group-active:duration-150"
                  />
                  <span
                    className="absolute bottom-[-6px] right-[-6px] h-3 w-3 border-b border-r border-current
                    opacity-0 transform -translate-x-[3px] -translate-y-[3px] transition-all duration-300
                    group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0
                    group-active:opacity-0 group-active:-translate-x-[3px] group-active:-translate-y-[3px] group-active:duration-150"
                  />
                </span>
              </Link>
            </AnimatedArticle>
          ))}
        </div>
      </div>
    </div>
  );
} 
