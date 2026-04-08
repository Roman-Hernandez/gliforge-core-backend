import { and, desc, eq, sql } from "drizzle-orm";

import type { Database } from "../../db/index.ts";
import type { CreateProjectBody, UpdateProjectBody } from "./projects.schemas.ts";

import { icons, projects, versions } from "../../db/schema/index.ts";
import { ConflictError, NotFoundError, ValidationError } from "../../utils/errors.ts";
import { assertProjectOwnership } from "../../utils/ownership.ts";
import { slugify } from "../../utils/slugify.ts";

const mapProjectSummary = (row: {
  id: string;
  userId: string;
  name: string;
  slug: string;
  packageName: string;
  description: string | null;
  frameworks: Array<"react" | "vue" | "svelte">;
  latestVersion: string | null;
  status: "active" | "archived";
  createdAt: Date;
  updatedAt: Date;
  iconCount: number;
}) => ({
  id: row.id,
  userId: row.userId,
  name: row.name,
  slug: row.slug,
  packageName: row.packageName,
  description: row.description,
  frameworks: row.frameworks,
  latestVersion: row.latestVersion,
  status: row.status,
  iconCount: row.iconCount,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export class ProjectsService {
  constructor(private readonly db: Database) {}

  async listByUser(userId: string) {
    const rows = await this.db
      .select({
        id: projects.id,
        userId: projects.userId,
        name: projects.name,
        slug: projects.slug,
        packageName: projects.packageName,
        description: projects.description,
        frameworks: projects.frameworks,
        latestVersion: projects.latestVersion,
        status: projects.status,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        iconCount: sql<number>`cast(count(${icons.id}) as int)`,
      })
      .from(projects)
      .leftJoin(icons, eq(icons.projectId, projects.id))
      .where(eq(projects.userId, userId))
      .groupBy(
        projects.id,
        projects.userId,
        projects.name,
        projects.slug,
        projects.packageName,
        projects.description,
        projects.frameworks,
        projects.latestVersion,
        projects.status,
        projects.createdAt,
        projects.updatedAt,
      )
      .orderBy(desc(projects.createdAt));

    return rows.map(mapProjectSummary);
  }

  async create(userId: string, input: CreateProjectBody) {
    const existing = await this.db.query.projects.findFirst({
      where: and(eq(projects.userId, userId), eq(projects.packageName, input.packageName)),
    });

    if (existing) {
      throw new ConflictError("You already have a project with this package name");
    }

    const [createdProject] = await this.db
      .insert(projects)
      .values({
        userId,
        name: input.name,
        slug: slugify(input.name),
        packageName: input.packageName,
        description: input.description ?? null,
        frameworks: input.frameworks,
      })
      .returning({
        id: projects.id,
        userId: projects.userId,
        name: projects.name,
        slug: projects.slug,
        packageName: projects.packageName,
        description: projects.description,
        frameworks: projects.frameworks,
        latestVersion: projects.latestVersion,
        status: projects.status,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      });

    if (!createdProject) {
      throw new Error("Failed to create project");
    }

    return {
      ...mapProjectSummary({
        ...createdProject,
        iconCount: 0,
      }),
      latestVersionInfo: null,
    };
  }

  async getById(userId: string, projectId: string) {
    const project = await assertProjectOwnership(userId, projectId, this.db);

    const iconCountResult = await this.db
      .select({
        count: sql<number>`cast(count(${icons.id}) as int)`,
      })
      .from(icons)
      .where(eq(icons.projectId, project.id));

    const iconCount = iconCountResult[0]?.count ?? 0;

    const latestVersionInfo = project.latestVersion
      ? await this.db.query.versions.findFirst({
          where: and(eq(versions.projectId, project.id), eq(versions.version, project.latestVersion)),
        })
      : null;

    return {
      ...mapProjectSummary({
        ...project,
        iconCount,
      }),
      latestVersionInfo: latestVersionInfo
        ? {
            id: latestVersionInfo.id,
            version: latestVersionInfo.version,
            status: latestVersionInfo.status,
            publishedAt: latestVersionInfo.publishedAt ? latestVersionInfo.publishedAt.toISOString() : null,
            createdAt: latestVersionInfo.createdAt.toISOString(),
          }
        : null,
    };
  }

  async update(userId: string, projectId: string, input: UpdateProjectBody) {
    await assertProjectOwnership(userId, projectId, this.db);

    const [updatedProject] = await this.db
      .update(projects)
      .set({
        ...(input.name ? { name: input.name, slug: slugify(input.name) } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.frameworks ? { frameworks: input.frameworks } : {}),
        ...(input.status ? { status: input.status } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
      .returning({
        id: projects.id,
        userId: projects.userId,
        name: projects.name,
        slug: projects.slug,
        packageName: projects.packageName,
        description: projects.description,
        frameworks: projects.frameworks,
        latestVersion: projects.latestVersion,
        status: projects.status,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      });

    if (!updatedProject) {
      throw new NotFoundError("Project not found");
    }

    const iconCountResult = await this.db
      .select({
        count: sql<number>`cast(count(${icons.id}) as int)`,
      })
      .from(icons)
      .where(eq(icons.projectId, projectId));

    const iconCount = iconCountResult[0]?.count ?? 0;
    const latestVersionInfo = updatedProject.latestVersion
      ? await this.db.query.versions.findFirst({
          where: and(eq(versions.projectId, projectId), eq(versions.version, updatedProject.latestVersion)),
        })
      : null;

    return {
      ...mapProjectSummary({
        ...updatedProject,
        iconCount,
      }),
      latestVersionInfo: latestVersionInfo
        ? {
            id: latestVersionInfo.id,
            version: latestVersionInfo.version,
            status: latestVersionInfo.status,
            publishedAt: latestVersionInfo.publishedAt ? latestVersionInfo.publishedAt.toISOString() : null,
            createdAt: latestVersionInfo.createdAt.toISOString(),
          }
        : null,
    };
  }

  async delete(userId: string, projectId: string): Promise<void> {
    await assertProjectOwnership(userId, projectId, this.db);

    const publishedVersions = await this.db
      .select({
        count: sql<number>`cast(count(${versions.id}) as int)`,
      })
      .from(versions)
      .where(and(eq(versions.projectId, projectId), eq(versions.status, "published")));

    if ((publishedVersions[0]?.count ?? 0) > 0) {
      throw new ValidationError("This project has published versions. Archive it instead of deleting it.");
    }

    await this.db.delete(projects).where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
  }
}


