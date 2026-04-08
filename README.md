# Gliforge API

Backend API for Gliforge, an open-core SaaS platform for creating, managing, versioning, and publishing custom icon libraries as npm packages.

## Prerequisites

- Node.js 20+
- PostgreSQL
- Redis

## Setup

1. Copy `.env.example` to `.env` and fill in the required values.
2. Install dependencies with `npm install`.
3. Create the PostgreSQL database named `gliforge` or update `DATABASE_URL`.
4. Generate migrations with `npm run db:generate`.
5. Apply migrations with `npm run db:migrate`.
6. Start the API with `npm run dev`.
7. Start the worker in another terminal with `npm run worker:dev`.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Starts the API in watch mode with `tsx`. |
| `npm run build` | Compiles TypeScript into `dist/`. |
| `npm run start` | Runs the compiled server from `dist/server.js`. |
| `npm run db:generate` | Generates Drizzle migration files from the schema. |
| `npm run db:migrate` | Runs pending Drizzle migrations. |
| `npm run db:studio` | Opens Drizzle Studio. |
| `npm run lint` | Lints the `src/` directory with ESLint. |
| `npm run format` | Formats the `src/` directory with Prettier. |
| `npm run test` | Runs Vitest. |
| `npm run worker:dev` | Starts the BullMQ worker in watch mode. |

## API Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Health check for API, database, and Redis. |
| `POST` | `/api/v1/auth/register` | Register a new user and return JWT tokens. |
| `POST` | `/api/v1/auth/login` | Authenticate a user and return JWT tokens. |
| `POST` | `/api/v1/auth/refresh` | Rotate a refresh token and return a new token pair. |
| `POST` | `/api/v1/auth/logout` | Revoke one or all refresh tokens for the authenticated user. |
| `GET` | `/api/v1/auth/me` | Return the authenticated user profile. |
| `GET` | `/api/v1/projects` | List the authenticated user's projects. |
| `POST` | `/api/v1/projects` | Create a project. |
| `GET` | `/api/v1/projects/:projectId` | Fetch a single project with icon and version metadata. |
| `PATCH` | `/api/v1/projects/:projectId` | Update project metadata and status. |
| `DELETE` | `/api/v1/projects/:projectId` | Delete a project if it has no published versions. |
| `GET` | `/api/v1/projects/:projectId/icons` | List project icons with pagination and filters. |
| `POST` | `/api/v1/projects/:projectId/icons/upload` | Upload one or more SVG icons. |
| `PATCH` | `/api/v1/projects/:projectId/icons/:iconId` | Rename an icon. |
| `DELETE` | `/api/v1/projects/:projectId/icons/:iconId` | Delete a single icon. |
| `DELETE` | `/api/v1/projects/:projectId/icons` | Bulk delete up to 100 icons. |
| `GET` | `/api/v1/projects/:projectId/versions` | List project versions. |
| `POST` | `/api/v1/projects/:projectId/versions` | Create a new version and enqueue a build job. |
| `GET` | `/api/v1/projects/:projectId/versions/:versionId` | Fetch a version with its full build log. |

## Architecture Overview

The API is organized by feature modules on top of Fastify, with Zod schemas handling request and response validation, Drizzle ORM managing PostgreSQL persistence, BullMQ handling asynchronous icon optimization and build/publish workflows, and a storage abstraction isolating local filesystem access so it can later be swapped for object storage like Cloudflare R2. The API server and worker run as separate entry points but share the same env, database, schema, and queue configuration.
