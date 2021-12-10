var express = require('express');
var http = require('http');
var bodyParser = require('body-parser');
var logger = require('morgan');
var { SuperLogin } = require('@sl-nx/superlogin-next');
const nano = require('nano')('http://admin:Fcrlab2021!@pi1:5984');

const axios = require("axios");

var app = express();
app.set('port', process.env.PORT || 3000);
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
var port = 8080;
var config = {
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


async function update_permission(path, roles)
{
    const q = {
        selector: {
            path: path
        },
        limit: 1
    };
    const permissions = nano.db.use('permissions');
    const response = await permissions.find(q)

    const doc = response.docs[0]
    console.log(doc)
    doc.roles = roles

    await permissions.insert(doc, doc._id)

}

async function find_roles(path){
    const q = {
        selector: {
            path: path
        },
            fields: ["roles"],
        limit:1
    };
    const permissions = nano.db.use('permissions');
    const response = await permissions.find(q)
    return response.docs[0].roles
}

async function requireDynamicRoles(req, res, next){
        try{
            let roles = await find_roles(req.path);
            res.locals.roles = roles;
            superlogin.requireAnyRole(roles)(req, res, next)
            console.log("calling next")
            //next() // next is called by requireAnyRole het
        }catch {
            res.status(500);
            res.send('Generic Error');
        }
}

async function proxy(req, res, next){
    let body =  (await axios.get('https://dog.ceo/api/breeds/list/all')).data
    res.send(body)
}
// Initialize SuperLogin
var superlogin = new SuperLogin(config);

// Mount SuperLogin's routes to our app
app.use('/auth', superlogin.router);

app.get('/admin', superlogin.requireAuth, superlogin.requireAnyRole(['admin']),
    function(req, res, ) {
        res.send('Welcome Admin');
    });


app.get('/dynamic', superlogin.requireAuth, requireDynamicRoles,    
    function(req, res) {
        console.log("js")
        res.send(`${req.path} Authorized`);
    });

app.get('/user', superlogin.requireAuth, superlogin.requireAnyRole(['moderator']), proxy)
app.get('/service', superlogin.requireAuth, requireDynamicRoles, proxy)

app.put("/permission", async function(req, res) {
    const body = req.body;
    try{
        await update_permission(body.path, body.roles)
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
