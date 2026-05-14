"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import type { EnrolledStudent } from "./types";

export function StudentListDialog({
  courseId, enrollmentKey, open, onOpenChange,
}: {
  courseId: string;
  enrollmentKey: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [removeTarget, setRemoveTarget] = useState<EnrolledStudent | null>(null);
  const [confirmKey, setConfirmKey] = useState("");
  const [removing, setRemoving] = useState(false);

  const fetchStudents = useCallback(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/dosen/courses/${courseId}/students`)
      .then((response) => response.json())
      .then((data) => { if (Array.isArray(data)) setStudents(data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [courseId, open]);

  useEffect(() => {
    const timeoutId = window.setTimeout(fetchStudents, 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchStudents]);

  async function handleRemove() {
    if (!removeTarget) return;
    if (confirmKey !== enrollmentKey) {
      toast.error("Enrollment key tidak sesuai");
      return;
    }

    setRemoving(true);
    try {
      const response = await fetch(`/api/dosen/courses/${courseId}/students`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: removeTarget.user.id, enrollmentKey: confirmKey }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Gagal mengeluarkan mahasiswa");
      }

      toast.success(`${removeTarget.user.name} berhasil dikeluarkan`);
      setRemoveTarget(null);
      setConfirmKey("");
      fetchStudents();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[660px]">
          <DialogHeader className="border-b bg-muted/30 px-6 py-4">
            <DialogTitle className="flex items-center gap-2">
              <Users className="size-5" />
              Daftar Mahasiswa
            </DialogTitle>
            <DialogDescription>{students.length} mahasiswa terdaftar</DialogDescription>
          </DialogHeader>
          <div className="max-h-[55vh] overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center py-14">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : students.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <Users className="mb-2 size-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Belum ada mahasiswa terdaftar</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 bg-muted/70 backdrop-blur">
                  <TableRow>
                    <TableHead className="w-12 pl-6">No</TableHead>
                    <TableHead>NPM</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Jurusan</TableHead>
                    <TableHead className="w-12 pr-6" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student, index) => (
                    <TableRow key={student.id}>
                      <TableCell className="pl-6 text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-mono text-xs">{student.user.npm ?? "-"}</TableCell>
                      <TableCell className="max-w-44 truncate font-medium">{student.user.name}</TableCell>
                      <TableCell className="max-w-40 truncate text-muted-foreground">{student.user.major ?? "-"}</TableCell>
                      <TableCell className="pr-6">
                        <Button
                          variant="destructive"
                          size="icon-sm"
                          onClick={() => setRemoveTarget(student)}
                          aria-label="Keluarkan mahasiswa"
                        >
                          <Trash2 />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!removeTarget} onOpenChange={(openConfirm) => { if (!openConfirm) { setRemoveTarget(null); setConfirmKey(""); } }}>
        <DialogContent className="sm:max-w-[430px]">
          <DialogHeader>
            <DialogTitle className="text-destructive">Keluarkan Mahasiswa</DialogTitle>
            <DialogDescription>
              Anda akan mengeluarkan <strong>{removeTarget?.user.name}</strong> dari course ini.
              Ketik enrollment key <strong className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">{enrollmentKey}</strong> untuk konfirmasi.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label>Enrollment Key</Label>
            <Input value={confirmKey} onChange={(event) => setConfirmKey(event.target.value)} placeholder="Masukkan enrollment key" className="font-mono" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRemoveTarget(null); setConfirmKey(""); }} disabled={removing}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleRemove} disabled={removing || !confirmKey.trim()}>
              {removing && <Loader2 className="animate-spin" data-icon="inline-start" />}
              Keluarkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
