import { and, eq } from "drizzle-orm";

import type { Job } from "bullmq";
import type { Database } from "../../db/index.ts";
import type { BuildPublishJobData } from "../queue.ts";

import { icons, projects, users, versions } from "../../db/schema/index.ts";

interface BuildProcessorDependencies {
  db: Database;
}

export const createBuildProcessor =
  ({ db }: BuildProcessorDependencies) =>
  async (job: Job<BuildPublishJobData>) => {
    const logLines: string[] = [];

    const appendLog = async (message: string) => {
      const line = `[${new Date().toISOString()}] ${message}`;
      logLines.push(line);
      await db
        .update(versions)
        .set({
          buildLog: logLines.join("\n"),
          updatedAt: new Date(),
        })
        .where(eq(versions.id, job.data.versionId));
    };

    try {
      await db
        .update(versions)
        .set({
          status: "building",
          updatedAt: new Date(),
        })
        .where(eq(versions.id, job.data.versionId));

      await appendLog("Starting build-and-publish job");

      const version = await db.query.versions.findFirst({
        where: eq(versions.id, job.data.versionId),
      });

      if (!version) {
        throw new Error("Version not found");
      }

      const project = await db.query.projects.findFirst({
        where: eq(projects.id, job.data.projectId),
      });

      if (!project) {
        throw new Error("Project not found");
      }

      const user = await db.query.users.findFirst({
        where: eq(users.id, job.data.userId),
      });

      if (!user) {
        throw new Error("User not found");
      }

      await appendLog("Fetching icons...");
      const optimizedIcons = await db.query.icons.findMany({
        where: and(eq(icons.projectId, job.data.projectId), eq(icons.status, "optimized")),
      });

      await appendLog(`Fetched ${optimizedIcons.length} optimized icons.`);
      await appendLog("Validating npm token...");

      if (!user.npmTokenEncrypted) {
        throw new Error("npm token missing");
      }

      await appendLog(`Generating components for frameworks: ${project.frameworks.join(", ")}`);
      await appendLog("Building package...");
      await appendLog("Publishing to npm...");
      await appendLog("Publish step is stubbed in MVP mode.");

      await db
        .update(versions)
        .set({
          status: "published",
          npmUrl: `https://npmjs.com/package/${project.packageName}`,
          publishedAt: new Date(),
          buildLog: logLines.join("\n"),
          updatedAt: new Date(),
        })
        .where(eq(versions.id, version.id));

      await appendLog("Build job finished successfully.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown build error";
      await appendLog(`Build failed: ${message}`);

      await db
        .update(versions)
        .set({
          status: "failed",
          buildLog: logLines.join("\n"),
          updatedAt: new Date(),
        })
        .where(eq(versions.id, job.data.versionId));

      throw error;
    }
  };


