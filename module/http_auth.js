/*jslint esversion: 6, node: true*/

'use strict';

// mysql module
var mysql = require('promise-mysql');
var sql_config = require('../sql_config');
var db = mysql.createPool(sql_config.db);
const crypto = require('crypto');
var passport = require('passport');
var BasicStrategy = require('passport-http').BasicStrategy;
var sqlEscape = require('../module/sqlEscape.js');
var debug = require('debug')('myBus:auth');

// const successRedrict = "/";
// const failureRedirect = "/login";

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
    var user = {};
    user.uuid = uuid;
    user.password = password;

    try {
        sqlEscape.escapeParam(user,
            'uuid', {length: 8}
        );
    } catch (err) {
        err.code = 406;
        throw err;
    }

    getUser(user, done);
};

function getUser(user, done) {
    console.log(user);
    var query = `SELECT * FROM USER WHERE UUID = ${user.uuid} AND password = '${sha512Base64(user.password)}'`;
    db.query(query).then((rows, field) => {
        if (rows.length > 0) {
            return done(null, rows[0]);
        } else {
            return done(null, false);
        }
    }, (err) => {
        err = new Error('Wow! Looks like the Database is down, maybe we should give it a hug!?');
        err.code = 500;
        return done(err);
    });
}

auth.register = function (uuid, password, phone) {
    var user = {};
    user.uuid = uuid;
    user.password = password;
    user.phone = phone;

    try {
        sqlEscape.escapeParam(user,
            'uuid', {length: 8},
            'phone', null
        );
    } catch (err) {
        err.code = 406;
        throw err;
    }

    return saveUser(user);
};

function saveUser(user) {
    var query = `INSERT INTO \`USER\` (\`UUID\`, \`password\`, \`phone_number\`)` +
                `VALUES (${user.uuid.toUpperCase()}, '${sha512Base64(user.password)}', ${user.phone});`;
    return db.query(query).then((result) => {
        debug(`${user.uuid} successfuly registered`);
        return {uuid: user.uuid.substring(1, user.uuid.length-1),
            phone: user.phone.length > 1 ? user.phone.substring(1, user.phone.length-1) : 'no data',
            description: 'successfuly registered'};
    }, (err) => {
        if (err.code.includes('ER_DUP_ENTRY')) {
            debug(`${user.uuid} try to rigister using an existing EasyCard`);
            err = new Error('This EasyCard already been registered, please try again with another one');
            err.code = 409;
            throw err;
        } else {
            err = new Error('Wow! Looks like the Database is down, maybe we should give it a hug!?');
            err.code = 500;
            throw err;
        }
    });
}

passport.use('api', new BasicStrategy(auth.authenticate));

module.exports = auth;
