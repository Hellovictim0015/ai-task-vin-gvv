import { NextResponse } from 'next/server';
import { jwtDecode }    from 'jwt-decode';

// ─── Token expire check helper ────────────────────────────────────────────────
function isTokenExpired(token) {
    try {
        const decoded = jwtDecode(token);
        if (!decoded.exp) return false;
        // exp seconds mein hota hai — Date.now() milliseconds mein
        return decoded.exp * 1000 < Date.now();
    } catch (err) {
        // Token decode nahi hua — invalid hai
        return true;
    }
}

// ─── Role wise dashboard URL ──────────────────────────────────────────────────
function getDashboardUrl(role) {
    switch (role) {
        case 'super_admin':     return '/super_admin';
        case 'admin':           return '/admin';
        case 'project_head':    return '/project_head';
        case 'department_head': return '/department_head';
        case 'team_member':     return '/TEAM_MEMBER';
        default:                return '/login';
    }
}

// ─── Main Middleware ──────────────────────────────────────────────────────────
export function middleware(request) {
    const token = request.cookies.get('access_token')?.value;
    const role  = request.cookies.get('user_role')?.value;
    const { pathname } = request.nextUrl;

    // ══════════════════════════════════════════════════════════
    // SCENARIO 1 — Token nahi hai → Login par bhejo
    // ══════════════════════════════════════════════════════════
    if (!token) {
        if (pathname.startsWith('/login')) return NextResponse.next();
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // ══════════════════════════════════════════════════════════
    // SCENARIO 2 — Token expire ho gaya → Cookies clear karo + Login
    // ══════════════════════════════════════════════════════════
    if (isTokenExpired(token)) {
        // Login page par already hai to sirf cookies clear karo
        if (pathname.startsWith('/login')) {
            const response = NextResponse.next();
            response.cookies.delete('access_token');
            response.cookies.delete('user_role');
            response.cookies.delete('user_data');
            return response;
        }

        // Kisi aur page par hai to login par redirect karo
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('reason', 'session_expired'); // ← reason bhi bhejo
        const response = NextResponse.redirect(loginUrl);

        // Cookies clear karo
        response.cookies.delete('access_token');
        response.cookies.delete('user_role');
        response.cookies.delete('user_data');
        return response;
    }

    // ══════════════════════════════════════════════════════════
    // SCENARIO 3 — Token valid hai + Login/Root page par hai
    //              → Apne dashboard par bhejo
    // ══════════════════════════════════════════════════════════
    if (pathname.startsWith('/login') || pathname === '/') {
        const dashUrl = getDashboardUrl(role);
        return NextResponse.redirect(new URL(dashUrl, request.url));
    }

    // ══════════════════════════════════════════════════════════
    // SCENARIO 4 — Role-based Route Protection
    // ══════════════════════════════════════════════════════════

    // Super Admin routes
    if (pathname.startsWith('/super_admin') && role !== 'super_admin') {
        return NextResponse.redirect(new URL(getDashboardUrl(role), request.url));
    }

    // Admin routes
    if (pathname.startsWith('/admin') && !['super_admin','admin'].includes(role)) {
        return NextResponse.redirect(new URL(getDashboardUrl(role), request.url));
    }

    // Project Head routes
    if (pathname.startsWith('/project_head') && !['super_admin','admin','project_head'].includes(role)) {
        return NextResponse.redirect(new URL(getDashboardUrl(role), request.url));
    }

    // Department Head routes
    if (pathname.startsWith('/department_head') && !['super_admin','admin','department_head'].includes(role)) {
        return NextResponse.redirect(new URL(getDashboardUrl(role), request.url));
    }

    // Team Member routes
    if (pathname.startsWith('/TEAM_MEMBER') && role !== 'team_member' && role !== 'super_admin') {
        return NextResponse.redirect(new URL(getDashboardUrl(role), request.url));
    }

    // ✅ Sab theek hai — aage jane do
    return NextResponse.next();
}

// ─── Matcher ─────────────────────────────────────────────────────────────────
export const config = {
    matcher: [
        '/',
        '/login',
        '/super_admin/:path*',
        '/admin/:path*',
        '/project_head/:path*',
        '/department_head/:path*',
        '/TEAM_MEMBER/:path*',
        '/dashboard/:path*',
    ],
};