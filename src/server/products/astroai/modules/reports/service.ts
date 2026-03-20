import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/server/foundation/errors";
import { createServerLogger, durationMs } from "@/server/foundation/observability/logger";
import type {
  ReportDetailDTO,
  ReportDetailWithProductDTO,
  ReportProductDTO,
  ReportsListDTO,
} from "./types";

interface ProductRow {
  slug: string;
  title: string;
  teaser: string | null;
  price_inr: number | null;
  status: string;
  badge: string | null;
  icon_url: string | null;
  accent: string | null;
  metadata: unknown;
}

function rowToProductDTO(row: ProductRow): ReportProductDTO {
  return {
    id: row.slug,
    title: row.title,
    teaser: row.teaser ?? "",
    price: row.price_inr != null ? Number(row.price_inr) : null,
    status: (row.status as ReportProductDTO["status"]) ?? "buy",
    badge: row.badge,
    icon: row.icon_url ?? "",
    accent: row.accent ?? "#84CC16",
  };
}

function extractDetail(slug: string, row: ProductRow): ReportDetailDTO {
  const meta = row.metadata as Record<string, unknown> | null;
  const rd = meta?.report_detail as Record<string, unknown> | undefined;
  if (!rd) {
    return {
      id: slug,
      title: row.title,
      subtitle: "",
      stats: [],
      sections: [],
    };
  }
  return {
    id: slug,
    title: row.title,
    subtitle: (rd.subtitle as string) ?? "",
    stats: Array.isArray(rd.stats)
      ? (rd.stats as Array<{ label: string; value: string }>)
      : [],
    sections: Array.isArray(rd.sections)
      ? (rd.sections as Array<{ title: string; body: string; bullets?: string[] }>).map((s) => ({
          title: s.title,
          body: s.body,
          bullets: s.bullets ?? [],
        }))
      : [],
  };
}

export class ReportsService {
  constructor(private readonly supabase: SupabaseClient) {}

  async listProducts(): Promise<ReportsListDTO> {
    const logger = createServerLogger("astroai.reports.service");
    const startedAt = Date.now();
    logger.info("listProducts.start");
    const { data, error } = await this.supabase
      .schema("chat")
      .from("advisor_report_products")
      .select("slug, title, teaser, price_inr, status, badge, icon_url, accent, metadata")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) {
      logger.error("listProducts.error", {
        durationMs: durationMs(startedAt),
        error,
      });
      throw new AppError(`Failed to load report products: ${error.message}`, "DB_ERROR", 500);
    }

    const products = ((data as ProductRow[] | null) ?? []).map(rowToProductDTO);
    logger.info("listProducts.success", {
      durationMs: durationMs(startedAt),
      outcome: "success",
      count: products.length,
    });
    return {
      products,
    };
  }

  async getProductWithDetail(slug: string): Promise<ReportDetailWithProductDTO> {
    const logger = createServerLogger("astroai.reports.service");
    const startedAt = Date.now();
    logger.info("getProductWithDetail.start", { slug });
    const { data, error } = await this.supabase
      .schema("chat")
      .from("advisor_report_products")
      .select("slug, title, teaser, price_inr, status, badge, icon_url, accent, metadata")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      logger.error("getProductWithDetail.error", {
        durationMs: durationMs(startedAt),
        slug,
        error,
      });
      throw new AppError(`Failed to load report product: ${error.message}`, "DB_ERROR", 500);
    }
    if (!data) {
      logger.warn("getProductWithDetail.not_found", {
        durationMs: durationMs(startedAt),
        slug,
      });
      throw new AppError(`Report product not found: ${slug}`, "NOT_FOUND", 404);
    }

    const row = data as ProductRow;
    const result = {
      product: rowToProductDTO(row),
      detail: extractDetail(slug, row),
    };
    logger.info("getProductWithDetail.success", {
      durationMs: durationMs(startedAt),
      outcome: "success",
      slug,
      sectionCount: result.detail.sections.length,
    });
    return result;
  }
}
