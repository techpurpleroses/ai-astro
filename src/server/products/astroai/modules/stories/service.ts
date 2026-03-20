import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/server/foundation/errors";
import { createServerLogger, durationMs } from "@/server/foundation/observability/logger";
import type {
  StoriesListDTO,
  StoryCategoryDTO,
  StoryArticleDTO,
  StorySectionDTO,
} from "./types";

interface CategoryRow {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  accent: string | null;
  image_url: string | null;
  sort_order: number;
}

interface ArticleRow {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  story_categories: CategoryRow | null;
}

interface SectionRow {
  section_order: number;
  heading: string;
  body: string;
  bullets: unknown;
}

function categoryRowToDTO(row: CategoryRow): StoryCategoryDTO {
  return {
    id: row.slug,
    title: row.title,
    subtitle: row.subtitle ?? "",
    accent: row.accent ?? "#22D3EE",
    image: row.image_url ?? "",
  };
}

export class StoriesService {
  constructor(private readonly supabase: SupabaseClient) {}

  async listCategories(): Promise<StoriesListDTO> {
    const logger = createServerLogger("astroai.stories.service");
    const startedAt = Date.now();
    logger.info("listCategories.start");
    const { data, error } = await this.supabase
      .schema("astro_artifacts")
      .from("story_categories")
      .select("id, slug, title, subtitle, accent, image_url, sort_order")
      .eq("status", "published")
      .order("sort_order", { ascending: true });

    if (error) {
      logger.error("listCategories.error", {
        durationMs: durationMs(startedAt),
        error,
      });
      throw new AppError(`Failed to load story categories: ${error.message}`, "DB_ERROR", 500);
    }

    const categories = ((data as CategoryRow[] | null) ?? []).map(categoryRowToDTO);
    logger.info("listCategories.success", {
      durationMs: durationMs(startedAt),
      outcome: "success",
      count: categories.length,
    });
    return {
      categories,
    };
  }

  async getArticle(slug: string): Promise<StoryArticleDTO> {
    const logger = createServerLogger("astroai.stories.service");
    const startedAt = Date.now();
    logger.info("getArticle.start", { slug });
    const { data: articleData, error: articleError } = await this.supabase
      .schema("astro_artifacts")
      .from("story_articles")
      .select("id, slug, title, subtitle, story_categories(id, slug, title, subtitle, accent, image_url, sort_order)")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();

    if (articleError) {
      logger.error("getArticle.error", {
        durationMs: durationMs(startedAt),
        slug,
        error: articleError,
      });
      throw new AppError(`Failed to load article: ${articleError.message}`, "DB_ERROR", 500);
    }
    if (!articleData) {
      logger.warn("getArticle.not_found", {
        durationMs: durationMs(startedAt),
        slug,
      });
      throw new AppError(`Article not found: ${slug}`, "NOT_FOUND", 404);
    }

    const article = articleData as unknown as ArticleRow;

    const { data: sectionsData, error: sectionsError } = await this.supabase
      .schema("astro_artifacts")
      .from("story_sections")
      .select("section_order, heading, body, bullets")
      .eq("article_id", article.id)
      .order("section_order", { ascending: true });

    if (sectionsError) {
      logger.error("getArticle.sections_error", {
        durationMs: durationMs(startedAt),
        slug,
        error: sectionsError,
      });
      throw new AppError(`Failed to load article sections: ${sectionsError.message}`, "DB_ERROR", 500);
    }

    const sections: StorySectionDTO[] = ((sectionsData as SectionRow[] | null) ?? []).map((row) => ({
      heading: row.heading,
      body: row.body,
      bullets: Array.isArray(row.bullets) ? (row.bullets as string[]) : [],
    }));

    const cat = article.story_categories;
    const category: StoryCategoryDTO = cat
      ? categoryRowToDTO(cat)
      : { id: slug, title: "", subtitle: "", accent: "#22D3EE", image: "" };

    const result = {
      slug: article.slug,
      title: article.title,
      subtitle: article.subtitle ?? "",
      accent: category.accent,
      sections,
      category,
    };
    logger.info("getArticle.success", {
      durationMs: durationMs(startedAt),
      outcome: "success",
      slug,
      sectionCount: sections.length,
    });
    return result;
  }
}
