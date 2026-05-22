"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  Link2,
  Type,
  CalendarDays,
} from "lucide-react";
import type { MaterialItem, SessionItem } from "./types";
import { formatDate, formatFileSize } from "./types";

type ContentType = "file" | "link" | "text";

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
  if (type === "link") return <Link2 className="text-blue-600" />;
  if (type === "text") return <Type className="text-emerald-600" />;
  return <FileText className="text-red-600" />;
}

function getMaterialIconBg(type: ContentType) {
  if (type === "link") return "bg-blue-500/10";
  if (type === "text") return "bg-emerald-500/10";
  return "bg-red-500/10";
}

export function MahasiswaSessionCard({ session }: { session: SessionItem }) {
  const [expanded, setExpanded] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [textMaterial, setTextMaterial] = useState<MaterialItem | null>(null);

  return (
    <Card className="overflow-hidden border-border/70 shadow-sm transition-shadow hover:shadow-md">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-muted/30"
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

      {expanded && (
        <div className="border-t px-5 pb-5">
          {session.description && (
            <div className="border-b py-4">
              <p className={`text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap break-words ${!descExpanded ? "line-clamp-1" : ""}`}>
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
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Materi
            </h4>

            {session.materials.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/10 py-8 text-center">
                <FileText className="mb-2 size-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Belum ada materi</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {session.materials.map((material) => {
                  const type = resolveMaterialType(material);
                  const description = material.description || material.fileName;

                  if (type === "text") {
                    return (
                      <button
                        key={material.id}
                        onClick={() => setTextMaterial(material)}
                        className="flex min-w-0 items-center gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-muted/30"
                      >
                        <div className={`flex size-9 shrink-0 items-center justify-center rounded-md ${getMaterialIconBg(type)}`}>
                          {getMaterialIcon(type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{material.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {material.description || "Materi teks"}
                          </p>
                        </div>
                        <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
                      </button>
                    );
                  }

                  return (
                    <a
                      key={material.id}
                      href={resolveMaterialHref(material)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-w-0 items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/30"
                    >
                      <div className={`flex size-9 shrink-0 items-center justify-center rounded-md ${getMaterialIconBg(type)}`}>
                        {getMaterialIcon(type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{material.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {description}
                          {type === "file" && material.fileSize && material.fileSize !== "0"
                            ? ` - ${formatFileSize(material.fileSize)}`
                            : ""}
                        </p>
                      </div>
                      <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog open={!!textMaterial} onOpenChange={(open) => !open && setTextMaterial(null)}>
        <DialogContent className="sm:max-w-[680px]">
          <DialogHeader>
            <DialogTitle>{textMaterial?.title}</DialogTitle>
            <DialogDescription>
              {textMaterial?.description || session.title}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto rounded-lg border bg-muted/20 p-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {textMaterial ? resolveTextContent(textMaterial) : ""}
            </p>
          </div>
          <Button variant="outline" onClick={() => setTextMaterial(null)} className="ml-auto">
            Tutup
          </Button>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
