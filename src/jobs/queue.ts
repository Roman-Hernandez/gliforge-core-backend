import { Queue } from "bullmq";

import { redis } from "../config/redis.ts";

export const ICON_PROCESSING_QUEUE_NAME = "icon-processing";
export const BUILD_PUBLISH_QUEUE_NAME = "build-publish";

export interface IconOptimizationJobData {
  iconId: string;
  projectId: string;
  storageKey: string;
}

export interface BuildPublishJobData {
  versionId: string;
  projectId: string;
  userId: string;
}

const defaultJobOptions = {
  attempts: 3,
  removeOnComplete: 100,
  removeOnFail: 100,
};

export const iconProcessingQueue = new Queue<IconOptimizationJobData>(ICON_PROCESSING_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions,
});

export const buildPublishQueue = new Queue<BuildPublishJobData>(BUILD_PUBLISH_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions,
});


