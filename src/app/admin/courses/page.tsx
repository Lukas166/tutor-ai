"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  Eye,
  Copy,
  ToggleLeft,
  ToggleRight,
  Users,
  KeyRound,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface Course {
  id: string;
  title: string;
  description: string | null;
  enrollmentKey: string;
  isActive: boolean;
  createdAt: string;
  creator: { id: string; name: string };
  _count: { instructors: number; enrollments: number };
}

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [form, setForm] = useState({ title: "", description: "" });
  const [submitting, setSubmitting] = useState(false);

  // Delete dialog
  const [deleteCourse, setDeleteCourse] = useState<Course | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const fetchCourses = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);

    fetch(`/api/admin/courses?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCourses(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  function openCreate() {
    setEditingCourse(null);
    setForm({ title: "", description: "" });
    setDialogOpen(true);
  }

  function openEdit(course: Course) {
    setEditingCourse(course);
    setForm({ title: course.title, description: course.description || "" });
    setDialogOpen(true);
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const body = {
        title: form.title,
        description: form.description || null,
      };

      if (editingCourse) {
        const res = await fetch(`/api/admin/courses/${editingCourse.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error?.toString() || "Gagal update");
        }
        toast.success("Course berhasil diperbarui");
      } else {
        const res = await fetch("/api/admin/courses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error?.toString() || "Gagal membuat course");
        }
        toast.success("Course berhasil dibuat");
      }
      setDialogOpen(false);
      fetchCourses();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(course: Course) {
    try {
      const res = await fetch(`/api/admin/courses/${course.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !course.isActive }),
      });
      if (!res.ok) throw new Error("Gagal mengubah status");
      toast.success(course.isActive ? "Course dinonaktifkan" : "Course diaktifkan");
      fetchCourses();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengubah status");
    }
  }

  async function handleDelete() {
    if (!deleteCourse) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/courses/${deleteCourse.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menghapus");
      }
      toast.success("Course berhasil dihapus");
      setDeleteCourse(null);
      fetchCourses();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus course");
    } finally {
      setDeleting(false);
    }
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key);
    toast.success("Enrollment key disalin");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Course Management</h1>
          <p className="text-muted-foreground">Kelola mata kuliah dan dosen pengampu</p>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-brand text-black hover:bg-brand/90">
          <Plus data-icon="inline-start" />
          Tambah Course
        </Button>
      </div>

      {/* Filters/Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari judul atau enrollment key..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setSearch(searchInput);
              }
            }}
            className="pl-9"
          />
          {searchInput && (
            <button
              onClick={() => {
                setSearchInput("");
                setSearch("");
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Judul</TableHead>
              <TableHead>Enrollment Key</TableHead>
              <TableHead className="text-center">Dosen</TableHead>
              <TableHead className="text-center">Mahasiswa</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : courses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Belum ada course
                </TableCell>
              </TableRow>
            ) : (
              courses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell className="pl-6 max-w-[200px] sm:max-w-[300px]">
                    <div className="flex flex-col min-w-0">
                      <p className="font-medium truncate" title={course.title}>{course.title}</p>
                      {course.description && (
                        <p className="text-xs text-muted-foreground truncate" title={course.description}>
                          {course.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => copyKey(course.enrollmentKey)}
                      className="inline-flex items-center gap-1.5 rounded-md border bg-muted/50 px-2 py-1 font-mono text-xs transition-colors hover:bg-muted"
                    >
                      <KeyRound className="size-3 text-brand" />
                      {course.enrollmentKey}
                      <Copy className="size-3 text-muted-foreground" />
                    </button>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{course._count.instructors}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{course._count.enrollments}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={course.isActive ? "default" : "secondary"}>
                      {course.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuGroup>
                          <DropdownMenuItem onClick={() => router.push(`/admin/courses/${course.id}`)}>
                            <Eye data-icon="inline-start" />
                            Detail
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(course)}>
                            <Pencil data-icon="inline-start" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(course)}>
                            {course.isActive ? (
                              <>
                                <ToggleLeft data-icon="inline-start" />
                                Nonaktifkan
                              </>
                            ) : (
                              <>
                                <ToggleRight data-icon="inline-start" />
                                Aktifkan
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                          <DropdownMenuItem
                            onClick={() => setDeleteCourse(course)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 data-icon="inline-start" />
                            Hapus
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 py-6 border-b bg-muted/30">
            <DialogTitle className="text-xl">{editingCourse ? "Edit Course" : "Tambah Course Baru"}</DialogTitle>
            <DialogDescription>
              {editingCourse
                ? "Perbarui informasi course ini."
                : "Isi data untuk membuat course baru. Enrollment key otomatis dibuat."}
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-4 max-h-[60vh] overflow-y-auto pr-4">
            <div className="grid gap-5 py-2">
              <div className="grid gap-2">
                <Label htmlFor="title">Judul</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Nama mata kuliah"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Deskripsi</Label>
                <Input
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Opsional"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="m-0 px-6 py-4 border-t bg-muted/10">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-brand text-black hover:bg-brand/90"
            >
              {submitting && <Loader2 className="animate-spin" data-icon="inline-start" />}
              {editingCourse ? "Simpan" : "Buat Course"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteCourse} onOpenChange={(open) => !open && setDeleteCourse(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Course</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus <strong>{deleteCourse?.title}</strong>? Semua data
              terkait (sesi, materi, enrollment) akan ikut terhapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="animate-spin" data-icon="inline-start" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
