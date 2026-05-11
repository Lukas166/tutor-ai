'use client';

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut, User as UserIcon } from "lucide-react";

export default function DashboardPage() {
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

    if (!session) {
        return null; // Will be handled by middleware
    }

    return (
        <main className="min-h-svh bg-muted/20 p-6 lg:p-10">
            <div className="mx-auto max-w-4xl space-y-8">
                <header className="flex items-center justify-between border-b border-border pb-6">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
                        <p className="text-sm text-muted-foreground">
                            Welcome back, <span className="font-semibold text-foreground">{session.user.name}</span>
                        </p>
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

                <section className="grid gap-6 sm:grid-cols-2">
                    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="flex size-10 items-center justify-center rounded-full bg-brand/10 text-brand">
                                <UserIcon className="size-5" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Role</p>
                                <p className="text-lg font-bold uppercase tracking-wider">{(session.user as any).role}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Email</p>
                            <p className="text-lg font-bold">{session.user.email}</p>
                        </div>
                    </div>
                </section>

                <div className="rounded-2xl border border-dashed border-border p-12 text-center">
                    <p className="text-muted-foreground">UI Dummy - Content for {(session.user as any).role} will appear here.</p>
                </div>
            </div>
        </main>
    );
}
