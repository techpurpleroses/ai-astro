"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, Loader2, Volume2 } from "lucide-react";
import { PalmCameraScanner } from "@/components/features/palm-reading/palm-camera-scanner";
import type { PalmScanRecord } from "@/lib/palm/contracts";
import { cn } from "@/lib/utils";
import { astroFetchJson } from "@/lib/client/astro-fetch";
import type { OnboardingAssetManifest } from "@/lib/onboarding/assets";
import type { OnboardingCategoryConfig, OnboardingStep } from "@/lib/onboarding/config";
import type { OnboardingSession } from "@/lib/onboarding/contracts";
import { resolveStepMedia } from "@/lib/onboarding/media-map";
import { BRAND_NAME } from "@/lib/brand";

// ─── types ─────────────────────────────────────────────────────────────────────

interface OnboardingFlowProps {
  category: OnboardingCategoryConfig;
  assets: OnboardingAssetManifest;
  initialSessionId?: string | null;
}

interface LocationSuggestion {
  id: string;
  label: string;
  fullName: string;
  city: string;
  region?: string;
  country: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
  provider: "mapbox";
}

interface BirthPlaceAnswer {
  label: string;
  fullName: string;
  city: string;
  region?: string;
  country: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
  provider: "mapbox" | "nominatim";
  providerId: string;
}

// ─── Sign chip helpers ──────────────────────────────────────────────────────────

const SIGN_GLYPHS: Record<string, string> = {
  aries: "♈", taurus: "♉", gemini: "♊", cancer: "♋",
  leo: "♌", virgo: "♍", libra: "♎", scorpio: "♏",
  sagittarius: "♐", capricorn: "♑", aquarius: "♒", pisces: "♓",
};

const SIGN_ELEMENTS: Record<string, string> = {
  aries: "Fire", leo: "Fire", sagittarius: "Fire",
  taurus: "Earth", virgo: "Earth", capricorn: "Earth",
  gemini: "Air", libra: "Air", aquarius: "Air",
  cancer: "Water", scorpio: "Water", pisces: "Water",
};

const PLANET_GLYPHS: Record<string, string> = {
  sun: "☉", moon: "☽", mercury: "☿", venus: "♀", mars: "♂",
  jupiter: "♃", saturn: "♄", uranus: "⛢", neptune: "♆", pluto: "♇",
};

/** Derives sun sign from a "Month D, YYYY" date string — runs client-side, no API. */
const MONTH_SIGN_CUTOFFS: Array<[number, number, string]> = [
  [3, 21, "aries"], [4, 20, "taurus"], [5, 21, "gemini"], [6, 21, "cancer"],
  [7, 23, "leo"], [8, 23, "virgo"], [9, 23, "libra"], [10, 23, "scorpio"],
  [11, 22, "sagittarius"], [12, 22, "capricorn"], [1, 20, "aquarius"], [2, 19, "pisces"],
];
const MONTH_NAMES_IDX = [
  "january","february","march","april","may","june",
  "july","august","september","october","november","december",
];
function dateStringToSunSign(dateStr: string): string | null {
  const m = dateStr.trim().match(/^(\w+)\s+(\d+),?\s+\d{4}$/);
  if (!m) return null;
  const monthIdx = MONTH_NAMES_IDX.indexOf(m[1].toLowerCase());
  if (monthIdx === -1) return null;
  const month = monthIdx + 1;
  const day = parseInt(m[2], 10);
  for (const [cutoffMonth, cutoffDay, sign] of MONTH_SIGN_CUTOFFS) {
    if (month === cutoffMonth && day >= cutoffDay) return sign;
    if (month === cutoffMonth && day < cutoffDay) {
      // previous sign
      const prevIdx = MONTH_SIGN_CUTOFFS.findIndex(([cm]) => cm === cutoffMonth) - 1;
      return prevIdx >= 0 ? MONTH_SIGN_CUTOFFS[prevIdx][2] : "pisces";
    }
  }
  // Dec 22+ = capricorn
  if (month === 12 && day >= 22) return "capricorn";
  // Jan 1-19 = capricorn
  if (month === 1 && day < 20) return "capricorn";
  return null;
}

interface ComputedChart {
  sunSign?: string;
  moonSign?: string;
  risingSign?: string;
  lifePath?: number;
  element?: string;
}

function isComputedChart(v: unknown): v is ComputedChart {
  if (!v || typeof v !== "object") return false;
  return "sunSign" in (v as object);
}

// ─── helpers ───────────────────────────────────────────────────────────────────

function isStepValueEmpty(value: unknown) {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value as object).length === 0;
  return false;
}

function isBirthPlaceAnswer(value: unknown): value is BirthPlaceAnswer {
  if (!value || typeof value !== "object") return false;
  const c = value as Partial<BirthPlaceAnswer>;
  return (
    typeof c.label === "string" &&
    typeof c.city === "string" &&
    typeof c.country === "string" &&
    typeof c.latitude === "number" &&
    typeof c.longitude === "number" &&
    (c.provider === "mapbox" || c.provider === "nominatim")
  );
}

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  return astroFetchJson<T>(input, {
    ...(init ?? {}),
    debugOrigin: "components.onboarding.flow",
  });
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Unable to read file."));
    reader.readAsDataURL(file);
  });
}

// ─── iOS Drum Picker ───────────────────────────────────────────────────────────

const ITEM_H = 48;
const VISIBLE = 5;

interface DrumColumnProps {
  items: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  bold?: boolean;
}

function DrumColumn({ items, selectedIndex, onChange, bold }: DrumColumnProps) {
  const startY = useRef(0);
  const startIdx = useRef(selectedIndex);
  const isDragging = useRef(false);

  function handleTouchStart(e: React.TouchEvent) {
    startY.current = e.touches[0].clientY;
    startIdx.current = selectedIndex;
    isDragging.current = true;
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!isDragging.current) return;
    const delta = startY.current - e.touches[0].clientY;
    const steps = Math.round(delta / ITEM_H);
    const next = Math.max(0, Math.min(items.length - 1, startIdx.current + steps));
    if (next !== selectedIndex) onChange(next);
  }

  function handleTouchEnd() {
    isDragging.current = false;
  }

  function handleMouseDown(e: React.MouseEvent) {
    startY.current = e.clientY;
    startIdx.current = selectedIndex;
    isDragging.current = true;

    function onMove(me: MouseEvent) {
      if (!isDragging.current) return;
      const delta = startY.current - me.clientY;
      const steps = Math.round(delta / ITEM_H);
      const next = Math.max(0, Math.min(items.length - 1, startIdx.current + steps));
      onChange(next);
    }

    function onUp() {
      isDragging.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  const offsetY = -(selectedIndex - Math.floor(VISIBLE / 2)) * ITEM_H;

  return (
    <div
      className="relative flex-1 overflow-hidden select-none cursor-grab active:cursor-grabbing"
      style={{ height: ITEM_H * VISIBLE }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
    >
      {/* selection lines */}
      <div
        className="pointer-events-none absolute inset-x-0 border-t border-b border-white/30"
        style={{
          top: ITEM_H * 2,
          height: ITEM_H,
        }}
      />
      {/* items */}
      <motion.div
        animate={{ y: offsetY }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="absolute top-0 left-0 right-0"
      >
        {items.map((item, i) => {
          const dist = Math.abs(i - selectedIndex);
          const opacity = dist === 0 ? 1 : dist === 1 ? 0.45 : 0.2;
          const fontSize = dist === 0 ? "1.05rem" : "0.9rem";
          return (
            <div
              key={item}
              className="flex items-center justify-center"
              style={{ height: ITEM_H, opacity, fontSize }}
              onClick={() => onChange(i)}
            >
              <span
                className={cn(
                  "text-white transition-all",
                  dist === 0 && (bold ? "font-bold" : "font-semibold")
                )}
              >
                {item}
              </span>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1));
const YEARS = Array.from({ length: 100 }, (_, i) => String(2006 - i));
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
const MERIDIEM = ["AM", "PM"];

interface ScrollDateValue { month: number; day: number; year: number }
interface ScrollTimeValue { hour: number; minute: number; meridiem: number }

function ScrollDatePicker({
  value,
  onChange,
}: {
  value: ScrollDateValue;
  onChange: (v: ScrollDateValue) => void;
}) {
  return (
    <div className="flex gap-2 px-2">
      <DrumColumn
        items={MONTHS}
        selectedIndex={value.month}
        onChange={(i) => onChange({ ...value, month: i })}
        bold
      />
      <DrumColumn
        items={DAYS}
        selectedIndex={value.day}
        onChange={(i) => onChange({ ...value, day: i })}
      />
      <DrumColumn
        items={YEARS}
        selectedIndex={value.year}
        onChange={(i) => onChange({ ...value, year: i })}
      />
    </div>
  );
}

function ScrollTimePicker({
  value,
  onChange,
}: {
  value: ScrollTimeValue;
  onChange: (v: ScrollTimeValue) => void;
}) {
  return (
    <div className="flex gap-2 px-2">
      <DrumColumn
        items={HOURS}
        selectedIndex={value.hour}
        onChange={(i) => onChange({ ...value, hour: i })}
        bold
      />
      <DrumColumn
        items={MINUTES}
        selectedIndex={value.minute}
        onChange={(i) => onChange({ ...value, minute: i })}
      />
      <DrumColumn
        items={MERIDIEM}
        selectedIndex={value.meridiem}
        onChange={(i) => onChange({ ...value, meridiem: i })}
        bold
      />
    </div>
  );
}

// ─── ForecastSphere ────────────────────────────────────────────────────────────

function ForecastSphere({ percent }: { percent: number }) {
  const isMax = percent >= 100;
  const fillColor = isMax
    ? "from-teal-300 via-cyan-400 to-blue-400"
    : percent >= 67
    ? "from-teal-400 via-cyan-400 to-blue-500"
    : "from-teal-500 via-cyan-300 to-blue-400";

  return (
    <div className="relative mx-auto flex items-center justify-center" style={{ width: 180, height: 180 }}>
      {/* glow */}
      <div
        className="absolute inset-0 rounded-full blur-2xl opacity-40"
        style={{ background: isMax ? "#2dd4bf" : "#06b6d4" }}
      />
      {/* sphere shell */}
      <div className="absolute inset-0 rounded-full border border-white/10 bg-[#0d1f35] overflow-hidden">
        {/* fill wave */}
        <motion.div
          className={cn("absolute bottom-0 left-0 right-0 bg-linear-to-t", fillColor)}
          initial={{ height: "0%" }}
          animate={{ height: `${percent}%` }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />
      </div>
      {/* percent label */}
      <span className="relative z-10 text-4xl font-bold text-white">{percent}%</span>
    </div>
  );
}

// ─── AdvisorBubble ─────────────────────────────────────────────────────────────

function AdvisorBubble({
  message,
  highlight,
  delay = 0,
}: {
  message: string;
  highlight?: string;
  delay?: number;
}) {
  const parts = highlight
    ? message.split(new RegExp(`(${highlight})`, "gi"))
    : [message];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className="mx-4 rounded-2xl bg-[#162237] border border-white/10 px-4 py-3 text-sm text-white/90 leading-relaxed"
    >
      {parts.map((p, i) =>
        p.toLowerCase() === highlight?.toLowerCase() ? (
          <span key={i} className="text-teal-300 font-semibold">{p}</span>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
      {/* tiny advisor avatar */}
      <div className="mt-2 flex justify-center">
        <div className="h-7 w-7 rounded-full bg-linear-to-br from-teal-400 to-cyan-600 flex items-center justify-center text-xs font-bold text-white">
          A
        </div>
      </div>
    </motion.div>
  );
}

// ─── ZodiacWheel (simple SVG) ──────────────────────────────────────────────────

const ZODIAC_SYMBOLS = ["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"];

function ZodiacWheel({ spinning }: { spinning: boolean }) {
  return (
    <div className="relative mx-auto" style={{ width: 180, height: 180 }}>
      {/* glow */}
      <div className="absolute inset-0 rounded-full blur-3xl opacity-30 bg-teal-400" />
      {/* wheel */}
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-teal-400/50 bg-[#050d1a] flex items-center justify-center overflow-hidden"
        animate={spinning ? { rotate: 360 } : { rotate: 0 }}
        transition={
          spinning
            ? { duration: 6, repeat: Infinity, ease: "linear" }
            : { duration: 0.5 }
        }
      >
        {ZODIAC_SYMBOLS.map((sym, i) => {
          const angle = (i / 12) * 360;
          const rad = (angle * Math.PI) / 180;
          const r = 72;
          const x = 90 + r * Math.sin(rad);
          const y = 90 - r * Math.cos(rad);
          return (
            <div
              key={sym}
              className="absolute text-[10px] text-teal-300/70"
              style={{ left: x - 6, top: y - 6 }}
            >
              {sym}
            </div>
          );
        })}
        {/* aspect lines */}
        <svg
          className="absolute inset-0"
          width="180"
          height="180"
          viewBox="0 0 180 180"
        >
          {[[0, 4], [2, 7], [5, 10], [1, 8]].map(([a, b], i) => {
            const r = 72;
            const ax = 90 + r * Math.sin(((a / 12) * 360 * Math.PI) / 180);
            const ay = 90 - r * Math.cos(((a / 12) * 360 * Math.PI) / 180);
            const bx = 90 + r * Math.sin(((b / 12) * 360 * Math.PI) / 180);
            const by = 90 - r * Math.cos(((b / 12) * 360 * Math.PI) / 180);
            const colors = ["#2dd4bf", "#f87171", "#86efac", "#c084fc"];
            return (
              <line
                key={i}
                x1={ax} y1={ay} x2={bx} y2={by}
                stroke={colors[i]}
                strokeWidth="0.8"
                strokeOpacity="0.6"
              />
            );
          })}
        </svg>
      </motion.div>
    </div>
  );
}

// ─── BirthChartResult ──────────────────────────────────────────────────────────

const SIGN_LABELS = [
  { sign: "Taurus", label: "Moon Sign" },
  { sign: "Pisces", label: "Sun Sign" },
  { sign: "Scorpio", label: "Ascendant" },
];

function BirthChartResultCard({ variant }: { variant?: string }) {
  if (variant === "bodygraph") {
    return (
      <div className="mx-4 rounded-2xl border border-white/10 bg-[#0d1f35] p-4 flex flex-col items-center gap-3">
        {/* simple bodygraph representation */}
        <div className="relative w-28 h-36">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-28 relative">
              {/* chakra centers simplified */}
              {[
                { top: "2%",  color: "#8b5cf6", label: "Crown" },
                { top: "18%", color: "#3b82f6", label: "Ajna" },
                { top: "34%", color: "#06b6d4", label: "Throat" },
                { top: "50%", color: "#22c55e", label: "G-Center" },
                { top: "66%", color: "#f59e0b", label: "Solar Plexus" },
                { top: "80%", color: "#ef4444", label: "Sacral" },
              ].map((c, i) => (
                <div
                  key={i}
                  className="absolute left-1/2 -translate-x-1/2 w-5 h-5 rounded-sm flex items-center justify-center"
                  style={{ top: c.top, background: c.color, opacity: 0.85 }}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-4 text-center">
          <div>
            <p className="text-xs text-teal-300 font-semibold">Power</p>
            <p className="text-xs text-white/80 mt-0.5">Initiative</p>
            <p className="text-xs text-white/80">Freedom</p>
            <p className="text-xs text-white/80">Vision</p>
          </div>
          <div>
            <p className="text-xs text-rose-400 font-semibold">Blocks</p>
            <p className="text-xs text-white/80 mt-0.5">Impulsivity</p>
            <p className="text-xs text-white/80">Resistance</p>
            <p className="text-xs text-white/80">Fatigue</p>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "centers") {
    return (
      <div className="mx-4 rounded-2xl border border-white/10 bg-[#0d1f35] p-4 flex gap-4 justify-center">
        {[
          { name: "Root Center", sub: "Vitality, Movement, Freedom", color: "#ef4444" },
          { name: "Sacral Center", sub: "Creation, Growth, Energy", color: "#f97316" },
        ].map((c) => (
          <div key={c.name} className="flex flex-col items-center gap-2 flex-1">
            <div
              className="w-14 h-20 rounded-xl flex items-center justify-center"
              style={{ background: `${c.color}22`, border: `1px solid ${c.color}55` }}
            >
              <div
                className="w-8 h-8 rounded-sm"
                style={{ background: c.color, opacity: 0.8 }}
              />
            </div>
            <p className="text-xs text-teal-300 font-semibold text-center">{c.name}</p>
            <p className="text-[10px] text-white/60 text-center leading-tight">{c.sub}</p>
          </div>
        ))}
      </div>
    );
  }

  // default astrology chart
  return (
    <div className="mx-4 rounded-2xl border border-white/10 bg-[#0d1f35] p-4">
      <p className="text-center text-xs text-white/50 mb-2">Man · Pisces · Water</p>
      <div className="flex justify-around mb-3">
        <div className="text-center">
          <p className="text-xs text-teal-300">△</p>
          <p className="text-xs font-semibold text-white">Cardinal</p>
          <p className="text-[10px] text-white/50">Modality</p>
        </div>
        <ZodiacWheel spinning={false} />
        <div className="text-center">
          <p className="text-xs text-teal-300">♀</p>
          <p className="text-xs font-semibold text-white">Feminine</p>
          <p className="text-[10px] text-white/50">Polarity</p>
        </div>
      </div>
      <div className="border-t border-white/10 pt-3">
        <p className="text-xs text-white/50 text-center mb-2">Your Details</p>
        <div className="flex justify-around">
          {SIGN_LABELS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-sm font-semibold text-teal-300">{s.sign}</p>
              <p className="text-[10px] text-white/50">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── PalmDiagram ───────────────────────────────────────────────────────────────

const PALM_LABELS = [
  { label: "Children", pos: { top: "8%",  left: "50%",  transform: "translateX(-50%)" } },
  { label: "Career",   pos: { top: "40%", left: "4%",   transform: "none" } },
  { label: "Marriage", pos: { top: "40%", right: "4%",  transform: "none" } },
  { label: "Big Change", pos: { bottom: "28%", left: "4%", transform: "none" } },
  { label: "Money",    pos: { bottom: "28%", right: "4%", transform: "none" } },
];

function PalmDiagram() {
  return (
    <div className="relative mx-auto" style={{ width: 260, height: 300 }}>
      {/* corner scan brackets */}
      {[
        { top: 0,    left: 0,    borderTop: "2px solid #2dd4bf", borderLeft: "2px solid #2dd4bf" },
        { top: 0,    right: 0,   borderTop: "2px solid #2dd4bf", borderRight: "2px solid #2dd4bf" },
        { bottom: 0, left: 0,    borderBottom: "2px solid #2dd4bf", borderLeft: "2px solid #2dd4bf" },
        { bottom: 0, right: 0,   borderBottom: "2px solid #2dd4bf", borderRight: "2px solid #2dd4bf" },
      ].map((s, i) => (
        <div key={i} className="absolute w-7 h-7" style={s as React.CSSProperties} />
      ))}

      {/* hand image */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative" style={{ width: 160, height: 240 }}>
          <Image
            src="/assets/onboarding/palm-reading/images/hand.2a469d86.webp"
            alt="Palm hand"
            fill
            className="object-contain"
          />
        </div>
      </div>

      {/* labels */}
      {PALM_LABELS.map((pl) => (
        <div
          key={pl.label}
          className="absolute flex items-center gap-1 text-[10px] text-white/80"
          style={pl.pos as React.CSSProperties}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-teal-400 inline-block" />
          <span>{pl.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── SocialProofCard ───────────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    name: "Emily",
    country: "US United States",
    text: "The sketch looked like someone I already knew. I never saw him romantically before, but after that, everything changed. We're together now.",
    days: "5 days ago",
  },
  {
    name: "Alex",
    country: "CA Canada",
    text: "The sketch reminded me of a close friend. I laughed at first, but we ended up dating shortly after. Still feels unreal.",
    days: "5 days ago",
  },
  {
    name: "Laura",
    country: "GB United Kingdom",
    text: "The app matched me with my soulmate, and we actually met. Everything it predicted was spot on — it truly changed my life.",
    days: "7 days ago",
  },
];

function SocialProofCards() {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 px-4 scrollbar-none">
      {TESTIMONIALS.map((t) => (
        <div
          key={t.name}
          className="min-w-55 rounded-2xl border border-white/10 bg-[#0d1f35] p-3 flex flex-col gap-2"
        >
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-linear-to-br from-teal-400 to-cyan-600 flex items-center justify-center text-sm font-bold text-white">
              {t.name[0]}
            </div>
            <div>
              <p className="text-xs font-semibold text-white">{t.name}</p>
              <p className="text-[10px] text-white/50">{t.country}</p>
            </div>
            <span className="ml-auto text-[10px] text-white/40">{t.days}</span>
          </div>
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className="text-yellow-400 text-xs">★</span>
            ))}
          </div>
          <p className="text-[11px] text-white/75 leading-relaxed">{t.text}</p>
        </div>
      ))}
    </div>
  );
}

// ─── AdvisorIntroCard ──────────────────────────────────────────────────────────

function AdvisorIntroCard() {
  return (
    <div className="mx-4 rounded-2xl border border-white/10 bg-[#0d1f35] p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-14 w-14 rounded-full bg-linear-to-br from-teal-500 to-blue-700 flex items-center justify-center text-2xl">
          🧭
        </div>
        <p className="text-xs text-white/70 leading-relaxed flex-1 italic">
          "I've helped professionals choose the right city for growth, families find places that
          feel like home, and couples start again in more supportive locations."
        </p>
      </div>
      <div className="flex justify-around border-t border-white/10 pt-3">
        {[
          { num: "30+",   label: "years of practice" },
          { num: "9 800+", label: "maps interpreted" },
          { num: "176",   label: "countries analyzed" },
        ].map((s) => (
          <div key={s.label} className="text-center">
            <p className="text-sm font-bold text-teal-300">{s.num}</p>
            <p className="text-[10px] text-white/50">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── GenderCards ──────────────────────────────────────────────────────────────

const GENDER_SYMBOLS: Record<string, string> = {
  female: "♀",
  male: "♂",
  "non-binary": "⊕",
};

interface GenderCardsProps {
  options: NonNullable<OnboardingStep["options"]>;
  onSelect: (value: string) => void;
}

function GenderCards({ options, onSelect }: GenderCardsProps) {
  return (
    <div className="px-4">
      <p className="text-center text-sm text-white/70 mb-4">Select your gender to start</p>
      <div className="flex gap-3 justify-center">
        {options.map((opt) => (
          <motion.button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            whileTap={{ scale: 0.95 }}
            className="flex-1 max-w-25 flex flex-col items-center gap-2 rounded-2xl border border-white/20 bg-[#1a3040] py-5 px-2 transition hover:bg-[#1e3a4a] hover:border-teal-400/40"
          >
            <span className="text-3xl text-[#c9a87c]">
              {GENDER_SYMBOLS[opt.value] ?? opt.emoji ?? "○"}
            </span>
            <span className="text-sm font-medium text-white">{opt.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ─── Main OnboardingFlow ───────────────────────────────────────────────────────

export function OnboardingFlow({
  category,
  assets,
  initialSessionId = null,
}: OnboardingFlowProps) {
  const router = useRouter();

  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [sessionReady, setSessionReady] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // date picker state
  const [dateVal, setDateVal] = useState<ScrollDateValue>({ month: 2, day: 0, year: 25 });
  // time picker state
  const [timeVal, setTimeVal] = useState<ScrollTimeValue>({ hour: 11, minute: 0, meridiem: 0 });
  const [forgotTime, setForgotTime] = useState(false);

  // birth-place
  const [draftText, setDraftText] = useState("");
  const [birthPlaceSelection, setBirthPlaceSelection] = useState<BirthPlaceAnswer | null>(null);
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationConfigured, setLocationConfigured] = useState(true);

  // birth-chart internal phase: "loading" | "result"
  const [chartPhase, setChartPhase] = useState<"loading" | "result">("loading");
  // forecast accuracy shown after mount
  const [forecastVisible, setForecastVisible] = useState(false);
  // email input for final step
  const [email, setEmail] = useState("");

  const steps = category.steps;
  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const isWelcome = stepIndex === 0 && step.kind === "intro";

  const backgroundMedia = useMemo(
    () => resolveStepMedia(category.slug, stepIndex, assets),
    [assets, category.slug, stepIndex]
  );

  // reset per-step state when step changes
  useEffect(() => {
    setChartPhase("loading");
    setForecastVisible(false);
    setError(null);

    const existing = answers[step.id];
    if (step.id === "birth-place" && isBirthPlaceAnswer(existing)) {
      setDraftText(existing.label);
      setBirthPlaceSelection(existing);
    } else if (typeof existing === "string" && step.kind !== "scroll-date" && step.kind !== "scroll-time") {
      setDraftText(existing);
    } else {
      setDraftText("");
      setBirthPlaceSelection(null);
      setLocationSuggestions([]);
    }

  }, [step.id, step.kind]); // eslint-disable-line react-hooks/exhaustive-deps

  // start forecast visibility animation
  useEffect(() => {
    if (step.kind !== "forecast") return;
    const t = setTimeout(() => setForecastVisible(true), 200);
    return () => clearTimeout(t);
  }, [step.id, step.kind]);

  // plan-ready → auto-advance after 2.5s
  useEffect(() => {
    if (step.kind !== "plan-ready") return;
    const t = setTimeout(() => void nextStep(), step.autoAdvanceMs ?? 2500);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.id, step.kind]);

  // birth-chart loading → result transition
  useEffect(() => {
    if (step.kind !== "birth-chart") return;
    const ms = step.autoAdvanceMs ?? 2400;
    const t = setTimeout(() => setChartPhase("result"), ms);
    return () => clearTimeout(t);
  }, [step.id, step.kind, step.autoAdvanceMs]);

  // location autocomplete debounce
  useEffect(() => {
    if (step.id !== "birth-place") return;
    const q = draftText.trim();
    if (q.length < 2) {
      setLocationSuggestions([]);
      setLocationLoading(false);
      return;
    }
    if (birthPlaceSelection && q.toLowerCase() === birthPlaceSelection.label.toLowerCase()) {
      setLocationSuggestions([]);
      return;
    }
    let cancelled = false;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setLocationLoading(true);
      fetchJson<{ suggestions: LocationSuggestion[]; meta?: { configured?: boolean } }>(
        `/api/location/autocomplete?q=${encodeURIComponent(q)}&limit=7`,
        { signal: ctrl.signal }
      )
        .then((r) => {
          if (cancelled) return;
          setLocationSuggestions(r.suggestions ?? []);
          setLocationConfigured(r.meta?.configured !== false);
          setLocationError(null);
        })
        .catch((e) => {
          if (cancelled || (e instanceof Error && e.name === "AbortError")) return;
          setLocationSuggestions([]);
          setLocationError("Could not load suggestions.");
        })
        .finally(() => {
          if (!cancelled) setLocationLoading(false);
        });
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(t);
      ctrl.abort();
    };
  }, [draftText, birthPlaceSelection, step.id]);

  // session bootstrap
  const applySession = useCallback(
    (session: OnboardingSession) => {
      setSessionId(session.sessionId);
      setAnswers(session.answers ?? {});
      setStepIndex(Math.min(session.currentStep ?? 0, steps.length - 1));
      setSessionReady(true);
    },
    [steps.length]
  );

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      try {
        setSessionReady(false);
        if (initialSessionId) {
          const s = await fetchJson<OnboardingSession>(`/api/onboarding/session/${initialSessionId}`);
          if (!cancelled) applySession(s);
          return;
        }
        const s = await fetchJson<OnboardingSession>("/api/onboarding/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category: category.slug, source: "public-onboarding" }),
        });
        if (!cancelled) applySession(s);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not start session.");
          setSessionReady(true);
        }
      }
    }
    void bootstrap();
    return () => { cancelled = true; };
  }, [applySession, category.slug, initialSessionId]);

  const persistProgress = useCallback(
    async (nextIndex: number, eventType = "step_advanced") => {
      if (!sessionId) return;
      await fetchJson(`/api/onboarding/session/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentStep: nextIndex,
          event: { type: eventType, stepId: step.id },
        }),
      });
    },
    [sessionId, step.id]
  );

  const saveAnswer = useCallback(
    async (value: unknown, nextIndex: number) => {
      if (!sessionId) return;
      const updated = await fetchJson<OnboardingSession>(
        `/api/onboarding/session/${sessionId}/answer`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stepId: step.id, value, currentStep: nextIndex }),
        }
      );
      setAnswers(updated.answers ?? {});
    },
    [sessionId, step.id]
  );

  const completeSession = useCallback(async () => {
    if (!sessionId) return;
    await fetchJson(`/api/onboarding/session/${sessionId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
  }, [sessionId]);

  const nextStep = useCallback(
    async (autoValue?: unknown) => {
      if (saving || !sessionReady) return;
      setSaving(true);
      setError(null);
      try {
        if (step.kind === "final") {
          if (!email.trim()) throw new Error("Please enter your email.");
          await saveAnswer(email.trim(), stepIndex);
          await completeSession();
          const q = new URLSearchParams({
            next: "/today",
            onboardingSession: sessionId ?? "",
            category: category.slug,
          });
          router.push(`/auth/signup?${q.toString()}`);
          return;
        }

        const nextIndex = Math.min(stepIndex + 1, steps.length - 1);

        if (autoValue !== undefined) {
          // welcome/gender auto-advance
          await saveAnswer(autoValue, nextIndex);
        } else if (step.kind === "single-choice") {
          const v = answers[step.id];
          if (step.required && isStepValueEmpty(v)) throw new Error("Please select an option.");
          if (!isStepValueEmpty(v)) await saveAnswer(v, nextIndex);
          else await persistProgress(nextIndex);
        } else if (step.kind === "multi-choice") {
          const v = answers[step.id];
          if (step.required && isStepValueEmpty(v)) throw new Error("Please select at least one option.");
          if (!isStepValueEmpty(v)) await saveAnswer(v, nextIndex);
          else await persistProgress(nextIndex);
        } else if (step.kind === "scroll-date") {
          const dateStr = `${MONTHS[dateVal.month]} ${Number(DAYS[dateVal.day])}, ${YEARS[dateVal.year]}`;
          await saveAnswer(dateStr, nextIndex);
        } else if (step.kind === "scroll-time") {
          if (forgotTime) {
            await persistProgress(nextIndex);
          } else {
            const timeStr = `${HOURS[timeVal.hour]}:${MINUTES[timeVal.minute]} ${MERIDIEM[timeVal.meridiem]}`;
            await saveAnswer(timeStr, nextIndex);
          }
        } else if (step.kind === "text") {
          const v = step.id === "birth-place" && birthPlaceSelection ? birthPlaceSelection : draftText;
          if (step.required && isStepValueEmpty(v)) throw new Error("Please fill this field.");
          if (!isStepValueEmpty(v)) await saveAnswer(v, nextIndex);
          else await persistProgress(nextIndex);
        } else {
          await persistProgress(nextIndex);
        }

        setStepIndex(nextIndex);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not continue.");
      } finally {
        setSaving(false);
      }
    },
    [
      answers, birthPlaceSelection, category.slug, completeSession, dateVal,
      draftText, email, forgotTime, persistProgress, router, saveAnswer,
      saving, sessionId, sessionReady, step.id, step.kind, step.required,
      stepIndex, steps.length, timeVal,
    ]
  );

  function goBack() {
    if (saving || stepIndex === 0) return;
    const prev = Math.max(stepIndex - 1, 0);
    setStepIndex(prev);
    if (sessionId) {
      void persistProgress(prev, "step_back").catch(() => null);
    }
  }

  function selectBirthPlace(s: LocationSuggestion) {
    const p: BirthPlaceAnswer = {
      label: s.label, fullName: s.fullName, city: s.city, region: s.region,
      country: s.country, countryCode: s.countryCode,
      latitude: s.latitude, longitude: s.longitude,
      provider: s.provider, providerId: s.id,
    };
    setDraftText(s.label);
    setBirthPlaceSelection(p);
    setLocationSuggestions([]);
    setAnswers((prev) => ({ ...prev, [step.id]: p }));
  }

  function handlePalmOnboardingComplete(result: PalmScanRecord, capturedEmail: string) {
    setEmail(capturedEmail);
    setAnswers((prev) => ({ ...prev, "lead-email": capturedEmail }));
    void nextStep({
      scanId: result.scanId,
      side: result.side,
      lineScore: result.interpret.core.lineScore,
      insights: result.interpret.insights,
    });
  }

  // ─── render helpers ──────────────────────────────────────────────────────────

  function renderStepContent() {
    switch (step.kind) {
      case "intro":
        return null; // handled in welcome layout

      case "single-choice":
        return (
          <div className="flex flex-col gap-2.5 px-4">
            {(step.options ?? []).map((opt, i) => {
              const selected = answers[step.id] === opt.value;
              return (
                <motion.button
                  key={opt.value}
                  type="button"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => {
                    if (saving) return;
                    setAnswers((prev) => ({ ...prev, [step.id]: opt.value }));
                    setTimeout(() => void nextStep(opt.value), 350);
                  }}
                  className={cn(
                    "flex items-center gap-3 w-full rounded-2xl border px-4 py-3.5 text-left transition-all",
                    selected
                      ? "border-teal-400/70 bg-teal-400/15"
                      : "border-white/15 bg-[#1a3040] hover:border-teal-400/30"
                  )}
                >
                  {opt.color && (
                    <span
                      className="h-5 w-5 rounded-full shrink-0"
                      style={{ background: opt.color }}
                    />
                  )}
                  {opt.emoji && !opt.color && (
                    <span className="text-lg w-7 shrink-0 text-center">{opt.emoji}</span>
                  )}
                  <span className="text-sm font-medium text-white">{opt.label}</span>
                </motion.button>
              );
            })}
          </div>
        );

      case "multi-choice": {
        const selected: string[] = Array.isArray(answers[step.id])
          ? (answers[step.id] as string[])
          : [];
        const max = step.maxSelect ?? 99;
        return (
          <div className="px-4">
            <p className="text-center text-xs text-white/50 mb-3">
              Selected: {selected.length}/{max}
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {(step.options ?? []).map((opt) => {
                const on = selected.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setAnswers((prev) => {
                        const cur: string[] = Array.isArray(prev[step.id])
                          ? [...(prev[step.id] as string[])]
                          : [];
                        if (cur.includes(opt.value)) {
                          return { ...prev, [step.id]: cur.filter((v) => v !== opt.value) };
                        }
                        if (cur.length >= max) return prev;
                        return { ...prev, [step.id]: [...cur, opt.value] };
                      });
                    }}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all",
                      on
                        ? "border-teal-400/70 bg-teal-400/15 text-white"
                        : "border-white/15 bg-[#1a3040] text-white/70"
                    )}
                  >
                    {opt.emoji && <span>{opt.emoji}</span>}
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      }

      case "scroll-date":
        return (
          <div className="px-2">
            <ScrollDatePicker value={dateVal} onChange={setDateVal} />
          </div>
        );

      case "scroll-time":
        return (
          <div className="px-2">
            <ScrollTimePicker value={timeVal} onChange={setTimeVal} />
            {!forgotTime && (
              <button
                type="button"
                onClick={() => { setForgotTime(true); void nextStep(); }}
                className="mt-4 w-full text-center text-sm text-teal-300 underline underline-offset-2"
              >
                I don't remember
              </button>
            )}
          </div>
        );

      case "text":
        if (step.id === "birth-place") {
          return (
            <div className="space-y-2 px-4">
              <div className="relative">
                <input
                  value={draftText}
                  onChange={(e) => {
                    setDraftText(e.target.value);
                    setBirthPlaceSelection(null);
                  }}
                  placeholder={step.placeholder ?? "e.g. Mumbai, India"}
                  autoComplete="off"
                  className="w-full rounded-2xl border border-white/20 bg-[#0d1f35] px-4 py-3 pr-10 text-sm text-white outline-none focus:border-teal-400"
                />
                {locationLoading && (
                  <Loader2 className="absolute right-3 top-3.5 h-4 w-4 animate-spin text-teal-300" />
                )}
              </div>
              {locationSuggestions.length > 0 && (
                <div className="rounded-2xl border border-white/15 bg-[#0a1829]/95 max-h-48 overflow-y-auto">
                  {locationSuggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="w-full border-b border-white/8 px-3 py-2.5 text-left hover:bg-white/5 last:border-0"
                      onClick={() => selectBirthPlace(s)}
                    >
                      <p className="text-sm font-medium text-white">{s.label}</p>
                      <p className="text-xs text-white/50">{s.fullName}</p>
                    </button>
                  ))}
                </div>
              )}
              {birthPlaceSelection && (
                <p className="text-xs text-teal-300/90 px-1">
                  ✓ {birthPlaceSelection.city}, {birthPlaceSelection.country}
                </p>
              )}
              {!locationConfigured && (
                <p className="text-xs text-amber-300/80 px-1">
                  Autosuggest unavailable. Type city and country manually.
                </p>
              )}
              {locationError && <p className="text-xs text-rose-300 px-1">{locationError}</p>}
            </div>
          );
        }
        return (
          <div className="px-4">
            <input
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              placeholder={step.placeholder ?? "Enter value"}
              className="w-full rounded-2xl border border-white/20 bg-[#0d1f35] px-4 py-3 text-sm text-white outline-none focus:border-teal-400"
            />
          </div>
        );

      case "loading":
        return (
          <div className="flex flex-col items-center gap-6 px-4">
            <Loader2 className="h-12 w-12 animate-spin text-teal-300" />
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-linear-to-r from-teal-300 to-cyan-400"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: (step.autoAdvanceMs ?? 1800) / 1000, ease: "easeInOut" }}
              />
            </div>
          </div>
        );

      case "birth-chart":
        return (
          <div className="flex flex-col gap-4">
            <AnimatePresence mode="wait">
              {chartPhase === "loading" ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-4"
                >
                  <ZodiacWheel spinning />
                  {step.title && (
                    <p className="text-center text-base font-semibold text-white px-4">
                      {step.title}
                    </p>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-4"
                >
                  {step.advisorMessage && (
                    <AdvisorBubble
                      message={step.advisorMessage}
                      highlight={step.advisorHighlight}
                    />
                  )}
                  <BirthChartResultCard variant={step.chartVariant} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );

      case "forecast":
        return (
          <div className="flex flex-col items-center gap-5 px-4">
            <ForecastSphere percent={forecastVisible ? (step.forecastPercent ?? 34) : 0} />
            {step.advisorMessage && (
              <AdvisorBubble
                message={step.advisorMessage}
                highlight={step.advisorHighlight}
                delay={0.6}
              />
            )}
          </div>
        );

      case "palm-photo":
        return null; // PalmCameraScanner rendered as fixed overlay below

      case "plan-ready": {
        const zodiacSign =
          (answers["birth-sign"] as string | undefined) ??
          (answers["sun-sign"] as string | undefined) ??
          (answers["welcome"] as string | undefined);
        return (
          <div className="flex flex-col flex-1 items-center justify-center gap-8 px-6 py-12">
            <div className="relative flex items-center justify-center">
              <motion.div
                className="absolute w-48 h-48 rounded-full"
                style={{ background: "radial-gradient(circle, rgba(45,212,191,0.25) 0%, transparent 70%)" }}
                animate={{ scale: [1, 1.12, 1] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              />
              <motion.div
                className="absolute w-36 h-36 rounded-full border border-teal-400/30"
                animate={{ rotate: 360 }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              />
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(45,212,191,0.15)", border: "1px solid rgba(45,212,191,0.3)" }}
              >
                <span className="text-4xl text-amber-300">
                  {(zodiacSign && SIGN_GLYPHS[zodiacSign]) ?? "★"}
                </span>
              </div>
            </div>
            {zodiacSign && (
              <p className="text-sm text-white/50 capitalize">{zodiacSign}</p>
            )}
          </div>
        );
      }

      case "social-proof":
        return (
          <div className="flex flex-col gap-3">
            <SocialProofCards />
            <p className="text-center text-xs text-white/50">❤️ Real people. Real matches</p>
          </div>
        );

      case "advisor-intro":
        return <AdvisorIntroCard />;

      case "video-story": {
        const videoSrcMap: Record<string, string> = {
          "video-story-1": "/assets/onboarding/astrocartography/videos/cut1.mp4",
          "video-story-2": "/assets/onboarding/astrocartography/videos/cut2.mp4",
        };
        const videoSrc = videoSrcMap[step.id] ?? "/assets/onboarding/astrocartography/videos/cut1.mp4";
        return (
          <div className="flex flex-col overflow-hidden rounded-2xl mx-4 border border-white/10">
            {/* video — tall, edge-to-edge within the card */}
            <div className="relative" style={{ height: "clamp(260px, 48vh, 420px)" }}>
              <video
                key={videoSrc}
                src={videoSrc}
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
                poster="/assets/onboarding/astrocartography/images/adviser.5a7a5fe9.webp"
              />
              {/* subtle bottom fade into text area */}
              <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-[#0d1f35] to-transparent" />
              <button type="button" className="absolute top-3 right-3 text-white/70 bg-black/30 rounded-full p-1.5">
                <Volume2 className="h-4 w-4" />
              </button>
            </div>
            {/* text below */}
            <div className="bg-[#0d1f35] px-4 pt-2 pb-4 space-y-2">
              {(step.videoStoryLines ?? []).map((line, i) => (
                <p key={i} className="text-sm text-white/85 leading-relaxed">
                  {line.split(/(Moon and Venus lines)/g).map((p, j) =>
                    p === "Moon and Venus lines" ? (
                      <span key={j} className="text-teal-300 font-semibold">{p}</span>
                    ) : (
                      <span key={j}>{p}</span>
                    )
                  )}
                </p>
              ))}
            </div>
          </div>
        );
      }

      case "final":
        return (
          <div className="px-4 space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full rounded-2xl border border-white/20 bg-[#0d1f35] px-4 py-3.5 text-sm text-white outline-none focus:border-teal-400"
            />
            <p className="text-xs text-white/40 text-center leading-relaxed px-2">
              🔒 Your personal data is safe with us. We'll use your email for updates, receipts, and
              subscription details.
            </p>
          </div>
        );

      default:
        return null;
    }
  }

  // progress bar value (0–100)
  const progressPercent = steps.length > 1
    ? Math.round((stepIndex / (steps.length - 1)) * 100)
    : 100;

  // ─── WELCOME / LANDING PAGE ────────────────────────────────────────────────

  if (isWelcome) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#0d1825] text-white flex flex-col">
        {/* background */}
        <div className="pointer-events-none absolute inset-0">
          {backgroundMedia.kind === "image" ? (
            <Image
              src={backgroundMedia.src}
              alt="background"
              fill
              priority
              className="object-cover opacity-30"
            />
          ) : (
            <video
              key={backgroundMedia.src}
              src={backgroundMedia.src}
              autoPlay muted loop playsInline
              className="h-full w-full object-cover opacity-30"
            />
          )}
          <div className="absolute inset-0 bg-linear-to-b from-[#0d1825]/60 via-[#0d1825]/70 to-[#0d1825]" />
        </div>

        {/* header */}
        <div className="relative z-10 flex items-center justify-between px-4 pt-4 pb-2">
          <div className="w-8" />
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-linear-to-br from-teal-400 to-cyan-600 flex items-center justify-center">
              <span className="text-[10px]">✦</span>
            </div>
            <span className="text-sm font-semibold tracking-wide">{BRAND_NAME}</span>
          </div>
          <div className="w-8" />
        </div>

        {/* hero content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-4 pt-4 pb-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <h1 className="text-2xl font-bold leading-tight text-white mb-3">
              {step.title}
            </h1>
            {step.subtitle && (
              <p className="text-sm text-white/65 leading-relaxed max-w-xs mx-auto">
                {step.subtitle}
              </p>
            )}
          </motion.div>

          {!sessionReady ? (
            <div className="flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-teal-300" />
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <GenderCards
                options={step.options ?? []}
                onSelect={(val) => {
                  setAnswers((prev) => ({ ...prev, [step.id]: val }));
                  void nextStep(val);
                }}
              />
            </motion.div>
          )}

          {error && (
            <p className="mt-4 text-center text-xs text-rose-300">{error}</p>
          )}
        </div>

        {/* footer */}
        <div className="relative z-10 px-4 pb-6 text-center space-y-2">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <div className="h-5 w-5 rounded-full bg-linear-to-br from-teal-400 to-cyan-600 flex items-center justify-center">
              <span className="text-[8px]">✦</span>
            </div>
            <span className="text-xs font-semibold text-white/60">{BRAND_NAME}</span>
          </div>
          <p className="text-[10px] text-white/35">
            2026 © All Rights Reserved.{" "}
            <span className="block">By continuing you agree to our</span>
          </p>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
            {["Privacy Policy", "Terms of Use", "Billing Terms", "Money-Back Policy"].map((t) => (
              <span key={t} className="text-[10px] text-white/50 underline cursor-pointer">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── STANDARD QUIZ PAGE ────────────────────────────────────────────────────

  const ctaLabel = step.ctaLabel ?? (saving ? "Loading..." : "Continue");
  const showCTA = step.kind !== "loading" && step.kind !== "palm-photo" && step.kind !== "plan-ready";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0d1825] text-white flex flex-col">
      {/* background media */}
      <div className="pointer-events-none absolute inset-0">
        {backgroundMedia.kind === "image" ? (
          <Image
            src={backgroundMedia.src}
            alt="background"
            fill
            priority
            className="object-cover opacity-20"
          />
        ) : (
          <video
            key={backgroundMedia.src}
            src={backgroundMedia.src}
            autoPlay muted loop playsInline
            className="h-full w-full object-cover opacity-25"
          />
        )}
        <div className="absolute inset-0 bg-linear-to-b from-[#0d1825]/80 via-[#0d1825]/85 to-[#0d1825]" />
      </div>

      {/* header */}
      <div className="relative z-10 shrink-0">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <button
            type="button"
            onClick={goBack}
            disabled={stepIndex === 0 || saving}
            className="h-8 w-8 flex items-center justify-center rounded-full text-white/60 disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold tracking-wide">{BRAND_NAME}</span>
          <span className="text-xs text-white/50 w-12 text-right">
            {stepIndex + 1}/{steps.length}
          </span>
        </div>
        {/* thin teal progress bar */}
        <div className="h-0.5 w-full bg-white/10">
          <motion.div
            className="h-full bg-teal-400"
            layoutId="onboarding-progress"
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          />
        </div>

        {/* sign chip / Big Three row — appears after birth-date is answered */}
        {(() => {
          const chart = isComputedChart(answers["computedChart"]) ? answers["computedChart"] : null;
          const sunSign = chart?.sunSign ?? dateStringToSunSign(answers["birth-date"] as string ?? "");
          if (!sunSign) return null;
          const hasBigThree = chart?.moonSign && chart?.risingSign;
          return (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-2 px-4 py-1.5"
            >
              {hasBigThree ? (
                // Big Three row — Astroline-style with scraped icons
                <>
                  {[
                    {
                      src: "/assets/scraped-catalog/astronomy/planets/sun/color-sun-9eeb857450f76312313a914653edbbb3.png",
                      label: "Sun",
                      sign: chart!.sunSign!,
                    },
                    {
                      src: "/assets/scraped-catalog/astronomy/planets/moon/color-moon-4fe5d20f3db510278c4cdb3e963492c9.png",
                      label: "Moon",
                      sign: chart!.moonSign!,
                    },
                    {
                      src: "/assets/scraped-catalog/astronomy/planets/ascendant/color-ascendant-5d061382278a0df504e3f6dba8048cb2.png",
                      label: "Rising",
                      sign: chart!.risingSign!,
                    },
                  ].map(({ src, label, sign }, i, arr) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <div className="flex items-center gap-1">
                        <Image src={src} alt={label} width={16} height={16} className="object-contain" />
                        <div className="flex flex-col leading-none">
                          <span className="text-[9px] text-white/40 uppercase tracking-wide">{label}</span>
                          <span className="text-[11px] text-white/85 capitalize font-semibold">{sign}</span>
                        </div>
                      </div>
                      {i < arr.length - 1 && <span className="text-white/20 text-xs">·</span>}
                    </div>
                  ))}
                </>
              ) : (
                // Simple sun sign chip
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/8 border border-white/12 px-3 py-1 text-[11px] text-white/75">
                  <span className="text-amber-300">{SIGN_GLYPHS[sunSign] ?? "★"}</span>
                  <span className="capitalize font-medium">{sunSign}</span>
                  {SIGN_ELEMENTS[sunSign] && (
                    <>
                      <span className="text-white/30">·</span>
                      <span className="text-white/50">{SIGN_ELEMENTS[sunSign]}</span>
                    </>
                  )}
                </span>
              )}
            </motion.div>
          );
        })()}
      </div>

      {/* scrollable content */}
      <div className="relative z-10 flex-1 overflow-y-auto pb-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22 }}
            className="pt-6 pb-4 flex flex-col gap-5"
          >
            {/* title / subtitle */}
            {step.kind !== "birth-chart" && step.kind !== "forecast" && (
              <div className="px-4 text-center">
                <h1 className="text-xl font-bold text-white leading-snug">{step.title}</h1>
                {step.subtitle && (
                  <p className="mt-2 text-sm text-white/60 leading-relaxed">{step.subtitle}</p>
                )}
              </div>
            )}

            {/* forecast title */}
            {step.kind === "forecast" && (
              <p className="text-center text-lg font-bold text-white px-4">{step.title}</p>
            )}

            {/* step body */}
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* sticky bottom CTA */}
      {showCTA && (
        <div className="relative z-20 shrink-0 px-4 pb-8 pt-3 bg-linear-to-t from-[#0d1825] via-[#0d1825]/95 to-transparent">
          {error && (
            <p className="mb-3 text-center text-xs text-rose-300">{error}</p>
          )}
          <button
            type="button"
            onClick={() => void nextStep()}
            disabled={saving || !sessionReady || (step.kind === "birth-chart" && chartPhase === "loading")}
            className="w-full h-14 rounded-full bg-teal-400 text-[#0d1825] font-bold text-base transition active:scale-[0.97] disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin mx-auto" />
            ) : (
              ctaLabel
            )}
          </button>
        </div>
      )}

      {/* Palm scanner overlay — mounted when on palm-photo step */}
      {step.kind === "palm-photo" && (
        <PalmCameraScanner
          hand="left"
          onClose={goBack}
          onboardingComplete={handlePalmOnboardingComplete}
        />
      )}
    </div>
  );
}
