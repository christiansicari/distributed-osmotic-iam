
var axios = require('axios');

function regUser() {

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

  axios(config)
      .then(function (response) {
        console.log(JSON.stringify(response.data));
      })
      .catch(function (error) {
        console.log(error);
      });
}

function regService(){
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
    data : data
  };

  axios(config)
      .then(function (response) {
        console.log(JSON.stringify(response.data));
      })
      .catch(function (error) {
        console.log(error);
      });
}

module.exports = {regUser, regService}