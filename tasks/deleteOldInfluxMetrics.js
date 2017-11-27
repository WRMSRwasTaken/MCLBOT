module.exports = {
  interval: 3600,
  single: true, // TODO: if sharding is enabled, single enabled sets this task only to run on the shard master
  fn: async (main) => {
    // Create a continuous query for data retention, as I don't want to store (and display) metrics longer than 1 day (for now)
    // and I don't want to use InfluxDB's built in CQ function, because this is much easier here

    await main.influx.query('delete from member_message where time < now() - 1d');
    await main.influx.query('delete from member_status where time < now() - 1d');
    await main.influx.query('delete from member_join where time < now() - 1d');
    await main.influx.query('delete from member_leave where time < now() - 1d');
  },
};
