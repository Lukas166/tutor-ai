"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusToggleButton } from "@/components/status-toggle-button";
import {
  ExternalLink,
  FileText,
  Link2,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Type,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

type ContentType = "file" | "link" | "text";

type ProcessingStatus =
  | "uploaded"
  | "queued"
  | "processing"
  | "extracting"
  | "ocr"
  | "chunking"
  | "embedding"
  | "indexing"
  | "ready"
  | "failed";

type ProcessingLog = {
  id: string;
  status: ProcessingStatus;
  message: string;
  error: string | null;
  createdAt: string;
};

type MaterialItem = {
  id: string;
  title: string;
  materialType: ContentType;
  description: string | null;
  fileName: string;
  filePath: string;
  storagePath: string | null;
  publicUrl: string | null;
  externalUrl: string | null;
  textContent: string | null;
  fileSize: string | null;
  isActive: boolean;
  isProcessed: boolean;
  processingStatus: ProcessingStatus;
  processingProgress: number;
  processingError: string | null;
  pageCount: number;
  chunkCount: number;
  embeddingModel: string | null;
  embeddingDimensions: number | null;
  createdAt: string;
  processingLogs?: ProcessingLog[];
};

type CourseSession = {
  id: string;
  title: string;
  description: string | null;
  orderNumber: number;
  isActive: boolean;
  createdAt: string;
  materials: MaterialItem[];
  _count: { materials: number };
};

type MaterialForm = {
  type: ContentType;
  title: string;
  description: string;
  url: string;
  content: string;
  file: File | null;
};

type DeleteTarget =
  | { type: "session"; session: CourseSession }
  | { type: "material"; session: CourseSession; material: MaterialItem }
  | null;

const emptyMaterialForm: MaterialForm = {
  type: "file",
  title: "",
  description: "",
  url: "",
  content: "",
  file: null,
};

const ACTIVE_PROCESSING_STATUSES: ProcessingStatus[] = [
  "queued", "processing", "extracting", "ocr", "chunking", "embedding", "indexing",
];

function formatFileSize(bytes: string | null) {
  if (!bytes) return "-";
  const num = Number(bytes);
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getMaterialHref(material: MaterialItem) {
  if (material.materialType === "link") return material.externalUrl || material.filePath;
  return material.publicUrl || material.filePath;
}

function getStatusVariant(status: ProcessingStatus) {
  if (status === "ready") return "default";
  if (status === "failed") return "destructive";
  if (status === "uploaded" || status === "queued") return "secondary";
  return "outline";
}

function getMaterialIcon(type: ContentType) {
  if (type === "link") return <Link2 className="text-blue-600" />;
  if (type === "text") return <Type className="text-emerald-600" />;
  return <FileText className="text-red-600" />;
}

export function CourseMaterialsPanel({ courseId }: { courseId: string }) {
  const [sessions, setSessions] = useState<CourseSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [sessionForm, setSessionForm] = useState({ title: "", description: "" });
  const [editingSession, setEditingSession] = useState<CourseSession | null>(null);
  const [sessionSubmitting, setSessionSubmitting] = useState(false);
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<CourseSession | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<MaterialItem | null>(null);
  const [materialForm, setMaterialForm] = useState<MaterialForm>(emptyMaterialForm);
  const [materialSubmitting, setMaterialSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchSessions = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        const response = await fetch(`/api/admin/courses/${courseId}/sessions`, {
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Gagal memuat sesi");
        if (Array.isArray(data)) setSessions(data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal memuat sesi");
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [courseId]
  );

  const hasActiveProcessing = sessions.some((s) =>
    s.materials.some((m) => ACTIVE_PROCESSING_STATUSES.includes(m.processingStatus))
  );

  useEffect(() => {
    void fetchSessions(true);
  }, [fetchSessions]);

  useEffect(() => {
    if (!hasActiveProcessing) return;
    const intervalId = window.setInterval(() => void fetchSessions(false), 3000);
    return () => window.clearInterval(intervalId);
  }, [fetchSessions, hasActiveProcessing]);

  function openSessionDialog(session?: CourseSession) {
    setEditingSession(session ?? null);
    setSessionForm(
      session
        ? { title: session.title, description: session.description ?? "" }
        : { title: "", description: "" }
    );
    setSessionDialogOpen(true);
  }

  function openMaterialDialog(session: CourseSession, material?: MaterialItem) {
    setSelectedSession(session);
    setEditingMaterial(material ?? null);
    setMaterialForm(
      material
        ? {
            type: material.materialType,
            title: material.title,
            description: material.description ?? "",
            url: material.externalUrl ?? "",
            content: material.textContent ?? "",
            file: null,
          }
        : emptyMaterialForm
    );
    setMaterialDialogOpen(true);
  }

  async function handleSubmitSession() {
    if (!sessionForm.title.trim()) {
      toast.error("Judul sesi wajib diisi");
      return;
    }

    setSessionSubmitting(true);
    try {
      const response = await fetch(
        editingSession
          ? `/api/admin/courses/${courseId}/sessions/${editingSession.id}`
          : `/api/admin/courses/${courseId}/sessions`,
        {
          method: editingSession ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: sessionForm.title.trim(),
            description: sessionForm.description.trim() || null,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Gagal menyimpan sesi");
      toast.success(editingSession ? "Sesi berhasil diperbarui" : "Sesi berhasil dibuat");
      setSessionDialogOpen(false);
      setEditingSession(null);
      setSessionForm({ title: "", description: "" });
      await fetchSessions(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan sesi");
    } finally {
      setSessionSubmitting(false);
    }
  }

  async function handleToggleSession(session: CourseSession) {
    const response = await fetch(`/api/admin/courses/${courseId}/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !session.isActive }),
    });
    const data = await response.json();
    if (!response.ok) {
      toast.error(data.error ?? "Gagal mengubah status sesi");
      return;
    }

    toast.success(session.isActive ? "Sesi dinonaktifkan" : "Sesi diaktifkan");
    await fetchSessions(false);
  }

  async function handleSubmitMaterial() {
    if (!selectedSession) return;
    if (!materialForm.title.trim()) {
      toast.error("Judul materi wajib diisi");
      return;
    }

    setMaterialSubmitting(true);
    try {
      if (editingMaterial) {
        const body: Record<string, string | null> = {
          title: materialForm.title.trim(),
          description: materialForm.description.trim() || null,
        };

        if (editingMaterial.materialType === "link") body.externalUrl = materialForm.url.trim();
        if (editingMaterial.materialType === "text") body.textContent = materialForm.content.trim();

        const response = await fetch(
          `/api/admin/courses/${courseId}/sessions/${selectedSession.id}/materials/${editingMaterial.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Gagal memperbarui materi");
        toast.success("Materi berhasil diperbarui");
      } else if (materialForm.type === "file") {
        if (!materialForm.file) {
          toast.error("Pilih file PDF");
          return;
        }

        const formData = new FormData();
        formData.append("file", materialForm.file);
        formData.append("title", materialForm.title.trim());
        if (materialForm.description.trim()) {
          formData.append("description", materialForm.description.trim());
        }

        const response = await fetch(
          `/api/admin/courses/${courseId}/sessions/${selectedSession.id}/materials`,
          { method: "POST", body: formData }
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Gagal upload materi");
        toast.success("PDF berhasil diupload dan masuk antrean processing");
      } else {
        const body: Record<string, string> = {
          title: materialForm.title.trim(),
          type: materialForm.type,
        };
        if (materialForm.description.trim()) body.description = materialForm.description.trim();
        if (materialForm.type === "link") body.url = materialForm.url.trim();
        if (materialForm.type === "text") body.content = materialForm.content.trim();

        const response = await fetch(
          `/api/admin/courses/${courseId}/sessions/${selectedSession.id}/materials`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Gagal menambah materi");
        toast.success("Materi berhasil ditambahkan");
      }

      setMaterialDialogOpen(false);
      await fetchSessions(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan materi");
    } finally {
      setMaterialSubmitting(false);
    }
  }

  async function handleToggleMaterial(session: CourseSession, material: MaterialItem) {
    const response = await fetch(
      `/api/admin/courses/${courseId}/sessions/${session.id}/materials/${material.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !material.isActive }),
      }
    );
    const data = await response.json();
    if (!response.ok) {
      toast.error(data.error ?? "Gagal mengubah status materi");
      return;
    }

    toast.success(material.isActive ? "Materi dinonaktifkan" : "Materi diaktifkan");
    await fetchSessions(false);
  }

  async function handleRetryMaterial(session: CourseSession, material: MaterialItem) {
    try {
      const response = await fetch(
        `/api/admin/courses/${courseId}/sessions/${session.id}/materials/${material.id}/retry`,
        { method: "POST" }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Gagal memproses ulang materi");
      
      toast.success("Materi dimasukkan kembali ke antrean");
      await fetchSessions(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memproses ulang materi");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const url =
        deleteTarget.type === "session"
          ? `/api/admin/courses/${courseId}/sessions/${deleteTarget.session.id}`
          : `/api/admin/courses/${courseId}/sessions/${deleteTarget.session.id}/materials/${deleteTarget.material.id}`;

      const response = await fetch(url, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Gagal menghapus");
      toast.success(deleteTarget.type === "session" ? "Sesi dihapus" : "Materi dihapus");
      setDeleteTarget(null);
      await fetchSessions(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Sesi dan Materi</h2>
          <p className="text-sm text-muted-foreground">
            Monitoring processing PDF tersimpan otomatis dan diperbarui berkala.
          </p>
        </div>
        <Button
          onClick={() => openSessionDialog()}
          className="w-full bg-brand text-black hover:bg-brand/90 sm:w-auto"
        >
          <Plus data-icon="inline-start" />
          Tambah Sesi
        </Button>
      </div>

      {sessions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Belum ada sesi pada course ini.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {sessions.map((session) => (
            <Card key={session.id} className="border-border/70">
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-base">
                    {session.title}
                  </CardTitle>
                  <CardDescription>
                    {session.description || `${session._count.materials} materi`}
                  </CardDescription>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusToggleButton
                    active={session.isActive}
                    inactiveLabel="Draft"
                    onClick={() => void handleToggleSession(session)}
                  />
                  <Button
                    className="bg-brand text-black shadow-sm hover:bg-brand/90"
                    onClick={() => openMaterialDialog(session)}
                  >
                    <Upload data-icon="inline-start" />
                    Tambah Konten
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openSessionDialog(session)}
                    aria-label="Edit sesi"
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget({ type: "session", session })}
                    aria-label="Hapus sesi"
                  >
                    <Trash2 />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {session.materials.length === 0 ? (
                  <div className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
                    Belum ada materi.
                  </div>
                ) : (
                  session.materials.map((material) => {
                    const latestError =
                      material.processingError ||
                      material.processingLogs?.find((log) => log.error)?.error ||
                      null;

                    return (
                      <div key={material.id} className="rounded-lg border bg-card p-3">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <a
                            href={getMaterialHref(material)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex min-w-0 flex-1 items-center gap-3"
                          >
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                              {getMaterialIcon(material.materialType)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">{material.title}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {material.description || material.fileName} - {formatFileSize(material.fileSize)} - {formatDate(material.createdAt)}
                              </p>
                            </div>
                            {material.materialType !== "text" && (
                              <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
                            )}
                          </a>

                          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                            {material.materialType === "file" && (
                              <>
                                <Badge variant={getStatusVariant(material.processingStatus)}>
                                  {material.processingStatus}
                                </Badge>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                                    <div
                                      className="h-full bg-brand"
                                      style={{ width: `${material.processingProgress}%` }}
                                    />
                                  </div>
                                  {material.processingProgress}%
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {material.pageCount} halaman - {material.chunkCount} chunk
                                </span>
                              </>
                            )}
                            {material.processingStatus === "failed" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => void handleRetryMaterial(session, material)}
                                title="Ulangi pemrosesan PDF"
                                aria-label="Ulangi proses materi"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            )}
                            <StatusToggleButton
                              active={material.isActive}
                              onClick={() => void handleToggleMaterial(session, material)}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openMaterialDialog(session, material)}
                              aria-label="Edit materi"
                            >
                              <Pencil />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget({ type: "material", session, material })}
                              aria-label="Hapus materi"
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        </div>

                        {material.processingStatus === "failed" && latestError && (
                          <div className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                            {latestError}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={sessionDialogOpen}
        onOpenChange={(open) => {
          setSessionDialogOpen(open);
          if (!open) {
            setEditingSession(null);
            setSessionForm({ title: "", description: "" });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSession ? "Edit Sesi" : "Tambah Sesi"}</DialogTitle>
            <DialogDescription>
              {editingSession ? "Perbarui detail sesi course ini." : "Buat sesi baru untuk course ini."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Judul</Label>
              <Input
                value={sessionForm.title}
                onChange={(event) => setSessionForm({ ...sessionForm, title: event.target.value })}
                placeholder="Contoh: Minggu 1 - Pengenalan AI"
              />
            </div>
            <div className="grid gap-2">
              <Label>Deskripsi</Label>
              <Input
                value={sessionForm.description}
                onChange={(event) =>
                  setSessionForm({ ...sessionForm, description: event.target.value })
                }
                placeholder="Opsional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSessionDialogOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleSubmitSession}
              disabled={sessionSubmitting}
              className="bg-brand text-black hover:bg-brand/90"
            >
              {sessionSubmitting && <Loader2 className="animate-spin" data-icon="inline-start" />}
              {editingSession ? "Simpan" : "Tambah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={materialDialogOpen} onOpenChange={setMaterialDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{editingMaterial ? "Edit Materi" : "Tambah Materi"}</DialogTitle>
            <DialogDescription>{selectedSession?.title}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {!editingMaterial && (
              <div className="grid gap-2">
                <Label>Jenis Konten</Label>
                <Select
                  value={materialForm.type}
                  onValueChange={(value: string) =>
                    setMaterialForm({ ...materialForm, type: value as ContentType })
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="file">File PDF</SelectItem>
                    <SelectItem value="link">Link URL</SelectItem>
                    <SelectItem value="text">Teks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-2">
              <Label>Judul</Label>
              <Input
                value={materialForm.title}
                onChange={(event) =>
                  setMaterialForm({ ...materialForm, title: event.target.value })
                }
                placeholder="Judul materi"
              />
            </div>

            {(materialForm.type === "file" || editingMaterial?.materialType === "file") && !editingMaterial && (
              <div className="grid gap-2">
                <Label>File PDF</Label>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex min-h-28 flex-col items-center justify-center rounded-lg border border-dashed px-4 py-6 text-center transition-colors hover:bg-muted/30"
                >
                  <Upload className="mb-2 text-muted-foreground" />
                  <span className="max-w-full truncate text-sm font-medium">
                    {materialForm.file ? materialForm.file.name : "Pilih file PDF"}
                  </span>
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(event) =>
                    setMaterialForm({ ...materialForm, file: event.target.files?.[0] ?? null })
                  }
                />
              </div>
            )}

            {(materialForm.type === "link" || editingMaterial?.materialType === "link") && (
              <div className="grid gap-2">
                <Label>URL</Label>
                <Input
                  value={materialForm.url}
                  onChange={(event) =>
                    setMaterialForm({ ...materialForm, url: event.target.value })
                  }
                  placeholder="https://..."
                />
              </div>
            )}

            {(materialForm.type === "text" || editingMaterial?.materialType === "text") && (
              <div className="grid gap-2">
                <Label>Konten</Label>
                <textarea
                  value={materialForm.content}
                  onChange={(event) =>
                    setMaterialForm({ ...materialForm, content: event.target.value })
                  }
                  rows={4}
                  className="flex w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label>Keterangan</Label>
              <Input
                value={materialForm.description}
                onChange={(event) =>
                  setMaterialForm({ ...materialForm, description: event.target.value })
                }
                placeholder="Opsional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMaterialDialogOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleSubmitMaterial}
              disabled={materialSubmitting}
              className="bg-brand text-black hover:bg-brand/90"
            >
              {materialSubmitting && <Loader2 className="animate-spin" data-icon="inline-start" />}
              {editingMaterial ? "Simpan" : "Tambah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open: boolean) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus {deleteTarget?.type === "session" ? "Sesi" : "Materi"}</DialogTitle>
            <DialogDescription>
              Data akan dihapus permanen dari course ini.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={deleting} onClick={() => setDeleteTarget(null)}>
              Batal
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="animate-spin" data-icon="inline-start" />}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
