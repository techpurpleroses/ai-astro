import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { normalizeNextPath } from "@/lib/auth/flow";

interface ForgotPasswordPageProps {
  searchParams: Promise<{
    next?: string;
    error?: string;
  }>;
}

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const params = await searchParams;
  const nextPath = normalizeNextPath(params.next);
  const errorMessage = params.error ?? null;

  return <ForgotPasswordForm nextPath={nextPath} initialError={errorMessage} />;
}

