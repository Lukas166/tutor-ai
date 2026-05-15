"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BookOpen, CalendarDays, GraduationCap, LayoutGrid, Search, X } from "lucide-react";

interface MahasiswaCourse {
  id: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  enrollmentKey: string;
  isActive: boolean;
  createdAt: string;
  creator: { id: string; name: string };
  instructors: { id: string; user: { id: string; name: string } }[];
  _count: { instructors: number; sessions: number };
}

const GRID_OPTIONS = [
  { label: "2 Kolom", value: 2, class: "sm:grid-cols-2" },
  { label: "4 Kolom", value: 4, class: "sm:grid-cols-2 lg:grid-cols-4" },
  { label: "6 Kolom", value: 6, class: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6" },
] as const;

function CourseCard({ course }: { course: MahasiswaCourse }) {
  const router = useRouter();

  return (
    <Card
      className="group cursor-pointer gap-0 overflow-hidden border-border/50 py-0 transition-all duration-200 hover:border-brand/30 hover:shadow-md"
      onClick={() => router.push(`/mahasiswa/courses/${course.id}`)}
    >
      <div className="relative aspect-[1.55/1] bg-muted">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url("${course.coverImage ?? ""}")` }}
        />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-card via-card/65 to-transparent" />
        <span className="absolute right-3 top-3 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black shadow-sm">
          Terdaftar
        </span>
      </div>
      <CardContent className="flex min-h-40 flex-col gap-3 p-5 pt-3">
        <h3 className="line-clamp-2 text-base font-bold leading-snug transition-colors group-hover:text-brand">
          {course.title}
        </h3>

        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {course.description || "Belum ada deskripsi"}
        </p>

        <div className="mt-auto flex items-center gap-4 pt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <GraduationCap className="size-3.5" />
            {course._count.instructors} Dosen
          </span>
          <span className="flex items-center gap-1">
            <CalendarDays className="size-3.5" />
            {course._count.sessions} Sesi
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function MahasiswaCoursesClient({ initialSearch }: { initialSearch: string }) {
  const [courses, setCourses] = useState<MahasiswaCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [gridColumns, setGridColumns] = useState(4);

  const fetchCourses = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);

    fetch(`/api/mahasiswa/courses?${params}`)
      .then((response) => response.json())
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

  const selectedGrid = GRID_OPTIONS.find((option) => option.value === gridColumns) ?? GRID_OPTIONS[1];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Courses</h1>
        <p className="text-muted-foreground">
          Semua mata kuliah yang sedang Anda ikuti
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="mahasiswa-courses-search"
            placeholder="Cari judul course..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") setSearch(searchInput);
            }}
            className="pl-9"
          />
          {searchInput && (
            <button
              type="button"
              aria-label="Bersihkan pencarian"
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="hidden h-10 shrink-0 bg-brand text-black shadow-sm hover:bg-brand/90 sm:inline-flex">
              <LayoutGrid data-icon="inline-start" />
              {selectedGrid.label}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {GRID_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => setGridColumns(option.value)}
                className={
                  gridColumns === option.value
                    ? "bg-brand text-black focus:bg-brand focus:text-black"
                    : ""
                }
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {loading ? (
        <div className={`grid gap-5 ${selectedGrid.class}`}>
          {Array.from({ length: gridColumns }).map((_, index) => (
            <Card key={index} className="gap-0 overflow-hidden border-border/50 py-0">
              <div className="relative aspect-[1.55/1]">
                <Skeleton className="size-full rounded-none" />
                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-card via-card/65 to-transparent" />
              </div>
              <CardContent className="flex min-h-40 flex-col gap-3 p-5 pt-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
                <div className="mt-auto flex gap-4 pt-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="mb-4 size-12 text-muted-foreground/50" strokeWidth={1.5} />
            <p className="font-medium text-muted-foreground">
              {search ? "Tidak ada course yang cocok" : "Belum ada course"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              {search
                ? "Coba gunakan kata kunci yang berbeda"
                : "Anda belum terdaftar ke course manapun."}
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
