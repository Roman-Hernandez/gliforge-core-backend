import { and, desc, eq, sql } from "drizzle-orm";

import type { Database } from "../../db/index.ts";
import type { CreateVersionBody } from "./versions.schemas.ts";

import { icons, projects, users, versions } from "../../db/schema/index.ts";
import { ConflictError, NotFoundError, ValidationError } from "../../utils/errors.ts";
import { assertProjectOwnership } from "../../utils/ownership.ts";

interface BuildPublishQueue {
  add(name: string, data: { versionId: string; projectId: string; userId: string }): Promise<unknown>;
}

const mapVersion = (version: {
  id: string;
  projectId: string;
  version: string;
  type: "major" | "minor" | "patch";
  changelog: string | null;
  iconCount: number;
  status: "pending" | "building" | "published" | "failed";
  npmUrl: string | null;
  buildLog: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: version.id,
  projectId: version.projectId,
  version: version.version,
  type: version.type,
  changelog: version.changelog,
  iconCount: version.iconCount,
  status: version.status,
  npmUrl: version.npmUrl,
  buildLog: version.buildLog,
  publishedAt: version.publishedAt ? version.publishedAt.toISOString() : null,
  createdAt: version.createdAt.toISOString(),
  updatedAt: version.updatedAt.toISOString(),
});

export class VersionsService {
  constructor(
    private readonly db: Database,
    private readonly buildPublishQueue: BuildPublishQueue,
  ) {}

  async list(userId: string, projectId: string) {
    await assertProjectOwnership(userId, projectId, this.db);

    const rows = await this.db.query.versions.findMany({
      where: eq(versions.projectId, projectId),
      orderBy: [desc(versions.createdAt)],
    });

    return rows.map(mapVersion);
  }

  async create(userId: string, projectId: string, input: CreateVersionBody) {
    await assertProjectOwnership(userId, projectId, this.db);

    const existingVersion = await this.db.query.versions.findFirst({
      where: and(eq(versions.projectId, projectId), eq(versions.version, input.version)),
    });

    if (existingVersion) {
      throw new ConflictError("This version already exists for the project");
    }

    const optimizedIconsCountResult = await this.db
      .select({
        count: sql<number>`cast(count(${icons.id}) as int)`,
      })
      .from(icons)
      .where(and(eq(icons.projectId, projectId), eq(icons.status, "optimized")));

    const optimizedIconsCount = optimizedIconsCountResult[0]?.count ?? 0;

    if (optimizedIconsCount < 1) {
      throw new ValidationError("Project must have at least one optimized icon before publishing");
    }

    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user?.npmTokenEncrypted) {
      throw new ValidationError("Please add your npm token in settings before publishing");
    }

    const [createdVersion] = await this.db
      .insert(versions)
      .values({
        projectId,
        version: input.version,
        type: input.type,
        changelog: input.changelog ?? null,
        iconCount: optimizedIconsCount,
        status: "pending",
      })
      .returning();

    if (!createdVersion) {
      throw new Error("Failed to create version");
    }

    await this.db
      .update(projects)
      .set({
        latestVersion: input.version,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId));

    await this.buildPublishQueue.add("build-and-publish", {
      versionId: createdVersion.id,
      projectId,
      userId,
    });

    return mapVersion(createdVersion);
  }

  async getById(userId: string, projectId: string, versionId: string) {
    await assertProjectOwnership(userId, projectId, this.db);

    const version = await this.db.query.versions.findFirst({
      where: and(eq(versions.id, versionId), eq(versions.projectId, projectId)),
    });

    if (!version) {
      throw new NotFoundError("Version not found");
    }

    return mapVersion(version);
  }
}


