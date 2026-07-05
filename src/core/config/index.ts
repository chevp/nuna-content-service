/** Environment-driven configuration. */

export interface AppConfig {
  port: number;
  env: 'development' | 'production' | 'test';
  kaga: {
    url: string;
    apiKey: string;
  };
  redis: {
    host: string;
    port: number;
    url: string;
  };
  storage: {
    driver: 'local' | 's3';
    basePath: string;
  };
  auth: {
    jwtSecret: string;
    enabled: boolean;
  };
}

const num = (v: string | undefined, fallback: number): number =>
  v === undefined ? fallback : Number(v);

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): AppConfig => ({
  port: num(env.PORT, 4000),
  env: (env.NODE_ENV as AppConfig['env']) ?? 'development',
  kaga: {
    url: env.KAGA_URL ?? 'http://localhost:8090',
    apiKey: env.KAGA_API_KEY ?? 'dev-key',
  },
  redis: {
    host: env.REDIS_HOST ?? 'localhost',
    port: num(env.REDIS_PORT, 6379),
    url: env.REDIS_URL ?? 'redis://localhost:6379',
  },
  storage: {
    driver: (env.STORAGE_DRIVER as 'local' | 's3') ?? 'local',
    basePath: env.STORAGE_BASE_PATH ?? './data/assets',
  },
  auth: {
    jwtSecret: env.JWT_SECRET ?? 'dev-secret',
    enabled: env.AUTH_ENABLED === 'true',
  },
});

export type { AppConfig as Config };
