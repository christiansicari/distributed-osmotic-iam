var express = require('express');
var http = require('http');
var bodyParser = require('body-parser');
var logger = require('morgan');
var request = require('request');
var superlogin;
const dbUser = "admin"
const dbPassword = "password"
const dbHost = "localhost"
const dbPort = "5984"
const initProxy = require("./initProxy")
const initDB = require("./initDB")
const nano = require('nano')(`http://${dbUser}:${dbPassword}@${dbHost}:${dbPort}`);
const axios = require("axios");
const port = 8080;
var md5 = require('md5');

async function testDB(){
    await nano.info()
}
async function update_service(deployment, host, port, path, roles)
{
    const q = {
        selector: {
            deployment: deployment
        },
        limit: 1
    };
    const permissions = nano.db.use('permissions');
    const response = await permissions.find(q)
    console.log(response.docs)
    let doc = {}
    if( response.docs.length > 0){
        doc = response.docs[0]
        doc.host = host || doc.host
        doc.port = port || doc.port
        doc.path = path || doc.path
        doc.roles = roles || doc.roles
        doc.deployment = deployment || doc.deployment
    }
    else{
        doc.host = host
        doc.port = port
        doc.path = path
        doc.roles = roles
        doc.deployment = deployment
    }

    await permissions.insert(doc, doc._id)

}


async function get_all_documents(collection){
    try{
        const permissions = nano.db.use(collection);
        let query = {
            "selector": {
                "_id": {
                    "$exists": true
                }
            }
        }
        const response = (await permissions.find(query)).docs;
        return response
    }catch{
        return []
    }
}


async function find_service(path){
    const q = {
        selector: {
            path: path
        },
            fields: ["roles", "host", "port"],
        limit:1
    };
    const permissions = nano.db.use('permissions');
    const response = await permissions.find(q)
    console.log(path, response)
    return response.docs[0]
}


async function find_user(email){
    const q = {
        selector: {
            email: email
        },
        fields: ["roles", "email"],
        limit:1
    };
    const permissions = nano.db.use('users');
    const response = await permissions.find(q)
    return response.docs[0]
}



async function requireDynamicRoles(req, res, next){
        try{
            console.log("Requiring Dynamic Roles")
            let allowed_roles = (await find_service(req.internal_path)).roles;
            let roles = (await find_user(req.email)).roles
            if(allowed_roles.filter(value => roles.includes(value)).length > 0){
                next()
            }
            else res.sendStatus(403)


            //next() // next is called by requireAnyRole het
        }catch(error) {
            res.status(500);
            res.send(`Error on requireDynamicRoles ${error}` );
        }
}

async function register(req, res, next){
    const users = nano.db.use('users');
    let doc = {'email': req.body.email, hash: md5(req.body.password), roles: ['user']}
    await users.insert(doc)
    res.sendStatus(201)
}
function base64ToStr(str){
    let buff = new Buffer(str, 'base64');
    let text = buff.toString('utf-8');
    return text

}
async function verify_user(req, res, next){
    const users = nano.db.use('users');
    let [email, password] = base64ToStr(req.headers.authorization.split("Basic ")[1]).split(":")
    let query = {
        "selector": {
            "email": {"$eq": email},
            "hash": {"$eq": md5(password)},

            //"password": md5(password) //future works
        }
    }
    const response = (await users.find(query)).docs;
    if (response.length > 0){
        console.log("User found")
        req.email = email
        next()
    }
    else res.sendStatus(401)
}



async function proxy (req, res, next){
    console.log("Starting proxy")
    let service = await find_service(req.internal_path)
    console.log("service found", service)
    let path2 = `http://${service.host}:${service.port}`
    console.log(`${req.path} -> ${path2}`)
    let body = (await axios.get(path2)).data
    console.log("sending content on")
    console.log(body)
    res.send(body)
}


function remove_prefix(prefix){
    return async (req, res, next) => {
        req.internal_path = req.path.replace(prefix, "")
        next()
    }
}

function onListening(){

    console.log("Init Proxy")
    initProxy.regUser()
    initProxy.regService()

}
async function runApp(){
    var app = express();
    app.use(logger('dev'));

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: false }));
// Mount SuperLogin's routes to our app

    app.get("/db/:collection", async function(req, res, next){
        let data = await get_all_documents(req.params.collection)
        res.send({data: data} )
    })
    app.get('/proxy/*', remove_prefix("/proxy"), verify_user, requireDynamicRoles, proxy)

    app.put("/service", async function(req, res) {
        const body = req.body;
        try{
            await update_service(body.deployment, body.host, body.port, body.path, body.roles)
            res.send(201)
        }
        catch (error){
            console.error(error);
            res.status(500)
            res.send("error")
        }
    })

    app.post("/auth/register",register)

    return app.listen(port, async () => {})
}


let attempts = 100;
async function wait_DB(){
    let isDBset = false;
    for(let i = 0; i < attempts && !isDBset; i++){
        try{
            await testDB();
            isDBset = true;
         }
         catch{
             console.log(`DB Connection attempt: ${i}/${attempts} failed, sleeping...`)
            await new Promise(r => setTimeout(r, 5000));
         }
    }
    if(!isDBset){
        console.log("DB connection failed, exit");
        throw "DB connection error"    
    }
    console.log("DB connection established")

}
async function run(){
    await wait_DB();
    let isInit = false;
    isInit = await initDB.isInit(dbUser, dbPassword, dbHost, dbPort);
    if(!isInit){
        console.log("Configure database")
        await initDB.initCouchDB(dbUser, dbPassword, dbHost, dbPort);
    }
    else
        console.log("System already configured")
    await runApp()
    if(!isInit){
        console.log("Waiting 5 seconds")
        await new Promise(r => setTimeout(r, 5000));
        console.log("Configure Proxy")
        //onListening();
    }
}

run()
.then(() =>console.log(`Example app listening at http://localhost:${port}`))
.catch( err => console.log(err))