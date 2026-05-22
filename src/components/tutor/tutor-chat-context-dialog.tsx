"use client";

import { FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { TutorMaterial, TutorChatSession } from "./tutor-chat-types";

export type TutorChatContextDialogProps = {
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  readyMaterials: TutorMaterial[];
  selectedMaterialSet: Set<string>;
  activeSession: TutorChatSession | null;
  savingContext: boolean;
  handleMaterialToggle: (materialId: string, checked: boolean) => Promise<void>;
};

export function TutorChatContextDialog({
  settingsOpen,
  setSettingsOpen,
  readyMaterials,
  selectedMaterialSet,
  activeSession,
  savingContext,
  handleMaterialToggle,
}: TutorChatContextDialogProps) {
  return (
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent className="sm:max-w-[520px] p-6 sm:p-8">
        <DialogHeader className="pr-8">
          <DialogTitle>Konteks Materi</DialogTitle>
          <DialogDescription>
            Pilih dokumen PDF yang akan dijadikan sumber pengetahuan Tutor AI untuk menjawab pertanyaan di sesi chat ini.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 flex max-h-[60vh] flex-col gap-3.5 overflow-y-auto pr-2">
          {readyMaterials.length === 0 ? (
            <div className="rounded-2xl border border-dashed px-3 py-10 text-center text-sm text-muted-foreground">
              Belum ada materi PDF yang siap digunakan untuk course ini.
            </div>
          ) : (
            readyMaterials.map((material) => {
              const isSelected = selectedMaterialSet.has(material.id);
              return (
                <label
                  key={material.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3.5 rounded-2xl border bg-background p-4 shadow-sm transition-all hover:bg-muted/40",
                    isSelected ? "border-brand ring-1 ring-brand/20" : "border-border"
                  )}
                >
                  <div className="flex shrink-0 items-center justify-center">
                    <Checkbox
                      checked={isSelected}
                      disabled={!activeSession || savingContext}
                      onCheckedChange={(checked: boolean | "indeterminate") =>
                        void handleMaterialToggle(material.id, checked === true)
                      }
                      aria-label={`Aktifkan ${material.title}`}
                    />
                  </div>

                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                    <FileText className="size-6" />
                  </div>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-semibold leading-tight text-foreground">
                      {material.title}
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {material.pageCount} halaman
                    </span>
                  </span>
                </label>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
