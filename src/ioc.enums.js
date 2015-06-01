define('utility.ioc.enums', function () {
    'use strict';
    return {
        scopes: {
            // means a new instance is always created
            transient: 1,
            // means a new instance is created only once in the current scope
            local: 2,
            // means a new instance is created only once
            singleton: 3
        },
        invocations: {
            // module should be treated as a constructor
            constructor: 1,
            // module returns new instances already
            factory: 2
        }
    };

});