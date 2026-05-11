'use client';

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut, ShieldCheck } from "lucide-react";

export default function AdminPage() {
    const { data: session, isPending } = authClient.useSession();
    const router = useRouter();

    async function handleLogout() {
        await authClient.signOut({
            fetchOptions: {
                onSuccess: () => {
                    router.push("/login");
                },
            },
        });
    }

    if (isPending) {
        return (
            <div className="flex h-svh items-center justify-center">
                <Loader2 className="size-8 animate-spin text-brand" />
            </div>
        );
    }

    if (!session || (session.user as any).role !== "admin") {
        return null; // Will be handled by middleware
    }

    return (
        <main className="min-h-svh bg-muted/20 p-6 lg:p-10">
            <div className="mx-auto max-w-5xl space-y-8">
                <header className="flex items-center justify-between border-b border-border pb-6">
                    <div className="flex items-center gap-4">
                        <div className="flex size-12 items-center justify-center rounded-xl bg-brand text-white shadow-lg shadow-brand/20">
                            <ShieldCheck className="size-6" />
                        </div>
                        <div className="space-y-1">
                            <h1 className="text-2xl font-bold tracking-tight">Admin Portal</h1>
                            <p className="text-sm text-muted-foreground">
                                Authorized access for <span className="font-semibold text-foreground">{session.user.name}</span>
                            </p>
                        </div>
                    </div>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleLogout}
                        className="gap-2 text-destructive hover:bg-destructive/5 hover:text-destructive transition-colors"
                    >
                        <LogOut className="size-4" />
                        Logout
                    </Button>
                </header>

                <div className="grid gap-6">
                    <div className="rounded-xl border border-brand/20 bg-brand/5 p-6">
                        <h2 className="text-lg font-semibold text-brand mb-2">System Status</h2>
                        <p className="text-sm text-muted-foreground">Admin-only area. Manage users, courses, and system configurations here.</p>
                    </div>

                    <div className="rounded-2xl border border-dashed border-border p-20 text-center bg-card">
                        <p className="text-muted-foreground">UI Dummy - Admin management tools will appear here.</p>
                    </div>
                </div>
            </div>
        </main>
    );
}
