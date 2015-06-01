/*global document,  window, requireContext, module, test, getEventListeners */
/*jshint onevar: false, white: false */

(function () {
    'use strict';

    var ModuleConstructor1 = function () {
        this.valid = true;
        this.id = '1';
    };

    var ModuleConstructor2 = function () {
        this.valid = true;
        this.id = '2';
    };


    var ModuleProvider1 = function () {
        return {
            pojo: true,
            valid: true
        };
    };

    requireContext()
        //.debugTests()
        .load('underscore', 'jquery')
        .load('mocks/requirejs')
        .resolve(['utility.ioc.binder', 'utility.ioc.binderCollection', 'utility.ioc.enums', 'utility.ioc.config', 'requirejs', 'underscoreExtensions'])
        .require(['utility.ioc.binder', 'utility.ioc.binderCollection', 'utility.ioc.enums', 'utility.ioc.config', 'requirejs'],
        function (Binder, BinderCollection, enums, config, requirejs) {

            module('utility.ioc.BinderCollection');

            config({
                requirejs: requirejs.require
            });


            var modulesMap = {
                'module1': ModuleConstructor1,
                'module2': ModuleConstructor2
            };

            requirejs.define('module1', function () { return ModuleConstructor1; });
            requirejs.define('module2', function () { return ModuleConstructor2; });

            test('Array name constructor', function (assert) {

                var moduleNames = ['module1', 'module2'];
                var sut = new BinderCollection(moduleNames);
                assert.ok(sut.binders.length === 2, "It contains two binders");


                assert.ok(sut.binders.every(function (e) {
                    return e instanceof Binder;
                }), 'They are a binder instances');

                assert.ok(sut.binders.every(function (e, i) {
                    return e.moduleName === moduleNames[i] && !e.module;

                }), 'They are created with the right name & not instantiated');
            });

            test('Object map constructor', function (assert) {

             
                var moduleNames = _.keys(modulesMap),
                    modules = _.values(modulesMap);

                var sut = new BinderCollection(modulesMap);
                assert.ok(sut.binders.length === 2, "It contains two binders");

                assert.ok(sut.binders.every(function (e) {
                    return e instanceof Binder;
                }), 'They are a binder instances');

                assert.ok(sut.binders.every(function (e, i) {
                    return e.moduleName === moduleNames[i] && e.module === modules[i];

                }), 'They are created with the right name & not instantiated');
            });

            test('Type operations are applied to all binders', function (assert) {
                var sut = new BinderCollection(modulesMap).asConstructor();
                assert.ok(sut.binders.every(function (e) {
                    return e.invocation = enums.invocations.constructor;
                }));
            });

            test('Scope operations are applied to all binders', function (assert) {
                var sut = new BinderCollection(modulesMap).inSingletonScope();
                assert.ok(sut.binders.every(function (e) {
                    return e.scope = enums.scopes.singleton;
                }));
            });

            test('configure multiple modules using the "configure" method', function (assert) {
                var sut = new BinderCollection(['module1', 'module2']);
                sut.configure({
                    scope: 'local',
                    invocation: 'factory'
                });

                sut.binders.forEach(function (binder) {
                    assert.equal(binder.scope, enums.scopes.local);
                    assert.equal(binder.invocation, enums.invocations.factory);
                });
            });


        });

}());

