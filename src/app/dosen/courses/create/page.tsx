"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, BookOpen, KeyRound, Info } from "lucide-react";
import { toast } from "sonner";

export default function DosenCreateCoursePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    description: "",
    isActive: true,
  });
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
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Buat Course Baru</h1>
        <p className="text-muted-foreground">
          Buat mata kuliah baru untuk mahasiswa Anda
        </p>
      </div>

      <Card className="max-w-2xl border-border/50">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-brand/10">
              <BookOpen className="size-5 text-brand" />
            </div>
            <div>
              <CardTitle className="text-lg">Informasi Course</CardTitle>
              <CardDescription>
                Lengkapi data di bawah. Enrollment key akan digenerate otomatis.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Title */}
            <div className="grid gap-2">
              <Label htmlFor="course-title">
                Judul Course <span className="text-destructive">*</span>
              </Label>
              <Input
                id="course-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Contoh: Kecerdasan Buatan"
                disabled={submitting}
              />
              <p className="text-xs text-muted-foreground">
                Nama mata kuliah yang akan ditampilkan kepada mahasiswa.
              </p>
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="course-description">
                Deskripsi{" "}
                <span className="text-muted-foreground font-normal text-xs">(opsional)</span>
              </Label>
              <textarea
                id="course-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Deskripsi singkat tentang mata kuliah, topik yang dibahas, dan tujuan pembelajaran."
                disabled={submitting}
                rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
            </div>

            {/* isActive */}
            <div className="flex items-start gap-3 rounded-lg border bg-muted/20 p-4">
              <Checkbox
                id="course-active"
                checked={form.isActive}
                onCheckedChange={(checked) =>
                  setForm({ ...form, isActive: checked === true })
                }
                disabled={submitting}
                className="mt-0.5"
              />
              <div className="grid gap-1">
                <Label htmlFor="course-active" className="font-medium cursor-pointer">
                  Aktifkan Course
                </Label>
                <p className="text-xs text-muted-foreground">
                  Jika diaktifkan, mahasiswa dapat melihat dan mengakses course ini. Nonaktifkan jika belum siap dipublikasikan.
                </p>
              </div>
            </div>

            {/* Auto-generated info */}
            <div className="flex items-start gap-3 rounded-lg border border-brand/20 bg-brand/5 p-4">
              <KeyRound className="size-5 text-brand shrink-0 mt-0.5" />
              <div className="grid gap-1">
                <p className="text-sm font-medium">Enrollment Key</p>
                <p className="text-xs text-muted-foreground">
                  Enrollment key (8 karakter unik) akan digenerate otomatis saat course dibuat. Mahasiswa menggunakan key ini untuk mendaftar ke course Anda.
                </p>
              </div>
            </div>

            {/* Info about auto-assignment */}
            <div className="flex items-start gap-3 rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
              <Info className="size-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="grid gap-1">
                <p className="text-sm font-medium">Penugasan Otomatis</p>
                <p className="text-xs text-muted-foreground">
                  Anda akan otomatis ditugaskan sebagai dosen pengampu dari course ini setelah dibuat.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dosen/courses")}
                disabled={submitting}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={submitting || form.title.trim().length < 3}
                className="bg-brand text-black hover:bg-brand/90"
              >
                {submitting && <Loader2 className="animate-spin" data-icon="inline-start" />}
                Buat Course
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
