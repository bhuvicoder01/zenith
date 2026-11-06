import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Interactive demo",
  description:
    "Explore a fictional career workflow locally, without an account or external API calls.",
  alternates: { canonical: "/demo" },
  openGraph: {
    title: "Explore Zenith — Interactive career workspace demo",
    description: "A fictional career workflow you can try without signing in.",
    url: "/demo",
  },
};
export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
