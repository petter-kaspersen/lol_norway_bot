import { existsSync, writeFileSync, readFileSync, copyFileSync } from "fs";

import process from "process";
import { Alias } from "../commands/alias";
import Logger from "./logger";

const CACHE_FILE_NAME = process.env.CACHE_FILE || "cache.json";

export interface Cache {
  roleSelectionMessage?: string;
  gamerArticles?: string[];
  alias?: Alias[];
}

export function writeToCachefile(key: keyof Cache, value: unknown) {
  const cacheFileContent = createOrReturnCachefile();
  const newCacheFileContent = { ...cacheFileContent, [key]: value };

  writeFileSync(CACHE_FILE_NAME, JSON.stringify(newCacheFileContent));
}

/**
 * Returns contents of cache file if it exists, otherwise
 * it creates and returns default values.
 */
export default function createOrReturnCachefile(): Cache {
  try {
    const cacheFile = existsSync(CACHE_FILE_NAME);

    if (!cacheFile) {
      writeFileSync(CACHE_FILE_NAME, JSON.stringify({}));
    } else {
      return JSON.parse(readFileSync(CACHE_FILE_NAME, "utf-8"));
    }
  } catch (e) {
    Logger.Warning(
      "Cache file contents invalid JSON - backing up and recreating"
    );

    copyFileSync(
      CACHE_FILE_NAME,
      `${new Date().toString()}.${CACHE_FILE_NAME}`
    );
    writeFileSync(CACHE_FILE_NAME, JSON.stringify({}));
  }

  return {};
}
