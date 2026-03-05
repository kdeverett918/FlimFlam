import HomeWrapper from "@/components/landing/HomeWrapper";

// All pages in this app are dynamic — they depend on client-side
// Colyseus connections and browser APIs.
export const dynamic = "force-dynamic";

export default function Page() {
  return <HomeWrapper />;
}
