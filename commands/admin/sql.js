module.exports = {
  desc: 'Runs a SQL command against the bot\'s database',
  hide: true,
  owner: true,
  arguments: [
    {
      label: 'command',
      type: 'string',
      infinite: true,
    },
  ],
  fn: async (context, command) => {
    const start = Date.now();

    let sqlOutput;

    try {
      sqlOutput = await context.main.db.sequelize.query(command);
    } catch (err) {
      return `There was an error while executing your SQL query:\n\`\`\`\n${err.message}\n\`\`\``;
    }

    const time = Date.now() - start;

    sqlOutput = JSON.stringify(sqlOutput[0], null, 2);

    return `SQL query returned:\n\`\`\`JSON\n${sqlOutput}\n\`\`\` \n:stopwatch: took ${time}ms`;
  },
};
