module.exports = {
  desc: 'reload a bot command or category',
  owner: true,
  args: ['all | command | category'],
  optArgs: ['command / category name'],
  fn: async (message, params, main) => {
    let mode;
    let commandOrCategoryName;

    console.log(params)

    if (params[0]) {
      mode = params[0].toLowerCase();
    }

    if (params[1]) {
      commandOrCategoryName = params[1].toLowerCase();
    }

    if (['command', 'category'].includes(mode) && !commandOrCategoryName) {
      return main.stringUtils.argumentsError('reload', 1, 'Missing command argument.');
    }

    switch (mode.toLowerCase()) {
      case 'all':
        main.resourceLoader.loadCommandFiles(null, true);
        break;
      case 'category':
        main.resourceLoader.loadCommandFiles(params[1], true);
        break;
      case 'command':
        if (!this.main.commands[commandOrCategoryName]) {
          return main.stringUtils.argumentsError('reload', 1, 'Unknown command for reloading specified.');
        }

        main.resourceLoader.loommandFiles(null, true);
        break;
      default:
        return main.stringUtils.argumentsError('reload', 0, 'Unknown command argument');
    }
  },
};
