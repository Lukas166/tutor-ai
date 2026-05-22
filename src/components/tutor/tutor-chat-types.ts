export type TutorMaterial = {
  id: string;
  title: string;
  fileName: string;
  sessionId: string;
  sessionTitle: string;
  pageCount: number;
  chunkCount: number;
  createdAt: string;
};

export type TutorChatSessionSummary = {
  id: string;
  title: string;
  messageCount: number;
  startedAt: string;
  lastActiveAt: string;
};

export type TutorMessage = {
  id: string;
  senderType: "user" | "ai" | string;
  content: string;
  ragSources: unknown;
  responseTimeMs: number | null;
  createdAt: string;
};

export type TutorChatSession = {
  id: string;
  courseId: string;
  selectedMaterialIds: string[];
  startedAt: string;
  lastActiveAt: string;
  messages: TutorMessage[];
};

export type TutorOverview = {
  course: {
    id: string;
    title: string;
    description: string | null;
    isActive: boolean;
  };
  user: {
    academicLevel: "S1" | "S2" | "S3";
    role: string;
  };
  readyMaterials: TutorMaterial[];
  chatSessions: TutorChatSessionSummary[];
};

export type RagSource = {
  chunkId: string;
  materialId: string;
  materialTitle: string;
  fileName: string;
  sessionTitle: string;
  pageNumber: number;
  chunkIndex: number;
  similarity: number;
  snippet: string;
};

export type TutorAiChatPageProps = {
  courseId: string;
  backHref: string;
};
