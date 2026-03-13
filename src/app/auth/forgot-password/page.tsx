import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

interface ForgotPasswordPageProps {
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

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const params = await searchParams;
  const nextPath = normalizeNext(params.next);
  const errorMessage = params.error ?? null;

  return <ForgotPasswordForm nextPath={nextPath} initialError={errorMessage} />;
}

