module.exports = {
  description: 'Runs a SQL command against the bot\'s database backend',
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
      sqlOutput = await context.main.pg`${command}`;
    } catch (err) {
      return `There was an error while executing your SQL query:\n\`\`\`\n${err.message}\n\`\`\``;
    }

    const time = Date.now() - start;

    sqlOutput = JSON.stringify(sqlOutput[0], null, 2);

    return `SQL query returned:\n\`\`\`JSON\n${sqlOutput}\n\`\`\` \n:stopwatch: took ${time}ms`;
  },
};
