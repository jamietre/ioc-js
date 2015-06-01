/* ioc - Inversion of Costar
   
   A DI container 

   Usage: Add "utility.ioc" as a dependency at bootstrapping

   var container = ioc(); // create a new root-level container

   container.bind('requireJsModule').asConstructor(); // bind a module returning a constructor (default behavior)
   container.bind('requireJsModule').asFactory(); // bind a module returning a factory method (e.g. invoking it returns a new instance)
   
   container.bind('requireJsModule').inTransientScope(); // bind a module and return a new instance each time (default behavior)
   container.bind('requireJsModule').inLocalScope(); // bind a module and return a single instance per scope
   container.bind('requireJsModule').inSingletonScope(); // bind a module and return a single instance ever

   container.bind(['requireJsModule1', 'requireJsModule2']).inLocalScope(); // bind multiple modules with same config

   container.bind('moduleName', SomeConstructor); // bind a module definition directly (e.g. without requireJs)
   
   // after config, you need to ensure all requireJs dependencies are loaded before you can use the container to
   // provide instances

   container.loaded().then(function() {
       // finish bootstrapping
   });

    // get an instance

   container.get('requireJsModule'); 
   
   // create a new scope -- modules defined in local scope will be singletons within each individual scope.
   
   var innerContainer = container.create(); 

   // automatically resolve dependencies with constructor injection
   
   function MyModule(dep1, dep2) { ... }
   MyModule._inject = ["someModule", "someOtherModule"];

   // automatically pass the container as a parameter
   
   function MyModule(container, dep1, dep2) { ... }
   MyModule._inject = ["$ioc", "someModule", "someOtherModule"];
   
   // return an instance of MyModule, inject instances of someModule & someOtherModule via constructor parmss
   
   var myModule = container.get("myModule"); 

   // return an instance of MyModule, passing in user-defined parameters to the constructor
   // constructor parms. (If _inject is also used, these parameters are passed after the
   // automatically-resolved ones)
   
   var myModule = container.get("myModule", ["parm1", parm2]); 

   // return an instance of MyModule, specifying the dependencies by name rather than letting the container
   // resolve them
   
   var myModule = container.get("myModule", { 
       module1: myModule1,
       module2: myModule2
    });

   // .. and also pass additional constructor parameters
   
   var myModule = container.get("myModule", { 
       module1: myModule1,
       module2: myModule2
   }, ["parm1", parm2]);
*/

/*global window */
/*jshint white: false, onevar: false */
define('utility.ioc', [
    'utility.ioc.binder',
    'utility.ioc.binderCollection',
    'utility.ioc.enums',
    'utility.ioc.helpers',
    'utility.ioc.config',
    'utility.strings'
], function (Binder, BinderCollection, enums, helpers, config, strings) {
    /*jshint validthis: true */
    'use strict';

    var scopes = enums.scopes;
    var invocations = enums.invocations;
    var slice = Function.call.bind(Array.prototype.slice);
    var when = config().promiseWhen;
    var Deferred = config().promiseDeferred;

    /**
    options = {
        parent: the parent container
        require: the require js module
    */
    var Container = function (options) {
        var that = this;
        options = options || {};

        this.config = config();
        config.changed.listen(function (key, value) {
            that.config[key] = value;
        });

        this.parent = options.parent || null;
        var parent = this.parent || {};

        this.root = parent.root || this;

        this._binders = {};
        this._instances = {};
    };

    function getBinder(moduleName) {
        return this.root._binders[moduleName];
    }

    function isBound(moduleName) {
        return !!this.root._binders[moduleName];
    }

    function getInstanceFromBinder(binder, deps, args) {
        var instance;
        var callback;
        var that = this;

        if (args && !Array.isArray(args)) {
            throw new Error("Arguments must be passed as an array");
        }

        if (this.config.propogate) {
            // assign the ioc container to the new instance before actually running the constructor
            // by way of the pre-callback parameter
            callback = function () {
                this[that.config.propogate] = that;
            };
        }

        // we pass the internal API of the IOC container to Binder so it can recursively resolve things

        var iocApi = new ContainerPrivateApi(this);

        switch (binder.scope) {
            case scopes.transient:
                instance = binder.provision(iocApi, deps, args, callback);
                break;
            case scopes.local:
                instance = this._instances[binder.moduleName] = binder.provision(iocApi, deps, args, callback);
                break;
            case scopes.singleton:
                instance = this.root._instances[binder.moduleName] = binder.provision(iocApi, deps, args, callback);
                break;
            default:
                throw new Error("Unhandled ioc scope");
        }

        return instance;
    }

    function get(moduleName, deps, args) {

        // Allow omitting deps

        if (!args && Array.isArray(deps)) {
            args = deps;
            deps = null;
        }

        if (moduleName.length > 2 && moduleName.substring(0, 2) === '$$') {
            return getFactory.call(this, moduleName.substring(2), deps);
        }

        return getInstance.call(this, moduleName, deps, args);
    }

    /* Get an instance of the container. If an object is passed, it is treated as an object map of dependencies 
       to inject by name (assuming _inject is used on the model).

       If an array is passed, it is treated as normal constructor arguments, and passed to the constructor after 
       all _inject arguments are resolved.

    */
    function getInstance(moduleName, deps, args) {
        var instance = this._instances[moduleName];


        if (instance) {
            if (args) {
                throw new Error("The module '" + moduleName + "' has already been created in it's instance scope; you can't pass arguments.");
            }
            return instance;
        }

        var binder = getBinder.call(this, moduleName);

        return binder && getInstanceFromBinder.call(this, binder, deps, args);
    }

    function getFactory(moduleName, deps) {
        if (Array.isArray(deps)) {
            throw new Error('Factories cannot be created with arguments. Consider using _.partial');
        }

        var that = this;
        var binder = getBinder.call(that, moduleName);

        if (!binder) {
            return;
        }

        if (binder.scope !== scopes.transient) {
            throw new Error('Factories can only be created from modules bound in transient scope.');
        }

        return function () {
            var callArgs = [moduleName, Array.prototype.slice.call(arguments)];
            if (deps) {
                callArgs.push(deps);
            }

            return that.get.apply(that, callArgs);
        };
    }

    function registerBinder(binder, ignoreDups) {
        if (isBound.call(this, binder.moduleName)) {
            if (ignoreDups) {
                return;
            }

            throw new Error(strings.format("There is already a module '{0}' registered with the container.", binder.moduleName));
        }

        this.root._binders[binder.moduleName] = binder;
    }

    function after(func, cb) {
        return function () {
            return cb.call(this, func.apply(this, arguments), arguments[0]);
        };
    }

    function ensureExists(binder, name) {
        if (!binder) {
            throw new Error(strings.format('Ioc: Unable to resolve module "{0}"', name));
        }
        return binder;
    }

    function ContainerPrivateApi(container) {
        return {
            ioc: container,
            isBound: isBound.bind(container),
            getBinder: getBinder.bind(container),
            getInstanceFromBinder: getInstanceFromBinder.bind(container),
            get: get.bind(container)
        };
    }

    Container.prototype = {
        constructor: Container,
        create: function () {
            return new Container(_.extend({},
                this.options,
                {
                    parent: this
                }));
        },
        /**

        Resolve an instance of an entity, with optional arguments. Arguments must be 

        deps: an object map of dependencies to inject; supercedes container bindings
        args: an array of arguments to pass to the constructor after all explicitly defined depenecies

        */

        get: /* function(moduleName, deps, args) */ after(get, ensureExists),

        /* Return a factory for a module, that is, a function that produces a new instance of the specified module
           on each invocation. You can pass dependencies to the 'factory', and you can pass arguments to the factory 
           it produces. 
        */
        factory: /* function(moduleName, deps) */ after(getFactory, ensureExists),

        /* return the constructor for a module 
        */
        cotr: function (moduleName) {
            var binder = after(getBinder, ensureExists).call(this, moduleName);
            if (binder.invocation !== invocations.constructor) {
                throw new Error("The module '" + moduleName + "' is not a constructor");
            }
            return binder.module;
        },

        /* return true of the named module has been bound in this (or a parent) scope 
        */
        isBound: isBound,


        /* Resolve an entity or entities asynchronously, binding as needed, always in transient scope, always as a constructor.
            This method is provided as a convenience, mostly for assisting in migrating code with inline module requires driven by
            configuration rather than define-time dependencies, but generally, you should try to configure everything up front so that the 
            binding is explicit.
        */
        require: function (moduleNames) {
            var that = this;
            var modules = [];
            var toResolve = [];
            var toResolveRef = {};

            moduleNames.forEach(function (moduleName, index) {

                if (that.isBound(moduleName)) {
                    modules[index] = that.get(moduleName);
                } else {
                    toResolve.push(moduleName);
                    toResolveRef[moduleName] = index;
                }
            });

            var promise;
            if (toResolve.length) {
                promise = helpers.requirePromise(toResolve).then(function (resolved) {
                    resolved.forEach(function (item, index) {
                        var name = toResolve[index];

                        that.bind(name, item, true).asConstructor().inTransientScope();
                        modules[toResolveRef[name]] = that.get(name);
                    });
                    return modules;
                });
            } else {
                promise = helpers.resolved(modules);
            }

            return promise;
        },

        /*  bind a requirejs module, or an alias to a constructor.
        
            e.g. container.bind("detailContext").asConstructor().inLocalScope();

            moduleName: the module name, an array of module names, an object map of object names & defs, 
                        or a requireJs alias
            moduleDef: a module definition, if missing, will be resolved using requireJs
            ignoreDups: when true, ignore modules that are already defined. 
        */
        bind: function (moduleName, moduleDef, ignoreDups) {
            var that = this;

            if (Array.isArray(moduleName) || helpers.isObject(moduleName)) {

                var binderCollection = new BinderCollection(moduleName);
                binderCollection.binders.forEach(function (binder) {
                    registerBinder.call(that, binder, ignoreDups);
                });
                return binderCollection;
            }

            var binder = new Binder(moduleName, moduleDef);
            registerBinder.call(this, binder, ignoreDups);
            return binder;
        },

        /* clear all instances recursing to parent scopes if recurse==true
            You can't actually clear bindings - to do this start a new root ioc 
        */
        clear: function (recurse) {
            this._instances = {};
            if (recurse && this.parent) {
                this.parent.clear(true);
            }
        },

        /* promise that resolves when all bound modules are available
           TODO - optimize this to ignore ones that are already resolved instead of creating large promise dependencies 
        */
        loaded: function () {
            return when(_.chain(this.root._binders).values().invoke('loaded').value());
        },

        /* define a module; uses same syntax as requirejs define. Dependencies are requirejs dependencies. 
        */
        define: function (name, deps, moduleDef) {
            var that = this;

            if (!Array.isArray(deps)) {
                moduleDef = deps;
                deps = [];
            }

            var modulePromise;

            if (deps.length) {
                modulePromise = helpers.requirePromise(deps).then(function (args) {
                    return moduleDef.apply(null, args);
                });
            } else {
                modulePromise = helpers.asPromise(moduleDef());
            }

            var binder = this.bind(name, modulePromise);

            return binder;
        }
    };

    return function () {
        return helpers.createObject(Container, slice(arguments));
    };
});