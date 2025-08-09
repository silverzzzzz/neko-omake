# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a browser-based action game development project called "neko-omake". The project aims to create action games that run in web browsers and can be deployed to Cloudflare.

## Technology Stack

- **Language**: TypeScript must be used for all development
- **Platform**: Browser-based (client-side JavaScript)
- **Deployment**: Cloudflare-compatible format

## Project Structure

The project uses a folder-based organization where each game is contained in its own directory:
- `game1/` - First game project (currently empty)
- Additional games should follow the pattern `game2/`, `game3/`, etc.

## Development Setup

This project is in its initial stages. When setting up a new game project:

1. **Initialize TypeScript Project**:
   ```bash
   cd game1
   npm init -y
   npm install --save-dev typescript
   npx tsc --init
   ```

2. **Common Development Commands** (once set up):
   - Build: `npm run build`
   - Development server: `npm run dev`
   - Type checking: `npx tsc --noEmit`

## Architecture Guidelines

When developing games in this repository:

1. **Game Structure**: Each game should be self-contained within its folder
2. **Browser Compatibility**: Code must run in modern browsers without server-side dependencies
3. **Cloudflare Deployment**: Ensure the build output is static files compatible with Cloudflare Pages or Workers

## Important Considerations

- All code must be written in TypeScript
- Games should be playable action games suitable for browser environments
- Each game project should maintain its own dependencies and build configuration
- Focus on client-side performance and browser compatibility