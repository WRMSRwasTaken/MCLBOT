const winston = require('winston');

class JobHelper {
  constructor(main) {
    this.main = main;

    this.main.jobQueue.on('active', (job, jobPromise) => {
      winston.debug('Running job: %s with id %s', job.name, job.id);
    });

    this.main.jobQueue.on('completed', (job, jobPromise) => {
      winston.debug('Job: %s (ID: %s) completed.', job.name, job.id);
    });

    this.main.jobQueue.on('failed', (job, err) => {
      winston.warn('Job: %s (ID: %s) failed: %s', job.name, job.id, err.message);
    });
  }

  async enqueue(jobName, jobData, delay = 0) {
    const job = await this.main.jobQueue.add(jobName, jobData, {
      delay: delay * 1000,
      removeOnComplete: true,
      attempts: 999,
      backoff: {
        type: 'exponential',
        delay: 10000,
      },
    });

    winston.debug('Enqueued new job for name: %s with id %s', jobName, job.id);

    return job;
  }

  registerQueue(jobName, fn) {
    return this.main.jobQueue.process(jobName, async job => fn(this.main, job));
  }
}

module.exports = JobHelper;
