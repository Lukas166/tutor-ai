import { auth } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";

export default async function proxy(request: NextRequest) {
    const session = await auth.api.getSession({
        headers: request.headers
    });

    const isAuthPage = request.nextUrl.pathname.startsWith("/login");
    const isDashboardPage = request.nextUrl.pathname.startsWith("/dashboard") || 
                           request.nextUrl.pathname.startsWith("/admin");

    if (!session && isDashboardPage) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    if (session && isAuthPage) {
        const role = (session.user as any).role;
        const redirectTo = role === "admin" ? "/admin" : "/dashboard";
        return NextResponse.redirect(new URL(redirectTo, request.url));
    }

    // Role-based protection for /admin
    if (session && request.nextUrl.pathname.startsWith("/admin") && (session.user as any).role !== "admin") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard/:path*", "/admin/:path*", "/login"],
};
