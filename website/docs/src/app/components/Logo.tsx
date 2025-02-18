"use client";

import Image from "next/image";
import { useTheme } from "nextra-theme-docs";
import { useState, useEffect } from "react";

const Logo = () => {
  const { resolvedTheme } = useTheme();
  const [logoSrc, setLogoSrc] = useState("/logo.svg");

  useEffect(() => {
    setLogoSrc(resolvedTheme === "dark" ? "/logo-dark.svg" : "/logo.svg");
  }, [resolvedTheme]);

  return (
    <Image
      src={logoSrc}
      alt="GenSX Logo"
      width={125}
      height={50}
      style={{ height: "50px" }}
    />
  );
};

export default Logo;
