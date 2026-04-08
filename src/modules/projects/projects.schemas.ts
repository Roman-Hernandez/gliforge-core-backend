import { z } from "zod";

const frameworkSchema = z.enum(["react", "vue", "svelte"]);
const statusSchema = z.enum(["active", "archived"]);

export const packageNameRegex = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

export const projectParamsSchema = z.object({
  projectId: z.string().uuid(),
});

export const createProjectBodySchema = z.object({
  name: z.string().min(2).max(50),
  packageName: z.string().regex(packageNameRegex, "Invalid npm package name"),
  description: z.string().max(500).optional(),
  frameworks: z.array(frameworkSchema).min(1),
});

export const updateProjectBodySchema = z
  .object({
    name: z.string().min(2).max(50).optional(),
    description: z.string().max(500).nullable().optional(),
    frameworks: z.array(frameworkSchema).min(1).optional(),
    status: statusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

export const latestVersionInfoSchema = z
  .object({
    id: z.string().uuid(),
    version: z.string(),
    status: z.enum(["pending", "building", "published", "failed"]),
    publishedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
  })
  .nullable();

export const projectSummarySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  packageName: z.string(),
  description: z.string().nullable(),
  frameworks: z.array(frameworkSchema),
  latestVersion: z.string().nullable(),
  status: statusSchema,
  iconCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const projectDetailSchema = projectSummarySchema.extend({
  latestVersionInfo: latestVersionInfoSchema,
});

export type CreateProjectBody = z.infer<typeof createProjectBodySchema>;
export type UpdateProjectBody = z.infer<typeof updateProjectBodySchema>;
