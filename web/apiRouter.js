const express = require('express');

module.exports = (main) => {
  const apiRouter = express.Router();

  apiRouter.get('/', async (req, res, next) => {
    res.json({
      hi: 'hi',
    });
  });

  return apiRouter;
};
