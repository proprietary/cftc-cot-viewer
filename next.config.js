/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    trailingSlash: true,
    skipTrailingSlashRedirect: true,
    env: {
        customKey: 'FRED_API_KEY',
    },
}

module.exports = nextConfig
