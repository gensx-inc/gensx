import { redirect } from "next/navigation";

export default function Home() {
  // Redirect to projects page
  redirect('/projects');
}
