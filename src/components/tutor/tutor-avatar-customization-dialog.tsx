"use client";

import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import {
  DEFAULT_TUTOR_AVATAR_CUSTOMIZATION,
  type TutorAvatarCustomization,
} from "./tutor-avatar-customization";

type TutorAvatarCustomizationDialogProps = {
  customization: TutorAvatarCustomization;
  onCustomizationChange: (customization: TutorAvatarCustomization) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

const COLOR_FIELDS: Array<{
  description: string;
  key: keyof TutorAvatarCustomization;
  label: string;
}> = [
  {
    key: "hijabColor",
    label: "Warna hijab",
    description: "Warna utama kain hijab.",
  },
  {
    key: "bodyColor",
    label: "Warna baju",
    description: "Warna utama pakaian avatar.",
  },
  {
    key: "headbandColor",
    label: "Warna headband",
    description: "Warna aksen pada bagian kepala.",
  },
];

export function TutorAvatarCustomizationDialog({
  customization,
  onCustomizationChange,
  onOpenChange,
  open,
}: TutorAvatarCustomizationDialogProps) {
  function updateColor(
    key: keyof TutorAvatarCustomization,
    color: string
  ) {
    onCustomizationChange({
      ...customization,
      [key]: color,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Personalisasi Avatar</DialogTitle>
          <DialogDescription>
            Pilih warna pakaian avatar. Perubahan langsung terlihat dan tersimpan
            di perangkat ini.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-1">
          {COLOR_FIELDS.map((field) => (
            <div
              key={field.key}
              className="flex items-center gap-4 rounded-xl border bg-muted/25 p-3"
            >
              <label
                className="relative size-12 shrink-0 cursor-pointer overflow-hidden rounded-xl border shadow-sm"
                style={{ backgroundColor: customization[field.key] }}
              >
                <input
                  type="color"
                  value={customization[field.key]}
                  onChange={(event) => updateColor(field.key, event.target.value)}
                  className="absolute inset-0 size-full cursor-pointer opacity-0"
                  aria-label={field.label}
                />
              </label>

              <div className="min-w-0 flex-1">
                <Label className="mb-1">{field.label}</Label>
                <p className="text-xs text-muted-foreground">
                  {field.description}
                </p>
              </div>

              <code className="rounded-md bg-background px-2 py-1 text-xs uppercase text-muted-foreground ring-1 ring-border">
                {customization[field.key]}
              </code>
            </div>
          ))}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              onCustomizationChange(DEFAULT_TUTOR_AVATAR_CUSTOMIZATION)
            }
          >
            <RotateCcw />
            Reset default
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Selesai
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
