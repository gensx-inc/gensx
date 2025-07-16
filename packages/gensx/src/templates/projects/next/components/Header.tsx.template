import Link from "next/link";
import Image from "next/image";

export default function Header() {
  return (
    <div className="border-b border-border/60 px-2 py-2 h-12 flex items-center gap-2 justify-between shadow-xs dark:shadow-white/10">
      <div className="flex items-center gap-2">
        {/* Left side - empty for now */}
      </div>
      {/* Right-aligned links */}
      <div className="flex items-center gap-2 ml-auto mr-4">
        <Link
          href="https://github.com/gensx-inc/gensx"
          passHref
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            src="/github-mark.svg"
            alt="GitHub"
            className="w-6 h-6 dark:invert"
            width={24}
            height={24}
          />
        </Link>
        <div className="h-6 border-l border-border mx-2" />
        <Link
          href="https://gensx.com/docs"
          passHref
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            src="/logo.svg"
            alt="Docs"
            width={87}
            height={35}
            className="block dark:hidden"
          />
          <Image
            src="/logo-dark.svg"
            alt="Docs"
            width={87}
            height={35}
            className="hidden dark:block"
          />
        </Link>
      </div>
    </div>
  );
}
