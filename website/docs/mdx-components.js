import { useMDXComponents as getDocsMDXComponents } from "nextra-theme-docs";
import { Tabs, TabSection } from "./src/app/components/Tabs";
import Image from "next/image";

const docsComponents = getDocsMDXComponents();

export const useMDXComponents = (components) => ({
  ...docsComponents,
  Tabs,
  TabSection,
  Image,
  ...components,
});
