(function() {
  'use strict';

  /**
   * Local Dependencies
   */
  var couplingHandler = require('./couplingHandler');

  module.exports = function(app, base) {

    app.get(route('/'), invokeCouplingHandler);
    app.post(route('/'), invokeCouplingHandler);

    function route(path) {
      return (base || '/') + (path || '');
    }
  };

  function invokeCouplingHandler(req, res, next) {
    var devKey = req.headers['x-feature-key']
      , devKeyShared = req.headers['x-feature-key-shared']
      , expList = req.body.experiments
      , shared = req.body.shared;

    if (! devKey) return res.send(401);

    couplingHandler(devKey, devKeyShared, expList, shared)
      .then(function(data) {
        res.json(data);
      })
      .catch(function(err) {
        if (err instanceof Error) return next(err);

        res.send(err);
      });
  }
})();
