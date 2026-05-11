"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, BookOpen, UserCheck, ShieldCheck, GraduationCap, ClipboardList } from "lucide-react";

interface Stats {
  total: number;
  admin: number;
  dosen: number;
  mahasiswa: number;
  totalCourses: number;
  activeCourses: number;
  totalEnrollments: number;
}

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

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { title: "Users", value: stats?.total, icon: Users, color: "text-brand" },
    { title: "Admin", value: stats?.admin, icon: ShieldCheck, color: "text-red-500" },
    { title: "Dosen", value: stats?.dosen, icon: UserCheck, color: "text-blue-500" },
    { title: "Mahasiswa", value: stats?.mahasiswa, icon: GraduationCap, color: "text-emerald-500" },
    { title: "Courses", value: stats?.totalCourses, icon: BookOpen, color: "text-violet-500" },
    { title: "Active Courses", value: stats?.activeCourses, icon: BookOpen, color: "text-amber-500" },
    { title: "Enrollments", value: stats?.totalEnrollments, icon: ClipboardList, color: "text-pink-500" },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground">Monitor aktivitas dan statistik sistem Tutor AI</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>
    </div>
  );
}
