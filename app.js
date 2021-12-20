var express = require('express');
var http = require('http');
var bodyParser = require('body-parser');
var { SuperLogin } = require('@sl-nx/superlogin-next');
var logger = require('morgan');
var request = require('request');

const dbUser = "admin"
const dbPassword = "password"
const dbHost = "localhost"
const dbPort = "5984"
const initProxy = require("./initProxy")
const initDB = require("./initDB")
const nano = require('nano')(`http://${dbUser}:${dbPassword}@${dbHost}:${dbPort}`);

const axios = require("axios");
const port = 8080;
const config = {
    dbServer: {
        protocol: 'http://',
        host: `${dbHost}:${dbPort}`,
        user: dbUser,
        password: dbPassword,
        userDB: 'sl-users',
        couchAuthDB: '_users'
    },
    local: {
        // Send out a confirm email after each user signs up with local login
        sendConfirmEmail: false,
        // Require the email be confirmed before the user can login
        requireEmailConfirm: false,
        // If this is set, the user will be redirected to this location after confirming email instead of JSON response
        confirmEmailRedirectURL: '/',
        // Set this to true to disable usernames and use emails instead
        emailUsername: false,
        // Custom names for the username and password fields in your sign-in form
        usernameField: 'user',
        passwordField: 'pass',
        // Override default constraints
    },
    mailer: {
        fromEmail: 'gmail.user@gmail.com',
        options: {
            service: 'Gmail', // N.B.: Gmail won't work out of the box, see https://nodemailer.com/usage/using-gmail/
            auth: {
                user: 'gmail.user@gmail.com',
                pass: 'userpass'
            }
        }
    },

    userDBs: {
        defaultDBs: {
            private: ['supertest']
        }
    }
}

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
        doc.roles = roles
        doc.host = host
        doc.port = port
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

async function requireDynamicRoles(req, res, next){
        try{
            console.log("Requiring Dynamic Roles")
            let roles = (await find_service(req.internal_path)).roles;
            console.log("Roles found for given service", roles)
            superlogin.requireAnyRole(roles)(req, res, next)
            //next() // next is called by requireAnyRole het
        }catch(error) {
            res.status(500);
            res.send('Error fetching service', error);
        }
}


async function proxy (req, res, next){
    console.log("Starting proxy")
    let service = await find_service(req.internal_path)
    console.log("service found", service)
    let path2 = `${service.host}:${service.port}`
    console.log(`${req.path} -> ${path2}`)
    let body = (await axios.get(path2)).data
    console.log("sending content on", path2)
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
    var superlogin = new SuperLogin(config);
// Mount SuperLogin's routes to our app
    app.use('/auth', superlogin.router);

    app.get("/db/:collection", async function(req, res, next){
        let data = await get_all_documents(req.params.collection)
        res.send(data)
    })
    app.get('/proxy/*', superlogin.requireAuth, remove_prefix("/proxy"), requireDynamicRoles, proxy)

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
    if(! isInit){
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