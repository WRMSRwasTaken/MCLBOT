module.exports = {
  description: 'XD',
  arguments: [
    {
      label: 'word 1',
      type: 'string',
    },
    {
      label: 'word 2',
      type: 'string',
      optional: true,
    },
    {
      label: 'word 3',
      type: 'string',
      optional: true,
    },
  ],
  fn: async (ctx, a1, a2, a3) => {
    a1 = a1.replace('```', '\\`\\`\\`');

    a2 = a2 || a1;
    a3 = a3 || a1;

    let spacesBefore = 0;
    let spacesAfter = 0;

    if (a1.length === 2) {
      spacesBefore = 1;
    } else if (a1.length > 2) {
      spacesBefore = a1.length / 2;
      spacesAfter = a1.length / 2;
    }

    const xd = `${a1}           ${a1}    ${a2} ${a3}
  ${a1}       ${a1}      ${a2}    ${a3}
    ${a1}   ${a1}        ${a2}     ${a3}
      ${(' '.repeat(spacesBefore))}${a1}          ${(' '.repeat(spacesAfter))}${a2}     ${a3}
    ${a1}   ${a1}        ${a2}     ${a3}
  ${a1}       ${a1}      ${a2}    ${a3}
${a1}           ${a1}    ${a2} ${a3}`;

    return `\`\`\`\n${xd}\n\`\`\``;
  },
};
