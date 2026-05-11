"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  UserPlus,
  Trash2,
  Loader2,
  Copy,
  KeyRound,
  Users,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";

interface Instructor {
  id: string;
  user: { id: string; name: string; email: string };
  assignedAt: string;
}

interface CourseDetail {
  id: string;
  title: string;
  description: string | null;
  enrollmentKey: string;
  isActive: boolean;
  createdAt: string;
  creator: { id: string; name: string };
  instructors: Instructor[];
  _count: { enrollments: number };
}

interface Enrollment {
  id: string;
  isActive: boolean;
  enrolledAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    npm: string | null;
    academicLevel: string | null;
    major: string | null;
    faculty: string | null;
  };
}

interface Dosen {
  id: string;
  name: string;
  email: string;
}

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEnrollments, setLoadingEnrollments] = useState(true);

  // Assign instructor
  const [assignOpen, setAssignOpen] = useState(false);
  const [dosenList, setDosenList] = useState<Dosen[]>([]);
  const [selectedDosen, setSelectedDosen] = useState("");
  const [assigning, setAssigning] = useState(false);

  // Remove instructor
  const [removeInstructor, setRemoveInstructor] = useState<Instructor | null>(null);
  const [removing, setRemoving] = useState(false);

  const fetchCourse = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/courses/${courseId}`)
      .then((r) => r.json())
      .then(setCourse)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [courseId]);

  const fetchEnrollments = useCallback(() => {
    setLoadingEnrollments(true);
    fetch(`/api/admin/courses/${courseId}/enrollments`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setEnrollments(data);
      })
      .catch(console.error)
      .finally(() => setLoadingEnrollments(false));
  }, [courseId]);

  useEffect(() => {
    fetchCourse();
    fetchEnrollments();
  }, [fetchCourse, fetchEnrollments]);

  async function openAssignDialog() {
    setAssignOpen(true);
    setSelectedDosen("");
    try {
      const res = await fetch("/api/admin/dosen");
      const data = await res.json();
      if (Array.isArray(data)) setDosenList(data);
    } catch {
      toast.error("Gagal memuat daftar dosen");
    }
  }

  async function handleAssign() {
    if (!selectedDosen) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/instructors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedDosen }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.toString() || "Gagal menambahkan dosen");
      toast.success("Dosen berhasil ditambahkan");
      setAssignOpen(false);
      fetchCourse();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menambahkan dosen");
    } finally {
      setAssigning(false);
    }
  }

  async function handleRemove() {
    if (!removeInstructor) return;
    setRemoving(true);
    try {
      const res = await fetch(
        `/api/admin/courses/${courseId}/instructors?userId=${removeInstructor.user.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Gagal menghapus dosen");
      toast.success("Dosen berhasil dihapus dari course");
      setRemoveInstructor(null);
      fetchCourse();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus dosen");
    } finally {
      setRemoving(false);
    }
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key);
    toast.success("Enrollment key disalin");
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-muted-foreground">
        <p>Course tidak ditemukan</p>
        <Button variant="outline" onClick={() => router.push("/admin/courses")}>
          Kembali
        </Button>
      </div>
    );
  }

  // Filter out already-assigned dosen
  const assignedIds = new Set(course.instructors.map((i) => i.user.id));
  const availableDosen = dosenList.filter((d) => !assignedIds.has(d.id));

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/admin/courses")}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{course.title}</h1>
            <Badge variant={course.isActive ? "default" : "secondary"}>
              {course.isActive ? "Aktif" : "Nonaktif"}
            </Badge>
          </div>
          {course.description && (
            <p className="text-muted-foreground">{course.description}</p>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Enrollment Key</CardDescription>
          </CardHeader>
          <CardContent>
            <button
              onClick={() => copyKey(course.enrollmentKey)}
              className="inline-flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-1.5 font-mono text-sm transition-colors hover:bg-muted"
            >
              <KeyRound className="size-3.5 text-brand" />
              {course.enrollmentKey}
              <Copy className="size-3.5 text-muted-foreground" />
            </button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Dosen Pengampu</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="size-4 text-blue-500" />
              <span className="text-2xl font-bold">{course.instructors.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Mahasiswa Terdaftar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <GraduationCap className="size-4 text-emerald-500" />
              <span className="text-2xl font-bold">{course._count.enrollments}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Tabs */}
      <Tabs defaultValue="instructors">
        <TabsList>
          <TabsTrigger value="instructors">Dosen Pengampu</TabsTrigger>
          <TabsTrigger value="enrollments">Mahasiswa Terdaftar</TabsTrigger>
        </TabsList>

        {/* Instructors Tab */}
        <TabsContent value="instructors" className="flex flex-col gap-4">
          <div className="flex justify-end">
            <Button
              onClick={openAssignDialog}
              size="sm"
              className="gap-2 bg-brand text-black hover:bg-brand/90"
            >
              <UserPlus data-icon="inline-start" />
              Tambah Dosen
            </Button>
          </div>
          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Ditugaskan</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {course.instructors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                      Belum ada dosen yang ditugaskan
                    </TableCell>
                  </TableRow>
                ) : (
                  course.instructors.map((inst) => (
                    <TableRow key={inst.id}>
                      <TableCell className="font-medium">{inst.user.name}</TableCell>
                      <TableCell className="text-muted-foreground">{inst.user.email}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(inst.assignedAt).toLocaleDateString("id-ID")}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive"
                          onClick={() => setRemoveInstructor(inst)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Enrollments Tab */}
        <TabsContent value="enrollments">
          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>NPM</TableHead>
                  <TableHead>Jenjang</TableHead>
                  <TableHead>Jurusan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Terdaftar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingEnrollments ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : enrollments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-20 text-center text-muted-foreground">
                      Belum ada mahasiswa yang terdaftar
                    </TableCell>
                  </TableRow>
                ) : (
                  enrollments.map((enrollment) => (
                    <TableRow key={enrollment.id}>
                      <TableCell className="font-medium">{enrollment.user.name}</TableCell>
                      <TableCell className="text-muted-foreground">{enrollment.user.email}</TableCell>
                      <TableCell className="font-mono text-xs">{enrollment.user.npm ?? "—"}</TableCell>
                      <TableCell>{enrollment.user.academicLevel ?? "—"}</TableCell>
                      <TableCell>{enrollment.user.major ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={enrollment.isActive ? "default" : "secondary"}>
                          {enrollment.isActive ? "Aktif" : "Dicabut"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(enrollment.enrolledAt).toLocaleDateString("id-ID")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Assign Instructor Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Dosen Pengampu</DialogTitle>
            <DialogDescription>
              Pilih dosen yang akan ditugaskan ke course ini.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="dosen">Dosen</Label>
            <Select value={selectedDosen} onValueChange={setSelectedDosen}>
              <SelectTrigger id="dosen" className="mt-2">
                <SelectValue placeholder="Pilih dosen..." />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {availableDosen.length === 0 ? (
                    <SelectItem value="none" disabled>
                      Semua dosen sudah ditugaskan
                    </SelectItem>
                  ) : (
                    availableDosen.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name} — {d.email}
                      </SelectItem>
                    ))
                  )}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleAssign}
              disabled={assigning || !selectedDosen}
              className="bg-brand text-black hover:bg-brand/90"
            >
              {assigning && <Loader2 className="animate-spin" data-icon="inline-start" />}
              Tugaskan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Instructor Confirmation */}
      <AlertDialog open={!!removeInstructor} onOpenChange={(open) => !open && setRemoveInstructor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Dosen dari Course</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus <strong>{removeInstructor?.user.name}</strong> dari
              course ini?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={removing}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {removing && <Loader2 className="animate-spin" data-icon="inline-start" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
