import { ReportPageClient } from '@/components/settings/report-page'

export default async function ReportPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <ReportPageClient slug={slug} />
}
