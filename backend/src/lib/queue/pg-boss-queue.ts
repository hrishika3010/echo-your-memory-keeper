import PgBoss from "pg-boss";

import type { JobHandler, JobName, JobPayloadMap, JobQueue } from "./types.js";

export class PgBossQueue implements JobQueue {
  private readonly boss: PgBoss;
  private started = false;

  constructor(databaseUrl: string) {
    this.boss = new PgBoss({
      connectionString: databaseUrl,
      retryLimit: 3,
      retryDelay: 2
    });
  }

  async start(): Promise<void> {
    if (this.started) {
      return;
    }

    await this.boss.start();
    this.started = true;
  }

  async stop(): Promise<void> {
    if (!this.started) {
      return;
    }

    await this.boss.stop();
    this.started = false;
  }

  async healthcheck(): Promise<boolean> {
    return this.started;
  }

  async publish<T extends JobName>(name: T, payload: JobPayloadMap[T]): Promise<void> {
    await this.boss.send(name, payload);
  }

  async register<T extends JobName>(name: T, handler: JobHandler<T>): Promise<void> {
    await this.boss.work(name, async (jobs) => {
      for (const job of jobs) {
        await handler(job.data as JobPayloadMap[T]);
      }
    });
  }
}
