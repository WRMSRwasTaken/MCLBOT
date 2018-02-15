module.exports = {
  description: 'XD',
  arguments: [
    {
      label: '1',
      type: 'string',
    },
    {
      label: '2',
      type: 'string',
      optional: true,
    },
    {
      label: '3',
      type: 'string',
      optional: true,
    },
  ],
  fn: async (ctx, a1, a2, a3) => {
    const build = `${a1}           ${a1}    ${a2} ${a3}
  ${a1}       ${a1}      ${a2}    ${a3}
    ${a1}   ${a1}        ${a2}     ${a3}
      ${a1}          ${a2}     ${a3}
    ${a1}   ${a1}        ${a2}     ${a3}
  ${a1}       ${a1}      ${a2}    ${a3}
${a1}           ${a1}    ${a2} ${a3}`;

    return `\`\`\`\n${build}\n\`\`\``;
  },
};
