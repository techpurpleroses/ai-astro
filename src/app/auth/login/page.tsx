import { MagicLinkForm } from "@/components/auth/magic-link-form";
import { normalizeNextPath } from "@/lib/auth/flow";

interface LoginPageProps {
  searchParams: Promise<{
    next?: string;
    error?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = normalizeNextPath(params.next);
  const errorMessage = params.error ?? null;

  return <MagicLinkForm mode="login" nextPath={nextPath} initialError={errorMessage} />;
}
