/** @type {import('next').NextConfig} */
const nextConfig = {
    async rewrites() {
        return [
            // Serve home.html at the root
            {
                source: '/',
                destination: '/home.html',
            },
            // Remove .html extension from all public pages
            // e.g., /offers → /offers.html, /about → /about.html
            {
                source: '/:page((?!api|_next|assets|styles|scripts|images|admin).*)',
                destination: '/:page.html',
            },
            // Remove .html extension from admin pages
            // e.g., /admin/orders → /admin/orders.html
            {
                source: '/admin/:page',
                destination: '/admin/:page.html',
            },
        ];
    },
};

export default nextConfig;
