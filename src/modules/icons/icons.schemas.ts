import { z } from "zod";

export const iconStatusSchema = z.enum(["pending", "optimized", "error"]);

export const projectParamsSchema = z.object({
  projectId: z.string().uuid(),
});

export const iconParamsSchema = projectParamsSchema.extend({
  iconId: z.string().uuid(),
});

export const listIconsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().trim().min(1).optional(),
  status: iconStatusSchema.optional(),
});

export const renameIconBodySchema = z.object({
  name: z.string().min(1).max(255),
});

export const bulkDeleteIconsBodySchema = z.object({
  iconIds: z.array(z.string().uuid()).min(1).max(100),
});

export const iconSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string(),
  filePath: z.string(),
  fileSizeOriginal: z.number().int().nonnegative(),
  fileSizeOptimized: z.number().int().nonnegative().nullable(),
  svgContent: z.string().nullable(),
  status: iconStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const paginatedIconsSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  total: z.number().int().nonnegative(),
  items: z.array(iconSchema),
});

export const uploadIconsResponseSchema = z.object({
  uploaded: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  icons: z.array(iconSchema),
});

export const bulkDeleteIconsResponseSchema = z.object({
  deleted: z.number().int().nonnegative(),
});

export type ListIconsQuery = z.infer<typeof listIconsQuerySchema>;
export type RenameIconBody = z.infer<typeof renameIconBodySchema>;
export type BulkDeleteIconsBody = z.infer<typeof bulkDeleteIconsBodySchema>;
