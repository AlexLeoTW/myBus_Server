/*jslint esversion: 6, node: true*/

'use strict';

// exports module
var auth = {};

//passport module
//const successRedrict = "/";
//const failureRedirect = "/login";

// mysql module
var mysql = require('promise-mysql');
var sql_config = require('../sql_config');
var db = mysql.createPool(sql_config.db);

auth.postOption = {
    usernameField: 'UUID',
    passwordField: 'password'
};

// TODO: only check password for existing account.
auth.authenticate = function (uuid, password, done) {
    var query = `SELECT * FROM USER WHERE UUID = '${uuid}' AND password = '${password}'`;
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
