"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Save,
  RotateCcw,
  Loader2,
  MessageSquareText,
  User,
} from "lucide-react";
import { toast } from "sonner";

// ==========================================
// TYPES
// ==========================================

interface PromptConfig {
  id: string | null;
  academicLevel: string;
  responseMode: string;
  promptContent: string;
  isDefault: boolean;
  updatedBy: string | null;
  updatedAt: string | null;
}

type AcademicLevel = "S1" | "S2" | "S3";

const LEVEL_LABELS: Record<AcademicLevel, string> = {
  S1: "Sarjana (S1)",
  S2: "Magister (S2)",
  S3: "Doktoral (S3)",
};

// ==========================================
// MAIN PAGE
// ==========================================

export default function TutorPromptsPage() {
  const [configs, setConfigs] = useState<PromptConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLevel, setActiveLevel] = useState<AcademicLevel>("S1");
  const [editedPrompts, setEditedPrompts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<{
    level: AcademicLevel;
    mode: "chat" | "avatar";
  } | null>(null);
  const [resetting, setResetting] = useState(false);

  const fetchConfigs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/tutor-prompts");
      if (!res.ok) throw new Error("Gagal memuat konfigurasi prompt.");
      const data = await res.json();
      setConfigs(data);

      const edits: Record<string, string> = {};
      for (const config of data) {
        edits[`${config.academicLevel}:${config.responseMode}`] = config.promptContent;
      }
      setEditedPrompts(edits);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  function getPrompt(level: AcademicLevel, mode: "chat" | "avatar") {
    return configs.find((c) => c.academicLevel === level && c.responseMode === mode);
  }

  function getEdited(level: AcademicLevel, mode: "chat" | "avatar") {
    return editedPrompts[`${level}:${mode}`] ?? "";
  }

  function setEdited(level: AcademicLevel, mode: "chat" | "avatar", value: string) {
    setEditedPrompts((prev) => ({ ...prev, [`${level}:${mode}`]: value }));
  }

  async function handleSave(level: AcademicLevel, mode: "chat" | "avatar") {
    const key = `${level}:${mode}`;
    setSavingKey(key);
    try {
      const res = await fetch("/api/admin/tutor-prompts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicLevel: level,
          responseMode: mode,
          promptContent: editedPrompts[key],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan.");
      toast.success(`Prompt ${level} ${mode} berhasil disimpan`);
      await fetchConfigs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan prompt.");
    } finally {
      setSavingKey(null);
    }
  }

  async function handleReset() {
    if (!resetTarget) return;
    setResetting(true);
    try {
      const res = await fetch("/api/admin/tutor-prompts/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicLevel: resetTarget.level,
          responseMode: resetTarget.mode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mereset.");
      toast.success(`Prompt ${resetTarget.level} ${resetTarget.mode} dikembalikan ke default`);
      setResetTarget(null);
      await fetchConfigs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mereset prompt.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prompt Personalisasi AI</h1>
          <p className="text-muted-foreground">
            Konfigurasi gaya bahasa Tutor AI berdasarkan jenjang akademik
          </p>
        </div>
        <Select value={activeLevel} onValueChange={(v) => setActiveLevel(v as AcademicLevel)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="S1">Sarjana (S1)</SelectItem>
              <SelectItem value="S2">Magister (S2)</SelectItem>
              <SelectItem value="S3">Doktoral (S3)</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {/* Prompt Cards */}
      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-[350px] rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {(["chat", "avatar"] as const).map((mode) => {
            const prompt = getPrompt(activeLevel, mode);
            const edited = getEdited(activeLevel, mode);
            const key = `${activeLevel}:${mode}`;
            const hasChanges = prompt ? edited !== prompt.promptContent : false;
            const isDefault = prompt?.isDefault ?? true;
            const isSaving = savingKey === key;
            const isChat = mode === "chat";

            return (
              <Card key={key} className="overflow-hidden border-border/50 flex flex-col">
                <CardContent className="px-5 py-3 flex flex-col gap-3 flex-1">
                  {/* Card Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isChat ? (
                        <MessageSquareText className="size-5 text-brand" />
                      ) : (
                        <User className="size-5 text-brand" />
                      )}
                      <div>
                        <p className="text-sm font-semibold">
                          {isChat ? "Mode Chat" : "Mode Avatar"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isChat
                            ? "Jawaban teks lengkap dan terstruktur"
                            : "Jawaban ringkas untuk avatar berbicara"}
                        </p>
                      </div>
                    </div>
                    <Badge variant={isDefault ? "secondary" : "outline"}>
                      {isDefault ? "Default" : "Custom"}
                    </Badge>
                  </div>

                  {/* Textarea */}
                  <div className="flex flex-col gap-2 flex-1">
                    <Label htmlFor={`prompt-${key}`} className="my-2">
                      Prompt {LEVEL_LABELS[activeLevel]} — {isChat ? "Chat" : "Avatar"}
                    </Label>
                    <Textarea
                      id={`prompt-${key}`}
                      value={edited}
                      onChange={(e) => setEdited(activeLevel, mode, e.target.value)}
                      className="font-mono text-[13px] leading-relaxed resize-none w-full h-[350px] overflow-y-auto"
                      placeholder="Tulis prompt personalisasi..."
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 justify-end mt-2">
                    {!isDefault && (
                      <Button
                        variant="outline"
                        onClick={() => setResetTarget({ level: activeLevel, mode })}
                        disabled={isSaving}
                        className="gap-2"
                      >
                        <RotateCcw data-icon="inline-start" className="size-4" />
                        Reset Default
                      </Button>
                    )}
                    <Button
                      onClick={() => handleSave(activeLevel, mode)}
                      disabled={isSaving || !hasChanges}
                      className="gap-2 bg-brand text-black hover:bg-brand/90"
                    >
                      {isSaving ? (
                        <Loader2 className="animate-spin" data-icon="inline-start" />
                      ) : (
                        <Save data-icon="inline-start" className="size-4" />
                      )}
                      Simpan
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Reset Confirmation */}
      <AlertDialog open={!!resetTarget} onOpenChange={(open) => !open && setResetTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset ke Prompt Default</AlertDialogTitle>
            <AlertDialogDescription>
              Prompt <strong>{resetTarget?.level}</strong> mode{" "}
              <strong>{resetTarget?.mode}</strong> akan dikembalikan ke versi bawaan sistem.
              Perubahan yang sudah dibuat akan hilang.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleReset();
              }}
              disabled={resetting}
              className="bg-brand text-black hover:bg-brand/90"
            >
              {resetting && <Loader2 className="animate-spin" data-icon="inline-start" />}
              Reset Default
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
