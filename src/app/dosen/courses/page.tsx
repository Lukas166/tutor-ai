"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  GraduationCap,
  CalendarDays,
  Search,
  X,
  Plus,
  LayoutGrid,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DosenCourse {
  id: string;
  title: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  creator: { id: string; name: string };
  _count: { enrollments: number; sessions: number };
}

const GRID_OPTIONS = [
  { label: "2 Kolom", value: 2, class: "sm:grid-cols-2" },
  { label: "4 Kolom", value: 4, class: "sm:grid-cols-2 lg:grid-cols-4" },
  { label: "6 Kolom", value: 6, class: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6" },
  { label: "8 Kolom", value: 8, class: "sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8" },
] as const;

function CourseCard({ course }: { course: DosenCourse }) {
  const router = useRouter();

  return (
    <Card
      className="group overflow-hidden border-border/50 transition-all duration-200 hover:shadow-md hover:border-brand/30 cursor-pointer"
      onClick={() => router.push(`/dosen/courses/${course.id}`)}
    >
      <div className="h-2 bg-gradient-to-r from-brand to-brand/60" />
      <CardContent className="p-5">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-base leading-snug line-clamp-2 group-hover:text-brand transition-colors">
              {course.title}
            </h3>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                course.isActive
                  ? "bg-brand text-black"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {course.isActive ? "Aktif" : "Nonaktif"}
            </span>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {course.description || "Belum ada deskripsi"}
          </p>

          <div className="flex items-center gap-4 pt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <GraduationCap className="size-3.5" />
              {course._count.enrollments} Mahasiswa
            </span>
            <span className="flex items-center gap-1">
              <CalendarDays className="size-3.5" />
              {course._count.sessions} Sesi
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DosenCoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<DosenCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [gridColumns, setGridColumns] = useState(4);

  const fetchCourses = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);

    fetch(`/api/dosen/courses?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCourses(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    const timeoutId = window.setTimeout(fetchCourses, 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchCourses]);

  const selectedGrid = GRID_OPTIONS.find((g) => g.value === gridColumns) ?? GRID_OPTIONS[1];

  return (
    <div className="flex flex-col gap-6">
      {/* Header with + button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Courses</h1>
          <p className="text-muted-foreground">
            Semua mata kuliah yang Anda ampu
          </p>
        </div>
        <Button
          onClick={() => router.push("/dosen/courses/create")}
          className="bg-brand text-black shadow-sm hover:bg-brand/90"
        >
          <Plus data-icon="inline-start" />
          Tambah Course
        </Button>
      </div>

      {/* Search + Layout toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="dosen-courses-search"
            placeholder="Cari judul course..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setSearch(searchInput);
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

        {/* Layout toggle dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="shrink-0 bg-brand text-black shadow-sm hover:bg-brand/90">
              <LayoutGrid data-icon="inline-start" />
              {selectedGrid.label}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {GRID_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => setGridColumns(option.value)}
                className={gridColumns === option.value ? "bg-brand text-black focus:bg-brand focus:text-black" : ""}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Course Grid */}
      {loading ? (
        <div className={`grid gap-5 ${selectedGrid.class}`}>
          {Array.from({ length: gridColumns }).map((_, i) => (
            <Card key={i} className="overflow-hidden border-border/50">
              <div className="h-2 bg-muted" />
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex gap-4 pt-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="size-12 text-muted-foreground/50 mb-4" strokeWidth={1.5} />
            <p className="text-muted-foreground font-medium">
              {search ? "Tidak ada course yang cocok" : "Belum ada course"}
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {search
                ? "Coba gunakan kata kunci yang berbeda"
                : "Anda belum ditugaskan ke course manapun oleh admin."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className={`grid gap-5 ${selectedGrid.class}`}>
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}
