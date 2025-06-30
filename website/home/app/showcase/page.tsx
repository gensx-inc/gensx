import { Metadata } from "next";
import ShowcaseClient from "./showcase-client";

export const metadata: Metadata = {
  title: "Showcase - GenSX",
  description:
    "Explore demo applications built with GenSX. From chat interfaces to research agents, and forward-thinking user experiences.",
};

export default function ShowcasePage() {
  return <ShowcaseClient />;
}
