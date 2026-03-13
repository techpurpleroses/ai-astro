import { PasswordUpdateForm } from "@/components/auth/password-update-form";

interface ResetPasswordPageProps {
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

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;
  const nextPath = normalizeNext(params.next);
  const errorMessage = params.error ?? null;

  return <PasswordUpdateForm mode="reset" nextPath={nextPath} initialError={errorMessage} />;
}

