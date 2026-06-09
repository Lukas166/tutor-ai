"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookUser,
  Building2,
  Edit3,
  GraduationCap,
  IdCard,
  Save,
  X,
} from "lucide-react";
import { toast } from "sonner";

type MahasiswaProfile = {
  name?: string | null;
  email?: string | null;
  emailVerified?: boolean | null;
  role?: string | null;
  academicLevel?: string | null;
  npm?: string | null;
  major?: string | null;
  faculty?: string | null;
  bio?: string | null;
  createdAt?: string | Date | null;
};

function displayValue(value?: string | null) {
  return value?.trim() ? value : "-";
}

function formatDate(value?: string | Date | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-background p-3">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <div className="mt-1 break-words text-sm font-semibold text-foreground">
          {value}
        </div>
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Skeleton className="h-9 w-36" />
        <Skeleton className="mt-2 h-5 w-72" />
      </div>
      <Card className="border-border/50">
        <CardContent className="flex items-center gap-4 p-6">
          <Skeleton className="size-16 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function MahasiswaProfilePage() {
  const { data: session, isPending } = authClient.useSession();
  const [bio, setBio] = useState("");
  const [draftBio, setDraftBio] = useState("");
  const [editingBio, setEditingBio] = useState(false);
  const [savingBio, setSavingBio] = useState(false);

  useEffect(() => {
    const sessionBio = (session?.user as MahasiswaProfile | undefined)?.bio ?? "";
    setBio(sessionBio);
    setDraftBio(sessionBio);
  }, [session]);

  async function handleSaveBio() {
    setSavingBio(true);
    try {
      const response = await fetch("/api/mahasiswa/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio: draftBio.trim() || null }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Gagal memperbarui bio");
      }

      setBio(data.bio ?? "");
      setDraftBio(data.bio ?? "");
      setEditingBio(false);
      toast.success("Bio berhasil diperbarui");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui bio");
    } finally {
      setSavingBio(false);
    }
  }

  if (isPending) {
    return <ProfileSkeleton />;
  }

  if (!session) {
    return null;
  }

  const user = session.user as MahasiswaProfile;
  const name = displayValue(user.name);
  const initials = name === "-" ? "M" : name.charAt(0).toUpperCase();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">
          Informasi akun mahasiswa yang tersimpan di sistem.
        </p>
      </div>

      <Card className="overflow-hidden border-border/50 py-0">
        <CardContent className="p-0">
          <div className="flex flex-col gap-5 bg-card p-6 sm:flex-row sm:items-center">
            <Avatar className="size-16">
              <AvatarFallback className="bg-brand text-xl font-bold text-black">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-2xl font-bold tracking-tight">{name}</h2>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {displayValue(user.email)}
              </p>
            </div>
            <div className="sm:min-w-48">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Bergabung Sejak
              </p>
              <p className="mt-1 text-sm font-semibold">{formatDate(user.createdAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Data Akademik</CardTitle>
          <CardDescription>Informasi akademik mahasiswa.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <InfoRow icon={IdCard} label="NPM" value={displayValue(user.npm)} />
          <InfoRow
            icon={GraduationCap}
            label="Jenjang"
            value={displayValue(user.academicLevel)}
          />
          <InfoRow icon={BookUser} label="Program Studi" value={displayValue(user.major)} />
          <InfoRow icon={Building2} label="Fakultas" value={displayValue(user.faculty)} />
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="sm:flex sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Bio</CardTitle>
            <CardDescription>Catatan singkat tentang profil mahasiswa.</CardDescription>
          </div>
          {!editingBio && (
            <Button variant="outline" onClick={() => setEditingBio(true)}>
              <Edit3 data-icon="inline-start" />
              Edit
            </Button>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {editingBio ? (
            <>
              <textarea
                value={draftBio}
                onChange={(event) => setDraftBio(event.target.value)}
                disabled={savingBio}
                rows={5}
                maxLength={500}
                placeholder="Tulis bio singkat Anda..."
                className="min-h-32 w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm leading-relaxed shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs text-muted-foreground">
                  {draftBio.length}/500 karakter
                </span>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    disabled={savingBio}
                    onClick={() => {
                      setDraftBio(bio);
                      setEditingBio(false);
                    }}
                  >
                    <X data-icon="inline-start" />
                    Batal
                  </Button>
                  <Button
                    className="bg-brand text-black hover:bg-brand/90"
                    disabled={savingBio}
                    onClick={handleSaveBio}
                  >
                    <Save data-icon="inline-start" />
                    {savingBio ? "Menyimpan..." : "Simpan"}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <p className="min-h-16 whitespace-pre-wrap rounded-lg border border-border/60 bg-background p-4 text-sm leading-relaxed text-muted-foreground">
              {bio.trim() ? bio : "Belum ada bio."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
