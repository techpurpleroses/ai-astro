import { notFound } from "next/navigation";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { getOnboardingAssetManifest } from "@/lib/onboarding/assets";
import { getOnboardingCategoryConfig } from "@/lib/onboarding/config";

interface OnboardingCategoryPageProps {
  params: Promise<{
    category: string;
  }>;
  searchParams: Promise<{
    session?: string;
  }>;
}

export default async function OnboardingCategoryPage({
  params,
  searchParams,
}: OnboardingCategoryPageProps) {
  const { category } = await params;
  const query = await searchParams;

  const categoryConfig = getOnboardingCategoryConfig(category);
  if (!categoryConfig) {
    notFound();
  }

  const assets = await getOnboardingAssetManifest(categoryConfig.slug);

  return (
    <OnboardingFlow
      category={categoryConfig}
      assets={assets}
      initialSessionId={query.session ?? null}
    />
  );
}

