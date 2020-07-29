(function() {
  function r(e, n, t) {
    function o(i, f) {
      if (!n[i]) {
        if (!e[i]) {
          var c = "function" == typeof require && require;
          if (!f && c) return c(i, !0);
          if (u) return u(i, !0);
          var a = new Error("Cannot find module '" + i + "'");
          throw ((a.code = "MODULE_NOT_FOUND"), a);
        }
        var p = (n[i] = { exports: {} });
        e[i][0].call(
          p.exports,
          function(r) {
            var n = e[i][1][r];
            return o(n || r);
          },
          p,
          p.exports,
          r,
          e,
          n,
          t
        );
      }
      return n[i].exports;
    }
    for (
      var u = "function" == typeof require && require, i = 0;
      i < t.length;
      i++
    )
      o(t[i]);
    return o;
  }
  return r;
})()(
  {
    1: [
      function(require, module, exports) {
        /* exported PromiseThrottle */

        "use strict";

        /**
         * @constructor
         * @param {Object} options A set op options to pass to the throttle function
         *        @param {number} requestsPerSecond The amount of requests per second
         *                                          the library will limit to
         */
        function PromiseThrottle(options) {
          this.requestsPerSecond = options.requestsPerSecond;
          this.promiseImplementation = options.promiseImplementation || Promise;
          this.lastStartTime = 0;
          this.queued = [];
        }

        /**
         * Adds a promise
         * @param {Function} promise A function returning the promise to be added
         * @param {Object} options A set of options.
         * @param {number} options.signal An AbortSignal object that can be used to abort the returned promise
         * @param {number} options.weight A "weight" of each operation resolving by array of promises
         * @return {Promise} A promise
         */
        PromiseThrottle.prototype.add = function(promise, options) {
          var self = this;
          var opt = options || {};
          return new self.promiseImplementation(function(resolve, reject) {
            self.queued.push({
              resolve: resolve,
              reject: reject,
              promise: promise,
              weight: opt.weight || 1,
              signal: opt.signal
            });

            self.dequeue();
          });
        };

        /**
         * Adds all the promises passed as parameters
         * @param {Function} promises An array of functions that return a promise
         * @param {Object} options A set of options.
         * @param {number} options.signal An AbortSignal object that can be used to abort the returned promise
         * @param {number} options.weight A "weight" of each operation resolving by array of promises
         * @return {Promise} A promise that succeeds when all the promises passed as options do
         */
        PromiseThrottle.prototype.addAll = function(promises, options) {
          var addedPromises = promises.map(
            function(promise) {
              return this.add(promise, options);
            }.bind(this)
          );

          return Promise.all(addedPromises);
        };

        /**
         * Dequeues a promise
         * @return {void}
         */
        PromiseThrottle.prototype.dequeue = function() {
          if (this.queued.length > 0) {
            var now = new Date(),
              weight = this.queued[0].weight,
              inc = (1000 / this.requestsPerSecond) * weight,
              elapsed = now - this.lastStartTime;

            if (elapsed >= inc) {
              this._execute();
            } else {
              // we have reached the limit, schedule a dequeue operation
              setTimeout(
                function() {
                  this.dequeue();
                }.bind(this),
                inc - elapsed
              );
            }
          }
        };

        /**
         * Executes the promise
         * @private
         * @return {void}
         */
        PromiseThrottle.prototype._execute = function() {
          this.lastStartTime = new Date();
          var candidate = this.queued.shift();
          var aborted = candidate.signal && candidate.signal.aborted;
          if (aborted) {
            candidate.reject(new DOMException("", "AbortError"));
          } else {
            candidate
              .promise()
              .then(function(r) {
                candidate.resolve(r);
              })
              .catch(function(r) {
                candidate.reject(r);
              });
          }
        };

        module.exports = PromiseThrottle;
      },
      {}
    ],
    2: [
      function(require, module, exports) {
        /* global module */
        "use strict";

        /**
         * Class representing the API
         */
        var SpotifyWebApi = (function() {
          var _baseUri = "https://api.spotify.com/v1";
          var _accessToken = null;
          var _promiseImplementation = null;

          var WrapPromiseWithAbort = function(promise, onAbort) {
            promise.abort = onAbort;
            return promise;
          };

          var _promiseProvider = function(promiseFunction, onAbort) {
            var returnedPromise;
            if (_promiseImplementation !== null) {
              var deferred = _promiseImplementation.defer();
              promiseFunction(
                function(resolvedResult) {
                  deferred.resolve(resolvedResult);
                },
                function(rejectedResult) {
                  deferred.reject(rejectedResult);
                }
              );
              returnedPromise = deferred.promise;
            } else {
              if (window.Promise) {
                returnedPromise = new window.Promise(promiseFunction);
              }
            }

            if (returnedPromise) {
              return new WrapPromiseWithAbort(returnedPromise, onAbort);
            } else {
              return null;
            }
          };

          var _extend = function() {
            var args = Array.prototype.slice.call(arguments);
            var target = args[0];
            var objects = args.slice(1);
            target = target || {};
            objects.forEach(function(object) {
              for (var j in object) {
                if (object.hasOwnProperty(j)) {
                  target[j] = object[j];
                }
              }
            });
            return target;
          };

          var _buildUrl = function(url, parameters) {
            var qs = "";
            for (var key in parameters) {
              if (parameters.hasOwnProperty(key)) {
                var value = parameters[key];
                qs +=
                  encodeURIComponent(key) +
                  "=" +
                  encodeURIComponent(value) +
                  "&";
              }
            }
            if (qs.length > 0) {
              // chop off last '&'
              qs = qs.substring(0, qs.length - 1);
              url = url + "?" + qs;
            }
            return url;
          };

          var _performRequest = function(requestData, callback) {
            var req = new XMLHttpRequest();

            var promiseFunction = function(resolve, reject) {
              function success(data) {
                if (resolve) {
                  resolve(data);
                }
                if (callback) {
                  callback(null, data);
                }
              }

              function failure() {
                if (reject) {
                  reject(req);
                }
                if (callback) {
                  callback(req, null);
                }
              }

              var type = requestData.type || "GET";
              req.open(type, _buildUrl(requestData.url, requestData.params));
              if (_accessToken) {
                req.setRequestHeader("Authorization", "Bearer " + _accessToken);
              }
              if (requestData.contentType) {
                req.setRequestHeader("Content-Type", requestData.contentType);
              }

              req.onreadystatechange = function() {
                if (req.readyState === 4) {
                  var data = null;
                  try {
                    data = req.responseText ? JSON.parse(req.responseText) : "";
                  } catch (e) {
                    console.error(e);
                  }

                  if (req.status >= 200 && req.status < 300) {
                    success(data);
                  } else {
                    failure();
                  }
                }
              };

              if (type === "GET") {
                req.send(null);
              } else {
                var postData = null;
                if (requestData.postData) {
                  postData =
                    requestData.contentType === "image/jpeg"
                      ? requestData.postData
                      : JSON.stringify(requestData.postData);
                }
                req.send(postData);
              }
            };

            if (callback) {
              promiseFunction();
              return null;
            } else {
              return _promiseProvider(promiseFunction, function() {
                req.abort();
              });
            }
          };

          var _checkParamsAndPerformRequest = function(
            requestData,
            options,
            callback,
            optionsAlwaysExtendParams
          ) {
            var opt = {};
            var cb = null;

            if (typeof options === "object") {
              opt = options;
              cb = callback;
            } else if (typeof options === "function") {
              cb = options;
            }

            // options extend postData, if any. Otherwise they extend parameters sent in the url
            var type = requestData.type || "GET";
            if (
              type !== "GET" &&
              requestData.postData &&
              !optionsAlwaysExtendParams
            ) {
              requestData.postData = _extend(requestData.postData, opt);
            } else {
              requestData.params = _extend(requestData.params, opt);
            }
            return _performRequest(requestData, cb);
          };

          /**
           * Creates an instance of the wrapper
           * @constructor
           */
          var Constr = function() {};

          Constr.prototype = {
            constructor: SpotifyWebApi
          };

          /**
           * Fetches a resource through a generic GET request.
           *
           * @param {string} url The URL to be fetched
           * @param {function(Object,Object)} callback An optional callback
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.getGeneric = function(url, callback) {
            var requestData = {
              url: url
            };
            return _checkParamsAndPerformRequest(requestData, callback);
          };

          /**
           * Fetches information about the current user.
           * See [Get Current User's Profile](https://developer.spotify.com/web-api/get-current-users-profile/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.getMe = function(options, callback) {
            var requestData = {
              url: _baseUri + "/me"
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Fetches current user's saved tracks.
           * See [Get Current User's Saved Tracks](https://developer.spotify.com/web-api/get-users-saved-tracks/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.getMySavedTracks = function(options, callback) {
            var requestData = {
              url: _baseUri + "/me/tracks"
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Adds a list of tracks to the current user's saved tracks.
           * See [Save Tracks for Current User](https://developer.spotify.com/web-api/save-tracks-user/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {Array<string>} trackIds The ids of the tracks. If you know their Spotify URI it is easy
           * to find their track id (e.g. spotify:track:<here_is_the_track_id>)
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.addToMySavedTracks = function(
            trackIds,
            options,
            callback
          ) {
            var requestData = {
              url: _baseUri + "/me/tracks",
              type: "PUT",
              postData: trackIds
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Remove a list of tracks from the current user's saved tracks.
           * See [Remove Tracks for Current User](https://developer.spotify.com/web-api/remove-tracks-user/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {Array<string>} trackIds The ids of the tracks. If you know their Spotify URI it is easy
           * to find their track id (e.g. spotify:track:<here_is_the_track_id>)
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.removeFromMySavedTracks = function(
            trackIds,
            options,
            callback
          ) {
            var requestData = {
              url: _baseUri + "/me/tracks",
              type: "DELETE",
              postData: trackIds
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Checks if the current user's saved tracks contains a certain list of tracks.
           * See [Check Current User's Saved Tracks](https://developer.spotify.com/web-api/check-users-saved-tracks/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {Array<string>} trackIds The ids of the tracks. If you know their Spotify URI it is easy
           * to find their track id (e.g. spotify:track:<here_is_the_track_id>)
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.containsMySavedTracks = function(
            trackIds,
            options,
            callback
          ) {
            var requestData = {
              url: _baseUri + "/me/tracks/contains",
              params: { ids: trackIds.join(",") }
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Get a list of the albums saved in the current Spotify user's "Your Music" library.
           * See [Get Current User's Saved Albums](https://developer.spotify.com/web-api/get-users-saved-albums/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.getMySavedAlbums = function(options, callback) {
            var requestData = {
              url: _baseUri + "/me/albums"
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Save one or more albums to the current user's "Your Music" library.
           * See [Save Albums for Current User](https://developer.spotify.com/web-api/save-albums-user/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {Array<string>} albumIds The ids of the albums. If you know their Spotify URI, it is easy
           * to find their album id (e.g. spotify:album:<here_is_the_album_id>)
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.addToMySavedAlbums = function(
            albumIds,
            options,
            callback
          ) {
            var requestData = {
              url: _baseUri + "/me/albums",
              type: "PUT",
              postData: albumIds
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Remove one or more albums from the current user's "Your Music" library.
           * See [Remove Albums for Current User](https://developer.spotify.com/web-api/remove-albums-user/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {Array<string>} albumIds The ids of the albums. If you know their Spotify URI, it is easy
           * to find their album id (e.g. spotify:album:<here_is_the_album_id>)
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.removeFromMySavedAlbums = function(
            albumIds,
            options,
            callback
          ) {
            var requestData = {
              url: _baseUri + "/me/albums",
              type: "DELETE",
              postData: albumIds
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Check if one or more albums is already saved in the current Spotify user's "Your Music" library.
           * See [Check User's Saved Albums](https://developer.spotify.com/web-api/check-users-saved-albums/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {Array<string>} albumIds The ids of the albums. If you know their Spotify URI, it is easy
           * to find their album id (e.g. spotify:album:<here_is_the_album_id>)
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.containsMySavedAlbums = function(
            albumIds,
            options,
            callback
          ) {
            var requestData = {
              url: _baseUri + "/me/albums/contains",
              params: { ids: albumIds.join(",") }
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Get the current user’s top artists based on calculated affinity.
           * See [Get a User’s Top Artists](https://developer.spotify.com/web-api/get-users-top-artists-and-tracks/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.getMyTopArtists = function(options, callback) {
            var requestData = {
              url: _baseUri + "/me/top/artists"
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Get the current user’s top tracks based on calculated affinity.
           * See [Get a User’s Top Tracks](https://developer.spotify.com/web-api/get-users-top-artists-and-tracks/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.getMyTopTracks = function(options, callback) {
            var requestData = {
              url: _baseUri + "/me/top/tracks"
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Get tracks from the current user’s recently played tracks.
           * See [Get Current User’s Recently Played Tracks](https://developer.spotify.com/web-api/web-api-personalization-endpoints/get-recently-played/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.getMyRecentlyPlayedTracks = function(
            options,
            callback
          ) {
            var requestData = {
              url: _baseUri + "/me/player/recently-played"
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Adds the current user as a follower of one or more other Spotify users.
           * See [Follow Artists or Users](https://developer.spotify.com/web-api/follow-artists-users/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {Array<string>} userIds The ids of the users. If you know their Spotify URI it is easy
           * to find their user id (e.g. spotify:user:<here_is_the_user_id>)
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is an empty value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.followUsers = function(userIds, callback) {
            var requestData = {
              url: _baseUri + "/me/following/",
              type: "PUT",
              params: {
                ids: userIds.join(","),
                type: "user"
              }
            };
            return _checkParamsAndPerformRequest(requestData, callback);
          };

          /**
           * Adds the current user as a follower of one or more artists.
           * See [Follow Artists or Users](https://developer.spotify.com/web-api/follow-artists-users/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {Array<string>} artistIds The ids of the artists. If you know their Spotify URI it is easy
           * to find their artist id (e.g. spotify:artist:<here_is_the_artist_id>)
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is an empty value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.followArtists = function(artistIds, callback) {
            var requestData = {
              url: _baseUri + "/me/following/",
              type: "PUT",
              params: {
                ids: artistIds.join(","),
                type: "artist"
              }
            };
            return _checkParamsAndPerformRequest(requestData, callback);
          };

          /**
           * Add the current user as a follower of one playlist.
           * See [Follow a Playlist](https://developer.spotify.com/web-api/follow-playlist/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {string} playlistId The id of the playlist. If you know the Spotify URI it is easy
           * to find the playlist id (e.g. spotify:user:xxxx:playlist:<here_is_the_playlist_id>)
           * @param {Object} options A JSON object with options that can be passed. For instance,
           * whether you want the playlist to be followed privately ({public: false})
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is an empty value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.followPlaylist = function(
            playlistId,
            options,
            callback
          ) {
            var requestData = {
              url: _baseUri + "/playlists/" + playlistId + "/followers",
              type: "PUT",
              postData: {}
            };

            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Removes the current user as a follower of one or more other Spotify users.
           * See [Unfollow Artists or Users](https://developer.spotify.com/web-api/unfollow-artists-users/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {Array<string>} userIds The ids of the users. If you know their Spotify URI it is easy
           * to find their user id (e.g. spotify:user:<here_is_the_user_id>)
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is an empty value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.unfollowUsers = function(userIds, callback) {
            var requestData = {
              url: _baseUri + "/me/following/",
              type: "DELETE",
              params: {
                ids: userIds.join(","),
                type: "user"
              }
            };
            return _checkParamsAndPerformRequest(requestData, callback);
          };

          /**
           * Removes the current user as a follower of one or more artists.
           * See [Unfollow Artists or Users](https://developer.spotify.com/web-api/unfollow-artists-users/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {Array<string>} artistIds The ids of the artists. If you know their Spotify URI it is easy
           * to find their artist id (e.g. spotify:artist:<here_is_the_artist_id>)
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is an empty value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.unfollowArtists = function(artistIds, callback) {
            var requestData = {
              url: _baseUri + "/me/following/",
              type: "DELETE",
              params: {
                ids: artistIds.join(","),
                type: "artist"
              }
            };
            return _checkParamsAndPerformRequest(requestData, callback);
          };

          /**
           * Remove the current user as a follower of one playlist.
           * See [Unfollow a Playlist](https://developer.spotify.com/web-api/unfollow-playlist/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {string} playlistId The id of the playlist. If you know the Spotify URI it is easy
           * to find the playlist id (e.g. spotify:user:xxxx:playlist:<here_is_the_playlist_id>)
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is an empty value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.unfollowPlaylist = function(playlistId, callback) {
            var requestData = {
              url: _baseUri + "/playlists/" + playlistId + "/followers",
              type: "DELETE"
            };
            return _checkParamsAndPerformRequest(requestData, callback);
          };

          /**
           * Checks to see if the current user is following one or more other Spotify users.
           * See [Check if Current User Follows Users or Artists](https://developer.spotify.com/web-api/check-current-user-follows/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {Array<string>} userIds The ids of the users. If you know their Spotify URI it is easy
           * to find their user id (e.g. spotify:user:<here_is_the_user_id>)
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is an array of boolean values that indicate
           * whether the user is following the users sent in the request.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.isFollowingUsers = function(userIds, callback) {
            var requestData = {
              url: _baseUri + "/me/following/contains",
              type: "GET",
              params: {
                ids: userIds.join(","),
                type: "user"
              }
            };
            return _checkParamsAndPerformRequest(requestData, callback);
          };

          /**
           * Checks to see if the current user is following one or more artists.
           * See [Check if Current User Follows](https://developer.spotify.com/web-api/check-current-user-follows/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {Array<string>} artistIds The ids of the artists. If you know their Spotify URI it is easy
           * to find their artist id (e.g. spotify:artist:<here_is_the_artist_id>)
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is an array of boolean values that indicate
           * whether the user is following the artists sent in the request.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.isFollowingArtists = function(artistIds, callback) {
            var requestData = {
              url: _baseUri + "/me/following/contains",
              type: "GET",
              params: {
                ids: artistIds.join(","),
                type: "artist"
              }
            };
            return _checkParamsAndPerformRequest(requestData, callback);
          };

          /**
           * Check to see if one or more Spotify users are following a specified playlist.
           * See [Check if Users Follow a Playlist](https://developer.spotify.com/web-api/check-user-following-playlist/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {string} playlistId The id of the playlist. If you know the Spotify URI it is easy
           * to find the playlist id (e.g. spotify:user:xxxx:playlist:<here_is_the_playlist_id>)
           * @param {Array<string>} userIds The ids of the users. If you know their Spotify URI it is easy
           * to find their user id (e.g. spotify:user:<here_is_the_user_id>)
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is an array of boolean values that indicate
           * whether the users are following the playlist sent in the request.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.areFollowingPlaylist = function(
            playlistId,
            userIds,
            callback
          ) {
            var requestData = {
              url:
                _baseUri + "/playlists/" + playlistId + "/followers/contains",
              type: "GET",
              params: {
                ids: userIds.join(",")
              }
            };
            return _checkParamsAndPerformRequest(requestData, callback);
          };

          /**
           * Get the current user's followed artists.
           * See [Get User's Followed Artists](https://developer.spotify.com/web-api/get-followed-artists/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {Object} [options] Options, being after and limit.
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is an object with a paged object containing
           * artists.
           * @returns {Promise|undefined} A promise that if successful, resolves to an object containing a paging object which contains
           * artists objects. Not returned if a callback is given.
           */
          Constr.prototype.getFollowedArtists = function(options, callback) {
            var requestData = {
              url: _baseUri + "/me/following",
              type: "GET",
              params: {
                type: "artist"
              }
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Fetches information about a specific user.
           * See [Get a User's Profile](https://developer.spotify.com/web-api/get-users-profile/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {string} userId The id of the user. If you know the Spotify URI it is easy
           * to find the id (e.g. spotify:user:<here_is_the_id>)
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.getUser = function(userId, options, callback) {
            var requestData = {
              url: _baseUri + "/users/" + encodeURIComponent(userId)
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Fetches a list of the current user's playlists.
           * See [Get a List of a User's Playlists](https://developer.spotify.com/web-api/get-list-users-playlists/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {string} userId An optional id of the user. If you know the Spotify URI it is easy
           * to find the id (e.g. spotify:user:<here_is_the_id>). If not provided, the id of the user that granted
           * the permissions will be used.
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.getUserPlaylists = function(
            userId,
            options,
            callback
          ) {
            var requestData;
            if (typeof userId === "string") {
              requestData = {
                url:
                  _baseUri +
                  "/users/" +
                  encodeURIComponent(userId) +
                  "/playlists"
              };
            } else {
              requestData = {
                url: _baseUri + "/me/playlists"
              };
              callback = options;
              options = userId;
            }
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Fetches a specific playlist.
           * See [Get a Playlist](https://developer.spotify.com/web-api/get-playlist/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {string} playlistId The id of the playlist. If you know the Spotify URI it is easy
           * to find the playlist id (e.g. spotify:user:xxxx:playlist:<here_is_the_playlist_id>)
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.getPlaylist = function(
            playlistId,
            options,
            callback
          ) {
            var requestData = {
              url: _baseUri + "/playlists/" + playlistId
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Fetches the tracks from a specific playlist.
           * See [Get a Playlist's Tracks](https://developer.spotify.com/web-api/get-playlists-tracks/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {string} playlistId The id of the playlist. If you know the Spotify URI it is easy
           * to find the playlist id (e.g. spotify:user:xxxx:playlist:<here_is_the_playlist_id>)
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.getPlaylistTracks = function(
            playlistId,
            options,
            callback
          ) {
            var requestData = {
              url: _baseUri + "/playlists/" + playlistId + "/tracks"
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Gets the current image associated with a specific playlist.
           * See [Get a Playlist Cover Image](https://developer.spotify.com/documentation/web-api/reference/playlists/get-playlist-cover/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {string} playlistId The id of the playlist. If you know the Spotify URI it is easy
           * to find the playlist id (e.g. spotify:playlist:<here_is_the_playlist_id>)
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.getPlaylistCoverImage = function(
            playlistId,
            callback
          ) {
            var requestData = {
              url: _baseUri + "/playlists/" + playlistId + "/images"
            };
            return _checkParamsAndPerformRequest(requestData, callback);
          };

          /**
           * Creates a playlist and stores it in the current user's library.
           * See [Create a Playlist](https://developer.spotify.com/web-api/create-playlist/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {string} userId The id of the user. If you know the Spotify URI it is easy
           * to find the id (e.g. spotify:user:<here_is_the_id>)
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.createPlaylist = function(
            userId,
            options,
            callback
          ) {
            var requestData = {
              url:
                _baseUri +
                "/users/" +
                encodeURIComponent(userId) +
                "/playlists",
              type: "POST",
              postData: options
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Change a playlist's name and public/private state
           * See [Change a Playlist's Details](https://developer.spotify.com/web-api/change-playlist-details/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {string} playlistId The id of the playlist. If you know the Spotify URI it is easy
           * to find the playlist id (e.g. spotify:user:xxxx:playlist:<here_is_the_playlist_id>)
           * @param {Object} data A JSON object with the data to update. E.g. {name: 'A new name', public: true}
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.changePlaylistDetails = function(
            playlistId,
            data,
            callback
          ) {
            var requestData = {
              url: _baseUri + "/playlists/" + playlistId,
              type: "PUT",
              postData: data
            };
            return _checkParamsAndPerformRequest(requestData, data, callback);
          };

          /**
           * Add tracks to a playlist.
           * See [Add Tracks to a Playlist](https://developer.spotify.com/web-api/add-tracks-to-playlist/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {string} playlistId The id of the playlist. If you know the Spotify URI it is easy
           * to find the playlist id (e.g. spotify:user:xxxx:playlist:<here_is_the_playlist_id>)
           * @param {Array<string>} uris An array of Spotify URIs for the tracks
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.addTracksToPlaylist = function(
            playlistId,
            uris,
            options,
            callback
          ) {
            var requestData = {
              url: _baseUri + "/playlists/" + playlistId + "/tracks",
              type: "POST",
              postData: {
                uris: uris
              }
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback,
              true
            );
          };

          /**
           * Replace the tracks of a playlist
           * See [Replace a Playlist's Tracks](https://developer.spotify.com/web-api/replace-playlists-tracks/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {string} playlistId The id of the playlist. If you know the Spotify URI it is easy
           * to find the playlist id (e.g. spotify:user:xxxx:playlist:<here_is_the_playlist_id>)
           * @param {Array<string>} uris An array of Spotify URIs for the tracks
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.replaceTracksInPlaylist = function(
            playlistId,
            uris,
            callback
          ) {
            var requestData = {
              url: _baseUri + "/playlists/" + playlistId + "/tracks",
              type: "PUT",
              postData: { uris: uris }
            };
            return _checkParamsAndPerformRequest(requestData, {}, callback);
          };

          /**
           * Reorder tracks in a playlist
           * See [Reorder a Playlist’s Tracks](https://developer.spotify.com/web-api/reorder-playlists-tracks/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {string} playlistId The id of the playlist. If you know the Spotify URI it is easy
           * to find the playlist id (e.g. spotify:user:xxxx:playlist:<here_is_the_playlist_id>)
           * @param {number} rangeStart The position of the first track to be reordered.
           * @param {number} insertBefore The position where the tracks should be inserted. To reorder the tracks to
           * the end of the playlist, simply set insert_before to the position after the last track.
           * @param {Object} options An object with optional parameters (range_length, snapshot_id)
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.reorderTracksInPlaylist = function(
            playlistId,
            rangeStart,
            insertBefore,
            options,
            callback
          ) {
            /* eslint-disable camelcase */
            var requestData = {
              url: _baseUri + "/playlists/" + playlistId + "/tracks",
              type: "PUT",
              postData: {
                range_start: rangeStart,
                insert_before: insertBefore
              }
            };
            /* eslint-enable camelcase */
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Remove tracks from a playlist
           * See [Remove Tracks from a Playlist](https://developer.spotify.com/web-api/remove-tracks-playlist/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {string} playlistId The id of the playlist. If you know the Spotify URI it is easy
           * to find the playlist id (e.g. spotify:user:xxxx:playlist:<here_is_the_playlist_id>)
           * @param {Array<Object>} uris An array of tracks to be removed. Each element of the array can be either a
           * string, in which case it is treated as a URI, or an object containing the properties `uri` (which is a
           * string) and `positions` (which is an array of integers).
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.removeTracksFromPlaylist = function(
            playlistId,
            uris,
            callback
          ) {
            var dataToBeSent = uris.map(function(uri) {
              if (typeof uri === "string") {
                return { uri: uri };
              } else {
                return uri;
              }
            });

            var requestData = {
              url: _baseUri + "/playlists/" + playlistId + "/tracks",
              type: "DELETE",
              postData: { tracks: dataToBeSent }
            };
            return _checkParamsAndPerformRequest(requestData, {}, callback);
          };

          /**
           * Remove tracks from a playlist, specifying a snapshot id.
           * See [Remove Tracks from a Playlist](https://developer.spotify.com/web-api/remove-tracks-playlist/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {string} playlistId The id of the playlist. If you know the Spotify URI it is easy
           * to find the playlist id (e.g. spotify:user:xxxx:playlist:<here_is_the_playlist_id>)
           * @param {Array<Object>} uris An array of tracks to be removed. Each element of the array can be either a
           * string, in which case it is treated as a URI, or an object containing the properties `uri` (which is a
           * string) and `positions` (which is an array of integers).
           * @param {string} snapshotId The playlist's snapshot ID against which you want to make the changes
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.removeTracksFromPlaylistWithSnapshotId = function(
            playlistId,
            uris,
            snapshotId,
            callback
          ) {
            var dataToBeSent = uris.map(function(uri) {
              if (typeof uri === "string") {
                return { uri: uri };
              } else {
                return uri;
              }
            });
            /* eslint-disable camelcase */
            var requestData = {
              url: _baseUri + "/playlists/" + playlistId + "/tracks",
              type: "DELETE",
              postData: {
                tracks: dataToBeSent,
                snapshot_id: snapshotId
              }
            };
            /* eslint-enable camelcase */
            return _checkParamsAndPerformRequest(requestData, {}, callback);
          };

          /**
           * Remove tracks from a playlist, specifying the positions of the tracks to be removed.
           * See [Remove Tracks from a Playlist](https://developer.spotify.com/web-api/remove-tracks-playlist/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {string} playlistId The id of the playlist. If you know the Spotify URI it is easy
           * to find the playlist id (e.g. spotify:user:xxxx:playlist:<here_is_the_playlist_id>)
           * @param {Array<number>} positions array of integers containing the positions of the tracks to remove
           * from the playlist.
           * @param {string} snapshotId The playlist's snapshot ID against which you want to make the changes
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.removeTracksFromPlaylistInPositions = function(
            playlistId,
            positions,
            snapshotId,
            callback
          ) {
            /* eslint-disable camelcase */
            var requestData = {
              url: _baseUri + "/playlists/" + playlistId + "/tracks",
              type: "DELETE",
              postData: {
                positions: positions,
                snapshot_id: snapshotId
              }
            };
            /* eslint-enable camelcase */
            return _checkParamsAndPerformRequest(requestData, {}, callback);
          };

          /**
           * Upload a custom playlist cover image.
           * See [Upload A Custom Playlist Cover Image](https://developer.spotify.com/web-api/upload-a-custom-playlist-cover-image/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {string} playlistId The id of the playlist. If you know the Spotify URI it is easy
           * to find the playlist id (e.g. spotify:user:xxxx:playlist:<here_is_the_playlist_id>)
           * @param {string} imageData Base64 encoded JPEG image data, maximum payload size is 256 KB.
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.uploadCustomPlaylistCoverImage = function(
            playlistId,
            imageData,
            callback
          ) {
            var requestData = {
              url: _baseUri + "/playlists/" + playlistId + "/images",
              type: "PUT",
              postData: imageData.replace(/^data:image\/jpeg;base64,/, ""),
              contentType: "image/jpeg"
            };
            return _checkParamsAndPerformRequest(requestData, {}, callback);
          };

          /**
           * Fetches an album from the Spotify catalog.
           * See [Get an Album](https://developer.spotify.com/web-api/get-album/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {string} albumId The id of the album. If you know the Spotify URI it is easy
           * to find the album id (e.g. spotify:album:<here_is_the_album_id>)
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.getAlbum = function(albumId, options, callback) {
            var requestData = {
              url: _baseUri + "/albums/" + albumId
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Fetches the tracks of an album from the Spotify catalog.
           * See [Get an Album's Tracks](https://developer.spotify.com/web-api/get-albums-tracks/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {string} albumId The id of the album. If you know the Spotify URI it is easy
           * to find the album id (e.g. spotify:album:<here_is_the_album_id>)
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.getAlbumTracks = function(
            albumId,
            options,
            callback
          ) {
            var requestData = {
              url: _baseUri + "/albums/" + albumId + "/tracks"
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Fetches multiple albums from the Spotify catalog.
           * See [Get Several Albums](https://developer.spotify.com/web-api/get-several-albums/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {Array<string>} albumIds The ids of the albums. If you know their Spotify URI it is easy
           * to find their album id (e.g. spotify:album:<here_is_the_album_id>)
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.getAlbums = function(albumIds, options, callback) {
            var requestData = {
              url: _baseUri + "/albums/",
              params: { ids: albumIds.join(",") }
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Fetches a track from the Spotify catalog.
           * See [Get a Track](https://developer.spotify.com/web-api/get-track/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {string} trackId The id of the track. If you know the Spotify URI it is easy
           * to find the track id (e.g. spotify:track:<here_is_the_track_id>)
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.getTrack = function(trackId, options, callback) {
            var requestData = {};
            requestData.url = _baseUri + "/tracks/" + trackId;
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Fetches multiple tracks from the Spotify catalog.
           * See [Get Several Tracks](https://developer.spotify.com/web-api/get-several-tracks/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {Array<string>} trackIds The ids of the tracks. If you know their Spotify URI it is easy
           * to find their track id (e.g. spotify:track:<here_is_the_track_id>)
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.getTracks = function(trackIds, options, callback) {
            var requestData = {
              url: _baseUri + "/tracks/",
              params: { ids: trackIds.join(",") }
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Fetches an artist from the Spotify catalog.
           * See [Get an Artist](https://developer.spotify.com/web-api/get-artist/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {string} artistId The id of the artist. If you know the Spotify URI it is easy
           * to find the artist id (e.g. spotify:artist:<here_is_the_artist_id>)
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.getArtist = function(artistId, options, callback) {
            var requestData = {
              url: _baseUri + "/artists/" + artistId
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Fetches multiple artists from the Spotify catalog.
           * See [Get Several Artists](https://developer.spotify.com/web-api/get-several-artists/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {Array<string>} artistIds The ids of the artists. If you know their Spotify URI it is easy
           * to find their artist id (e.g. spotify:artist:<here_is_the_artist_id>)
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.getArtists = function(artistIds, options, callback) {
            var requestData = {
              url: _baseUri + "/artists/",
              params: { ids: artistIds.join(",") }
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Fetches the albums of an artist from the Spotify catalog.
           * See [Get an Artist's Albums](https://developer.spotify.com/web-api/get-artists-albums/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {string} artistId The id of the artist. If you know the Spotify URI it is easy
           * to find the artist id (e.g. spotify:artist:<here_is_the_artist_id>)
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.getArtistAlbums = function(
            artistId,
            options,
            callback
          ) {
            var requestData = {
              url: _baseUri + "/artists/" + artistId + "/albums"
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Fetches a list of top tracks of an artist from the Spotify catalog, for a specific country.
           * See [Get an Artist's Top Tracks](https://developer.spotify.com/web-api/get-artists-top-tracks/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {string} artistId The id of the artist. If you know the Spotify URI it is easy
           * to find the artist id (e.g. spotify:artist:<here_is_the_artist_id>)
           * @param {string} countryId The id of the country (e.g. ES for Spain or US for United States)
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.getArtistTopTracks = function(
            artistId,
            countryId,
            options,
            callback
          ) {
            var requestData = {
              url: _baseUri + "/artists/" + artistId + "/top-tracks",
              params: { country: countryId }
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Fetches a list of artists related with a given one from the Spotify catalog.
           * See [Get an Artist's Related Artists](https://developer.spotify.com/web-api/get-related-artists/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {string} artistId The id of the artist. If you know the Spotify URI it is easy
           * to find the artist id (e.g. spotify:artist:<here_is_the_artist_id>)
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.getArtistRelatedArtists = function(
            artistId,
            options,
            callback
          ) {
            var requestData = {
              url: _baseUri + "/artists/" + artistId + "/related-artists"
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Fetches a list of Spotify featured playlists (shown, for example, on a Spotify player's "Browse" tab).
           * See [Get a List of Featured Playlists](https://developer.spotify.com/web-api/get-list-featured-playlists/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.getFeaturedPlaylists = function(options, callback) {
            var requestData = {
              url: _baseUri + "/browse/featured-playlists"
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Fetches a list of new album releases featured in Spotify (shown, for example, on a Spotify player's "Browse" tab).
           * See [Get a List of New Releases](https://developer.spotify.com/web-api/get-list-new-releases/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.getNewReleases = function(options, callback) {
            var requestData = {
              url: _baseUri + "/browse/new-releases"
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Get a list of categories used to tag items in Spotify (on, for example, the Spotify player's "Browse" tab).
           * See [Get a List of Categories](https://developer.spotify.com/web-api/get-list-categories/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.getCategories = function(options, callback) {
            var requestData = {
              url: _baseUri + "/browse/categories"
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Get a single category used to tag items in Spotify (on, for example, the Spotify player's "Browse" tab).
           * See [Get a Category](https://developer.spotify.com/web-api/get-category/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {string} categoryId The id of the category. These can be found with the getCategories function
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.getCategory = function(
            categoryId,
            options,
            callback
          ) {
            var requestData = {
              url: _baseUri + "/browse/categories/" + categoryId
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Get a list of Spotify playlists tagged with a particular category.
           * See [Get a Category's Playlists](https://developer.spotify.com/web-api/get-categorys-playlists/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {string} categoryId The id of the category. These can be found with the getCategories function
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.getCategoryPlaylists = function(
            categoryId,
            options,
            callback
          ) {
            var requestData = {
              url: _baseUri + "/browse/categories/" + categoryId + "/playlists"
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Get Spotify catalog information about artists, albums, tracks or playlists that match a keyword string.
           * See [Search for an Item](https://developer.spotify.com/web-api/search-item/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {string} query The search query
           * @param {Array<string>} types An array of item types to search across.
           * Valid types are: 'album', 'artist', 'playlist', and 'track'.
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.search = function(query, types, options, callback) {
            var requestData = {
              url: _baseUri + "/search/",
              params: {
                q: query,
                type: types.join(",")
              }
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Fetches albums from the Spotify catalog according to a query.
           * See [Search for an Item](https://developer.spotify.com/web-api/search-item/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {string} query The search query
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.searchAlbums = function(query, options, callback) {
            return this.search(query, ["album"], options, callback);
          };

          /**
           * Fetches artists from the Spotify catalog according to a query.
           * See [Search for an Item](https://developer.spotify.com/web-api/search-item/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {string} query The search query
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.searchArtists = function(query, options, callback) {
            return this.search(query, ["artist"], options, callback);
          };

          /**
           * Fetches tracks from the Spotify catalog according to a query.
           * See [Search for an Item](https://developer.spotify.com/web-api/search-item/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {string} query The search query
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.searchTracks = function(query, options, callback) {
            return this.search(query, ["track"], options, callback);
          };

          /**
           * Fetches playlists from the Spotify catalog according to a query.
           * See [Search for an Item](https://developer.spotify.com/web-api/search-item/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {string} query The search query
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.searchPlaylists = function(
            query,
            options,
            callback
          ) {
            return this.search(query, ["playlist"], options, callback);
          };

          /**
           * Fetches shows from the Spotify catalog according to a query.
           * See [Search for an Item](https://developer.spotify.com/web-api/search-item/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {string} query The search query
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.searchShows = function(query, options, callback) {
            return this.search(query, ["show"], options, callback);
          };

          /**
           * Fetches episodes from the Spotify catalog according to a query.
           * See [Search for an Item](https://developer.spotify.com/web-api/search-item/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {string} query The search query
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.searchEpisodes = function(query, options, callback) {
            return this.search(query, ["episode"], options, callback);
          };

          /**
           * Get audio features for a single track identified by its unique Spotify ID.
           * See [Get Audio Features for a Track](https://developer.spotify.com/web-api/get-audio-features/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {string} trackId The id of the track. If you know the Spotify URI it is easy
           * to find the track id (e.g. spotify:track:<here_is_the_track_id>)
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.getAudioFeaturesForTrack = function(
            trackId,
            callback
          ) {
            var requestData = {};
            requestData.url = _baseUri + "/audio-features/" + trackId;
            return _checkParamsAndPerformRequest(requestData, {}, callback);
          };

          /**
           * Get audio features for multiple tracks based on their Spotify IDs.
           * See [Get Audio Features for Several Tracks](https://developer.spotify.com/web-api/get-several-audio-features/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {Array<string>} trackIds The ids of the tracks. If you know their Spotify URI it is easy
           * to find their track id (e.g. spotify:track:<here_is_the_track_id>)
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.getAudioFeaturesForTracks = function(
            trackIds,
            callback
          ) {
            var requestData = {
              url: _baseUri + "/audio-features",
              params: { ids: trackIds }
            };
            return _checkParamsAndPerformRequest(requestData, {}, callback);
          };

          /**
           * Get audio analysis for a single track identified by its unique Spotify ID.
           * See [Get Audio Analysis for a Track](https://developer.spotify.com/web-api/get-audio-analysis/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {string} trackId The id of the track. If you know the Spotify URI it is easy
           * to find the track id (e.g. spotify:track:<here_is_the_track_id>)
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.getAudioAnalysisForTrack = function(
            trackId,
            callback
          ) {
            var requestData = {};
            requestData.url = _baseUri + "/audio-analysis/" + trackId;
            return _checkParamsAndPerformRequest(requestData, {}, callback);
          };

          /**
           * Create a playlist-style listening experience based on seed artists, tracks and genres.
           * See [Get Recommendations Based on Seeds](https://developer.spotify.com/web-api/get-recommendations/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.getRecommendations = function(options, callback) {
            var requestData = {
              url: _baseUri + "/recommendations"
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Retrieve a list of available genres seed parameter values for recommendations.
           * See [Available Genre Seeds](https://developer.spotify.com/web-api/get-recommendations/#available-genre-seeds) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.getAvailableGenreSeeds = function(callback) {
            var requestData = {
              url: _baseUri + "/recommendations/available-genre-seeds"
            };
            return _checkParamsAndPerformRequest(requestData, {}, callback);
          };

          /**
           * Get information about a user’s available devices.
           * See [Get a User’s Available Devices](https://developer.spotify.com/web-api/get-a-users-available-devices/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.getMyDevices = function(callback) {
            var requestData = {
              url: _baseUri + "/me/player/devices"
            };
            return _checkParamsAndPerformRequest(requestData, {}, callback);
          };

          /**
           * Get information about the user’s current playback state, including track, track progress, and active device.
           * See [Get Information About The User’s Current Playback](https://developer.spotify.com/web-api/get-information-about-the-users-current-playback/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {Object} options A JSON object with options that can be passed.
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.getMyCurrentPlaybackState = function(
            options,
            callback
          ) {
            var requestData = {
              url: _baseUri + "/me/player"
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Get the object currently being played on the user’s Spotify account.
           * See [Get the User’s Currently Playing Track](https://developer.spotify.com/web-api/get-the-users-currently-playing-track/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {Object} options A JSON object with options that can be passed.
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.getMyCurrentPlayingTrack = function(
            options,
            callback
          ) {
            var requestData = {
              url: _baseUri + "/me/player/currently-playing"
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Transfer playback to a new device and determine if it should start playing.
           * See [Transfer a User’s Playback](https://developer.spotify.com/web-api/transfer-a-users-playback/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {Array<string>} deviceIds A JSON array containing the ID of the device on which playback should be started/transferred.
           * @param {Object} options A JSON object with options that can be passed.
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.transferMyPlayback = function(
            deviceIds,
            options,
            callback
          ) {
            var postData = options || {};
            postData.device_ids = deviceIds;
            var requestData = {
              type: "PUT",
              url: _baseUri + "/me/player",
              postData: postData
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Start a new context or resume current playback on the user’s active device.
           * See [Start/Resume a User’s Playback](https://developer.spotify.com/web-api/start-a-users-playback/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {Object} options A JSON object with options that can be passed.
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.play = function(options, callback) {
            options = options || {};
            var params =
              "device_id" in options ? { device_id: options.device_id } : null;
            var postData = {};
            ["context_uri", "uris", "offset", "position_ms"].forEach(function(
              field
            ) {
              if (field in options) {
                postData[field] = options[field];
              }
            });
            var requestData = {
              type: "PUT",
              url: _baseUri + "/me/player/play",
              params: params,
              postData: postData
            };

            // need to clear options so it doesn't add all of them to the query params
            var newOptions = typeof options === "function" ? options : {};
            return _checkParamsAndPerformRequest(
              requestData,
              newOptions,
              callback
            );
          };

          /**
           * Pause playback on the user’s account.
           * See [Pause a User’s Playback](https://developer.spotify.com/web-api/pause-a-users-playback/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {Object} options A JSON object with options that can be passed.
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.pause = function(options, callback) {
            options = options || {};
            var params =
              "device_id" in options ? { device_id: options.device_id } : null;
            var requestData = {
              type: "PUT",
              url: _baseUri + "/me/player/pause",
              params: params
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Skips to next track in the user’s queue.
           * See [Skip User’s Playback To Next Track](https://developer.spotify.com/web-api/skip-users-playback-to-next-track/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {Object} options A JSON object with options that can be passed.
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.skipToNext = function(options, callback) {
            options = options || {};
            var params =
              "device_id" in options ? { device_id: options.device_id } : null;
            var requestData = {
              type: "POST",
              url: _baseUri + "/me/player/next",
              params: params
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Skips to previous track in the user’s queue.
           * Note that this will ALWAYS skip to the previous track, regardless of the current track’s progress.
           * Returning to the start of the current track should be performed using `.seek()`
           * See [Skip User’s Playback To Previous Track](https://developer.spotify.com/web-api/skip-users-playback-to-next-track/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {Object} options A JSON object with options that can be passed.
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.skipToPrevious = function(options, callback) {
            options = options || {};
            var params =
              "device_id" in options ? { device_id: options.device_id } : null;
            var requestData = {
              type: "POST",
              url: _baseUri + "/me/player/previous",
              params: params
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Seeks to the given position in the user’s currently playing track.
           * See [Seek To Position In Currently Playing Track](https://developer.spotify.com/web-api/seek-to-position-in-currently-playing-track/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {number} position_ms The position in milliseconds to seek to. Must be a positive number.
           * @param {Object} options A JSON object with options that can be passed.
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.seek = function(position_ms, options, callback) {
            options = options || {};
            var params = {
              position_ms: position_ms
            };
            if ("device_id" in options) {
              params.device_id = options.device_id;
            }
            var requestData = {
              type: "PUT",
              url: _baseUri + "/me/player/seek",
              params: params
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Set the repeat mode for the user’s playback. Options are repeat-track, repeat-context, and off.
           * See [Set Repeat Mode On User’s Playback](https://developer.spotify.com/web-api/set-repeat-mode-on-users-playback/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {String} state A string set to 'track', 'context' or 'off'.
           * @param {Object} options A JSON object with options that can be passed.
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.setRepeat = function(state, options, callback) {
            options = options || {};
            var params = {
              state: state
            };
            if ("device_id" in options) {
              params.device_id = options.device_id;
            }
            var requestData = {
              type: "PUT",
              url: _baseUri + "/me/player/repeat",
              params: params
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Set the volume for the user’s current playback device.
           * See [Set Volume For User’s Playback](https://developer.spotify.com/web-api/set-volume-for-users-playback/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {number} volume_percent The volume to set. Must be a value from 0 to 100 inclusive.
           * @param {Object} options A JSON object with options that can be passed.
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.setVolume = function(
            volume_percent,
            options,
            callback
          ) {
            options = options || {};
            var params = {
              volume_percent: volume_percent
            };
            if ("device_id" in options) {
              params.device_id = options.device_id;
            }
            var requestData = {
              type: "PUT",
              url: _baseUri + "/me/player/volume",
              params: params
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Toggle shuffle on or off for user’s playback.
           * See [Toggle Shuffle For User’s Playback](https://developer.spotify.com/web-api/toggle-shuffle-for-users-playback/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {bool} state Whether or not to shuffle user's playback.
           * @param {Object} options A JSON object with options that can be passed.
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.setShuffle = function(state, options, callback) {
            options = options || {};
            var params = {
              state: state
            };
            if ("device_id" in options) {
              params.device_id = options.device_id;
            }
            var requestData = {
              type: "PUT",
              url: _baseUri + "/me/player/shuffle",
              params: params
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Fetches a show from the Spotify catalog.
           * See [Get a Show](https://developer.spotify.com/documentation/web-api/reference/shows/get-a-show/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {string} showId The id of the show. If you know the Spotify URI it is easy
           * to find the show id (e.g. spotify:show:<here_is_the_show_id>)
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.getShow = function(showId, options, callback) {
            var requestData = {};
            requestData.url = _baseUri + "/shows/" + showId;
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Fetches multiple shows from the Spotify catalog.
           * See [Get Several Shows](https://developer.spotify.com/documentation/web-api/reference/shows/get-several-shows/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {Array<string>} showIds The ids of the shows. If you know their Spotify URI it is easy
           * to find their show id (e.g. spotify:show:<here_is_the_show_id>)
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.getShows = function(showIds, options, callback) {
            var requestData = {
              url: _baseUri + "/shows/",
              params: { ids: showIds.join(",") }
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Fetches current user's saved shows.
           * See [Get Current User's Saved Shows](https://developer.spotify.com/documentation/web-api/reference/library/get-users-saved-shows/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.getMySavedShows = function(options, callback) {
            var requestData = {
              url: _baseUri + "/me/shows"
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Adds a list of shows to the current user's saved shows.
           * See [Save Shows for Current User](https://developer.spotify.com/documentation/web-api/reference/library/save-shows-user/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {Array<string>} showIds The ids of the shows. If you know their Spotify URI it is easy
           * to find their show id (e.g. spotify:show:<here_is_the_show_id>)
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.addToMySavedShows = function(
            showIds,
            options,
            callback
          ) {
            var requestData = {
              url: _baseUri + "/me/shows",
              type: "PUT",
              postData: showIds
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Remove a list of shows from the current user's saved shows.
           * See [Remove Shows for Current User](https://developer.spotify.com/documentation/web-api/reference/library/remove-shows-user/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {Array<string>} showIds The ids of the shows. If you know their Spotify URI it is easy
           * to find their show id (e.g. spotify:show:<here_is_the_show_id>)
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.removeFromMySavedShows = function(
            showIds,
            options,
            callback
          ) {
            var requestData = {
              url: _baseUri + "/me/shows",
              type: "DELETE",
              postData: showIds
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Checks if the current user's saved shows contains a certain list of shows.
           * See [Check Current User's Saved Shows](https://developer.spotify.com/documentation/web-api/reference/library/check-users-saved-shows/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {Array<string>} showIds The ids of the shows. If you know their Spotify URI it is easy
           * to find their show id (e.g. spotify:show:<here_is_the_show_id>)
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.containsMySavedShows = function(
            showIds,
            options,
            callback
          ) {
            var requestData = {
              url: _baseUri + "/me/shows/contains",
              params: { ids: showIds.join(",") }
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Fetches the episodes of a show from the Spotify catalog.
           * See [Get a Show's Episodes](https://developer.spotify.com/documentation/web-api/reference/shows/get-shows-episodes/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {string} showId The id of the show. If you know the Spotify URI it is easy
           * to find the show id (e.g. spotify:show:<here_is_the_show_id>)
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.getShowEpisodes = function(
            showId,
            options,
            callback
          ) {
            var requestData = {
              url: _baseUri + "/shows/" + showId + "/episodes"
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Fetches an episode from the Spotify catalog.
           * See [Get an Episode](https://developer.spotify.com/documentation/web-api/reference/episodes/get-an-episode/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {string} episodeId The id of the episode. If you know the Spotify URI it is easy
           * to find the episode id (e.g. spotify:episode:<here_is_the_episode_id>)
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.getEpisode = function(episodeId, options, callback) {
            var requestData = {};
            requestData.url = _baseUri + "/episodes/" + episodeId;
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Fetches multiple episodes from the Spotify catalog.
           * See [Get Several Episodes](https://developer.spotify.com/documentation/web-api/reference/episodes/get-several-episodes/) on
           * the Spotify Developer site for more information about the endpoint.
           *
           * @param {Array<string>} episodeIds The ids of the episodes. If you know their Spotify URI it is easy
           * to find their episode id (e.g. spotify:episode:<here_is_the_episode_id>)
           * @param {Object} options A JSON object with options that can be passed
           * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
           * one is the error object (null if no error), and the second is the value if the request succeeded.
           * @return {Object} Null if a callback is provided, a `Promise` object otherwise
           */
          Constr.prototype.getEpisodes = function(
            episodeIds,
            options,
            callback
          ) {
            var requestData = {
              url: _baseUri + "/episodes/",
              params: { ids: episodeIds.join(",") }
            };
            return _checkParamsAndPerformRequest(
              requestData,
              options,
              callback
            );
          };

          /**
           * Gets the access token in use.
           *
           * @return {string} accessToken The access token
           */
          Constr.prototype.getAccessToken = function() {
            return _accessToken;
          };

          /**
           * Sets the access token to be used.
           * See [the Authorization Guide](https://developer.spotify.com/web-api/authorization-guide/) on
           * the Spotify Developer site for more information about obtaining an access token.
           *
           * @param {string} accessToken The access token
           * @return {void}
           */
          Constr.prototype.setAccessToken = function(accessToken) {
            _accessToken = accessToken;
          };

          /**
           * Sets an implementation of Promises/A+ to be used. E.g. Q, when.
           * See [Conformant Implementations](https://github.com/promises-aplus/promises-spec/blob/master/implementations.md)
           * for a list of some available options
           *
           * @param {Object} PromiseImplementation A Promises/A+ valid implementation
           * @throws {Error} If the implementation being set doesn't conform with Promises/A+
           * @return {void}
           */
          Constr.prototype.setPromiseImplementation = function(
            PromiseImplementation
          ) {
            var valid = false;
            try {
              var p = new PromiseImplementation(function(resolve) {
                resolve();
              });
              if (
                typeof p.then === "function" &&
                typeof p.catch === "function"
              ) {
                valid = true;
              }
            } catch (e) {
              console.error(e);
            }
            if (valid) {
              _promiseImplementation = PromiseImplementation;
            } else {
              throw new Error("Unsupported implementation of Promises/A+");
            }
          };

          return Constr;
        })();

        if (typeof module === "object" && typeof module.exports === "object") {
          module.exports = SpotifyWebApi;
        }
      },
      {}
    ],
    3: [
      function(require, module, exports) {
        // var React = require('react');
        // var ReactDom = require('react-dom');

        //Using Spotify Web Api to simplify spotify api requests
        // https://github.com/JMPerez/spotify-web-api-js
        const Spotify = require("spotify-web-api-js");
        const sp = new Spotify();
        var userId = "";

        // // Using Promise Throttle to avoid rate limits when requesting tracks
        // // https://github.com/JMPerez/promise-throttle
        const PromiseThrottle = require("promise-throttle");
        const promiseThrottle = new PromiseThrottle({
          requestsPerSecond: 5, // up to 5 request per second
          promiseImplementation: Promise // the Promise library you are using
        });

        //Create Storege space
        //Global variables used to pass objects around
        var USER_PLAYLISTS = [];
        var ALL_PLAYLISTS = [];
        var CURR_TRACKS = [];

        document
          .getElementById("searchTracks")
          .addEventListener("click", search);
        document
          .getElementById("filterPlaylists")
          .addEventListener("click", filterPlaylists);
        document
          .getElementById("toggleShow")
          .addEventListener("change", toggleShow);
        // document.getElementById("refresh").addEventListener("click", refreshPlaylists);
        document
          .getElementById("clear")
          .addEventListener("click", clearCookies);

        function addEnter(element, button) {
          var e = document.getElementById(element);
          e.addEventListener("keyup", function(event) {
            // Number 13 is the "Enter" key on the keyboard
            if (event.keyCode === 13) {
              // Cancel the default action, if needed
              event.preventDefault();
              // Trigger the button element with a click
              document.getElementById(button).click();
            }
          });
        }
        addEnter("filterInput", "filterPlaylists");
        addEnter("searchInput", "searchTracks");

        // document.getElementById("xList").addEventListener("click", xList);
        // document.getElementById("remX").addEventListener("click", removeXTracks);
        document.getElementById("remX").addEventListener("click", xList);

        function getHashParams() {
          // Copied from SP OAuth examples
          console.log("GETTING HASH PARAMS");
          var hashParams = {};
          var e,
            r = /([^&;=]+)=?([^&;]*)/g,
            q = window.location.hash.substring(1);
          e = r.exec(q);
          while (e) {
            hashParams[e[1]] = decodeURIComponent(e[2]);
            e = r.exec(q);
          }
          return hashParams;
        }

        function setCookie(cname, cvalue, exhrs = 1) {
          var d = new Date();
          d.setTime(d.getTime() + exhrs * 60 * 60 * 1000);
          var expires = "expires=" + d.toUTCString();
          document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
        }

        function getCookie(cname) {
          var name = cname + "=";
          var decodedCookie = decodeURIComponent(document.cookie);
          var ca = decodedCookie.split(";");
          for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == " ") {
              c = c.substring(1);
            }
            if (c.indexOf(name) == 0) {
              return c.substring(name.length, c.length);
            }
          }
          return "";
        }

        function clearCookies() {
          setCookie("accessToken", params.access_token, -1);
        }

        console.log("loading in browser");

        //On Load get params
        var params = getHashParams();
        if (params.error) {
          alert("There was an error during the authentication");
        }
        if (params.access_token) {
          // if found params update cookies etc
          console.log("got hash params: ");
          console.log(params);

          setCookie("accessToken", params.access_token);
          setCookie("refreshToken", params.refresh_token, 999999999);
          console.log(document.cookie);

          sp.setAccessToken(params.access_token);
        } else if (getCookie("accessToken")) {
          // if no params found check cookies
          console.log("found access token in cookie");
          sp.setAccessToken(getCookie("accessToken"));
        } else {
          // if no access token found request a login
          console.log("Please log in.");
          //TODO use the refresh token here
          // window.location.href = "/login";
        }
        if (sp.getAccessToken()) {
          document.getElementById("loader").style.display = "none";
          document.getElementById("buttons").style.display = "block";
          document.getElementById("body").style.display = "block";
          
          console.log("Token found.. Starting Automatically");
          sp.getMe().then(r => {
            console.log(r.id);
            userId = r.id;
          });
          load();
        }

        async function load() {
          // USER_PLAYLISTS = await getPlaylists(1);
          getPlaylists(1)
            .then(res => {
              USER_PLAYLISTS = res;
              displayPlaylists(USER_PLAYLISTS);
            })
            .catch(err => {
              console.log("Please log in.");
              window.location.href = "http://localhost:8888";
            });
        }

        async function getPlaylists(owned = 0) {
          if (owned) {
            if (USER_PLAYLISTS.length == 0) {
              USER_PLAYLISTS = await requestUserPlaylists(0, owned);
            }
            return USER_PLAYLISTS;
          } else {
            if (ALL_PLAYLISTS.length == 0) {
              ALL_PLAYLISTS = await requestUserPlaylists(0, owned);
            }
            return ALL_PLAYLISTS;
          }
        }

        function toggleShow() {
          if (this.checked) {
            showMine();
          } else {
            showAll();
          }
        }

        function showAll() {
          getPlaylists().then(r => {
            displayPlaylists(ALL_PLAYLISTS);
          });
        }

        function showMine() {
          getPlaylists(1).then(displayPlaylists(USER_PLAYLISTS));
        }

        async function requestUserPlaylists(count = 0, owned = 0) {
          //returns an array of JSON playlist objects
          // console.log("requestUserPlaylists");

          let id = "";
          owned ? (id = userId) : "";

          // fileLog("Rquesting playlistsURL: " + playlistsURL);
          let limit = 50;
          let playlists = new Array();
          // console.log("curr count: " + count);

          let page = await promiseThrottle.add(
            sp.getUserPlaylists.bind(
              this,
              (options = { offset: count, limit: limit })
            )
          );
          page.err ? console.log("FAIL " + page.err) : "";
          // console.log(page.items);
          playlists = page.items;

          let next = page.next;
          count += page.items.length;
          total = page.total;

          log = `current: ${page.href}
					\n Next: ${next}
					\ncount: ${count}
					\ntotal: ${total}\n\n
					`;

          move("User Playlists", count, total);

          if (next && count < total) {
            playlists = playlists.concat(
              await requestUserPlaylists(count, owned)
            );
          }
          console.log("Returning playlists");
          if (owned) {
            playlists = playlists.filter(p => {
              return p.owner.id == userId;
            });
          }
          return playlists;
        }

        async function requestPlaylistTracks(playlist, count = 0) {
          //Returns an array of playlist track objects
          // console.log("requesting tracks for: " + playlistID + " curr count: " + count);
          playlistID = playlist.id;
          let limit = 100;
          let playlistTracks = new Array();

          let page = await promiseThrottle.add(
            sp.getPlaylistTracks.bind(
              this,
              playlistID,
              (options = { offset: count, limit: limit })
            )
          );
          page.err ? console.log("FAIL " + page.err) : "";
          playlistTracks = page.items;

          let next = page.next;
          count += page.items.length;
          total = page.total;

          log = `current: ${page.href}
					\n Next: ${next}
					\ncount: ${count}
					\ntotal: ${total}\n\n
					`;

          if (next && count < total) {
            playlistTracks = playlistTracks.concat(
              await requestPlaylistTracks(playlist, count)
            );
          }
          playlistTracks = playlistTracks.map(t => {
            if (typeof t === "undefined" || t.track == null) return;

            if (t.added_at) t = t.track;
            t.playlist = playlist;
            return t;
          });

          updateDisplay(
            "tracklistLog",
            playlist.name +
              " " +
              playlistID +
              " Track count: " +
              playlistTracks.length
          );
          return playlistTracks;
        }

        function download(text, filename) {
          var a = document.createElement("a");
          a.setAttribute(
            "href",
            "data:text/plain;charset=utf-8," + encodeURIComponent(text)
          );
          a.setAttribute("download", filename);
          a.click();

          // Call it:
          // var obj = {a: "Hello", b: "World"};
          // saveText( JSON.stringify(obj), "filename.json" );
        }

        function parseTracks() {
          console.log("PARSE");
          var tracksList = document.getElementById("tracksList");
          let tracks = [];
          console.log(tracksList);
          for (let i = 0; i < tracksList.childNodes.length; i++) {
            let c = tracksList.childNodes[i];
            console.log(c);
            let t = {};
            t.name = c.innerText.split(",")[0];
            t.id = c.id;
            t.playlistName = c.data - playlist - name;
            t.playlistId = c.data - playlist - id;
            tracks.push(t);
          }

          return tracks;
        }

        function getCurrentTracks() {
          // if(CURR_TRACKS.length == 0){
          // 	CURR_TRACKS = parseTracks();
          // }
          // if (CURR_TRACKS.length==0){
          // 	console.log("No tracks found!")
          // 	throw("No tracks found!")
          // }
          CURR_TRACKS = parseTracks();

          return CURR_TRACKS;
        }
        async function xList() {
          //get playlist tracks
          // let query = document.getElementById("xListInput").value.toUpperCase();
          // if(USER_PLAYLISTS.length == 0){ await getPlaylists(1) }
          // let x = filterPlaylists(query, USER_PLAYLISTS)

          // requestPlaylistTracks(x[0])
          // .then(xTracks => {
          // 	updateDisplay("tracksListTitle", xTracks.length + " Tracks in xList")
          // 	if (xTracks.length == 0) return;
          // 	findTracks(xTracks, USER_PLAYLISTS)
          // 	//TODO remove all tracks from xlist if r = 0
          // })

          // let tracks = parseTracks()
          let tracks = getCurrentTracks();
          findTracks(tracks, USER_PLAYLISTS);
          // document.getElementById("xList").style.display = "none";
          removeXTracks();
          document.getElementById("remX").style.display = "block";
        }

        function removeXTracks() {
          //remove xTracks from all playlists
          // then remove from xList
          let tracks = [];
          if (CURR_TRACKS.length == 0) console.log("No Tracks Found");

          let playlists = mapPlaylists(CURR_TRACKS);

          trackIds = CURR_TRACKS.map(t => {
            return t.id;
          });
          trackUris = CURR_TRACKS.map(t => {
            return t.uri;
          });

          // sp.removeFromMySavedTracks(trackIds).then(res => console.log(res))

          for (let id in playlists) {
            // if(playlists[id].playlist.name.toUpperCase() == "XTHIS"){
            // 	continue;
            // }
            let uris = playlists[id].tracks.map(t => {
              return t.uri;
            });
            console.log("REMOVING");
            console.log(id, uris);
            // sp.removeTracksFromPlaylist(id, uris).then(res => console.log(res))
          }

          // xList()
        }

        function mapPlaylists(tracks) {
          let playlists = {};
          tracks.forEach(t => {
            if (!(t.playlist.id in playlists)) {
              playlists[t.playlist.id] = {
                playlist: t.playlist,
                tracks: []
              };
            }
            playlists[t.playlist.id].tracks.push(t);
          });
          console.log(playlists);
          return playlists;
        }

        async function search() {
          let query = document
            .getElementById("searchInput")
            .value.toUpperCase();
          updateDisplay("tracksList", "");
          console.log("starting search for: " + query);

          let USER_PLAYLISTS = await getPlaylists(0);
          // Search for playlists
          // filterPlaylists(query, playlists);

          // Search for tracks
          incrementalSearch(query, USER_PLAYLISTS);
        }

        async function filterPlaylists(query, playlists) {
          if (!(typeof query === "string")) {
            query = document
              .getElementById("filterInput")
              .value.trim()
              .toUpperCase();
          }
          console.log("searching for playlist: " + query);

          if (!playlists) {
            playlists = await getPlaylists();
          }

          let results = [];

          results = playlists.filter(p => {
            let name = p.name.toUpperCase();
            let id = p.id.toUpperCase();
            let nameMatch = name.indexOf(query) !== -1;
            let idMatch = id.localeCompare(query) == 0;
            return nameMatch || idMatch;
          });
          console.log(results);

          displayPlaylists(results);
          return results;
        }

        //TODO change this to an incremental search
        //.. Parse through each page of the playlistTracks then request the next page
        function incrementalSearch(query, playlists) {
          // let results = []
          // var rCount = 0;

          var pCount = 0;

          playlists.forEach(p => {
            // r = await queryPlaylist(p, query)
            queryPlaylist(p, query).then(r => {
              // if(r.length > 0){
              // rCount += r.length;
              // console.log(rCount);
              // updateDisplay("tracksListTitle", rCount + " Match query.");
              // console.log(r)
              // displayAppend(r);
              // }
              move("playlists", ++pCount, playlists.length);
            });
          });
        }

        async function queryPlaylist(p, query) {
          let results = [];
          let rCount = 0;
          let tracks = await requestPlaylistTracks(p);
          tracks.forEach(t => {
            if (typeof t === "undefined") return;
            name = t.name.toUpperCase();
            if (name.indexOf(query) !== -1) {
              console.log(`found ${name} in ${p.name}`);
              // t.playlist = p
              // results.push(t)
              updateDisplay("tracksListTitle", ++rCount + " Match query.");
              displayAppend([t]);
            }
          });
          // return results;
        }

        function sameTrack(t1, t2) {
          //Check the type of the track object
          //(PlaylistTrack vs Track)
          if (t1.track == null || t2.track == null) {
            return false;
          }
          if (t1.track.name) t1 = t1.track;
          if (t2.track.name) t2 = t2.track;
          return t1.id == t2.id;
        }

        function filterTracks(source, filter) {
          let r = [];
          filter.forEach(fT => {
            r = r.concat(
              source.filter(function(sT) {
                if (sameTrack(sT, fT)) {
                  fT.found = true;
                  return true;
                } else {
                  return false;
                }
              })
            );
          });
          return r;
        }

        function findTracks(tracks, playlists) {
          CURR_TRACKS = [];
          updateDisplay("tracksList", "");

          let pCount = 0;
          playlists.forEach(p => {
            // if (p.name.toUpperCase() == "XTHIS") {return;}
            requestPlaylistTracks(p).then(pT => {
              // console.log(pT)
              // pT = pT.map(t => {/*console.log(t);*/ return t.track})
              let r = filterTracks(pT, tracks);
              rCount += r.length;
              updateDisplay("playlistLog", `${p.name} ${p.id} ${r.length}`);
              r.forEach(t => {
                t.playlist = p;
                displayAppend([t]);
                CURR_TRACKS.push(t);
              });
              move("playlists", ++pCount, playlists.length);
            });
          });
        }

        function updateDisplay(displayID, content) {
          document.getElementById(displayID).innerText = content;
        }

        function displayPlaylists(playlists) {
          //Takes an array of JSON playlist objects
          if (!playlists) {
            console.log(playlists);
            throw "Playlists Required";
          }
          let title = document.getElementById("playlistTitle");
          title.innerHTML = playlists.length + " Playlists Found";

          let list = document.getElementById("playlistsList");
          list.innerHTML = "";

          playlists.forEach(function(p) {
            let div = document.createElement("div");

            let button = document.createElement("button");
            let ptext = p.name + " - " + p.owner.id;
            button.innerText = ptext;
            button.id = p.id;
            button.onclick = viewPlaylist;

            div.append(button);
            list.append(div);
          });
        }

        async function viewPlaylist() {
          //loads the tracks for the select playlist
          updateDisplay("tracksList", "");
          console.log("called from: " + this.id);
          console.log("This:");
          console.log(this);
          let thisId = this.id;
          let playlist = await getPlaylists();
          playlist = playlist.filter(p => {
            return thisId == p.id;
          });

          let playlistTracks = await requestPlaylistTracks(playlist[0]);
          console.log("found playlist Tracks to view. Now display...");
          displayAppend(playlistTracks);
        }

        // function displayTracks(tracks, source=""){
        // 	console.log("Display tracks:")
        // 	console.log(tracks);

        // 	updateDisplay("tracksListTitle", tracks.length + " Match query.");

        // 	let list = document.getElementById("tracksList");
        // 	list.innerHTML = "";

        // 	tracks.forEach(t => {
        // 		if (typeof t === 'undefined') return;
        // 		if(t.added_at) t = t.track
        // 		console.log(t);
        // 		div = document.createElement("div");
        // 		text 	= `${t.name} - ${t.artists[0].name} in ${t.playlist.name}\n`;
        // 		if (t.inPlaylists) {
        // 			text += ` In Playlists: ${t.playlist.name}\n`;
        // 		}

        // 		div.className = "trackItem";
        // 		div.id = t.id;

        // 		div.innerText = text;
        // 		list.append(div);
        // 	})
        // }

        //TODO update to react
        /* Updates a display list realtime.
	Takes a destination and a list of items (tracks with playlists) to display.
*/
        function displayAppend(tracks) {
          let destination = "tracksList";
          let list = document.getElementById(destination);

          updateDisplay("tracksListTitle", tracks.length + " Match query.");

          tracks.forEach(t => {
            if (typeof t === "undefined") return;
            if (t.added_at) t = t.track;
            console.log(t);
            div = document.createElement("div");
            text = `${t.name}, ${t.artists[0].name}, ${t.playlist.name}\n`;
            div.className = "trackItem";
            div.id = t.id;
            div.data = t;
            div.dataset.playlistId = t.playlist.id;
            div.dataset.playlistName = t.playlist.name;
            div.innerText = text;
            div.onclick = function() {
              console.log(this.data);
            };
            list.append(div);
            div.scrollIntoView({ behavior: "smooth" });
          });
        }

        function move(label, count, total) {
          // console.log(label, count, total)
          var elem = document.getElementById("progressBar");
          var width = 0;
          var id = setInterval(frame, 100);
          function frame() {
            if (width >= 100) {
              clearInterval(id);
              // document.getElementById("myP").className = "w3-text-green w3-animate-opacity";
              // document.getElementById("myP").innerHTML = "Successfully uploaded 10 photos!";
              elem.innerHTML = "Checked all " + count + " " + label;
            } else {
              while (width < (count / total) * 100) {
                // console.log(count/total)
                width++;
                elem.style.width = width + "%";
                var num = (width * 1) / 10;
                num = num.toFixed(0);
                document.getElementById(
                  "progressBar"
                ).innerHTML = `${count}/${total}`;
              }
            }
          }
        }
      },
      { "promise-throttle": 1, "spotify-web-api-js": 2 }
    ]
  },
  {},
  [3]
);
