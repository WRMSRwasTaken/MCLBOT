module.exports = {
  run: async (main, job) => {
    main.prometheusMetrics.sqlReads.inc(1);

    const jobInformation = await main.db.muted_members.findOne({
      where: {
        queue_id: job.id,
      },
    });

    if (!jobInformation) { // huh?
      return false;
    }

    const guild = main.api.guilds.get(jobInformation.guild_id);

    if (!guild) { // kicked?
      return false;
    }

    const context = {
      main,
      guild,
    };

    return main.userHelper.unmuteMember(context, jobInformation.target_id);
  },
};
