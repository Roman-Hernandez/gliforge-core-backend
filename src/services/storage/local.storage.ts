import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import type { IStorageService } from "./storage.interface.ts";

import { env } from "../../config/env.ts";

class LocalStorageService implements IStorageService {
  private readonly baseDir = path.resolve(process.cwd(), env.UPLOADS_DIR);

  private resolvePath(key: string): string {
    const resolved = path.resolve(this.baseDir, key);

    if (!resolved.startsWith(this.baseDir)) {
      throw new Error("Invalid storage key");
    }

    return resolved;
  }

  async save(key: string, content: Buffer | string): Promise<string> {
    const filePath = this.resolvePath(key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, content);

    return key;
  }

  async read(key: string): Promise<Buffer> {
    return readFile(this.resolvePath(key));
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolvePath(key), { force: true });
  }

  async exists(key: string): Promise<boolean> {
    try {
      await stat(this.resolvePath(key));
      return true;
    } catch {
      return false;
    }
  }

  getUrl(key: string): string {
    return this.resolvePath(key);
  }
}

export const storageService = new LocalStorageService();


