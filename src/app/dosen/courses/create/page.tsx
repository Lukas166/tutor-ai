"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, BookOpen } from "lucide-react";
import { toast } from "sonner";

export default function DosenCreateCoursePage() {
  const router = useRouter();
  const [form, setForm] = useState({ title: "", description: "", isActive: true });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.title.trim().length < 3) {
      toast.error("Judul minimal 3 karakter");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/dosen/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || null,
          isActive: form.isActive,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.toString() || "Gagal membuat course");
      }

      toast.success("Course berhasil dibuat!");
      router.push("/dosen/courses");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-center py-4">
      <Card className="w-full max-w-lg border-border/50">
        <CardHeader className="border-b bg-muted/30 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-brand/10">
              <BookOpen className="size-4.5 text-brand" />
            </div>
            <CardTitle className="text-lg">Buat Course Baru</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="grid gap-1.5">
              <Label htmlFor="course-title">
                Judul <span className="text-destructive">*</span>
              </Label>
              <Input
                id="course-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Contoh: Kecerdasan Buatan"
                disabled={submitting}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="course-description">
                Deskripsi <span className="text-muted-foreground font-normal text-xs">(opsional)</span>
              </Label>
              <textarea
                id="course-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Deskripsi singkat mata kuliah"
                disabled={submitting}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
            </div>

            <label htmlFor="course-active" className="flex items-center gap-2.5 cursor-pointer">
              <Checkbox
                id="course-active"
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v === true })}
                disabled={submitting}
              />
              <span className="text-sm">Langsung aktifkan course ini</span>
            </label>

            <p className="text-xs text-muted-foreground -mt-2">
              Enrollment key akan digenerate otomatis. Anda otomatis menjadi dosen pengampu.
            </p>

            <div className="flex justify-end gap-3 pt-1 border-t">
              <Button type="button" variant="outline" onClick={() => router.push("/dosen/courses")} disabled={submitting}>
                Batal
              </Button>
              <Button type="submit" disabled={submitting || form.title.trim().length < 3} className="bg-brand text-black hover:bg-brand/90">
                {submitting && <Loader2 className="animate-spin mr-1.5 size-4" />}
                Buat Course
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
