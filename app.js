var express = require('express');
var http = require('http');
var bodyParser = require('body-parser');
var logger = require('morgan');
var { SuperLogin } = require('@sl-nx/superlogin-next');
const nano = require('nano')('http://admin:Fcrlab2021!@pi1:5984');

const axios = require("axios");
const {parseHost} = require("express-http-proxy/lib/requestOptions");

var app = express();
app.set('port', process.env.PORT || 3000);
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
const port = 8080;
const config = {
    dbServer: {
        protocol: 'http://',
        host: 'pi1:5984',
        user: 'admin',
        password: 'Fcrlab2021!',
        userDB: 'sl-users',
        couchAuthDB: '_users'
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

    const doc = response.docs[0]
    console.log(doc)
    doc.roles = roles || doc.roles
    doc.host = host || doc.host
    doc.port = port || doc.port

    await permissions.insert(doc, doc._id)

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
            let roles = (await find_service(req.internal_path)).roles;
            console.log(roles)
            superlogin.requireAnyRole(roles)(req, res, next)
            console.log("calling next")
            //next() // next is called by requireAnyRole het
        }catch {
            res.status(500);
            res.send('Generic Error');
        }
}


async function proxy (req, res, next){
    let service = await find_service(req.internal_path)
    let path2 = `${service.host}:${service.port}`
    console.log(`${req.path} -> ${path2}`)
    let body = (await axios.get(path2)).data
    res.send(body)
}


function remove_prefix(prefix){
    return async (req, res, next) => {
        req.internal_path = req.path.replace(prefix, "")
        next()
    }
}


// Initialize SuperLogin
var superlogin = new SuperLogin(config);

// Mount SuperLogin's routes to our app
app.use('/auth', superlogin.router);



app.get('/proxy/*', superlogin.requireAuth, remove_prefix("/proxy"), requireDynamicRoles, proxy)

app.put("/service", async function(req, res) {
    const body = req.body;
    try{
        await update_service(body.deployment, body.host, body.port, body.path, body.roles)
        res.send(201)
    }
    catch{
        res.status(500)
        res.send("error")
    }
})



//http.createServer(app).listen(app.get('8080'));
app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})
