/*jshint onevar: false, regexp: false, evil: true */
define('utility.ioc.helpers', ['utility.ioc.config', 'utility.ioc.enums', 'utility.strings', 'underscoreExtensions'], function (config, enums, strings) {

    'use strict';

    var COMMENTS = /\/\*(.*?)\*\//g;
    var ARGUMENT_NAMES = /([^\s,]+)/g;
    var COMMA_SUBSTITUTE = "_C!_";
    var COMMA_SUBSTITUTE_REGEX = new RegExp(COMMA_SUBSTITUTE);

    var Deferred = config().promiseDeferred;

    // instance creation methods. Because the method of newing something dynamic involves creating a new
    // constructor function, the function name gets lost normally. The debug version uses eval to 
    // preserve the function name.

    var createObject = {
        debug: function (constructor, args, callback) {
            if (typeof constructor !== 'function') {
                throw new Error('Cannot create object: "' + String(constructor) + '" is not a function');
            }

            var functionString = strings.format("var fn = function {0}() { if (cb) cb.apply(this); var i = c.apply(this, a) || this; " +
                "if (cb && i !== this) cb.apply(i); return i }; fn.prototype = c.prototype; return fn;", constructor.name || '');

            var Fn = new Function("c", "a", "cb", functionString)(constructor, args, callback);

            var instance = new Fn();
            return instance;
        },
        prod: function (constructor, args, callback) {
            function F() {
                if (callback) {
                    callback.apply(this);
                }

                var instance = constructor.apply(this, args) || this;

                // when a constructor returns something other than itself, we need to run the callback on the new
                // instance as well. We also can't just do it after creation, because objects likely depend on ioc
                // during their own construction.

                if (callback && instance !== this) {
                    callback.apply(instance);
                }

                return instance;
            }
            F.prototype = constructor.prototype;

            var instance = new F();
            instance._constructorName = constructor.name;
            return instance;
        }
    };

    function getCreateMethod(debug) {
        return createObject[debug ? 'debug' : 'prod'];
    }

    var api = {
        /* Parse out a functions parameters and comments. Should be able to handle multi-line comments and commas
        in comments; does not handle // comment syntax. Future improvement might identify comment position before or
        after parameter if needed for something. */

        getFunctionParams: function (func, strip) {
            var fnStr = func.toString();
            var text = fnStr
                .slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')'));

            // pre-process the comments to remove commas
            text = text.replace(COMMENTS, function (match, comment) {
                return match.replace(/,/g, COMMA_SUBSTITUTE);
            });

            var parms = text.split(',')
                .map(function (parm) {
                    var comments = [];
                    parm = parm.replace(COMMENTS, function (match, comment) {
                        comments.push(comment.trim().replace(COMMA_SUBSTITUTE_REGEX, ","));
                        return '';
                    });
                    return {
                        name: parm.trim(),
                        comments: comments
                    };
                });

            return parms;
        },
        requirePromise: function (arr) {
            return new Deferred(function (resolver) {
                config().requirejs(arr, function () {
                    resolver.resolve(Array.prototype.slice.call(arguments));
                });
            }).promise();
        },
        isPromise: function (obj) {
            return obj && typeof obj.then === 'function';
        },
        asPromise: function (obj) {
            return api.isPromise(obj) ? obj : api.resolved(obj);
        },
        resolved: function (obj) {
            return new Deferred(function (cb) { cb.resolve(obj); });
        },
        /* Try to determine if something's primary use is an object
          This is not like jQuery isPlainObject which also tests to see if something has a prototype other than Object.prototype,
          this is just meant to exclude things whose primary use is not an object such as functions, arrays, strings. 
       */
        isObject: function (obj) {
            return obj !== null &&
                Object.prototype.toString.apply(obj) === '[object Object]';
        },
        createObject: getCreateMethod(config().debug),
        populateBinder: function (prototype, callback) {
            // generate configuration methods for binders

            var data = {
                scopes: {
                    pattern: "in-{0}-scope",
                    target: "scope",
                    values: enums.scopes
                },
                invocations: {
                    pattern: "as-{0}",
                    target: "invocation",
                    values: enums.invocations
                }
            };

            _.each(data, function (config) {
                Object.keys(config.values).forEach(function (key) {
                    var method = _.chain(config.pattern).fn(strings.format, key).fn(strings.camelCase).value();

                    prototype[method] = function () {
                        callback.call(this, method, config.target, config.values[key]);
                        return this;
                    };
                });
            });
            /* configure using named options instead: takes on object map which aligns with the
            keys/values from "enums" except that the keys are not pluralized, e.g. "scope" instead of "scopes"
            */
            prototype.configure = function (options) {
                var that = this;
                _.each(options, function (value, key) {
                    key = key + 's';
                    var option = enums[key];

                    if (option && option[value]) {
                        var config = data[key];
                        var method = _.chain(config.pattern).fn(strings.format, value).fn(strings.camelCase).value();
                        that[method]();
                    }
                });
            };
        }
    };

    config.changed.listen(function (key, value) {
        if (key === 'debug') {
            api.createObject = getCreateMethod(value);
        }
    });

    return api;
});