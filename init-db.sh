#! /bin/bash

# init admin db
curl -X PUT http://admin:password@127.0.0.1:5984/_users;
curl -X PUT http://admin:password@127.0.0.1:5984/_replicator;
curl -X PUT http://admin:password@127.0.0.1:5984/sl-users;
curl -X PUT http://admin:password@127.0.0.1:5984/permissions;


