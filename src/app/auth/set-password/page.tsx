import { PasswordUpdateForm } from "@/components/auth/password-update-form";
import { normalizeNextPath } from "@/lib/auth/flow";

interface SetPasswordPageProps {
  searchParams: Promise<{
    next?: string;
    error?: string;
  }>;
}

export default async function SetPasswordPage({ searchParams }: SetPasswordPageProps) {
  const params = await searchParams;
  const nextPath = normalizeNextPath(params.next);
  const errorMessage = params.error ?? null;

  return <PasswordUpdateForm mode="set" nextPath={nextPath} initialError={errorMessage} />;
}

