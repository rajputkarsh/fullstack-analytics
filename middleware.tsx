import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/forgot-password(.*)',
    '/'
])

const isAdminRoute = createRouteMatcher([
    '/admin(.*)'
])

export default clerkMiddleware(async (auth, req) => {
    // Allow public routes
    if (isPublicRoute(req)) {
        return NextResponse.next()
    }

    // Protect all other routes
    const { userId, sessionClaims } = await auth.protect()

    // Check admin routes
    if (isAdminRoute(req)) {
        const publicMetadata = sessionClaims?.publicMetadata as { role?: string } | undefined;
        const privateMetadata = sessionClaims?.privateMetadata as { role?: string } | undefined;
        const role = publicMetadata?.role || privateMetadata?.role || 'user';
        
        if (role !== 'admin') {
            // Redirect non-admin users to dashboard
            const dashboardUrl = new URL('/dashboard', req.url)
            return NextResponse.redirect(dashboardUrl)
        }
    }

    return NextResponse.next()
})

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
}