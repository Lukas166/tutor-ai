import { redirect } from "next/navigation";

type MahasiswaTutorPageProps = {
  params: Promise<{ id: string }>;
};

export default async function MahasiswaTutorPage({ params }: MahasiswaTutorPageProps) {
  const { id } = await params;
  redirect(`/courses/${id}/tutor`);
}
