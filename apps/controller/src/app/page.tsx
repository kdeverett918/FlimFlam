import { JoinPageClient } from "@/components/join/JoinPageClient";

interface JoinPageProps {
  searchParams?: Promise<{ code?: string | string[] }>;
}

export default async function JoinPage({ searchParams }: JoinPageProps) {
  const resolved = searchParams ? await searchParams : undefined;
  const rawCode = resolved?.code;
  const initialCode = Array.isArray(rawCode) ? (rawCode[0] ?? "") : (rawCode ?? "");

  return <JoinPageClient initialCode={initialCode} />;
}
