import { useMDXComponents as getDocsMDXComponents } from "nextra-theme-docs";
import { Tabs, TabSection } from "./src/app/components/Tabs";

const docsComponents = getDocsMDXComponents();

export const useMDXComponents = (components) => ({
  ...docsComponents,
  Tabs,
  TabSection,
  ...components,
});
