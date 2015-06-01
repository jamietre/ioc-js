/*global document,  window, requireContext, module, test, asyncTest, getEventListeners, stop, start */
/*jshint onevar: false */

(function () {
    'use strict';

    var ModuleConstructor = function () {
        this.valid = true;
    };

    var ModuleProvider = function () {
        return {
            pojo: true,
            valid: true
        };
    };

    var ModuleWithDeps = function (module1) {
        this.valid = 1;
        this.inner = module1;
    };

    requireContext()
        .debugTests()
        .load('underscore', 'jquery') // jquery dependency is because of $.Deferred
        .load('mocks/requirejs')
        .resolve(['underscoreExtensions'])
        .require(['utility.ioc.binder', 'utility.ioc.config', 'utility.ioc.enums', 'requirejs'], function (Binder, config, enums, requirejs) {

            module('utility.ioc.binder', {
                setup: function () {
                    
                }
            });

            config({
                requirejs: requirejs.require
            });


            requirejs.define('module2', function () {
                var Constructor = function () {
                    this.name = "foo";
                };
                Constructor.id = "module2";
                return Constructor;
            });

            test('Constructed with a module', function (assert) {
                assert.expect(2);

                var binder = new Binder('module1', ModuleConstructor);
                
                assert.equal(binder.module, ModuleConstructor, "The module was set as a property");
                assert.equal('module1', binder.moduleName, "A module name has been assigned");
                  

            });
            asyncTest('Constructed with a requireJs alias', function (assert) {
                assert.expect(2);
                var binder = new Binder('module2');
                binder.loaded().then(function () {
                    assert.equal(binder.module.id, "module2", "The module was defined");
                    assert.equal(binder.moduleName, 'module2', "The module name was set");
                    start();
                });
                

            });

            test('Provision a module from constructor', function (assert) {
                var sut = new Binder('module3', ModuleConstructor);

                var output = sut.provision();
                assert.ok(output instanceof ModuleConstructor);
                assert.ok(output.valid);
                assert.ok(!output.pojo);
            });

            test('Provision a module from a provider', function (assert) {
                var sut = new Binder('module4', ModuleProvider);

                var output = sut.provision();
                assert.ok(output.valid);
                assert.ok(output.pojo);
            });

            test('configure a module using the "configure" method', function (assert) {
                var binder = new Binder('module1', ModuleProvider);
                binder.configure({
                    scope: 'local',
                    invocation: 'factory'
                });

                assert.equal(binder.scope, enums.scopes.local);
                assert.equal(binder.invocation, enums.invocations.factory);
            });

            test('can use $ioc convention to inject the container as a constructor parameter', function (assert) {
                var iocMock = 'iocMock';

                var Thing = function (ioc, foo) {
                    this.foo = foo;
                    this.ioc = ioc;
                };
                Thing._inject = ['$ioc'];

                var binder = new Binder('thing', Thing);

                var instance = binder.provision({
                    ioc: iocMock
                }, null, ['bar']);

                assert.ok(instance instanceof Thing, 'The instance looks good');
                assert.ok(instance.ioc === iocMock, 'The container made it through');
                assert.ok(instance.foo === 'bar', 'Extra parms are handled');
            });
        });
}());

