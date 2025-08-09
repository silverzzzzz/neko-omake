# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

日本語で返答して。

## Project Overview

This is a browser-based action game development project called "neko-omake". The project aims to create action games that run in web browsers and are optimized for deployment to Cloudflare Pages edge environment.

## Technology Stack

- **Language**: TypeScript must be used for all development
- **Build Tool**: Vite (fast build and development server)
- **Platform**: Browser-based (client-side JavaScript)
- **Deployment**: Cloudflare Pages (edge environment)
- **Minifier**: Terser for production builds

## Project Structure

```
neko-omake/
├── src/              # TypeScript source code
│   └── main.ts       # Game entry point
├── public/           # Static assets
│   └── _redirects    # Cloudflare Pages routing
├── dist/             # Build output (gitignored)
├── index.html        # HTML template
├── vite.config.ts    # Vite configuration
├── tsconfig.json     # TypeScript configuration
└── package.json      # Dependencies and scripts
```

## Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production (Cloudflare Pages)
npm run build

# Preview production build
npm run preview
```

## Cloudflare Pages Deployment

### Automatic Deployment (GitHub Integration)
- Connect repository to Cloudflare Pages
- Build command: `npm run build`
- Build output directory: `dist`
- Node.js version: 18+

### Manual Deployment
```bash
npm run build
npx wrangler pages deploy dist
```

## Architecture Guidelines

When developing games in this repository:

1. **Static Build**: All code compiles to static HTML/JS/CSS files
2. **Edge Optimization**: Minimize bundle size, use code splitting when needed
3. **No Server Dependencies**: Everything runs client-side
4. **Browser Compatibility**: Target modern browsers with ES2020
5. **Performance**: Use Vite's optimization features (minification, tree-shaking)

## Important Considerations

- All code must be written in TypeScript
- Build output must be static files compatible with Cloudflare Pages edge environment
- Use `public/_redirects` for SPA routing configuration
- Vite config is optimized for Cloudflare Pages deployment:
  - Terser minification enabled
  - Source maps disabled for production
  - Assets directory configured
- Focus on client-side performance and minimal bundle size
- Games should work offline after initial load (static assets)