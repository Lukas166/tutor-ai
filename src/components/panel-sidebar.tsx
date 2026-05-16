"use client";

import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { ElementType, useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface NavItem {
  title: string;
  href: string;
  icon: ElementType;
  exact?: boolean;
}

interface PanelSidebarProps {
  title: string;
  href: string;
  label: string;
  navItems: NavItem[];
  defaultRoleName: string;
}

export function PanelSidebar({ title, href, label, navItems, defaultRoleName }: PanelSidebarProps) {
  const { setOpenMobile, isMobile } = useSidebar();
  const pathname = usePathname();

  const isActive = (itemHref: string, exact?: boolean) => {
    if (exact || itemHref === href || itemHref === `${href}/courses`) return pathname === itemHref;
    return pathname.startsWith(itemHref);
  };

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar variant="sidebar" collapsible="icon" className="border-r">
      <SidebarHeader className="flex h-16 shrink-0 flex-row items-center justify-between px-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
        <Link
          href={href}
          onClick={handleNavClick}
          className="flex min-w-0 items-center gap-3 group-data-[collapsible=icon]:hidden"
        >
          <div className="flex size-8 shrink-0 items-center justify-center">
            <img src="/black_unpad.png" alt="Logo" className="size-16 object-contain" />
          </div>
          <span className="truncate font-bold text-base">{title}</span>
        </Link>
        <SidebarTrigger className="shrink-0 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:mt-3" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="px-4 py-6 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:py-2">
          <SidebarGroupLabel className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">
            {label}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href, item.exact)}
                    tooltip={item.title}
                    className={cn(
                      "transition-colors hover:bg-brand/10 hover:text-brand gap-4 px-4 h-11 rounded-lg flex items-center group-data-[collapsible=icon]:justify-center",
                      isActive(item.href, item.exact) && "bg-brand text-black hover:text-white data-[active=true]:bg-brand data-[active=true]:text-black shadow-sm"
                    )}
                  >
                    <Link href={item.href} onClick={handleNavClick} className="flex flex-1 items-center gap-4 group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:justify-center">
                      <item.icon className="size-5 shrink-0" />
                      <span className={cn("text-sm font-medium group-data-[collapsible=icon]:hidden", isActive(item.href, item.exact) && "font-bold")}>
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

      <SidebarFooter className="p-4 group-data-[collapsible=icon]:p-2">
        <ProfileDropdown defaultRoleName={defaultRoleName} />
      </SidebarFooter>
    </Sidebar>
  );
}

function ProfileDropdown({ defaultRoleName }: { defaultRoleName: string }) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await authClient.signOut({
        fetchOptions: { onSuccess: () => router.push("/login") },
      });
    } finally {
      setLoggingOut(false);
      setLogoutOpen(false);
    }
  }

  const name = session?.user?.name ?? defaultRoleName;
  const email = session?.user?.email ?? "";
  const initials = name.charAt(0).toUpperCase();

  return (
    <TooltipProvider>
      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <div className="flex w-full items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setLogoutOpen(true)}
                className="hidden rounded-full outline-none transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background group-data-[collapsible=icon]:block"
              >
                <Avatar className="size-8 shrink-0">
                  <AvatarFallback className="flex items-center justify-center bg-brand text-sm font-bold text-black">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Logout</TooltipContent>
          </Tooltip>

          <div className="group-data-[collapsible=icon]:hidden">
            <Avatar className="size-8 shrink-0">
              <AvatarFallback className="flex items-center justify-center bg-brand text-sm font-bold text-black">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-center group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-semibold leading-tight">{name}</span>
            <span className="truncate text-xs text-muted-foreground">{email}</span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLogoutOpen(true)}
            className="shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-data-[collapsible=icon]:hidden"
            title="Logout"
          >
            <LogOut className="size-4" />
          </Button>
        </div>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <LogOut className="size-5" />
            </AlertDialogMedia>
            <AlertDialogTitle>Logout dari akun?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan keluar dari sesi saat ini dan diarahkan ke halaman login.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loggingOut}>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(event) => {
                event.preventDefault();
                void handleLogout();
              }}
              disabled={loggingOut}
            >
              {loggingOut ? "Keluar..." : "Logout"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
