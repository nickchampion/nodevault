#!/bin/sh
# Build the Next.js app for Cloudflare Workers and preview it locally with wrangler.
cd apps/nodevault || exit 1

npx opennextjs-cloudflare build || exit 1
npx opennextjs-cloudflare preview
