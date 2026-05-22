import { TutorAiChatPage } from "@/components/tutor/tutor-ai-chat-page";

type MahasiswaTutorPageProps = {
  params: Promise<{ id: string }>;
};

export default async function MahasiswaTutorPage({ params }: MahasiswaTutorPageProps) {
  const { id } = await params;

  return (
    <TutorAiChatPage 
      courseId={id} 
      backHref={`/mahasiswa/courses/${id}`} 
    />
  );
}
