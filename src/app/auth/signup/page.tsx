import { MagicLinkForm } from "@/components/auth/magic-link-form";

interface SignupPageProps {
  searchParams: Promise<{
    next?: string;
    error?: string;
  }>;
}

function normalizeNext(next: string | undefined): string {
  if (!next || !next.startsWith("/")) return "/today";
  if (next.startsWith("/auth")) return "/today";
  return next;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const nextPath = normalizeNext(params.next);
  const errorMessage = params.error ?? null;

  return <MagicLinkForm mode="signup" nextPath={nextPath} initialError={errorMessage} />;
}
