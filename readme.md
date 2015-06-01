#ioc - A DI container 

###Basic usage

#####create a new root-level container

Add `utility.ioc` as a dependency at bootstrapping. You don't need explcit references to the container outside of the top level, as it will inject itself onto things it creates.

    var container = ioc(); 


###Binding modules

Modules can be bound from requireJs or defined directly. Some examples

#####bind a module returning a constructor (default behavior)

    container.bind('requireJsModule').asConstructor();

#####bind a module returning a factory method (e.g. invoking it returns a new instance)

    container.bind('requireJsModule').asFactory(); 

#####bind a module and return a new instance each time (default behavior)

    container.bind('requireJsModule').inTransientScope();

#####bind a module and return a single instance per scope

    container.bind('requireJsModule').inLocalScope();

#####bind a module and return a single instance ever
   
    container.bind('requireJsModule').inSingletonScope();


#####bind multiple modules with same config

    container.bind(['requireJsModule1', 'requireJsModule2']).inLocalScope(); 

#####bind a module definition directly (e.g. without requireJs)

    container.bind('moduleName', SomeConstructor); 

###Finish bootstrapping

  
After config, you need to ensure all requireJs dependencies are loaded before you can use the container to
provide instances

    container.loaded().then(function() {
        var vm = ioc.create('shellViewModel')

        // bind in whatever way you do
        // finish bootstrapping
    });

###Use it

#####get an instance

    var instance = container.get('module-name'); 

#####create a new scope  

Entities bound with a local scope will have one instance per scope. Singletons have one instance per container. Transient things always get a new instance.
 
    var innerContainer = container.create(); 

#####use constructor injection

This syntax causes dependencies to be automatically resolved from the current scope and injected via constructor parameters:

    function MyModule(dep1, dep2) { ... }
    MyModule._inject = ["someModule", "someOtherModule"];

....automatically pass the container as a parameter
   
If you need access to the container itself, e.g. to resolve dependencies dynamically, you can inject it also:

    function MyModule(container, dep1, dep2) { ... }
    MyModule._inject = ["$ioc", "someModule", "someOtherModule"];
   
...inject something as a factory

Adding $$ before a dependency results in a factory being injected instead of an instance.

  function MyModule(container, dep1factory, dep2) { ... }
    MyModule._inject = ["$ioc", "$$someModule", "someOtherModule"];


######ways to create instances


return an instance of MyModule, inject instances of someModule & someOtherModule via constructor parms:
   
    var myModule = container.get("myModule"); 

return an instance of MyModule, passing in user-defined parameters to the constructor
constructor parms. (If _inject is also used, these parameters are passed after the
automatically-resolved ones)
   
    var myModule = container.get("myModule", ["parm1", parm2]); 

return an instance of MyModule, specifying the dependencies by name rather than letting the container
resolve them
   
    var myModule = container.get("myModule", { 
        module1: myModule1,
        module2: myModule2
    });
 
.. and also pass additional constructor parameters
   
    var myModule = container.get("myModule", { 
       module1: myModule1,
       module2: myModule2
    }, ["parm1", parm2]);

get a factory (for something in transient scope only)

    var myModuleFactory = container.get("myModule")

    var myModule = myModuleFactory();
    var anotherMyModule = myModuleFactory();

... with runtime dependencies

    var myModuleFactory = container.get("myModule", {module1: myModule1});
    var myModule = myModuleFactory();

.. pass arguments

    var myModule = myModuleFactory(arg1, arg2);

Note when using a factory, args are not passed as an array.

