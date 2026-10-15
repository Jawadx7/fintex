import AlertDetailView from "@/app/components/admin/compliance/alert-detail";

export const dynamic = "force-dynamic";

export default async function AlertDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;

  // `from` carries the list's query string (page + filters) so "Back to
  // alerts" returns the analyst to exactly where they were.
  const backQuery =
    typeof from === "string" && from.length > 0 && !from.includes("://")
      ? from
      : "";

  return <AlertDetailView id={id} backQuery={backQuery} />;
}
