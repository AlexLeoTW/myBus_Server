/*jslint esversion: 6, node: true*/

'use strict';

// mysql module
var mysql = require('promise-mysql');
var sql_config = require('../sql_config');
var db = mysql.createPool(sql_config.db);
const crypto = require('crypto');

const successRedrict = "/";
const failureRedirect = "/login";

function sha512Base64(password) {
    if (password === undefined) {
        return password;
    } else {
        var hash = crypto.createHash('sha512');
        hash.update(password);
        return hash.digest('base64');
    }
}

// exports module
var auth = {};

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

auth.register = function (uuid, password, phone) {
    var query = `INSERT INTO \`USER\` (\`UUID\`, \`password\`, \`phone_number\`)` +
                `VALUES (${uuid.toUpperCase()}, '${sha512Base64(password)}', ${phone});`;
    console.log(query);
    return db.query(query).then((result) => {
        return {id: result.insertId, description: 'successfuly registered'};
    });
};

module.exports = auth;
