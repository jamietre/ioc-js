/*jshint white: false, onevar: false, latedef: false, evil: true */
define('utility.ioc.binder', ['utility.ioc.enums', 'utility.ioc.helpers', 'utility.ioc.config', 'utility.strings'],
function (enums, helpers, config, strings) {
    'use strict';
    /*jshint validthis: true */
    var nameCount = 0;
    var scopes = enums.scopes;
    var invocations = enums.invocations;

    function dependencyError(moduleName) {
        throw new Error('Ioc: unable to resolve dependency "' + moduleName + '".');
    }

    /* Resolve the _inject dependencies against provided dependency map, or resolving using 
       ioc whenever possible, or undefined.
    */

    //function getAndCache(iocApi, param, index) {
    //    var binder = iocApi.getBinder(param);
    //    if (!binder) {
    //        dependencyError(param);
    //    } else {
    //        this.module._inject[index] = binder;
    //    }
    //    return iocApi.getInstanceFromBinder(binder);
    //}

    function getDependencies(iocApi, deps) {
        deps = deps || {};

        var dependencies = (this.module._inject || []).map(function (param, index) {

            var instance =
                //param instanceof Binder ?
                //iocApi.getInstanceFromBinder(param) :
                    param === '$ioc' ?
                    iocApi.ioc : deps[param] ||
                        //getAndCache.call(this, iocApi, param, index) || 
                    iocApi.get(param) || dependencyError(param);
            return instance;
        }, this);
        return dependencies;
    }

    /* moduleName: string
       module: defintiion of the module, or a promise that resolves with the module, or null to resolve with requirejs
       
    */

    var Binder = function (moduleName, module) {
        var that = this;

        if (!moduleName || typeof moduleName !== 'string') {
            throw new Error("ioc: cannot bind a module without a name");
        }

        this.moduleName = moduleName;

        // this logic declares that either a promise will resolve with module, or
        // module is defined explicitly on construction

        var modulePromise = helpers.isPromise(module) ? module :
            !module ? helpers.requirePromise([moduleName]).then(function (args) {
                return args[0];
            }) : null;

        if (modulePromise) {
            modulePromise = modulePromise.then(function (module) {
                if (!module) {
                    throw new Error(strings.format("Can't bind {0}: module was undefined or returned nothing.", that.moduleName));
                }
                that.module = module;
            });
        } else {
            this.module = module;
        }

        this.loaded = function () {
            return modulePromise || helpers.asPromise(module);
        };

        this.scope = scopes.transient;
        this.invocation = invocations.constructor;

    };

    Binder.prototype = {
        constructor: Binder,

        /*  Create in instance of a module, with optional aguments (array or named map) and a callback invoked before
            the constructor */

        provision: function (iocApi, deps, args, callback) {
            if (!this.module) {
                throw new Error(strings.format('ioc: Module "{0}" has not been loaded, did you forget to invoke "load"?', this.moduleName));
            }

            switch (this.invocation) {
                case invocations.constructor:
                    var resolved = getDependencies.call(this, iocApi, deps);

                    var finalArgs = args ?
                        resolved.concat(args) :
                        resolved;

                    return helpers.createObject(this.module, finalArgs, callback);
                case invocations.factory:
                    var module = this.module.apply(this.module, args);
                    if (callback) {
                        callback.call(module);
                    }
                    return module;
                default:
                    throw new Error("ioc: Unimplemented invocation type " + this.invocation);
            }
        }
    };

    // generate configuration methods

    helpers.populateBinder(Binder.prototype, function (method, target, value) {
        this[target] = value;
    });

    return Binder;
});