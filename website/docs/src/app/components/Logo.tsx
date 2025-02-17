"use client";

import Image from "next/image";
import { useTheme } from "nextra-theme-docs";

const Logo = () => {
  const { resolvedTheme } = useTheme();

  return (
    <Image
      src={resolvedTheme === "dark" ? "/logo.svg" : "/logo.svg"}
      alt="GenSX Logo"
      width={150}
      height={50}
      style={{ height: "50px" }}
    />
  );
};

export default Logo;
