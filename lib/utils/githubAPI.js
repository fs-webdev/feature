(function() {
  'use strict';

  var superagent = require('superagent-defaults')()
    , debug = require('debug')('feature:lib:github')
    , Promise = Promise || require('bluebird')
  ;

  module.exports = GithubAPI;

  function GithubAPI(user, token) {
    this.user = user;

    this.request = superagent.on('request', function(request) {
      request.set('Accept', 'application/vnd.github.raw+json');
      if (token) request.auth(token, 'x-oauth-basic');

      request.setCb = function(cb, dfd) {
        var fail = function(err) {
          if (typeof err === 'string') {
            err = new Error(err);
          }

          if (cb) cb(err);
          if (dfd) dfd.reject(err);
        };
        var win = function(resp) {
          if (cb) cb(null, resp.body, resp.headers);
          if (dfd) dfd.resolve(resp.body);
        };
        request.on('error', fail);
        request.on('response', function(resp) {
          if (resp.ok) return win(resp);

          debug('Request failed: ' + resp.status);
          return fail('Request failed');
        });
        return request;
      };

      return request;
    });

    return this;
  }

  GithubAPI.prototype.fetchOrgs = function(cb) {
    var url = 'https://api.github.com/user/orgs'
      , self = this;

    return new Promise(function(resolve, reject) {
      self.request
        .get(url)
        .setCb(cb, { resolve: resolve, reject: reject })
        .end();
    });
  };

  GithubAPI.prototype.filterOrgs = function(orgs) {
    var okOrgs = this.orgs
      , isMember = false;
    orgs.map(function(org) {
      if (~ okOrgs.indexOf(org.login.toLowerCase())) isMember = true;
    });

    if (! isMember) throw { message: 'Not a Member of required Orgs', name: 'NOT_AUTHORIZED' };
  };

  GithubAPI.prototype.fetchRepos = function() {
    var self = this;

    return new Promise(function(resolve) {
      var appMap = {}
        , _request = self.request;

      var promises = self.orgs.map(function(orgName) {
        return new Promise(function(resolve) {
          fetchPage(1, function(err, data, headers) {
            var links = headers.link
              , _promises = []
              , matches, pages;

            if (links) {
              matches = links.match(/\?page=[^?]*\?page=(\d+)/);
              pages = parseInt(matches[1]);
              for (var i=2; i<=pages; i++) {
                _promises.push(fetchPage(i));
              }
            }
            Promise.all(_promises).then(resolve);
          });

          function parseRepo(item) {
            if (! appMap[orgName]) appMap[orgName] = [];
            appMap[orgName].push({ name : item.full_name, url : item.html_url, permissions: item.permissions });
          }

          function fetchPage(page, cb) {
            return new Promise(function(resolve, reject) {
              var url = 'https://api.github.com/orgs/' + orgName + '/repos?page=' + page + '&per_page=100';

              _request.get(url)
                .setCb(function(err, data, headers) {
                  data.map(parseRepo);
                  if (cb) cb(err, data, headers);
                }, { resolve: resolve, reject: reject })
                .end();
            });
          }
        });
      });

      Promise.all(promises)
        .then(function() {
          resolve(appMap);
        });
    });
  };

})();
