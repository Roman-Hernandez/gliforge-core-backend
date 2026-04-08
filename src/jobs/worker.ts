import { Worker } from "bullmq";
import { and, eq } from "drizzle-orm";
import { optimize } from "svgo";

import { redis } from "../config/redis.ts";
import { db, pool } from "../db/index.ts";
import { icons } from "../db/schema/index.ts";
import { storageService } from "../services/storage/local.storage.ts";
import { createBuildProcessor } from "./processors/build.processor.ts";
import {
  BUILD_PUBLISH_QUEUE_NAME,
  ICON_PROCESSING_QUEUE_NAME,
  type IconOptimizationJobData,
} from "./queue.ts";

const iconWorker = new Worker<IconOptimizationJobData>(
  ICON_PROCESSING_QUEUE_NAME,
  async (job) => {
    const icon = await db.query.icons.findFirst({
      where: eq(icons.id, job.data.iconId),
    });

    if (!icon) {
      throw new Error("Icon not found");
    }

    try {
      const svgBuffer = await storageService.read(icon.filePath);
      const svg = svgBuffer.toString("utf8");

      const optimized = optimize(svg, {
        multipass: true,
        plugins: [
          "removeComments",
          "removeMetadata",
          "removeEditorsNSData",
          "cleanupIds",
          "removeUselessDefs",
          {
            name: "convertColors",
            params: {
              currentColor: false,
            },
          },
          "removeDimensions",
          {
            name: "preset-default",
            params: {
              overrides: {
                removeViewBox: false,
              },
            },
          },
        ],
      });

      if (!("data" in optimized)) {
        throw new Error("Failed to optimize SVG");
      }

      await storageService.save(icon.filePath, optimized.data);

      await db
        .update(icons)
        .set({
          svgContent: optimized.data,
          fileSizeOptimized: Buffer.byteLength(optimized.data),
          status: "optimized",
          updatedAt: new Date(),
        })
        .where(eq(icons.id, icon.id));
    } catch (error) {
      await db
        .update(icons)
        .set({
          status: "error",
          updatedAt: new Date(),
        })
        .where(and(eq(icons.id, icon.id), eq(icons.projectId, job.data.projectId)));

      throw error;
    }
  },
  {
    connection: redis,
  },
);

const buildWorker = new Worker(BUILD_PUBLISH_QUEUE_NAME, createBuildProcessor({ db }), {
  connection: redis,
});

iconWorker.on("completed", (job) => {
  console.log(`[worker] icon job completed: ${job.id}`);
});

iconWorker.on("failed", (job, error) => {
  console.error(`[worker] icon job failed: ${job?.id}`, error);
});

buildWorker.on("completed", (job) => {
  console.log(`[worker] build job completed: ${job.id}`);
});

buildWorker.on("failed", (job, error) => {
  console.error(`[worker] build job failed: ${job?.id}`, error);
});

const shutdown = async () => {
  await Promise.allSettled([iconWorker.close(), buildWorker.close()]);
  await Promise.allSettled([redis.quit(), pool.end()]);
  process.exit(0);
};

process.on("SIGINT", () => {
  void shutdown();
});

process.on("SIGTERM", () => {
  void shutdown();
});

console.log("[worker] Gliforge worker running");


