/*global document,  window, requireContext, module, test, asyncTest, start */
/*jshint onevar: false */

(function () {
    'use strict';

    requireContext()
       // .debugTests()
        .load('underscore', 'jquery')
        .load('mocks/requirejs')
        .mock('configuration', {})
        .resolve(['utility.ioc.binder', 'utility.ioc.enums', 'utility.ioc', 'underscoreExtensions', 'utility.promises'])
        .require(['utility.ioc', 'utility.ioc.config', 'utility.promises', 'requirejs'], function (iocFactory, iocConfig, promises, requirejs) {
            var ioc;

            iocConfig({
                requirejs: requirejs.require
            });

            module('utility.ioc', {
                setup: function () {
                    ioc = iocFactory();
                    iocConfig({
                        requirejs: requirejs.require,
                        propogate: "_ioc"
                    });
                }
            });

            var module2 = function () {
                return function () {
                    return {
                        valid: true,
                        name: "module2"
                    };
                };
            };

            var counter = (function () {
                var instances = 0;

                function Counter(arg) {
                    this.foo = 'bar';
                    this.arg = arg;
                    this.id = instances++;
                }
                return Counter;
            }());

            requirejs.define('module1', function () {
                return function (name, alias) {
                    this.valid = true;
                    this.name = name || "module1";
                    this.alias = alias;
                };
            });

            requirejs.define('module3', function () {
                function Module3($module1, $module2) {
                    this.name = 'module3';
                    this.m1 = $module1;
                    this.m2 = $module2;
                }
                Module3._inject = ["module1", "module2"];
                return Module3;
            });

            requirejs.define('module4', function () {
                function Module4($ioc, $module1, $module2, p1, p2) {
                    this.$ioc = $ioc;
                    this.name = 'module4';
                    this.m1 = $module1;
                    this.m2 = $module2;
                    this.p1 = p1;
                    this.p2 = p2;
                }
                Module4._inject = ["$ioc", "module1", "module2"];
                return Module4;
            });



            requirejs.define('module2', module2);

            asyncTest('Basic singleton resolution', function (assert) {
                assert.expect(2);

                ioc.bind('module1').asConstructor().inSingletonScope();
                ioc.loaded().then(function () {

                    var m1 = ioc.get('module1');
                    var m2 = ioc.get('module1');

                    assert.equal(m1.name, "module1", "Correct module");
                    assert.ok(m1 === m2, "Singleton returned same instance");
                    start();
                });
            });

            asyncTest('Basic transient resolution', function (assert) {
                assert.expect(2);

                ioc.bind('module1').asConstructor().inTransientScope();
                ioc.loaded().then(function () {
                    var m1 = ioc.get('module1');
                    var m2 = ioc.get('module1');

                    assert.equal(m1.name, "module1", "Correct module");
                    assert.ok(m1 !== m2, "Transient scope returned different instances");
                    start();
                });
            });

            asyncTest('Factory type works', function (assert) {
                assert.expect(2);
                ioc.bind('module2').asFactory().inTransientScope();
                ioc.loaded().then(function () {
                    var m1 = ioc.get('module2');
                    var m2 = ioc.get('module2');

                    assert.equal(m1.name, "module2", "Correct module");
                    assert.ok(m1 !== m2, "Transient scope returned different instances");
                    start();
                });

            });


            asyncTest('Local scope', function (assert) {
                assert.expect(3);
                ioc.bind('module1').asConstructor().inLocalScope();
                ioc.loaded().then(function () {
                    var inner = ioc.create();

                    var m1 = ioc.get('module1');
                    var m2 = ioc.get('module1');

                    var m3 = inner.get('module1');
                    var m4 = inner.get('module1');

                    assert.ok(m1 === m2, "Objects created in outer scope are same instance");
                    assert.ok(m3 === m4, "Objects created in inner scope are same instance");
                    assert.ok(m1 !== m3, "Objects created in separate scopes are different instances");
                    start();
                });

            });

            asyncTest('Pass arguments to constructor', function (assert) {
                assert.expect(2);
                ioc.bind('module1').asConstructor().inLocalScope();
                ioc.loaded().then(function () {
                    var m1 = ioc.get('module1', ['foo', 'bar']);
                    assert.equal(m1.name, 'foo');
                    assert.equal(m1.alias, 'bar');
                    start();
                });

            });

            asyncTest('Propogation of IOC container', function (assert) {
                assert.expect(2);
                ioc.bind('module1').asConstructor().inLocalScope();

                ioc.loaded().then(function () {
                    var inner = ioc.create();

                    var m1 = inner.get('module1');

                    assert.ok(m1._ioc === inner, "Inner object has property _ioc with its container");
                    assert.ok(inner !== ioc, "inner and outer containers are different objects");
                    start();
                });
            });

            asyncTest('Propogation of IOC container can be disabled', function (assert) {
                assert.expect(1);

                ioc = iocFactory();

                ioc.config.propogate = false;

                ioc.bind('module1').asConstructor().inLocalScope();

                ioc.loaded().then(function () {
                    var m1 = ioc.get('module1');
                    assert.ok(!m1._ioc);
                    start();
                });
            });


            asyncTest('Propogation can have your own name', function (assert) {
                assert.expect(1);

                ioc = iocFactory();
                iocConfig({
                    propogate: 'myIoc'
                });

                ioc.bind('module1').asConstructor().inLocalScope();

                ioc.loaded().then(function () {
                    var m1 = ioc.get('module1');
                    assert.ok(m1.myIoc === ioc);
                    start();
                });
            });

            asyncTest('require - single unresolved module', function (assert) {
                assert.expect(2);
                ioc.require(['module1']).then(function (modules) {
                    assert.ok(modules.length === 1);
                    assert.ok(modules[0].name === 'module1');
                    start();
                });
            });

            asyncTest('require - mutliple mixed modules', function (assert) {
                assert.expect(3);

                ioc.bind('module2', module2()).asFactory().inTransientScope();
                ioc.require(['module1', 'module2'], 'foo').then(function (modules) {
                    assert.ok(modules.length === 2);
                    assert.ok(modules[0].name === 'module1');
                    assert.ok(modules[1].name === 'module2');
                    start();
                });
            });

            asyncTest('resolve a module with dependencies', function (assert) {
                assert.expect(3);

                ioc.bind(['module1', 'module2', 'module3']).asConstructor().inTransientScope();

                ioc.loaded().then(function () {

                    var m3 = ioc.get('module3');

                    assert.ok(m3.name === 'module3');
                    assert.ok(m3.m1.name === 'module1');
                    assert.ok(m3.m2.name === 'module2');

                    start();
                });
            });

            asyncTest('resolve a module with dependencies, passing them as an object map', function (assert) {
                assert.expect(3);
                ioc.bind('module3').asConstructor().inTransientScope();

                ioc.loaded().then(function () {

                    var m3 = ioc.get('module3', {
                        module1: "p1",
                        module2: 2
                    });

                    assert.ok(m3.name === 'module3');
                    assert.ok(m3.m1 === "p1");
                    assert.ok(m3.m2 === 2);

                    start();
                });
            });

            var testDef = function (Dep) {
                function Module4() {
                    this.name = 'm4';
                    if (Dep) {
                        this.dep = new Dep();
                    }
                }

                return Module4;
            };

            asyncTest('define with no dependencies', function (assert) {
                assert.expect(2);

                var binder = ioc.define('module4', testDef);
                binder.loaded().then(function () {
                    var instance = ioc.get('module4');
                    assert.ok(instance.name === 'm4');
                    assert.ok(instance.dep === undefined);
                    start();

                });

            });

            asyncTest('define with dependencies', function (assert) {
                assert.expect(2);

                var binder = ioc.define('module4', ['module3'], testDef);

                binder.loaded().then(function () {
                    var instance = ioc.get('module4');
                    assert.ok(instance.name === 'm4');
                    assert.ok(instance.dep.name === 'module3');
                    start();

                });
            });

            asyncTest('resolving a module with $$ causes it to return a factory', function (assert) {
                function Module1(counter) {
                    this.m1 = counter();
                    this.m2 = counter();
                }
                Module1._inject = ['$$module2'];

               
                ioc.bind('module1', Module1);
                ioc.bind('module2', counter);

                ioc.loaded().then(function () {
                    var thing = ioc.get('module1');
                    assert.equal(thing.m1.id, 0);
                    assert.equal(thing.m2.id, 1);
                    start();
                });


            });

            asyncTest('resolving modules with deps resolves correct scope for dependencies', function (assert) {
                ioc.bind('module1').inLocalScope();
                ioc.bind('module2').inTransientScope();
                ioc.bind('module3').inTransientScope();

                ioc.loaded().then(function () {
                    // get m1 and m2 before they are resolved as deps of m3, then compare
                    var m1 = ioc.get('module1');
                    var m2 = ioc.get('module2');
                    var m3 = ioc.get('module3');
                    assert.ok(m1 === m3.m1, "module1 resolved as a dep is same instance as previously resolved");
                    assert.ok(m2 !== m3.m2, "module2 as a dep is a new instance");
                    start();
                });
            });

            asyncTest('resolving with $ioc, explicit deps, automatic deps, and args', function (assert) {
                // don't bind module 2
                ioc.bind('module1').inLocalScope();
                ioc.bind('module4');

                var module2 = { foo: 'bar' };

                ioc.loaded().then(function () {
                    var m4 = ioc.get('module4', {
                        module2: module2
                    }, ['val1', 'val2']);

                    assert.ok(m4.m1 === ioc.get('module1'), 'module1 was resolved');
                    assert.ok(m4.m2 === module2, 'module2 was resolved');
                    assert.ok(m4.p1 === 'val1', 'p1 was passed');
                    assert.ok(m4.p2 === 'val2', 'p2 was passed');
                    assert.ok(m4.$ioc === ioc, 'ioc was passed');
                    start();

                });


            });

            asyncTest('factory method', function (assert) {
                ioc.bind('module1', counter);
                var Cotr = ioc.cotr('module1');

                ioc.loaded().then(function () {
                    var factory = ioc.factory('module1');

                    var i1 = factory();
                    var i2 = factory('bar');

                    assert.ok(i1 instanceof Cotr);
                    assert.ok(i2 instanceof Cotr);
                    assert.ok(i1 !== i2);
                    assert.ok(i2.arg === 'bar');
                    start();
                });
            });

            asyncTest('factory method only for transient', function (assert) {

                assert.expect(2);

                ioc.bind('module1', counter).inLocalScope();
                ioc.bind('module2', counter).inSingletonScope();
                
                ioc.loaded().then(function () {
                    ['module1', 'module2'].forEach(function (m) {
                        assert.throws(function () {
                            var f = ioc.factory(m);
                        }, function (e) {
                            return e.message.indexOf('Factories can') >= 0;
                        });
                    });
                    start();
                });
            });
        });

}());

