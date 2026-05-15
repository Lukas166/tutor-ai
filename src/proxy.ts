import { auth } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";

const ROLE_REDIRECT_MAP: Record<string, string> = {
    admin: "/admin",
    dosen: "/dosen",
};

export default async function proxy(request: NextRequest) {
    const session = await auth.api.getSession({
        headers: request.headers
    });

    const { pathname } = request.nextUrl;
    const isAuthPage = pathname.startsWith("/login");
    const isProtectedPage = pathname.startsWith("/dashboard") ||
        pathname.startsWith("/admin") ||
        pathname.startsWith("/dosen");

    // Unauthenticated users cannot access protected pages
    if (!session && isProtectedPage) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    // Authenticated users on login page → redirect by role
    if (session && isAuthPage) {
        const role = (session.user as any).role;
        const redirectTo = ROLE_REDIRECT_MAP[role] ?? "/dashboard";
        return NextResponse.redirect(new URL(redirectTo, request.url));
    }

    // Role-based protection for /admin
    if (session && pathname.startsWith("/admin") && (session.user as any).role !== "admin") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Role-based protection for /dosen
    if (session && pathname.startsWith("/dosen") && (session.user as any).role !== "dosen") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard/:path*", "/admin/:path*", "/dosen/:path*", "/login"],
};
