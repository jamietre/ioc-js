/*global window, $, Promise */
/*jshint white: false, onevar: false */
define('utility.ioc.config', ['events.Topic'], function (Topic) {
    /*jshint validthis: true */
    'use strict';

    // provide a method for using promises without jQuery in modern browsers so we don't have to depend on jQuery
    // for test running

    var useJquery = !!window.$;

    var defaults = {
        debug: false,
        propogate: "_ioc",
        requirejs: window.require,
        promiseWhen: useJquery ? function (args) {
            return $.when.apply($, args);
        } : function (args) {
            return Promise.all(args);
        },
        promiseDeferred: useJquery ? $.Deferred : (function () {
            function Deferred(cb) {
                var that = this;
                this._promise = new Promise(function (resolve, reject) {
                    that.resolve = resolve;
                    that.reject = reject;
                });
                if (cb) {
                    cb(this);
                }
            }

            Deferred.prototype = {
                constructor: Deferred,
                promise: function () {
                    return this._promise;
                },
                then: function (resolve, reject) {
                    return this.promise().then(resolve, reject);
                },
                resolve: function (val) {
                    this.resolve(val);
                },
                reject: function (val) {
                    this.reject(val);
                }
            };

            return Deferred;
        }())
    };


    var config = _.extend({}, defaults);

    var transform = {
        propogate: function (value) {
            return typeof value === 'string' || value === false ? value : defaults.propogate;
        }
    };

    var api = function (options) {
        if (!options) {
            return config;
        } else {
            _.each(options, function (value, key) {
                config[key] = value;
                api.changed(key, value);
            });
        }
    };

    api.changed = new Topic();
    return api;
});