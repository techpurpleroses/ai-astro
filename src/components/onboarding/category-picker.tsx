"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export interface OnboardingCategoryCard {
  slug: string;
  name: string;
  description: string;
  accent: string;
  coverImage: string;
  stepCount: number;
}

interface CategoryPickerProps {
  cards: OnboardingCategoryCard[];
}

export function OnboardingCategoryPicker({ cards }: CategoryPickerProps) {
  return (
    <div className="grid gap-3">
      {cards.map((card, index) => (
        <motion.div
          key={card.slug}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.35 }}
        >
          <Link
            href={`/onboarding/${card.slug}`}
            className="group relative block overflow-hidden rounded-2xl border border-white/15 bg-black/25"
          >
            <div className="relative h-44">
              <Image
                src={card.coverImage}
                alt={`${card.name} onboarding`}
                fill
                className="object-cover transition duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-linear-to-t from-[#050b17]/95 via-[#050b17]/20 to-transparent" />
              <div
                className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                style={{
                  backgroundColor: `${card.accent}33`,
                  color: card.accent,
                  border: `1px solid ${card.accent}77`,
                }}
              >
                {card.stepCount} steps
              </div>
            </div>

            <div className="space-y-2 p-4">
              <h2 className="font-display text-lg font-semibold text-white">{card.name}</h2>
              <p className="line-clamp-2 text-sm text-slate-200/85">{card.description}</p>
              <div
                className="inline-flex items-center gap-1 text-sm font-semibold"
                style={{ color: card.accent }}
              >
                Start onboarding
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </div>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
