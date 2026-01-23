import { redirect } from "next/navigation";

// This page just redirects to search - no params needed
export default function VariantIndexPage() {
  redirect("/");
}
