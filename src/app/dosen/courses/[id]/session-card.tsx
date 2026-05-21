"use client";

import { useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { 
  FileText, Upload, Loader2, ChevronDown, ChevronUp, 
  Link2, Type, ExternalLink, Trash2, Pencil, CalendarDays 
} from "lucide-react";
import { toast } from "sonner";
import type { MaterialItem, SessionItem } from "./types";
import { formatDate, formatFileSize } from "./types";
import { CourseKeyConfirmDialog } from "./course-key-confirm-dialog";
import { StatusToggleButton } from "./status-toggle-button";

type ContentType = "file" | "link" | "text";

type ContentAction =
  | { target: "session"; type: "toggle"; nextActive: boolean }
  | { target: "session"; type: "edit" }
  | { target: "session"; type: "delete" }
  | { target: "material"; type: "toggle"; material: MaterialItem; nextActive: boolean }
  | { target: "material"; type: "edit"; material: MaterialItem }
  | { target: "material"; type: "delete"; material: MaterialItem }
  | null;

function resolveMaterialType(material: MaterialItem): ContentType {
  if (material.materialType) return material.materialType;
  if (material.filePath.startsWith("link:") || material.filePath.startsWith("http")) return "link";
  if (material.filePath.startsWith("text:")) return "text";
  return "file";
}

function resolveMaterialHref(material: MaterialItem) {
  if (resolveMaterialType(material) === "link") {
    return material.externalUrl || material.filePath.replace("link:", "");
  }
  return material.publicUrl || material.filePath;
}

function resolveTextContent(material: MaterialItem) {
  return material.textContent || material.filePath.replace("text:", "");
}

function getMaterialIcon(type: ContentType) {
  if (type === "link") return <Link2 className="text-blue-600 size-4" />;
  if (type === "text") return <Type className="text-emerald-600 size-4" />;
  return <FileText className="text-red-600 size-4" />;
}

function getMaterialIconBg(type: ContentType) {
  if (type === "link") return "bg-blue-500/10";
  if (type === "text") return "bg-emerald-500/10";
  return "bg-red-500/10";
}

export function SessionCard({
  session, courseId, enrollmentKey, onContentChanged, expanded, onToggleExpand
}: {
  session: SessionItem;
  courseId: string;
  enrollmentKey: string;
  onContentChanged: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const [descExpanded, setDescExpanded] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [contentAction, setContentAction] = useState<ContentAction>(null);
  const [contentType, setContentType] = useState<ContentType>("file");
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [textContent, setTextContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<MaterialItem | null>(null);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [sessionForm, setSessionForm] = useState({ title: "", description: "" });
  const [sessionSubmitting, setSessionSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setTitle("");
    setDescription("");
    setLinkUrl("");
    setTextContent("");
    setSelectedFile(null);
    setContentType("file");
    setEditingMaterial(null);
  }

  function openEditMaterial(material: MaterialItem) {
    setEditingMaterial(material);
    setTitle(material.title);
    setDescription(material.description ?? "");
    const type = resolveMaterialType(material);
    setContentType(type);
    if (type === "link") setLinkUrl(material.externalUrl || material.filePath.replace("link:", ""));
    if (type === "text") setTextContent(material.textContent || material.filePath.replace("text:", ""));
    setShowDialog(true);
  }

  function openEditSession() {
    setSessionForm({ title: session.title, description: session.description ?? "" });
    setSessionDialogOpen(true);
  }

  async function handleEditSession() {
    if (!sessionForm.title.trim()) {
      toast.error("Judul sesi wajib diisi");
      return;
    }

    setSessionSubmitting(true);
    try {
      const response = await fetch(`/api/dosen/courses/${courseId}/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollmentKey,
          title: sessionForm.title.trim(),
          description: sessionForm.description.trim() || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Gagal memperbarui sesi");

      toast.success("Sesi berhasil diperbarui");
      setSessionDialogOpen(false);
      onContentChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSessionSubmitting(false);
    }
  }

  async function handleSubmit() {
    if (!title.trim()) {
      toast.error("Judul wajib diisi");
      return;
    }

    setUploading(true);
    try {
      if (editingMaterial) {
        const body: Record<string, string | null> = {
          enrollmentKey,
          title: title.trim(),
          description: description.trim() || null,
        };

        if (contentType === "link") body.externalUrl = linkUrl.trim();
        if (contentType === "text") body.textContent = textContent.trim();

        const response = await fetch(
          `/api/dosen/courses/${courseId}/sessions/${session.id}/materials/${editingMaterial.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        );
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error ?? "Gagal memperbarui");
        }
      } else if (contentType === "file") {
        if (!selectedFile) {
          toast.error("Pilih file PDF");
          setUploading(false);
          return;
        }

        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("title", title.trim());
        if (description.trim()) formData.append("description", description.trim());

        const response = await fetch(
          `/api/dosen/courses/${courseId}/sessions/${session.id}/materials`,
          { method: "POST", body: formData }
        );
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error ?? "Gagal upload");
        }
      } else {
        const body: Record<string, string> = { title: title.trim(), type: contentType };
        if (contentType === "link") body.url = linkUrl.trim();
        if (contentType === "text") body.content = textContent.trim();
        if (description.trim()) body.description = description.trim();

        const response = await fetch(
          `/api/dosen/courses/${courseId}/sessions/${session.id}/materials`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        );
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error ?? "Gagal menambah");
        }
      }

      toast.success(editingMaterial ? "Konten diperbarui" : "Konten berhasil ditambahkan");
      setShowDialog(false);
      resetForm();
      onContentChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setUploading(false);
    }
  }

  async function handleContentAction(submittedKey: string) {
    if (!contentAction) return;

    const sessionUrl = `/api/dosen/courses/${courseId}/sessions/${session.id}`;
    const isToggle = contentAction.type === "toggle";
    
    const url = contentAction.target === "session"
      ? sessionUrl
      : `${sessionUrl}/materials/${contentAction.material.id}`;

    const body = isToggle 
      ? { enrollmentKey: submittedKey, isActive: (contentAction as any).nextActive }
      : { enrollmentKey: submittedKey };

    const response = await fetch(url, {
      method: isToggle ? "PATCH" : "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Aksi gagal dijalankan");

    const entityName = contentAction.target === "session" ? "Sesi" : "Materi";
    if (contentAction.type === "delete") {
      toast.success(`${entityName} berhasil dihapus`);
    } else if (contentAction.type === "toggle") {
      toast.success((contentAction as any).nextActive ? `${entityName} diaktifkan` : `${entityName} dinonaktifkan`);
    }

    onContentChanged();
  }

  function getActionCopy() {
    if (!contentAction) {
      return { title: "", description: "", confirmLabel: "" };
    }

    if (contentAction.target === "session") {
      if (contentAction.type === "delete") {
        return {
          title: "Hapus sesi?",
          description: `Sesi "${session.title}" beserta seluruh materi di dalamnya akan dihapus permanen.`,
          confirmLabel: "Hapus Sesi",
        };
      }

      if (contentAction.type === "toggle") {
        return {
          title: contentAction.nextActive ? "Aktifkan sesi?" : "Nonaktifkan sesi?",
          description: contentAction.nextActive
            ? `Sesi "${session.title}" akan kembali terlihat sebagai sesi aktif.`
            : `Sesi "${session.title}" akan disembunyikan dari mahasiswa.`,
          confirmLabel: contentAction.nextActive ? "Aktifkan" : "Nonaktifkan",
        };
      }
    }

    if (contentAction.target === "material") {
      if (contentAction.type === "delete") {
        return {
          title: "Hapus materi?",
          description: `Materi "${contentAction.material.title}" akan dihapus permanen dari sesi ini.`,
          confirmLabel: "Hapus Materi",
        };
      }

      if (contentAction.type === "toggle") {
        return {
          title: contentAction.nextActive ? "Aktifkan materi?" : "Nonaktifkan materi?",
          description: contentAction.nextActive
            ? `Materi "${contentAction.material.title}" akan kembali terlihat sebagai materi aktif.`
            : `Materi "${contentAction.material.title}" akan disembunyikan dari mahasiswa.`,
          confirmLabel: contentAction.nextActive ? "Aktifkan" : "Nonaktifkan",
        };
      }
    }

    return { title: "", description: "", confirmLabel: "" };
  }

  return (
    <Card className="overflow-hidden border-border/70 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-col gap-3 p-5 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={onToggleExpand}
          className="flex min-w-0 flex-1 items-center justify-between gap-4 text-left"
        >
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <CalendarDays className="size-5" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold">{session.title}</h3>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span>{formatDate(session.createdAt)}</span>
                <span className="flex items-center gap-1">
                  <FileText className="size-3" />
                  {session._count.materials} materi
                </span>
              </div>
            </div>
          </div>
          {expanded ? (
            <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          )}
        </button>
        <div className="flex shrink-0 items-center gap-2">
          <StatusToggleButton
            active={session.isActive}
            inactiveLabel="Draft"
            onClick={() => setContentAction({ target: "session", type: "toggle", nextActive: !session.isActive })}
          />
          <Button
            size="icon"
            variant="ghost"
            className="bg-transparent text-muted-foreground shadow-none hover:bg-transparent hover:text-foreground"
            onClick={openEditSession}
            aria-label="Edit sesi"
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="bg-transparent text-destructive shadow-none hover:bg-transparent hover:text-destructive hover:[&_svg]:stroke-[2.5]"
            onClick={() => setContentAction({ target: "session", type: "delete" })}
            aria-label="Hapus sesi"
          >
            <Trash2 />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="border-t px-5 pb-5">
          {session.description && (
            <div className="border-b py-4">
              <p className={`text-sm leading-relaxed text-muted-foreground ${!descExpanded ? "line-clamp-1" : ""}`}>
                {session.description}
              </p>
              {session.description.length > 100 && (
                <button
                  onClick={() => setDescExpanded(!descExpanded)}
                  className="mt-1 text-xs font-medium text-primary hover:underline"
                >
                  {descExpanded ? "Sembunyikan" : "Lihat selengkapnya"}
                </button>
              )}
            </div>
          )}

          <div className="pt-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Konten
              </h4>
              <Button className="bg-brand text-black hover:bg-brand/90" onClick={() => setShowDialog(true)}>
                <Upload data-icon="inline-start" />
                Tambah Konten
              </Button>
            </div>

            {session.materials.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/10 py-8 text-center">
                <FileText className="mb-2 size-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Belum ada konten</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {session.materials.map((material) => {
                  const type = resolveMaterialType(material);

                  if (type === "text") {
                    return (
                      <Card key={material.id} className="border-border/60 bg-muted/5">
                        <CardContent className="flex flex-col gap-3 p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                              <div className={`flex size-9 shrink-0 items-center justify-center rounded-md ${getMaterialIconBg(type)}`}>
                                {getMaterialIcon(type)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-bold">{material.title}</p>
                                <p className="text-xs text-muted-foreground">{material.description || "Materi teks"}</p>
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <StatusToggleButton
                                active={material.isActive}
                                onClick={() => setContentAction({ target: "material", type: "toggle", material, nextActive: !material.isActive })}
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                className="bg-transparent text-muted-foreground shadow-none hover:bg-transparent hover:text-foreground"
                                onClick={() => openEditMaterial(material)}
                                aria-label="Edit materi"
                              >
                                <Pencil className="size-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="bg-transparent text-destructive shadow-none hover:bg-transparent hover:text-destructive hover:[&_svg]:stroke-[2.5]"
                                onClick={() => setContentAction({ target: "material", type: "delete", material })}
                                aria-label="Hapus materi"
                              >
                                <Trash2 />
                              </Button>
                            </div>
                          </div>
                          <p className="border-t pt-3 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                            {resolveTextContent(material)}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  }

                  return (
                    <div
                      key={material.id}
                      className="flex flex-col gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center"
                    >
                      <a
                        href={resolveMaterialHref(material)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex min-w-0 flex-1 items-center gap-3"
                      >
                        <div className={`flex size-9 shrink-0 items-center justify-center rounded-md ${getMaterialIconBg(type)}`}>
                          {getMaterialIcon(type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{material.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {material.description || material.fileName}
                            {type === "file" && material.fileSize && material.fileSize !== "0"
                              ? ` - ${formatFileSize(material.fileSize)}`
                              : ""}
                          </p>
                        </div>
                        <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
                      </a>
                      <div className="flex shrink-0 items-center gap-2">
                        <StatusToggleButton
                          active={material.isActive}
                          onClick={() => setContentAction({ target: "material", type: "toggle", material, nextActive: !material.isActive })}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="bg-transparent text-muted-foreground shadow-none hover:bg-transparent hover:text-foreground"
                          onClick={() => openEditMaterial(material)}
                          aria-label="Edit materi"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="bg-transparent text-destructive shadow-none hover:bg-transparent hover:text-destructive hover:[&_svg]:stroke-[2.5]"
                          onClick={() => setContentAction({ target: "material", type: "delete", material })}
                          aria-label="Hapus materi"
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Material Modal */}
      <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[520px]">
          <DialogHeader className="border-b bg-muted/30 px-6 py-4">
            <DialogTitle>{editingMaterial ? "Edit Konten" : "Tambah Konten"}</DialogTitle>
            <DialogDescription>{session.title}</DialogDescription>
          </DialogHeader>
          <div className="flex max-h-[62vh] flex-col gap-4 overflow-y-auto px-6 py-5">
            {!editingMaterial && (
              <div className="grid gap-1.5">
                <Label>Jenis Konten</Label>
                <Select value={contentType} onValueChange={(value) => setContentType(value as ContentType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="file">File PDF</SelectItem>
                    <SelectItem value="link">Link URL</SelectItem>
                    <SelectItem value="text">Teks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-1.5">
              <Label>Judul <span className="text-destructive">*</span></Label>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Judul materi" disabled={uploading} />
            </div>

            {contentType === "file" && !editingMaterial && (
              <div className="grid gap-1.5">
                <Label>File PDF <span className="text-destructive">*</span></Label>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex min-h-28 flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors hover:border-primary/40 hover:bg-muted/30"
                >
                  <Upload className="mb-2 size-6 text-muted-foreground/60" />
                  <span className="max-w-full truncate text-sm font-medium">
                    {selectedFile ? selectedFile.name : "Klik untuk memilih file"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {selectedFile ? formatFileSize(String(selectedFile.size)) : "PDF"}
                  </span>
                </button>
                <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} />
              </div>
            )}

            {contentType === "link" && (
              <div className="grid gap-1.5">
                <Label>URL <span className="text-destructive">*</span></Label>
                <Input value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="https://..." disabled={uploading} />
              </div>
            )}

            {contentType === "text" && (
              <div className="grid gap-1.5">
                <Label>Konten Teks <span className="text-destructive">*</span></Label>
                <textarea
                  value={textContent}
                  onChange={(event) => setTextContent(event.target.value)}
                  placeholder="Tulis konten teks di sini..."
                  disabled={uploading}
                  rows={4}
                  className="flex w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            )}

            {(contentType === "file" || contentType === "link") && (
              <div className="grid gap-1.5">
                <Label>Keterangan <span className="text-xs font-normal text-muted-foreground">(opsional)</span></Label>
                <Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Keterangan singkat" disabled={uploading} />
              </div>
            )}
          </div>
          <DialogFooter className="mx-0 mb-0 flex-row justify-end gap-2 rounded-none border-t bg-background px-6 py-4">
            <Button className="min-w-24" variant="outline" onClick={() => setShowDialog(false)} disabled={uploading}>
              Batal
            </Button>
            <Button
              className="min-w-28 bg-brand text-black hover:bg-brand/90"
              onClick={handleSubmit}
              disabled={
                uploading ||
                !title.trim() ||
                (contentType === "file" && !selectedFile && !editingMaterial) ||
                (contentType === "link" && !linkUrl.trim()) ||
                (contentType === "text" && !textContent.trim())
              }
            >
              {uploading && <Loader2 className="animate-spin" data-icon="inline-start" />}
              {editingMaterial ? "Simpan" : "Tambah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Session Modal */}
      <Dialog open={sessionDialogOpen} onOpenChange={setSessionDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Edit Sesi</DialogTitle>
            <DialogDescription>Perbarui detail sesi perkuliahan.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Judul Sesi</Label>
              <Input
                value={sessionForm.title}
                onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
                placeholder="Judul sesi"
                disabled={sessionSubmitting}
              />
            </div>
            <div className="grid gap-2">
              <Label>Deskripsi</Label>
              <textarea
                value={sessionForm.description}
                onChange={(e) => setSessionForm({ ...sessionForm, description: e.target.value })}
                placeholder="Deskripsi sesi"
                disabled={sessionSubmitting}
                rows={3}
                className="flex w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSessionDialogOpen(false)} disabled={sessionSubmitting}>
              Batal
            </Button>
            <Button
              className="bg-brand text-black hover:bg-brand/90"
              onClick={handleEditSession}
              disabled={sessionSubmitting || !sessionForm.title.trim()}
            >
              {sessionSubmitting && <Loader2 className="animate-spin" data-icon="inline-start" />}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CourseKeyConfirmDialog
        open={!!contentAction}
        onOpenChange={(open) => !open && setContentAction(null)}
        courseKey={enrollmentKey}
        destructive={contentAction?.type === "delete"}
        onConfirm={handleContentAction}
        {...getActionCopy()}
      />
    </Card>
  );
}
