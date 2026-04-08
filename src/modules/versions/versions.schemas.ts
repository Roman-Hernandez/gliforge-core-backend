import { z } from "zod";

export const projectParamsSchema = z.object({
  projectId: z.string().uuid(),
});

export const versionParamsSchema = projectParamsSchema.extend({
  versionId: z.string().uuid(),
});

export const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[\da-z-]+(?:\.[\da-z-]+)*)?(?:\+[\da-z-]+(?:\.[\da-z-]+)*)?$/i;

export const createVersionBodySchema = z.object({
  version: z.string().regex(semverRegex, "Invalid semver version"),
  type: z.enum(["major", "minor", "patch"]),
  changelog: z.string().max(5000).optional(),
});

export const versionSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  version: z.string(),
  type: z.enum(["major", "minor", "patch"]),
  changelog: z.string().nullable(),
  iconCount: z.number().int().nonnegative(),
  status: z.enum(["pending", "building", "published", "failed"]),
  npmUrl: z.string().nullable(),
  buildLog: z.string().nullable(),
  publishedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type CreateVersionBody = z.infer<typeof createVersionBodySchema>;
