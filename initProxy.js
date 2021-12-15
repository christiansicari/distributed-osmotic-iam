
var axios = require('axios');

async function regUser() {

  var data = JSON.stringify({
    "name": "Joe Smith",
    "username": "fcrlab",
    "email": "joesmith@example.com",
    "password": "fcrlab!!",
    "confirmPassword": "fcrlab!!"
  });

  var config = {
    method: 'post',
    url: 'http://localhost:8080/auth/register',
    headers: {
      'Content-Type': 'application/json'
    },
    data: data
  };
  try {
    await axios(config)
  }
  catch{
    console.log("error registring user")
  }
}

async function regService() {
  var data = JSON.stringify({
    "host": "http://172.17.7.37",
    "port": 31099,
    "deployment": "app1",
    "path": "/service",
    "roles": [
      "admin",
      "super direttore galattico"
    ]
  });

  var config = {
    method: 'put',
    url: 'http://localhost:8080/service',
    headers: {
      'Content-Type': 'application/json'
    },
    data: data
  };

  try {
    await axios(config)
  }
  catch{
    console.log("error registring service")
  }
}

module.exports = { regUser, regService }