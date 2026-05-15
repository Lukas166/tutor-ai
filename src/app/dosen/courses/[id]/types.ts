export interface CourseDetail {
  id: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  enrollmentKey: string;
  isActive: boolean;
  createdAt: string;
  creator: { id: string; name: string };
  instructors: { id: string; user: { id: string; name: string; email: string } }[];
  _count: { enrollments: number; sessions: number };
}

export interface MaterialItem {
  id: string;
  title: string;
  materialType: "file" | "link" | "text";
  description: string | null;
  fileName: string;
  filePath: string;
  storagePath: string | null;
  publicUrl: string | null;
  externalUrl: string | null;
  textContent: string | null;
  fileSize: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface SessionItem {
  id: string;
  title: string;
  description: string | null;
  orderNumber: number;
  isActive: boolean;
  createdAt: string;
  creator: { id: string; name: string };
  materials: MaterialItem[];
  _count: { materials: number };
}

export interface EnrolledStudent {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    npm: string | null;
    major: string | null;
  };
}

export function formatFileSize(bytes: string | null): string {
  if (!bytes) return "—";
  const num = Number(bytes);
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
