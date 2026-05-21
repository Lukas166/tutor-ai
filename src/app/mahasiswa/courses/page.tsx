import { MahasiswaCoursesClient } from "./courses-client";

export default async function MahasiswaCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const params = await searchParams;

  return <MahasiswaCoursesClient initialSearch={params.search ?? ""} />;
}
