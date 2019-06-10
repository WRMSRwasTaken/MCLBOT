module.exports = {
  run: async (main, job) => {
    main.prometheusMetrics.sqlCommands.labels('SELECT').inc();
    const jobInformation = await main.db.reminders.findOne({
      where: {
        queue_id: job.id,
      },
    });

    if (!jobInformation) { // the job has been deleted from the database, so we're just going to do nothing anymore
      return false;
    }

    main.prometheusMetrics.sqlCommands.labels('DELETE').inc();
    await main.db.reminders.destroy({
      where: {
        queue_id: job.id,
      },
    });

    const user = await main.userHelper.getUser(false, jobInformation.user_id);

    if (jobInformation.text) {
      return user.send(`Reminder: \`${jobInformation.text}\``);
    }

    // TODO: this fails(?) if the user has DM messages disabled. we need to handle this and don't delete SQL jobs

    return user.send(`Reminder: \`...\`\n\n<https://discordapp.com/channels/${(jobInformation.guild_id) ? jobInformation.guild_id : '@me'}/${jobInformation.channel_id}/${jobInformation.message_id}>`);
  },
};
