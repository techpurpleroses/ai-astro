import Link from "next/link";
import { Sparkles } from "lucide-react";
import { OnboardingCategoryPicker } from "@/components/onboarding/category-picker";
import { getAllOnboardingAssetManifests } from "@/lib/onboarding/assets";
import {
  ONBOARDING_CATEGORIES,
  ONBOARDING_CONFIG,
} from "@/lib/onboarding/config";

export default async function OnboardingHomePage() {
  const manifests = await getAllOnboardingAssetManifests();
  const cards = ONBOARDING_CATEGORIES.map((slug) => {
    const category = ONBOARDING_CONFIG[slug];
    const coverImage =
      manifests[slug].images[0] ?? "/assets/features/moon-phases-hq.webp";

    return {
      slug,
      name: category.shortName,
      description: category.description,
      accent: category.accent,
      coverImage,
      stepCount: category.steps.length,
    };
  });

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_8%,rgba(34,211,238,0.2),transparent_35%),radial-gradient(circle_at_85%_95%,rgba(167,139,250,0.16),transparent_35%)]" />
      <div className="relative mx-auto w-full space-y-5">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/40 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-200">
            <Sparkles className="h-3.5 w-3.5" />
            Public Onboarding
          </div>
          <h1 className="font-display text-3xl font-semibold leading-tight">
            Choose your onboarding journey
          </h1>
          <p className="text-sm text-slate-200/85">
            Each category has a separate flow, different step count, and dedicated
            media. Complete a journey and continue to sign up with your session data saved.
          </p>
        </div>

        <OnboardingCategoryPicker cards={cards} />

        <div className="rounded-2xl border border-white/15 bg-white/5 p-4 text-sm text-slate-200/90">
          Already have an account?{" "}
          <Link href="/auth/login" className="font-semibold text-cyan-300 hover:text-cyan-200">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
