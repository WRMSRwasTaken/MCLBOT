module.exports = {
  run: async (main, job) => {
    main.prometheusMetrics.sqlReads.inc(1);

    const jobInformation = await main.db.muted_members.findOne({
      where: {
        queue_id: job.id,
      },
    });

    if (!jobInformation) { // the job has been deleted from the database, so we're just going to do nothing anymore
      return false;
    }

    const guild = main.api.guilds.get(jobInformation.guild_id);

    if (!guild) { // kicked? // TODO: make this shard aware and run on the shard the guild is on
      return false;
    }

    const context = {
      main,
      guild,
    };

    return main.userHelper.unmuteMember(context, jobInformation.target_id);
  },
};
