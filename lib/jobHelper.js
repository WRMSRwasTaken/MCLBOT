const winston = require('winston');
const uuidv4 = require('uuid/v4');

const jobQueues = {};

class JobHelper {
  constructor(main) {
    this.main = main;
  }

  registerJobQueue(jobName) {
    if (!jobQueues[jobName]) {
      jobQueues[jobName] = {};
    }
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
    return this.main.jobQueue.process(jobName, async (job) => fn(this.main, job));
  }
}

module.exports = JobHelper;
