import { PasswordUpdateForm } from "@/components/auth/password-update-form";
import { normalizeNextPath } from "@/lib/auth/flow";

interface ResetPasswordPageProps {
  searchParams: Promise<{
    next?: string;
    error?: string;
  }>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;
  const nextPath = normalizeNextPath(params.next);
  const errorMessage = params.error ?? null;

  return <PasswordUpdateForm mode="reset" nextPath={nextPath} initialError={errorMessage} />;
}

