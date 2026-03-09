import { permanentRedirect } from "next/navigation";

type LegacyTrumpyBirdPageProps = {
  params: Promise<{
    slug?: string[];
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LegacyTrumpyBirdPage({
  params,
  searchParams,
}: LegacyTrumpyBirdPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(resolvedSearchParams)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        query.append(key, item);
      }
      continue;
    }
    if (typeof value === "string") {
      query.set(key, value);
    }
  }

  const pathname = slug && slug.length > 0 ? `/flimflap/${slug.join("/")}` : "/flimflap";
  permanentRedirect(query.size > 0 ? `${pathname}?${query.toString()}` : pathname);
}
