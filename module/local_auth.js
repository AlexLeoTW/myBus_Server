/*jslint esversion: 6, node: true*/

'use strict';

// exports module
var auth = {};

const crypto = require('crypto');

//passport module
//const successRedrict = "/";
//const failureRedirect = "/login";

// mysql module
var mysql = require('promise-mysql');
var sql_config = require('../sql_config');
var db = mysql.createPool(sql_config.db);

function sha512Base64(password) {
    if (password === undefined) {
        return password;
    } else {
        var hash = crypto.createHash('sha512');
        hash.update(password);
        return hash.digest('base64');
    }
}

auth.postOption = {
    usernameField: 'UUID',
    passwordField: 'password'
};

// TODO: only check password for existing account.
auth.authenticate = function (uuid, password, done) {
    console.log(`uuid = ${uuid}`);
    console.log(`password = ${password}`);
    var query = `SELECT * FROM USER WHERE UUID = '${uuid}' AND password = '${sha512Base64(password)}'`;
    console.log(`query = ${query}`);
    db.query(query).then((rows, field) => {
        if (rows.length > 0) {
            return done(null, rows[0]);
        } else {
            return done(null, false);
        }
    }, (err) => {
        return done(err);
    });
};

auth.serializeUser = function() {};

auth.deserializeUser = function() {};

module.exports = auth;
