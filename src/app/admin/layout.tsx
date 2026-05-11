"use client";

import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  LogOut,
  GraduationCap,
  Loader2,
} from "lucide-react";
import Link from "next/link";

const NAV_ITEMS = [
  { title: "Overview", href: "/admin", icon: LayoutDashboard },
  { title: "User Management", href: "/admin/users", icon: Users },
  { title: "Course Management", href: "/admin/courses", icon: BookOpen },
];

function AdminSidebar() {
  const { setOpenMobile, isMobile } = useSidebar();
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar variant="sidebar" collapsible="icon" className="border-r">
      <SidebarHeader className="flex h-16 shrink-0 flex-row items-center justify-between px-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
        <Link
          href="/admin"
          onClick={handleNavClick}
          className="flex min-w-0 items-center gap-3 group-data-[collapsible=icon]:hidden"
        >
          <div className="flex size-8 shrink-0 items-center justify-center">
            <img src="/black_unpad.png" alt="Logo" className="size-16 object-contain" />
          </div>
          <span className="truncate font-bold text-base">Admin Panel</span>
        </Link>

        {/* Trigger — satu-satunya, selalu visible */}
        <SidebarTrigger className="shrink-0" />
      </SidebarHeader>

      <SidebarContent>
        {/* Padding lega saat terbuka, padding normal (p-2) saat icon-only agar tidak kepotong */}
        <SidebarGroup className="px-4 py-6 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:py-2">
          <SidebarGroupLabel className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">
            Management Panel
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href)}
                    tooltip={item.title}
                    className={cn(
                      "transition-colors hover:bg-brand/10 hover:text-brand gap-4 px-4 h-11 rounded-lg",
                      isActive(item.href) && "bg-brand text-black hover:text-white data-[active=true]:bg-brand data-[active=true]:text-black shadow-sm"
                    )}
                  >
                    <Link href={item.href} onClick={handleNavClick} className="flex items-center gap-4">
                      <item.icon className="size-[18px] shrink-0" />
                      <span className={cn("text-sm font-medium", isActive(item.href) && "font-bold")}>
                        {item.title}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer dengan Profile */}
      <SidebarFooter className="p-4 group-data-[collapsible=icon]:p-2">
        <ProfileDropdown />
      </SidebarFooter>
    </Sidebar>
  );
}

function ProfileDropdown() {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  async function handleLogout() {
    await authClient.signOut({
      fetchOptions: { onSuccess: () => router.push("/login") },
    });
  }

  const name = session?.user?.name ?? "Admin";
  const email = session?.user?.email ?? "";
  const initials = name.charAt(0).toUpperCase();

  return (
    <div className="flex w-full items-center justify-between gap-3 p-2 group-data-[collapsible=icon]:justify-center">
      <div className="flex min-w-0 flex-1 items-center gap-3 group-data-[collapsible=icon]:hidden">
        <Avatar className="size-8 shrink-0">
          <AvatarFallback className="bg-brand text-black text-sm font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col min-w-0">
          <span className="truncate text-sm font-bold leading-none">{name}</span>
          <span className="truncate text-xs text-muted-foreground mt-0.5">{email}</span>
        </div>
      </div>
      
      {/* Avatar for collapsed state */}
      <Avatar className="hidden size-8 shrink-0 group-data-[collapsible=icon]:flex">
        <AvatarFallback className="bg-brand text-black text-sm font-bold">
          {initials}
        </AvatarFallback>
      </Avatar>

      <Button
        variant="ghost"
        size="icon"
        onClick={handleLogout}
        className="shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-data-[collapsible=icon]:hidden"
        title="Logout"
      >
        <LogOut className="size-4" />
      </Button>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="flex h-svh items-center justify-center">
        <Loader2 className="size-8 animate-spin text-brand" />
      </div>
    );
  }

  if (!session || (session.user as { role?: string }).role !== "admin") {
    return null;
  }

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        {/* Header atas hanya untuk mobile (menampilkan SidebarTrigger) */}
        <header className="flex h-14 shrink-0 items-center border-b px-6 md:hidden">
          <SidebarTrigger className="-ml-2" />
        </header>

        {/* Konten halaman */}
        <main className="flex-1 px-6 md:px-10 pb-10 pt-6 md:pt-10">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
