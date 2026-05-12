"use client";

import { useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FileText, Upload, Loader2, ChevronDown, ChevronUp, Link2, Type } from "lucide-react";
import { toast } from "sonner";
import type { SessionItem } from "./types";
import { formatDate, formatFileSize } from "./types";

type ContentType = "file" | "link" | "text";

export function SessionCard({
  session, courseId, onContentAdded,
}: {
  session: SessionItem;
  courseId: string;
  onContentAdded: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [contentType, setContentType] = useState<ContentType>("file");
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [textContent, setTextContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setTitle(""); setDescription(""); setLinkUrl("");
    setTextContent(""); setSelectedFile(null); setContentType("file");
  }

  async function handleSubmit() {
    if (!title.trim()) { toast.error("Judul wajib diisi"); return; }

    setUploading(true);
    try {
      if (contentType === "file") {
        if (!selectedFile) { toast.error("Pilih file PDF"); setUploading(false); return; }
        const fd = new FormData();
        fd.append("file", selectedFile);
        fd.append("title", title.trim());
        if (description.trim()) fd.append("description", description.trim());
        const res = await fetch(`/api/dosen/courses/${courseId}/sessions/${session.id}/materials`, { method: "POST", body: fd });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Gagal upload"); }
      } else {
        const body: Record<string, string> = { title: title.trim(), type: contentType };
        if (contentType === "link") body.url = linkUrl.trim();
        if (contentType === "text") body.content = textContent.trim();
        if (description.trim()) body.description = description.trim();
        const res = await fetch(`/api/dosen/courses/${courseId}/sessions/${session.id}/materials`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Gagal menambah"); }
      }
      toast.success("Konten berhasil ditambahkan");
      setShowDialog(false);
      resetForm();
      onContentAdded();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setUploading(false);
    }
  }

  function getIcon(mat: SessionItem["materials"][0]) {
    if (mat.filePath.startsWith("http") || mat.filePath.startsWith("link:")) return <Link2 className="size-4 text-blue-600" />;
    if (mat.filePath.startsWith("text:")) return <Type className="size-4 text-emerald-600" />;
    return <FileText className="size-4 text-red-600" />;
  }

  function getIconBg(mat: SessionItem["materials"][0]) {
    if (mat.filePath.startsWith("http") || mat.filePath.startsWith("link:")) return "bg-blue-500/10";
    if (mat.filePath.startsWith("text:")) return "bg-emerald-500/10";
    return "bg-red-500/10";
  }

  return (
    <Card className="border-border/50 overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-muted/30">
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 font-bold text-brand text-sm">{session.orderNumber}</div>
          <div className="min-w-0">
            <h3 className="font-bold text-base truncate">{session.title}</h3>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
              <span>{formatDate(session.createdAt)}</span>
              <span className="flex items-center gap-1"><FileText className="size-3" />{session._count.materials} materi</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={session.isActive ? "default" : "secondary"} className="text-[10px]">{session.isActive ? "Aktif" : "Draft"}</Badge>
          {expanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t px-5 pb-5">
          {session.description && (
            <div className="py-4 border-b">
              <p className={`text-sm text-muted-foreground leading-relaxed ${!descExpanded ? "line-clamp-1" : ""}`}>
                {session.description}
              </p>
              {session.description.length > 100 && (
                <button 
                  onClick={() => setDescExpanded(!descExpanded)} 
                  className="text-xs text-brand hover:underline mt-1 font-medium"
                >
                  {descExpanded ? "Sembunyikan" : "Lihat selengkapnya..."}
                </button>
              )}
            </div>
          )}
          <div className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Konten</h4>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setShowDialog(true)}>
                <Upload className="size-3.5" />Tambah Konten
              </Button>
            </div>
            {session.materials.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center rounded-lg border border-dashed">
                <FileText className="size-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">Belum ada konten</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {session.materials.map((mat) => {
                  const isText = mat.filePath.startsWith("text:");
                  const isLink = mat.filePath.startsWith("link:") || mat.filePath.startsWith("http");
                  
                  if (isText) {
                    return (
                      <div key={mat.id} className="flex flex-col gap-2 rounded-lg border p-4 bg-muted/5 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`flex size-9 shrink-0 items-center justify-center rounded-md ${getIconBg(mat)}`}>{getIcon(mat)}</div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-foreground">{mat.title}</p>
                            <p className="text-xs text-muted-foreground">Teks</p>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed mt-1 border-t pt-3">
                          {mat.filePath.replace("text:", "")}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <a key={mat.id} href={isLink ? mat.filePath.replace("link:", "") : mat.filePath} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/30">
                      <div className={`flex size-9 shrink-0 items-center justify-center rounded-md ${getIconBg(mat)}`}>{getIcon(mat)}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{mat.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{mat.fileName} {mat.fileSize && mat.fileSize !== "0" ? `• ${formatFileSize(mat.fileSize)}` : ""}</p>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Content Dialog */}
      <Dialog open={showDialog} onOpenChange={(o) => { setShowDialog(o); if (!o) resetForm(); }}>
        <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b bg-muted/30">
            <DialogTitle>Tambah Konten — {session.title}</DialogTitle>
            <DialogDescription>Pilih jenis konten yang ingin ditambahkan.</DialogDescription>
          </DialogHeader>
          <div className="px-6 py-4 flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
            <div className="grid gap-1.5">
              <Label>Jenis Konten</Label>
              <Select value={contentType} onValueChange={(v) => setContentType(v as ContentType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="file">📄 File PDF</SelectItem>
                  <SelectItem value="link">🔗 Link URL</SelectItem>
                  <SelectItem value="text">📝 Teks</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Judul <span className="text-destructive">*</span></Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul materi" disabled={uploading} />
            </div>

            {contentType === "file" && (
              <div className="grid gap-1.5">
                <Label>File PDF <span className="text-destructive">*</span></Label>
                <div onClick={() => fileRef.current?.click()} className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-6 cursor-pointer transition-colors hover:bg-muted/20 hover:border-brand/30">
                  <Upload className="size-6 text-muted-foreground/50 mb-1.5" />
                  <p className="text-sm font-medium">{selectedFile ? selectedFile.name : "Klik untuk memilih file"}</p>
                  <p className="text-xs text-muted-foreground">{selectedFile ? formatFileSize(String(selectedFile.size)) : "Maks 50MB"}</p>
                </div>
                <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)} />
              </div>
            )}

            {contentType === "link" && (
              <div className="grid gap-1.5">
                <Label>URL <span className="text-destructive">*</span></Label>
                <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." disabled={uploading} />
              </div>
            )}

            {contentType === "text" && (
              <div className="grid gap-1.5">
                <Label>Konten Teks <span className="text-destructive">*</span></Label>
                <textarea value={textContent} onChange={(e) => setTextContent(e.target.value)} placeholder="Tulis konten teks di sini..." disabled={uploading} rows={4} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" />
              </div>
            )}

            {(contentType === "file" || contentType === "link") && (
              <div className="grid gap-1.5">
                <Label>Keterangan <span className="text-muted-foreground text-xs font-normal">(opsional)</span></Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Keterangan singkat" disabled={uploading} />
              </div>
            )}
          </div>
          <DialogFooter className="px-6 py-3 border-t">
            <Button variant="outline" onClick={() => setShowDialog(false)} disabled={uploading}>Batal</Button>
            <Button onClick={handleSubmit} disabled={uploading || !title.trim() || (contentType === "file" && !selectedFile) || (contentType === "link" && !linkUrl.trim()) || (contentType === "text" && !textContent.trim())} className="bg-brand text-black hover:bg-brand/90">
              {uploading && <Loader2 className="animate-spin mr-1.5 size-4" />}Tambah
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
