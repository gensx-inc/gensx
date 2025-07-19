import Link from "next/link";
import Image from "next/image";
const Footer = () => {
  return (
    <footer className="w-full bg-gray-200/50 backdrop-blur-sm border-t border-gray-200 dark:border-gray-800 mt-auto py-8 px-4 md:px-6">
      {/* Main grid: 1 column on small screens, 2 columns on medium+ */}
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-gray-500 dark:text-gray-400">
        {/* Left Column: Logo and Copyright */}
        <div className="flex flex-col items-center md:items-start gap-2">
          <span className="font-semibold text-lg text-gray-900 dark:text-gray-50">
            <Image src="/logo.svg" alt="Logo" width={100} height={100} />
          </span>
          <span>
            © {new Date().getFullYear()} GenSX Inc. All rights reserved.
          </span>
        </div>

        {/* Right Column: Contains nested grid for Legal & Social */}
        {/* Nested grid: 1 column on small screens, 2 columns on medium+ */}
        {/* Aligns content to the right edge on medium+ screens */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 md:justify-self-end">
          {/* Legal Links Column (within nested grid) */}
          {/* Aligns items center on small screens and up */}
          <div className="flex flex-col items-center sm:items-center gap-2">
            <h4 className="font-medium mb-1 text-gray-700 dark:text-gray-300">
              Legal
            </h4>
            <Link
              href="/legal/terms-of-service"
              className="hover:underline text-xs text-center"
            >
              Terms of Service
            </Link>
            <Link
              href="/legal/privacy-policy"
              className="hover:underline text-xs text-center"
            >
              Privacy Policy
            </Link>
            <Link
              href="/legal/terms-of-use"
              className="hover:underline text-xs text-center"
            >
              Terms of Use
            </Link>
          </div>

          {/* Social Links Column (within nested grid) */}
          {/* Aligns items center on small screens, end (right) on medium+ */}
          <div className="flex flex-col items-center sm:items-end gap-2">
            <h4 className="font-medium mb-1 text-gray-700 dark:text-gray-300">
              Follow Us
            </h4>
            {/* Twitter */}
            <Link
              href="https://twitter.com/gensx_inc"
              className="hover:text-gray-900 dark:hover:text-gray-50 flex items-center justify-center sm:justify-end gap-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
              </svg>
              <span>Twitter</span>
            </Link>
            {/* GitHub */}
            <Link
              href="https://github.com/gensx-inc/gensx"
              className="hover:text-gray-900 dark:hover:text-gray-50 flex items-center justify-center sm:justify-end gap-2"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.026 2.747-1.026.546 1.379.201 2.397.098 2.65.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
              <span>GitHub</span>
            </Link>
            {/* LinkedIn */}
            <Link
              href="https://www.linkedin.com/company/gensx-inc"
              className="hover:text-gray-900 dark:hover:text-gray-50 flex items-center justify-center sm:justify-end gap-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg
                className="h-5 w-5"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
              <span>LinkedIn</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
