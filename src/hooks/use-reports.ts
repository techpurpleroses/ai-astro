'use client'

import { useQuery } from '@tanstack/react-query'
import { astroFetchJson } from '@/lib/client/astro-fetch'
import type { AdvisorReportProduct } from '@/types'

export interface ReportDetailSection {
  title: string
  body: string
  bullets: string[]
}

export interface ReportDetailData {
  id: string
  title: string
  subtitle: string
  stats: Array<{ label: string; value: string }>
  sections: ReportDetailSection[]
}

async function fetchReportProducts(): Promise<AdvisorReportProduct[]> {
  const json = await astroFetchJson<{ products: AdvisorReportProduct[] }>('/api/dashboard/features/reports', {
    debugOrigin: 'hooks.use-reports.products',
  })
  return json.products
}

async function fetchReportDetail(slug: string): Promise<{ product: AdvisorReportProduct; detail: ReportDetailData }> {
  return astroFetchJson<{ product: AdvisorReportProduct; detail: ReportDetailData }>(
    `/api/dashboard/features/reports/${slug}`,
    { debugOrigin: 'hooks.use-reports.detail' }
  )
}

export function useReportProducts() {
  return useQuery({
    queryKey: ['reports', 'products'],
    queryFn: fetchReportProducts,
    staleTime: 1000 * 60 * 60,
  })
}

export function useReportDetail(slug: string) {
  return useQuery({
    queryKey: ['reports', 'detail', slug],
    queryFn: () => fetchReportDetail(slug),
    staleTime: 1000 * 60 * 60,
    enabled: !!slug,
  })
}
