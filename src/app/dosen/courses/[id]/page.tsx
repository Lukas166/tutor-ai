"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Plus, GraduationCap, Users, KeyRound, Copy, CalendarDays,
  FileText, Upload, Loader2, Link2, Type, Trash2
} from "lucide-react";
import { toast } from "sonner";
import { SessionCard } from "./session-card";
import { StudentListDialog } from "./student-list-dialog";
import type { CourseDetail, SessionItem } from "./types";
import { formatFileSize } from "./types";

type ContentType = "file" | "link" | "text";

type NewMaterial = {
  id: string;
  type: ContentType;
  title: string;
  description: string;
  url: string;
  content: string;
  file: File | null;
};

export default function DosenCourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [showStudents, setShowStudents] = useState(false);

  // Create session dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sessionForm, setSessionForm] = useState({ title: "", description: "" });
  const [newMaterials, setNewMaterials] = useState<NewMaterial[]>([]);
  const [submitting, setSubmitting] = useState(false);
  
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const fetchCourse = useCallback(() => {
    setLoading(true);
    fetch(`/api/dosen/courses/${courseId}`)
      .then((r) => { if (!r.ok) throw new Error("Not found"); return r.json(); })
      .then(setCourse)
      .catch(() => setCourse(null))
      .finally(() => setLoading(false));
  }, [courseId]);

  const fetchSessions = useCallback(() => {
    setLoadingSessions(true);
    fetch(`/api/dosen/courses/${courseId}/sessions`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setSessions(data); })
      .catch(console.error)
      .finally(() => setLoadingSessions(false));
  }, [courseId]);

  useEffect(() => { fetchCourse(); fetchSessions(); }, [fetchCourse, fetchSessions]);

  function resetDialog() {
    setSessionForm({ title: "", description: "" });
    setNewMaterials([]);
  }

  function addMaterialField() {
    setNewMaterials([
      ...newMaterials, 
      { id: crypto.randomUUID(), type: "file", title: "", description: "", url: "", content: "", file: null }
    ]);
  }

  function updateMaterial(id: string, updates: Partial<NewMaterial>) {
    setNewMaterials(newMaterials.map((m) => m.id === id ? { ...m, ...updates } : m));
  }

  function removeMaterial(id: string) {
    setNewMaterials(newMaterials.filter((m) => m.id !== id));
  }

  async function handleCreateSession() {
    if (!sessionForm.title.trim()) { toast.error("Judul sesi wajib diisi"); return; }

    // Validate materials
    for (const mat of newMaterials) {
      if (!mat.title.trim()) { toast.error("Semua materi harus memiliki judul"); return; }
      if (mat.type === "file" && !mat.file) { toast.error(`Pilih file untuk materi: ${mat.title}`); return; }
      if (mat.type === "link" && !mat.url.trim()) { toast.error(`Masukkan URL untuk materi: ${mat.title}`); return; }
      if (mat.type === "text" && !mat.content.trim()) { toast.error(`Masukkan teks untuk materi: ${mat.title}`); return; }
    }

    setSubmitting(true);
    try {
      // 1. Create session
      const res = await fetch(`/api/dosen/courses/${courseId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: sessionForm.title.trim(), description: sessionForm.description.trim() || null }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error?.toString() || "Gagal membuat sesi"); }
      const newSession = await res.json();

      // 2. Upload materials sequentially to prevent race conditions
      for (const mat of newMaterials) {
        if (mat.type === "file" && mat.file) {
          const fd = new FormData();
          fd.append("file", mat.file);
          fd.append("title", mat.title.trim());
          if (mat.description.trim()) fd.append("description", mat.description.trim());
          const upRes = await fetch(`/api/dosen/courses/${courseId}/sessions/${newSession.id}/materials`, { method: "POST", body: fd });
          if(!upRes.ok) throw new Error(`Gagal upload file ${mat.title}`);
        } else if (mat.type === "link" && mat.url.trim()) {
          const upRes = await fetch(`/api/dosen/courses/${courseId}/sessions/${newSession.id}/materials`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: mat.title.trim(), type: "link", url: mat.url.trim(), description: mat.description.trim() || undefined }),
          });
          if(!upRes.ok) throw new Error(`Gagal membuat link ${mat.title}`);
        } else if (mat.type === "text" && mat.content.trim()) {
          const upRes = await fetch(`/api/dosen/courses/${courseId}/sessions/${newSession.id}/materials`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: mat.title.trim(), type: "text", content: mat.content.trim() }),
          });
          if(!upRes.ok) throw new Error(`Gagal membuat teks ${mat.title}`);
        }
      }

      toast.success("Sesi beserta materi berhasil dibuat!");
      setDialogOpen(false);
      resetDialog();
      fetchSessions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-muted-foreground">
        <p>Course tidak ditemukan atau Anda tidak memiliki akses.</p>
        <Button variant="outline" onClick={() => router.push("/dosen/courses")}>Kembali</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <Button variant="ghost" size="sm" onClick={() => router.push("/dosen/courses")} className="self-start gap-1.5 -ml-2 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />Kembali ke Courses
      </Button>

      {/* Course Info Header */}
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{course.title}</h1>
              <Badge variant={course.isActive ? "default" : "secondary"}>{course.isActive ? "Aktif" : "Nonaktif"}</Badge>
            </div>
            {course.description && <p className="text-muted-foreground mt-2 leading-relaxed max-w-3xl">{course.description}</p>}
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => setShowStudents(true)}>
            <Users className="size-4" />Daftar Mahasiswa
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-border/50">
            <CardHeader className="pb-2"><CardDescription className="text-xs font-semibold uppercase tracking-wider">Enrollment Key</CardDescription></CardHeader>
            <CardContent>
              <button onClick={() => { navigator.clipboard.writeText(course.enrollmentKey); toast.success("Disalin"); }} className="inline-flex w-full items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2 font-mono text-sm hover:bg-muted transition-colors">
                <div className="flex items-center gap-2"><KeyRound className="size-4 text-brand" /><span className="font-bold">{course.enrollmentKey}</span></div>
                <Copy className="size-3.5 text-muted-foreground" />
              </button>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardHeader className="pb-2"><CardDescription className="text-xs font-semibold uppercase tracking-wider">Mahasiswa Terdaftar</CardDescription></CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500/10"><GraduationCap className="size-5 text-emerald-600" /></div>
                <span className="text-3xl font-bold">{course._count.enrollments}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardHeader className="pb-2"><CardDescription className="text-xs font-semibold uppercase tracking-wider">Dosen Pengampu</CardDescription></CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-blue-500/10"><Users className="size-5 text-blue-600" /></div>
                <span className="text-3xl font-bold">{course.instructors.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sessions */}
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Sesi Perkuliahan</h2>
            <p className="text-sm text-muted-foreground">Kelola sesi dan materi course ini</p>
          </div>
          <Button onClick={() => { resetDialog(); setDialogOpen(true); }} className="gap-2 bg-brand text-black hover:bg-brand/90">
            <Plus className="size-4" />Tambah Sesi
          </Button>
        </div>

        {loadingSessions ? (
          <div className="flex flex-col gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
        ) : sessions.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <CalendarDays className="size-12 text-muted-foreground/50 mb-4" strokeWidth={1.5} />
              <p className="text-muted-foreground font-medium">Belum ada sesi</p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {sessions.map((s) => <SessionCard key={s.id} session={s} courseId={courseId} onContentAdded={fetchSessions} />)}
          </div>
        )}
      </div>

      {/* Create Session Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetDialog(); }}>
        <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b bg-muted/30">
            <DialogTitle>Tambah Sesi Baru</DialogTitle>
            <DialogDescription>Buat sesi dan tambahkan materi.</DialogDescription>
          </DialogHeader>
          <div className="px-6 py-4 flex flex-col gap-6 max-h-[65vh] overflow-y-auto">
            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <Label>Judul Sesi <span className="text-destructive">*</span></Label>
                <Input value={sessionForm.title} onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })} placeholder="Contoh: Minggu 1 — Pengenalan AI" disabled={submitting} />
              </div>
              <div className="grid gap-1.5">
                <Label>Deskripsi <span className="text-muted-foreground text-xs font-normal">(opsional)</span></Label>
                <textarea value={sessionForm.description} onChange={(e) => setSessionForm({ ...sessionForm, description: e.target.value })} placeholder="Topik yang dibahas" disabled={submitting} rows={2} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" />
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Materi Sesi</Label>
                <Button type="button" variant="outline" size="sm" onClick={addMaterialField} disabled={submitting} className="gap-1.5 h-8">
                  <Plus className="size-3.5" /> Tambah Materi
                </Button>
              </div>

              {newMaterials.length === 0 ? (
                <div className="text-sm text-center py-4 bg-muted/20 border border-dashed rounded-lg text-muted-foreground">
                  Belum ada materi ditambahkan. Anda bisa menambahkan materi nanti.
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {newMaterials.map((mat, index) => (
                    <Card key={mat.id} className="border-border/50 relative overflow-visible">
                      <Button 
                        type="button" 
                        variant="destructive" 
                        size="icon" 
                        className="absolute -right-2.5 -top-2.5 size-7 rounded-full shadow-sm z-10"
                        onClick={() => removeMaterial(mat.id)}
                        disabled={submitting}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                      <CardContent className="p-4 flex flex-col gap-4">
                        <div className="flex items-start gap-4">
                          <div className="flex items-center justify-center size-6 rounded bg-muted text-xs font-bold shrink-0 mt-1">
                            {index + 1}
                          </div>
                          <div className="flex-1 grid gap-3">
                            <div className="grid gap-1.5">
                              <Label className="text-xs">Jenis Konten</Label>
                              <Select value={mat.type} onValueChange={(v) => updateMaterial(mat.id, { type: v as ContentType })} disabled={submitting}>
                                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="file">📄 File PDF</SelectItem>
                                  <SelectItem value="link">🔗 Link URL</SelectItem>
                                  <SelectItem value="text">📝 Teks</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="grid gap-1.5">
                              <Label className="text-xs">Judul <span className="text-destructive">*</span></Label>
                              <Input className="h-8" value={mat.title} onChange={(e) => updateMaterial(mat.id, { title: e.target.value })} placeholder="Judul materi" disabled={submitting} />
                            </div>

                            {mat.type === "file" && (
                              <div className="grid gap-1.5">
                                <Label className="text-xs">File PDF <span className="text-destructive">*</span></Label>
                                <div onClick={() => fileRefs.current[mat.id]?.click()} className="flex flex-col items-center justify-center rounded-lg border border-dashed p-3 cursor-pointer hover:bg-muted/20 transition-colors">
                                  {mat.file ? (
                                    <div className="flex items-center gap-2 text-sm">
                                      <FileText className="size-4 text-red-500" />
                                      <span className="font-medium">{mat.file.name}</span>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Upload className="size-3.5" /> Pilih File PDF</span>
                                  )}
                                </div>
                                <input ref={(el) => { fileRefs.current[mat.id] = el; }} type="file" accept=".pdf" className="hidden" onChange={(e) => updateMaterial(mat.id, { file: e.target.files?.[0] || null })} />
                              </div>
                            )}

                            {mat.type === "link" && (
                              <div className="grid gap-1.5"><Label className="text-xs">URL <span className="text-destructive">*</span></Label><Input className="h-8" value={mat.url} onChange={(e) => updateMaterial(mat.id, { url: e.target.value })} placeholder="https://..." disabled={submitting} /></div>
                            )}

                            {mat.type === "text" && (
                              <div className="grid gap-1.5"><Label className="text-xs">Konten Teks <span className="text-destructive">*</span></Label><textarea value={mat.content} onChange={(e) => updateMaterial(mat.id, { content: e.target.value })} placeholder="Isi materi teks..." disabled={submitting} rows={3} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" /></div>
                            )}

                            {(mat.type === "file" || mat.type === "link") && (
                              <div className="grid gap-1.5"><Label className="text-xs">Keterangan <span className="font-normal text-muted-foreground">(opsional)</span></Label><Input className="h-8 text-xs" value={mat.description} onChange={(e) => updateMaterial(mat.id, { description: e.target.value })} placeholder="Keterangan singkat" disabled={submitting} /></div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="px-6 py-3 border-t bg-muted/10">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>Batal</Button>
            <Button onClick={handleCreateSession} disabled={submitting || !sessionForm.title.trim()} className="bg-brand text-black hover:bg-brand/90">
              {submitting && <Loader2 className="animate-spin mr-1.5 size-4" />}Buat Sesi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Student List Dialog */}
      <StudentListDialog courseId={courseId} enrollmentKey={course.enrollmentKey} open={showStudents} onOpenChange={setShowStudents} />
    </div>
  );
}
