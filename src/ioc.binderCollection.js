/*jshint white: false, onevar: false */
define('utility.ioc.binderCollection', ['utility.ioc.enums', 'utility.strings', 'utility.objects', 'utility.ioc.binder', 'utility.ioc.helpers'],
function (enums, strings, objects, Binder, helpers) {
    'use strict';
    var nameCount = 0;
    var scopes = enums.scopes;
    var invocations = enums.invocations;

    // generate names for anonymous modules
    //function getName() {
    //    return "__anon_" + nameCount++;
    //}

    /* Expects an array of module names to resolve, or an object map of name/definition */

    var BinderCollection = function (modules, moduleDef) {
        if (Array.isArray(modules)) {
            this.binders = modules.map(function (name) {
                return new Binder(name, moduleDef);
            });
        } else if (objects.isObject(modules)) {
            this.binders = Object.keys(modules).map(function (name) {
                return new Binder(name, modules[name]);
            });
        } else {
            throw new Error("Binders must be constructed with an array of module names, or an object map of names/module definitions");
        }

    };

    helpers.populateBinder(BinderCollection.prototype, function (method, target, value) {
        var args = Array.prototype.slice.call(arguments);
        this.binders.forEach(function (binder) {
            binder[method].apply(binder, args);
        });
    });

    return BinderCollection;
});