#!/bin/bash  

echo "Enter the module name: "  
read moduleName 
# This generates modules, controllers and service file
nest g resource $moduleName --no-spec
# nest g resource $moduleName --no-spec --no-entity
# nest g resource src/modules/auth/users --no-entity

mv src/$moduleName src/modules/
