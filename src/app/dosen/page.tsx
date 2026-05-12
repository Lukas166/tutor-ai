"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  GraduationCap,
  CalendarDays,
  Search,
  ArrowRight,
  X,
  Users,
  Clock,
} from "lucide-react";

interface DosenCourse {
  id: string;
  title: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  creator: { id: string; name: string };
  _count: { enrollments: number; sessions: number };
}

interface DosenStats {
  totalCourses: number;
  totalStudents: number;
  totalSessions: number;
}

const PREVIEW_LIMIT = 4;

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: number | undefined;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card className="overflow-hidden border-border/50">
      <CardContent className="p-6">
        <div className="flex items-center gap-6 ml-1">
          <Icon className={`size-12 ${color}`} strokeWidth={1.5} />
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {value !== undefined ? (
              <p className="text-3xl font-bold tracking-tight">{value}</p>
            ) : (
              <Skeleton className="h-9 w-20" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

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
                  ? "bg-emerald-500/10 text-emerald-600"
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

function SearchDropdown({
  results,
  visible,
  onSelect,
}: {
  results: DosenCourse[];
  visible: boolean;
  onSelect: (id: string) => void;
}) {
  if (!visible || results.length === 0) return null;

  return (
    <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border bg-card shadow-lg animate-in fade-in slide-in-from-top-2 duration-150">
      {results.map((course) => (
        <button
          key={course.id}
          onClick={() => onSelect(course.id)}
          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 first:rounded-t-xl last:rounded-b-xl"
        >
          <BookOpen className="size-4 shrink-0 text-brand" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{course.title}</p>
            {course.description && (
              <p className="truncate text-xs text-muted-foreground">
                {course.description}
              </p>
            )}
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {course._count.enrollments} siswa
          </span>
        </button>
      ))}
    </div>
  );
}

export default function DosenDashboardPage() {
  const { data: session } = authClient.useSession();
  const router = useRouter();

  const [courses, setCourses] = useState<DosenCourse[]>([]);
  const [stats, setStats] = useState<DosenStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DosenCourse[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const fetchCourses = useCallback(() => {
    setLoading(true);
    fetch("/api/dosen/courses")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCourses(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fetchStats = useCallback(() => {
    fetch("/api/dosen/stats")
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data.totalCourses === "number") setStats(data);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetchCourses();
    fetchStats();
  }, [fetchCourses, fetchStats]);

  // Live search filtering
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    const query = searchQuery.toLowerCase();
    const filtered = courses.filter(
      (c) =>
        c.title.toLowerCase().includes(query) ||
        c.description?.toLowerCase().includes(query)
    );
    setSearchResults(filtered);
    setShowDropdown(true);
  }, [searchQuery, courses]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelectCourse(courseId: string) {
    setShowDropdown(false);
    setSearchQuery("");
    router.push(`/dosen/courses/${courseId}`);
  }

  const previewCourses = courses.slice(0, PREVIEW_LIMIT);
  const hasMoreCourses = courses.length > PREVIEW_LIMIT;
  const dosenName = session?.user?.name ?? "Dosen";

  const statCards = [
    { title: "Total Course", value: stats?.totalCourses, icon: BookOpen, color: "text-brand" },
    { title: "Total Mahasiswa", value: stats?.totalStudents, icon: Users, color: "text-blue-500" },
    { title: "Total Sesi", value: stats?.totalSessions, icon: CalendarDays, color: "text-emerald-500" },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Selamat datang, <span className="font-semibold text-foreground">{dosenName}</span>
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      {/* Search Bar */}
      <div ref={searchRef} className="relative">
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="dosen-search-course"
          placeholder="Cari course Anda..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => searchQuery.trim() && setShowDropdown(true)}
          className="pl-10 h-11"
        />
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery("");
              setShowDropdown(false);
            }}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        )}
        <SearchDropdown
          results={searchResults}
          visible={showDropdown}
          onSelect={handleSelectCourse}
        />
      </div>

      {/* Course Cards */}
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Course Saya</h2>
          {hasMoreCourses && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dosen/courses")}
              className="gap-1.5 text-brand hover:text-brand/80 hover:bg-brand/5"
            >
              Lihat Semua
              <ArrowRight className="size-4" />
            </Button>
          )}
        </div>

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: PREVIEW_LIMIT }).map((_, i) => (
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
        ) : previewCourses.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <BookOpen className="size-12 text-muted-foreground/50 mb-4" strokeWidth={1.5} />
              <p className="text-muted-foreground font-medium">Belum ada course</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Anda belum ditugaskan ke course manapun oleh admin.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {previewCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="flex flex-col gap-5">
        <h2 className="text-xl font-bold tracking-tight">Aktivitas Terbaru</h2>
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted/80 mb-4">
              <Clock className="size-6 text-muted-foreground/60" />
            </div>
            <p className="text-muted-foreground font-medium">Belum ada aktivitas</p>
            <p className="text-sm text-muted-foreground/70 mt-1 max-w-sm">
              Aktivitas terbaru seperti mahasiswa baru terdaftar, materi diupload, dan sesi dibuat akan muncul di sini.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
