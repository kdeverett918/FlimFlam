import { permanentRedirect } from "next/navigation";

type LegacyTrumpyBirdPageProps = {
  params: Promise<{
    slug?: string[];
  }>;
};

export default async function LegacyTrumpyBirdPage({ params }: LegacyTrumpyBirdPageProps) {
  const { slug } = await params;
  const pathname = slug && slug.length > 0 ? `/flimflap/${slug.join("/")}` : "/flimflap";
  permanentRedirect(pathname);
}
