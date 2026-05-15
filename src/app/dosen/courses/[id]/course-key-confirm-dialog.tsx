"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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

type CourseKeyConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseKey: string;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: (submittedKey: string) => Promise<void>;
};

export function CourseKeyConfirmDialog({
  open,
  onOpenChange,
  courseKey,
  title,
  description,
  confirmLabel,
  destructive = false,
  onConfirm,
}: CourseKeyConfirmDialogProps) {
  const [submittedKey, setSubmittedKey] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isKeyMatch = useMemo(
    () => submittedKey.trim().toUpperCase() === courseKey.toUpperCase(),
    [courseKey, submittedKey]
  );

  useEffect(() => {
    if (!open) setSubmittedKey("");
  }, [open]);

  async function handleConfirm() {
    if (!isKeyMatch || submitting) return;

    setSubmitting(true);
    try {
      await onConfirm(submittedKey.trim());
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Aksi gagal dijalankan");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !submitting && onOpenChange(nextOpen)}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[460px]">
        <DialogHeader className="border-b bg-muted/30 px-6 py-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <AlertTriangle />
            </div>
            <div className="min-w-0">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="mt-1">{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-3 px-6 py-5">
          <div className="rounded-lg border bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground">Ketik enrollment key course ini:</p>
            <p className="mt-1 font-mono text-sm font-bold tracking-wider">{courseKey}</p>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="course-key-confirmation">Enrollment Key</Label>
            <Input
              id="course-key-confirmation"
              value={submittedKey}
              onChange={(event) => setSubmittedKey(event.target.value)}
              placeholder="Masukkan key"
              autoComplete="off"
              disabled={submitting}
            />
          </div>
        </div>

        <DialogFooter className="mx-0 mb-0 flex-row justify-end gap-2 rounded-none border-t bg-background px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Batal
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            className={destructive ? undefined : "bg-brand text-black hover:bg-brand/90"}
            onClick={handleConfirm}
            disabled={!isKeyMatch || submitting}
          >
            {submitting && <Loader2 className="animate-spin" data-icon="inline-start" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
