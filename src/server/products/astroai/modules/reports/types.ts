export interface ReportProductDTO {
  id: string;
  title: string;
  teaser: string;
  price: number | null;
  status: "buy" | "gift" | "owned";
  badge: string | null;
  icon: string;
  accent: string;
}

export interface ReportSectionDTO {
  title: string;
  body: string;
  bullets: string[];
}

export interface ReportDetailDTO {
  id: string;
  title: string;
  subtitle: string;
  stats: Array<{ label: string; value: string }>;
  sections: ReportSectionDTO[];
}

export interface ReportDetailWithProductDTO {
  product: ReportProductDTO;
  detail: ReportDetailDTO;
}

export interface ReportsListDTO {
  products: ReportProductDTO[];
}
