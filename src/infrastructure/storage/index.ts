/**
 * Asset storage adapter (infrastructure).
 *
 * Resolves asset URIs to retrievable locations (local filesystem today, S3
 * later). The asset module resolves mesh/material/file paths through this.
 */

import path from 'node:path';
import type { AppConfig } from '../../core/config';

export interface StorageClient {
  /** Resolve a logical asset path to a concrete, fetchable URL/path. */
  resolve(assetPath: string): string;
  driver: 'local' | 's3';
}

export function createStorage(config: AppConfig['storage']): StorageClient {
  if (config.driver === 's3') {
    return {
      driver: 's3',
      resolve: (assetPath: string) => `s3://${config.basePath}/${assetPath}`.replace(/\/+/g, '/'),
    };
  }
  return {
    driver: 'local',
    resolve: (assetPath: string) => path.posix.join(config.basePath, assetPath),
  };
}
