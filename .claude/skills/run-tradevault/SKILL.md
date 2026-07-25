---
name: run-tradevault
description: Build, launch, and drive the Tradevault AI trading journal application. Provides a driver script for programmatic interaction with the application.
license: MIT
metadata:
  author: CodeAct Agent
  version: "1.0.0"
---

# Tradevault Run Skill

This skill provides the ability to build, launch, and interact with the Tradevault AI trading journal application. The application consists of an Express backend server and a React/Vite frontend that communicates with Supabase for data storage.

## Overview

Tradevault is a trading journal application featuring:
- Trade tracking and portfolio management
- Performance analytics and reporting
- Secure authentication and data storage
- Responsive UI built with React and Tailwind CSS

## Prerequisites

- Node.js v20+ (tested with v24.16.0)
- npm v10+ (tested with 11.13.0)
- No additional system packages required on Linux environments

The application requires the following environment variables (provided in `.env`):
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key
- `RESEND_API_KEY`: Resend API key for email functionality

## Build

```bash
# Ensure dependencies are installed
cd Tradevault && npm ci

# Build the application for production
# Compiles TypeScript, bundles React frontend with Vite, and bundles Express server with esbuild
npm run build
```

Build output is placed in the `dist/` directory.

## Run (Agent Path)

The recommended way for agents to interact with the application is through the provided driver script:

```bash
# Make the driver executable (if needed)
chmod +x Tradevault/.claude/skills/run-tradevault/driver.mjs

# Build and start the application
node Tradevault/.claude/skills/run-tradevault/driver.mjs start

# In another terminal or background process, use the driver to interact:
node Tradevault/.claude/skills/run-tradevault/driver.mjs status
node Tradevault/.claude/skills/run-tradevault/driver.mjs request GET /api/health
```

The driver script provides these commands:
- `start`: Builds (if needed) and starts the application server
- `stop`: Stops the running application
- `restart`: Restarts the application
- `status`: Shows application status
- `request <method> <endpoint> [data]`: Makes HTTP requests to the API
- `health`: Checks application health

## Run (Human Path)

For manual interaction with the full application:

```bash
# Build and start
cd Tradevault
npm ci
npm run build
npm start
```

Then open your browser to:
- **Application UI**: http://localhost:3000
- **API Health Check**: http://localhost:3000/api/health

To stop the application, press `Ctrl+C` in the terminal.

## Gotchas

1. **Initial Build Time**: First-time builds may take 20-30 seconds as dependencies are downloaded and compiled.

2. **Database State**: The application uses a real Supabase instance. While the API will be available, some database-dependent features may show limited functionality in this environment.

3. **Port Conflicts**: The application runs on port 3000. If this port is unavailable, set the `PORT` environment variable.

4. **Environment Variables**: The `.env` file contains working credentials for testing. In production, these should be set via your hosting platform's environment variable system.

## Troubleshooting

**Issue: "Command failed: npm start"**
- Ensure Node.js v20+ is installed
- Try deleting `node_modules` and running `npm ci` again
- Check that the build output exists in `dist/`

**Issue: Application starts but API returns errors**
- Verify the application built successfully (look for "✓ built in" message)
- Check that the `.env` file contains valid credentials
- Look at the application logs for specific error messages

**Issue: Port already in use**
- Change the port by setting `PORT` environment variable: `PORT=3001 npm start`
- Or free up port 3000 by stopping the conflicting process

**Issue: Blank page in browser**
- This usually indicates the frontend assets aren't being served
- Verify the build completed successfully
- Check that the server is serving static files from the `dist/` directory
- Try accessing http://localhost:3000 directly to see if you get the HTML response

## Notes

- The driver script (`driver.mjs`) is located at `Tradevault/.claude/skills/run-tradevault/driver.mjs`
- All paths in this document are relative to the repository root
- The application logs will be visible in the terminal where it's started
- For production deployments, consider using a process manager like PM2 or Docker
- The built application in `dist/` can be deployed to any Node.js hosting service
