/*
#! /bin/bash
# init admin db
curl -X PUT http://admin:password@127.0.0.1:5984/_users;
curl -X PUT http://admin:password@127.0.0.1:5984/_replicator;
curl -X PUT http://admin:password@127.0.0.1:5984/sl-users;
curl -X PUT http://admin:password@127.0.0.1:5984/permissions;
*/

const axios = require('axios');

async function initCouchDB(user, password, host, port){
    const urlBase = `http://${user}:${password}@${host}:${port}`;

    var config = {
        method: 'put',
        headers: {},
        data: {}
    };
        config.url = `${urlBase}/_users`;
        await axios(config);
        config.url = `${urlBase}/_replicator`,
        await axios(config);
        config.url = `${urlBase}/sl-users`;
        await axios(config);
        config.url = `${urlBase}/permissions`,
        await axios(config);

}

async function isInit(user, password, host, port){
    const urlBase = `http://${user}:${password}@${host}:${port}`;

    var config = {
        method: 'get',
        url: `${urlBase}/_users`,
        headers: {},
        data: {}
    };

    try{
       await axios(config)
       return true
    }
    catch (error){
        return false;
    }

}

module.exports = {initCouchDB, isInit}