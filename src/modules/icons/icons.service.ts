import { and, desc, eq, ilike, inArray, sql } from "drizzle-orm";
import path from "node:path";

import type { Database } from "../../db/index.ts";
import type { IStorageService } from "../../services/storage/storage.interface.ts";
import type { BulkDeleteIconsBody, ListIconsQuery, RenameIconBody } from "./icons.schemas.ts";

import { icons } from "../../db/schema/index.ts";
import { ConflictError, NotFoundError } from "../../utils/errors.ts";
import { assertProjectOwnership } from "../../utils/ownership.ts";
import { slugify } from "../../utils/slugify.ts";

export interface UploadedIconInput {
  filename: string;
  mimetype: string;
  buffer: Buffer;
}

interface IconProcessingQueue {
  add(name: string, data: { iconId: string; projectId: string; storageKey: string }): Promise<unknown>;
}

const mapIcon = (icon: {
  id: string;
  projectId: string;
  name: string;
  filePath: string;
  fileSizeOriginal: number;
  fileSizeOptimized: number | null;
  svgContent: string | null;
  status: "pending" | "optimized" | "error";
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: icon.id,
  projectId: icon.projectId,
  name: icon.name,
  filePath: icon.filePath,
  fileSizeOriginal: icon.fileSizeOriginal,
  fileSizeOptimized: icon.fileSizeOptimized,
  svgContent: icon.svgContent,
  status: icon.status,
  createdAt: icon.createdAt.toISOString(),
  updatedAt: icon.updatedAt.toISOString(),
});

export class IconsService {
  constructor(
    private readonly db: Database,
    private readonly storage: IStorageService,
    private readonly iconProcessingQueue: IconProcessingQueue,
  ) {}

  async list(userId: string, projectId: string, query: ListIconsQuery) {
    await assertProjectOwnership(userId, projectId, this.db);

    const conditions = [eq(icons.projectId, projectId)];

    if (query.search) {
      conditions.push(ilike(icons.name, `%${query.search}%`));
    }

    if (query.status) {
      conditions.push(eq(icons.status, query.status));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    const rows = await this.db.query.icons.findMany({
      where: whereClause,
      orderBy: [desc(icons.createdAt)],
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
    });

    const countResult = await this.db
      .select({
        count: sql<number>`cast(count(${icons.id}) as int)`,
      })
      .from(icons)
      .where(whereClause);

    return {
      page: query.page,
      limit: query.limit,
      total: countResult[0]?.count ?? 0,
      items: rows.map(mapIcon),
    };
  }

  async upload(userId: string, projectId: string, files: UploadedIconInput[]) {
    await assertProjectOwnership(userId, projectId, this.db);

    const createdIcons: Array<ReturnType<typeof mapIcon>> = [];
    let skipped = 0;

    for (const file of files) {
      const isSvgFile =
        file.mimetype === "image/svg+xml" || path.extname(file.filename).toLowerCase() === ".svg";

      if (!isSvgFile || file.buffer.byteLength > 2 * 1024 * 1024) {
        skipped += 1;
        continue;
      }

      const iconName = slugify(path.basename(file.filename, path.extname(file.filename)));

      if (!iconName) {
        skipped += 1;
        continue;
      }

      const existingIcon = await this.db.query.icons.findFirst({
        where: and(eq(icons.projectId, projectId), eq(icons.name, iconName)),
      });

      if (existingIcon) {
        skipped += 1;
        continue;
      }

      const storageKey = `${projectId}/${iconName}.svg`;
      await this.storage.save(storageKey, file.buffer);

      const [createdIcon] = await this.db
        .insert(icons)
        .values({
          projectId,
          name: iconName,
          filePath: storageKey,
          fileSizeOriginal: file.buffer.byteLength,
          status: "pending",
        })
        .returning();

      if (!createdIcon) {
        throw new Error("Failed to create icon");
      }

      await this.iconProcessingQueue.add("optimize-icon", {
        iconId: createdIcon.id,
        projectId,
        storageKey,
      });

      createdIcons.push(mapIcon(createdIcon));
    }

    return {
      uploaded: createdIcons.length,
      skipped,
      icons: createdIcons,
    };
  }

  async rename(userId: string, projectId: string, iconId: string, input: RenameIconBody) {
    await assertProjectOwnership(userId, projectId, this.db);

    const icon = await this.db.query.icons.findFirst({
      where: and(eq(icons.id, iconId), eq(icons.projectId, projectId)),
    });

    if (!icon) {
      throw new NotFoundError("Icon not found");
    }

    const nextName = slugify(input.name);

    const existingIcon = await this.db.query.icons.findFirst({
      where: and(eq(icons.projectId, projectId), eq(icons.name, nextName)),
    });

    if (existingIcon && existingIcon.id !== iconId) {
      throw new ConflictError("An icon with that name already exists in this project");
    }

    if (nextName !== icon.name) {
      const content = await this.storage.read(icon.filePath);
      const nextFilePath = `${projectId}/${nextName}.svg`;
      await this.storage.save(nextFilePath, content);
      await this.storage.delete(icon.filePath);

      const [updatedIcon] = await this.db
        .update(icons)
        .set({
          name: nextName,
          filePath: nextFilePath,
          updatedAt: new Date(),
        })
        .where(eq(icons.id, iconId))
        .returning();

      if (!updatedIcon) {
        throw new NotFoundError("Icon not found");
      }

      return mapIcon(updatedIcon);
    }

    return mapIcon(icon);
  }

  async deleteOne(userId: string, projectId: string, iconId: string): Promise<void> {
    await assertProjectOwnership(userId, projectId, this.db);

    const icon = await this.db.query.icons.findFirst({
      where: and(eq(icons.id, iconId), eq(icons.projectId, projectId)),
    });

    if (!icon) {
      throw new NotFoundError("Icon not found");
    }

    await this.storage.delete(icon.filePath);
    await this.db.delete(icons).where(eq(icons.id, iconId));
  }

  async bulkDelete(userId: string, projectId: string, input: BulkDeleteIconsBody) {
    await assertProjectOwnership(userId, projectId, this.db);

    const rows = await this.db.query.icons.findMany({
      where: and(eq(icons.projectId, projectId), inArray(icons.id, input.iconIds)),
    });

    for (const icon of rows) {
      await this.storage.delete(icon.filePath);
    }

    if (rows.length > 0) {
      await this.db.delete(icons).where(and(eq(icons.projectId, projectId), inArray(icons.id, rows.map((icon) => icon.id))));
    }

    return {
      deleted: rows.length,
    };
  }
}


