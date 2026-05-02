import type { JobHandler, JobName, JobPayloadMap, JobQueue } from "./types.js";

type QueuedJob<T extends JobName = JobName> = {
  name: T;
  payload: JobPayloadMap[T];
};

export class TestJobQueue implements JobQueue {
  private readonly handlers = new Map<JobName, JobHandler<JobName>>();
  private readonly jobs: QueuedJob[] = [];

  async start(): Promise<void> {
    return;
  }

  async stop(): Promise<void> {
    this.jobs.splice(0, this.jobs.length);
  }

  async healthcheck(): Promise<boolean> {
    return true;
  }

  async publish<T extends JobName>(name: T, payload: JobPayloadMap[T]): Promise<void> {
    this.jobs.push({ name, payload });
  }

  async register<T extends JobName>(name: T, handler: JobHandler<T>): Promise<void> {
    this.handlers.set(name, handler as JobHandler<JobName>);
  }

  async drain(maxIterations = 50): Promise<void> {
    let iterations = 0;
    while (this.jobs.length > 0) {
      const job = this.jobs.shift();
      if (!job) {
        break;
      }

      const handler = this.handlers.get(job.name);
      if (!handler) {
        throw new Error(`No handler registered for ${job.name}`);
      }

      await handler(job.payload as never);
      iterations += 1;

      if (iterations > maxIterations) {
        throw new Error("Exceeded max queue iterations while draining test jobs.");
      }
    }
  }
}
