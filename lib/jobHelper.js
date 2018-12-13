const winston = require('winston');

class JobHelper {
  constructor(main) {
    this.main = main;
  }

  async enqueue(jobName, jobData, delay = 0) {
    const job = await this.main.jobQueue.add(jobName, jobData, {
      delay: delay * 1000,
      removeOnComplete: true,
    });

    winston.debug('Enqueued new job for name: %s with id %s', jobName, job.id);

    return job;
  }

  registerQueue(jobName, fn) {
    return this.main.jobQueue.process(jobName, async (job) => {
      winston.debug('Running job: %s with id %s', jobName, job.id);

      return fn(this.main, job);
    });
  }
}

module.exports = JobHelper;
