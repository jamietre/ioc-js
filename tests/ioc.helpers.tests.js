/*global document,  window, requireContext, module, test, asyncTest, start */
/*jshint onevar: false, laxcomma: true*/

(function () {
    'use strict';

    /* Note - the comment tests don't work in phantomjs - and generally we should probably not be looking for comments
      in code anyway since they will be removed when minified */

    requireContext()
        .load('underscore')
        .resolve(['utility.ioc.helpers'])
        .require(['utility.ioc.helpers'], function (helpers) {
            var ioc;

            module('utility.ioc.helpers');

            test('getFunctionParams - 1 comment before', function (assert) {
                function test(/* comment1 */ param1) { }

                var parms = helpers.getFunctionParams(test);

                assert.equal(parms.length, 1);
                assert.equal(parms[0].name, 'param1');
                //assert.equal(parms[0].comments.length, 1);
                //assert.equal(parms[0].comments[0], 'comment1');
            });

            test('getFunctionParams - multiple comments before', function (assert) {
                function test(/*comment1*/ /*another */ param1) { }

                var parms = helpers.getFunctionParams(test);

                assert.equal(parms.length, 1);
                assert.equal(parms[0].name, 'param1');
                //assert.equal(parms[0].comments.length, 2);
                //assert.equal(parms[0].comments[0], 'comment1');
                //assert.equal(parms[0].comments[1], 'another');
            });


            test('getFunctionParams - comments before and after with newlines and commas', function (assert) {
                function test(/*comment1*/
                    /*another */ param1
                    /* after, 1 */ /* after 2*/,
                    param2 /* comment, after param2 */, param3) { }

                var parms = helpers.getFunctionParams(test);

                assert.equal(parms.length, 3);
                assert.equal(parms[0].name, 'param1');
                assert.equal(parms[1].name, 'param2');
                assert.equal(parms[2].name, 'param3');

                //assert.equal(parms[0].comments.length, 4);
                //assert.equal(parms[0].comments[0], 'comment1');
                //assert.equal(parms[0].comments[1], 'another');
                //assert.equal(parms[0].comments[2], 'after, 1');
                //assert.equal(parms[0].comments[3], 'after 2');

                //assert.equal(parms[1].comments.length, 1);
                //assert.equal(parms[1].comments[0], 'comment, after param2');

                //assert.equal(parms[2].comments.length, 0);
            });

        });

}());

