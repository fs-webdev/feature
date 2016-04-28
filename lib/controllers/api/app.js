(function() {
  'use strict';

  /**
   * Module Dependencies
   */
  var AppModel = require('xpr-dash-mongodb').app;


  module.exports = function(app, base) {

    base = base || '/';

    app.get(route('/'), function(req, res, next) {
      var query = AppModel.cleanQuery(req.query);

      return AppModel.find(query, true)
        .then(res.send.bind(res))
        .catch(next);
    });

    app.post(route('/'), function(req, res, next) {
      var config = cleanFields(req.body)
        , app = new AppModel(config);

      app.save()
        .then(function() {
          res.send(201, app.getDoc());
          process.nextTick(app.serialize.bind(app));
        })
        .catch(function(err) {
          // 11000 means a unique index failed
          if (err.code === 11000) return res.send(409, err);
          return next(err);
        });
    });

    app.put(route('/:appId'), function(req, res, next) {
      var appId = req.params.appId
        , appData = req.body
        , name = appData.name;

      AppModel.findAndUpdate(appId, { name: name })
        .then(function(app) {
          res.json(app.getDoc());
          process.nextTick(app.serialize.bind(app));
        })
        .catch(function(err) {
          if (err === 404) return res.send(404);

          next(err);
        });

    });

    app.put(route('/:appId/groups'), function(req, res, next) {
      var appId = req.params.appId
        , groups = req.body;

      AppModel.findAndUpdate(appId, { groups: groups })
        .then(function(app) {
          res.json(app.getDoc());
          process.nextTick(app.serialize.bind(app));
        })
        .catch(next);
    });


    function route(path) {
      return base + (path || '');
    }
  };

  function cleanFields(oldObj) {
    var fieldList = [ 'github_repo' ]
      , newObj = {}
      , field;

    for (var i=0, l=fieldList.length; i<l; i++) {
      field = fieldList[i];
      if (oldObj[field]) newObj[field] = oldObj[field];
    }

    return newObj;
  }
})();
