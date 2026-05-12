"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Plus,
  GraduationCap,
  Users,
  KeyRound,
  Copy,
  CalendarDays,
  FileText,
  Upload,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

/* ─── Types ────────────────────────────────────────── */

interface CourseDetail {
  id: string;
  title: string;
  description: string | null;
  enrollmentKey: string;
  isActive: boolean;
  createdAt: string;
  creator: { id: string; name: string };
  instructors: { id: string; user: { id: string; name: string; email: string } }[];
  _count: { enrollments: number; sessions: number };
}

interface MaterialItem {
  id: string;
  title: string;
  fileName: string;
  fileSize: string | null;
  isActive: boolean;
  createdAt: string;
}

interface SessionItem {
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

/* ─── Helpers ──────────────────────────────────────── */

function formatFileSize(bytes: string | null): string {
  if (!bytes) return "—";
  const num = Number(bytes);
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* ─── Session Card Component ───────────────────────── */

function SessionCard({
  session,
  courseId,
  onMaterialUploaded,
}: {
  session: SessionItem;
  courseId: string;
  onMaterialUploaded: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  async function handleUpload() {
    if (!selectedFile || !uploadTitle.trim()) {
      toast.error("Judul dan file wajib diisi");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("title", uploadTitle.trim());

      const res = await fetch(
        `/api/dosen/courses/${courseId}/sessions/${session.id}/materials`,
        { method: "POST", body: formData }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Gagal mengupload file");
      }

      toast.success("Materi berhasil diupload");
      setShowUploadDialog(false);
      setUploadTitle("");
      setSelectedFile(null);
      onMaterialUploaded();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card className="border-border/50 overflow-hidden">
      {/* Session Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-muted/30"
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 font-bold text-brand text-sm">
            {session.orderNumber}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-base truncate">{session.title}</h3>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
              <span>{formatDate(session.createdAt)}</span>
              <span className="flex items-center gap-1">
                <FileText className="size-3" />
                {session._count.materials} materi
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge
            variant={session.isActive ? "default" : "secondary"}
            className="text-[10px]"
          >
            {session.isActive ? "Aktif" : "Draft"}
          </Badge>
          {expanded ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t px-5 pb-5">
          {/* Description */}
          {session.description && (
            <p className="text-sm text-muted-foreground py-4 border-b leading-relaxed">
              {session.description}
            </p>
          )}

          {/* Materials Section */}
          <div className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Materi
              </h4>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => setShowUploadDialog(true)}
              >
                <Upload className="size-3.5" />
                Upload PDF
              </Button>
            </div>

            {session.materials.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center rounded-lg border border-dashed">
                <FileText className="size-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">Belum ada materi</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">
                  Upload file PDF untuk sesi ini
                </p>
              </div>
            ) : (
              <div className="grid gap-2">
                {session.materials.map((material) => (
                  <a
                    key={material.id}
                    href={`/uploads/${courseId}/${session.id}/${material.fileName}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/30"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-red-500/10">
                      <FileText className="size-4 text-red-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{material.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {material.fileName} • {formatFileSize(material.fileSize)}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-[480px] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 py-5 border-b bg-muted/30">
            <DialogTitle>Upload Materi — {session.title}</DialogTitle>
            <DialogDescription>Upload file PDF sebagai materi sesi ini.</DialogDescription>
          </DialogHeader>
          <div className="px-6 py-4 flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor={`material-title-${session.id}`}>
                Judul Materi <span className="text-destructive">*</span>
              </Label>
              <Input
                id={`material-title-${session.id}`}
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="Contoh: Slide Pertemuan 1"
                disabled={uploading}
              />
            </div>
            <div className="grid gap-2">
              <Label>
                File PDF <span className="text-destructive">*</span>
              </Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-8 cursor-pointer transition-colors hover:bg-muted/20 hover:border-brand/30"
              >
                <Upload className="size-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm font-medium">
                  {selectedFile ? selectedFile.name : "Klik untuk memilih file"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedFile
                    ? formatFileSize(String(selectedFile.size))
                    : "Format: PDF (maks 50MB)"}
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t bg-muted/10">
            <Button variant="outline" onClick={() => setShowUploadDialog(false)} disabled={uploading}>
              Batal
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || !selectedFile || !uploadTitle.trim()}
              className="bg-brand text-black hover:bg-brand/90"
            >
              {uploading && <Loader2 className="animate-spin" data-icon="inline-start" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ─── Main Page Component ──────────────────────────── */

export default function DosenCourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(true);

  // Create session dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sessionForm, setSessionForm] = useState({ title: "", description: "" });
  const [submitting, setSubmitting] = useState(false);

  const fetchCourse = useCallback(() => {
    setLoading(true);
    fetch(`/api/dosen/courses/${courseId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setCourse)
      .catch(() => setCourse(null))
      .finally(() => setLoading(false));
  }, [courseId]);

  const fetchSessions = useCallback(() => {
    setLoadingSessions(true);
    fetch(`/api/dosen/courses/${courseId}/sessions`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSessions(data);
      })
      .catch(console.error)
      .finally(() => setLoadingSessions(false));
  }, [courseId]);

  useEffect(() => {
    fetchCourse();
    fetchSessions();
  }, [fetchCourse, fetchSessions]);

  async function handleCreateSession() {
    if (!sessionForm.title.trim()) {
      toast.error("Judul sesi wajib diisi");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/dosen/courses/${courseId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: sessionForm.title.trim(),
          description: sessionForm.description.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.toString() || "Gagal membuat sesi");
      }

      toast.success("Sesi berhasil dibuat!");
      setDialogOpen(false);
      setSessionForm({ title: "", description: "" });
      fetchSessions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key);
    toast.success("Enrollment key disalin");
  }

  /* ─── Loading State ─── */
  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  /* ─── Not Found State ─── */
  if (!course) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-muted-foreground">
        <p>Course tidak ditemukan atau Anda tidak memiliki akses.</p>
        <Button variant="outline" onClick={() => router.push("/dosen/courses")}>
          Kembali
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/dosen/courses")}
        className="self-start gap-1.5 -ml-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Kembali ke Courses
      </Button>

      {/* ─── Course Info Header ─── */}
      <div className="flex flex-col gap-6">
        {/* Title + Status */}
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{course.title}</h1>
            <Badge variant={course.isActive ? "default" : "secondary"} className="shrink-0">
              {course.isActive ? "Aktif" : "Nonaktif"}
            </Badge>
          </div>
          {course.description && (
            <p className="text-muted-foreground mt-2 leading-relaxed max-w-3xl">
              {course.description}
            </p>
          )}
        </div>

        {/* Info Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="overflow-hidden border-border/50">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider">
                Enrollment Key
              </CardDescription>
            </CardHeader>
            <CardContent>
              <button
                onClick={() => copyKey(course.enrollmentKey)}
                className="inline-flex w-full items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2 font-mono text-sm transition-colors hover:bg-muted"
              >
                <div className="flex items-center gap-2">
                  <KeyRound className="size-4 text-brand" />
                  <span className="font-bold">{course.enrollmentKey}</span>
                </div>
                <Copy className="size-3.5 text-muted-foreground" />
              </button>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-border/50">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider">
                Mahasiswa Terdaftar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500/10">
                  <GraduationCap className="size-5 text-emerald-600" />
                </div>
                <span className="text-3xl font-bold">{course._count.enrollments}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-border/50">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider">
                Dosen Pengampu
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-blue-500/10">
                  <Users className="size-5 text-blue-600" />
                </div>
                <span className="text-3xl font-bold">{course.instructors.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ─── Sessions Section ─── */}
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Sesi Perkuliahan</h2>
            <p className="text-sm text-muted-foreground">
              Kelola sesi mingguan dan materi untuk course ini
            </p>
          </div>
          <Button
            onClick={() => {
              setSessionForm({ title: "", description: "" });
              setDialogOpen(true);
            }}
            className="gap-2 bg-brand text-black hover:bg-brand/90"
          >
            <Plus data-icon="inline-start" />
            Tambah Sesi
          </Button>
        </div>

        {/* Sessions List */}
        {loadingSessions ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <CalendarDays className="size-12 text-muted-foreground/50 mb-4" strokeWidth={1.5} />
              <p className="text-muted-foreground font-medium">Belum ada sesi</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Buat sesi perkuliahan pertama untuk course ini.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                courseId={courseId}
                onMaterialUploaded={fetchSessions}
              />
            ))}
          </div>
        )}
      </div>

      {/* ─── Create Session Dialog ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 py-5 border-b bg-muted/30">
            <DialogTitle className="text-xl">Tambah Sesi Baru</DialogTitle>
            <DialogDescription>
              Buat sesi perkuliahan baru. Urutan sesi otomatis ditentukan.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-4 flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="session-title">
                Judul Sesi <span className="text-destructive">*</span>
              </Label>
              <Input
                id="session-title"
                value={sessionForm.title}
                onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
                placeholder="Contoh: Minggu 1 — Pengenalan AI"
                disabled={submitting}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="session-description">
                Deskripsi{" "}
                <span className="text-muted-foreground font-normal text-xs">(opsional)</span>
              </Label>
              <textarea
                id="session-description"
                value={sessionForm.description}
                onChange={(e) => setSessionForm({ ...sessionForm, description: e.target.value })}
                placeholder="Deskripsi singkat topik yang dibahas pada sesi ini."
                disabled={submitting}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t bg-muted/10">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Batal
            </Button>
            <Button
              onClick={handleCreateSession}
              disabled={submitting || !sessionForm.title.trim()}
              className="bg-brand text-black hover:bg-brand/90"
            >
              {submitting && <Loader2 className="animate-spin" data-icon="inline-start" />}
              Buat Sesi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
