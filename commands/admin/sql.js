module.exports = {
  desc: 'Runs a SQL command against the bot\'s database',
  hide: true,
  owner: true,
  args: ['command'],
  fn: async (context, code) => {
    const start = Date.now();

    let sqlOutput;

    try {
      sqlOutput = await context.main.db.sequelize.query(code.join(' '));
    } catch (err) {
      return `There was an error while executing your SQL query:\n\`\`\`\n${err.message}\n\`\`\``;
    }

    const time = Date.now() - start;

    sqlOutput = JSON.stringify(sqlOutput[0], null, 2);

    return `SQL query returned:\n\`\`\`JSON\n${sqlOutput}\n\`\`\` \n :stopwatch: Query took ${time}ms`;
  },
};
