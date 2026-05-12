"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, X, Users } from "lucide-react";
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
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setStudents(data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [courseId, open]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  async function handleRemove() {
    if (!removeTarget) return;
    if (confirmKey !== enrollmentKey) {
      toast.error("Enrollment key tidak sesuai");
      return;
    }
    setRemoving(true);
    try {
      const res = await fetch(`/api/dosen/courses/${courseId}/students`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: removeTarget.user.id, enrollmentKey: confirmKey }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Gagal"); }
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
        <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b bg-muted/30">
            <DialogTitle className="flex items-center gap-2">
              <Users className="size-5" /> Daftar Mahasiswa
            </DialogTitle>
            <DialogDescription>{students.length} mahasiswa terdaftar</DialogDescription>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
            ) : students.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="size-10 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">Belum ada mahasiswa terdaftar</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="px-6 py-3 w-10">No</th>
                    <th className="px-2 py-3">NPM</th>
                    <th className="px-2 py-3">Nama</th>
                    <th className="px-2 py-3">Jurusan</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {students.map((s, i) => (
                    <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-3 text-muted-foreground">{i + 1}</td>
                      <td className="px-2 py-3 font-mono text-xs">{s.user.npm ?? "—"}</td>
                      <td className="px-2 py-3 font-medium">{s.user.name}</td>
                      <td className="px-2 py-3 text-muted-foreground">{s.user.major ?? "—"}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setRemoveTarget(s)} className="text-red-500 hover:text-red-700 transition-colors" title="Keluarkan mahasiswa">
                          <X className="size-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <Dialog open={!!removeTarget} onOpenChange={(o) => { if (!o) { setRemoveTarget(null); setConfirmKey(""); } }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">Keluarkan Mahasiswa</DialogTitle>
            <DialogDescription>
              Anda akan mengeluarkan <strong>{removeTarget?.user.name}</strong> dari course ini. Masukkan enrollment key untuk konfirmasi.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label>Enrollment Key</Label>
            <Input value={confirmKey} onChange={(e) => setConfirmKey(e.target.value)} placeholder="Masukkan enrollment key" className="font-mono" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRemoveTarget(null); setConfirmKey(""); }} disabled={removing}>Batal</Button>
            <Button variant="destructive" onClick={handleRemove} disabled={removing || !confirmKey.trim()}>
              {removing && <Loader2 className="animate-spin mr-1.5 size-4" />}Keluarkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
