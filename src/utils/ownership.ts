import { eq } from "drizzle-orm";

import type { Database } from "../db/index.ts";

import { projects } from "../db/schema/index.ts";
import { ForbiddenError, NotFoundError } from "./errors.ts";

export const assertProjectOwnership = async (userId: string, projectId: string, db: Database) => {
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  if (!project) {
    throw new NotFoundError("Project not found");
  }

  if (project.userId !== userId) {
    throw new ForbiddenError("You do not have access to this project");
  }

  return project;
};


