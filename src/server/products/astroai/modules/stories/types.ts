export interface StoryCategoryDTO {
  id: string;
  title: string;
  subtitle: string;
  accent: string;
  image: string;
}

export interface StorySectionDTO {
  heading: string;
  body: string;
  bullets: string[];
}

export interface StoryArticleDTO {
  slug: string;
  title: string;
  subtitle: string;
  accent: string;
  sections: StorySectionDTO[];
  category: StoryCategoryDTO;
}

export interface StoriesListDTO {
  categories: StoryCategoryDTO[];
}
