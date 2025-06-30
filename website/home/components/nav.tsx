"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { HyperText } from "./ui/hyper-text";
import { motion } from "framer-motion";
import { Menu, ArrowUpRight } from "lucide-react";
// Replace Sheet components with Dropdown components
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
} from "@/components/ui/dropdown-menu";

// Logo component
function Logo() {
  return (
    <Link href="/">
      <div className="flex-shrink-0">
        <Image src="/logo.svg" alt="GenSX Logo" width={150} height={50} />
      </div>
    </Link>
  );
}

interface NavMenuProps {
  simple?: boolean;
}

// NavMenu renders the full styled version by default (desktop)
// When "simple" is true (used in the mobile dropdown) it renders a basic list.
function NavMenu({ simple = false }: NavMenuProps) {
  const pathname = usePathname();

  if (simple) {
    return (
      <ul className="space-y-4">
        <li>
          <Link href="/showcase" className="block text-gray-800 text-sm">
            Showcase
          </Link>
        </li>
        <li>
          <Link href="/blog" className="block text-gray-800 text-sm">
            Blog
          </Link>
        </li>
        <li>
          <motion.a
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className={`relative py-2 transition-colors text-sm group inline-flex items-center gap-1
              ${
                pathname === "/docs"
                  ? "text-gray-900 font-medium"
                  : pathname === "/"
                    ? "text-gray-900 hover:text-gray-900"
                    : "text-gray-800 hover:text-gray-900"
              }
              after:absolute after:left-0 after:bottom-0 after:h-0.5 after:w-full
              after:origin-left after:scale-x-0 after:bg-[#ffde59] after:transition-transform after:duration-300
              after:z-10
              ${pathname === "/docs" ? "after:scale-x-100" : "hover:after:scale-x-100 group-hover:after:scale-x-100"}
            `}
          >
            <span>Docs</span>
            <span className="inline-block opacity-0 -translate-x-2 translate-y-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0">
              <ArrowUpRight size={16} />
            </span>
          </motion.a>
        </li>
      </ul>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-8">
      <Link
        href="/showcase"
        className={`relative py-2 transition-colors text-sm
          ${
            pathname === "/showcase"
              ? "text-gray-900 font-medium"
              : pathname === "/"
                ? "text-gray-900 hover:text-gray-900"
                : "text-gray-800 hover:text-gray-900"
          }
          after:absolute after:left-0 after:bottom-0 after:h-0.5 after:w-full
          after:origin-left after:scale-x-0 after:bg-[#ffde59] after:transition-transform after:duration-300
          ${pathname === "/showcase" ? "after:scale-x-100" : "hover:after:scale-x-100"}
        `}
      >
        Showcase
      </Link>
      <Link
        href="/blog"
        className={`relative py-2 transition-colors text-sm
          ${
            pathname === "/blog"
              ? "text-gray-900 font-medium"
              : pathname === "/"
                ? "text-gray-900 hover:text-gray-900"
                : "text-gray-800 hover:text-gray-900"
          }
          after:absolute after:left-0 after:bottom-0 after:h-0.5 after:w-full
          after:origin-left after:scale-x-0 after:bg-[#ffde59] after:transition-transform after:duration-300
          ${pathname === "/blog" ? "after:scale-x-100" : "hover:after:scale-x-100"}
        `}
      >
        Blog
      </Link>
      <motion.a
        href="/docs"
        target="_blank"
        rel="noopener noreferrer"
        className={`relative py-2 transition-colors text-sm group inline-flex items-center gap-1
          ${
            pathname === "/docs"
              ? "text-gray-900 font-medium"
              : pathname === "/"
                ? "text-gray-900 hover:text-gray-900"
                : "text-gray-800 hover:text-gray-900"
          }
          after:absolute after:left-0 after:bottom-0 after:h-0.5 after:w-full
          after:origin-left after:scale-x-0 after:bg-[#ffde59] after:transition-transform after:duration-300
          after:z-10
          ${pathname === "/docs" ? "after:scale-x-100" : "hover:after:scale-x-100 group-hover:after:scale-x-100"}
        `}
      >
        <span>Docs</span>
        <span className="inline-block opacity-0 -translate-x-2 translate-y-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0">
          <ArrowUpRight size={16} />
        </span>
      </motion.a>
    </div>
  );
}

// Create a motion-enabled Link component
const MotionLink = motion(Link);

// SocialLinks component
// When showLabels is true (mobile dropdown), each item renders a flex container with the icon and label on one line.
function SocialLinks({ showLabels = false }: { showLabels?: boolean }) {
  // motion variants for interaction (kept the same for desktop)
  const scaleVariants = {
    rest: { scale: 1 },
    hover: { scale: 1.3, transition: { duration: 0.2 } },
    tap: { scale: 0.95, transition: { duration: 0.1 } },
  };

  if (showLabels) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <MotionLink
            href="https://github.com/gensx-inc/gensx"
            className="hover:opacity-80 transition-opacity text-gray-800 flex items-center gap-2"
            aria-label="GitHub"
            target="_blank"
            rel="noopener noreferrer"
            initial="rest"
            whileHover="hover"
            whileTap="tap"
            variants={scaleVariants}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <span className="text-sm">GitHub</span>
          </MotionLink>
        </div>
        <div className="flex items-center gap-2">
          <MotionLink
            href="https://discord.gg/wRmwfz5tCy"
            className="hover:opacity-80 transition-opacity text-gray-800 flex items-center gap-2"
            aria-label="Discord"
            target="_blank"
            rel="noopener noreferrer"
            initial="rest"
            whileHover="hover"
            whileTap="tap"
            variants={scaleVariants}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
            <span className="text-sm">Discord</span>
          </MotionLink>
        </div>
        <div className="flex items-center gap-2">
          <MotionLink
            href="https://npmjs.com/package/gensx"
            className="hover:opacity-80 transition-opacity text-gray-800 flex items-center gap-2"
            aria-label="NPM"
            target="_blank"
            rel="noopener noreferrer"
            initial="rest"
            whileHover="hover"
            whileTap="tap"
            variants={scaleVariants}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M0 7.334v8h6.666v1.332H12v-1.332h12v-8H0zm6.666 6.664H5.334v-4H3.999v4H1.335V8.667h5.331v5.331zm4 0v1.336H8.001V8.667h5.334v5.332h-2.669v-.001zm12.001 0h-1.33v-4h-1.336v4h-1.335v-4h-1.33v4h-2.671V8.667h8.002v5.331zM10.665 10H12v2.667h-1.335V10z" />
            </svg>
            <span className="text-sm">NPM</span>
          </MotionLink>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-8">
      {/* <a
        href="/docs"
        rel="noopener noreferrer"
        className="text-gray-800 hover:text-gray-900 transition-colors text-sm"
      >
        <motion.div
          initial="rest"
          whileHover="hover"
          animate="rest"
          className="flex items-center gap-1"
        >
          <motion.span variants={docsTextVariants}>Docs</motion.span>
          <motion.span variants={docsArrowVariants}>
            <ArrowRight size={16} />
          </motion.span>
        </motion.div>
      </a> */}

      <MotionLink
        href="https://github.com/gensx-inc/gensx"
        className="hover:opacity-80 transition-opacity text-gray-800"
        aria-label="GitHub"
        target="_blank"
        rel="noopener noreferrer"
        initial="rest"
        whileHover="hover"
        whileTap="tap"
        variants={scaleVariants}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
        </svg>
      </MotionLink>
      <MotionLink
        href="https://discord.gg/wRmwfz5tCy"
        className="hover:opacity-80 transition-opacity text-gray-800"
        aria-label="Discord"
        target="_blank"
        rel="noopener noreferrer"
        initial="rest"
        whileHover="hover"
        whileTap="tap"
        variants={scaleVariants}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
        </svg>
      </MotionLink>
      <MotionLink
        href="https://npmjs.com/package/gensx"
        className="hover:opacity-80 transition-opacity text-gray-800"
        aria-label="NPM"
        target="_blank"
        rel="noopener noreferrer"
        initial="rest"
        whileHover="hover"
        whileTap="tap"
        variants={scaleVariants}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M0 7.334v8h6.666v1.332H12v-1.332h12v-8H0zm6.666 6.664H5.334v-4H3.999v4H1.335V8.667h5.331v5.331zm4 0v1.336H8.001V8.667h5.334v5.332h-2.669v-.001zm12.001 0h-1.33v-4h-1.336v4h-1.335v-4h-1.33v4h-2.671V8.667h8.002v5.331zM10.665 10H12v2.667h-1.335V10z" />
        </svg>
      </MotionLink>
    </div>
  );
}

// Authentication Buttons component
function AuthButtons() {
  return (
    <div className="flex items-center gap-4">
      <Link href="https://signin.gensx.com/sign-up">
        <Button variant="primary">
          <HyperText>Sign Up</HyperText>
        </Button>
      </Link>
      <Link href="https://app.gensx.com">
        <Button variant="ghost">
          <HyperText>Login</HyperText>
        </Button>
      </Link>
    </div>
  );
}

// Main Navigation component
export default function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm bg-white/75">
      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center justify-between px-12 py-2 w-full">
        {/* Left Side: Logo & full Navigation */}
        <div className="flex items-center gap-8">
          <Logo />
          <NavMenu />
        </div>

        {/* Right Side: Social Links & Auth Buttons */}
        <div className="flex items-center gap-8">
          <SocialLinks />
          <AuthButtons />
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="flex md:hidden items-center justify-between h-14 px-4 w-full">
        {/* Left: Logo */}
        <Logo />
        {/* Right: Dropdown Menu */}
        <div className="flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="p-0 m-0 w-[40px] h-[40px]">
                <Menu style={{ width: "20px", height: "20px" }} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-54 p-4 mt-2 origin-top-right right-0 mr-4 flex flex-col space-y-4 rounded-[0px]">
              <NavMenu simple />
              <div>
                <SocialLinks showLabels />
              </div>
              <div className="pt-2 border-t">
                <AuthButtons />
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
