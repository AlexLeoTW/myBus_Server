/*jslint esversion: 6, node: true, nomen: true, unparam: true */
'use strict';

var debug = require('debug')('myBus:rv2');
var express = require('express');
var router = express.Router();
var busInfo = require('../Testing/businfo.js');
var Promise = require('promise');
require('promise/lib/rejection-tracking').enable();

// initial DB object
var mysql = require('promise-mysql');
var sql_config = require('../sql_config');
var db = mysql.createPool(sql_config.db);

router.get('/route', function (req, res) {

});

router.get('/bus', function(req, res) {
    res.set("Connection", "close");
    res.send('this is bus');
});

router.post('/register', (req, res) => {
    res.set("Connection", "close");
    res.send('');
});

router.post('/reservation', (req, res) => {
    // INSERT INTO `Reservation_List`(`UUID`, `route`, `is_reverse`, `from_sn`, `to_sn`) VALUES ('B397A7F7',160,false,1,3)
    var query = "INSERT INTO `Reservation_List`(`UID`, `route`, `is_reverse`, `from_sn`, `to_sn`) ";

    if (req.body.UID && req.body.route && req.body.from_sn && req.body.to_sn) {
        query += 'VALUES (\'' + req.body.UID + '\',' + req.body.route + ',' + (req.body.from_sn<req.body.to_sn) + ',' + req.body.from_sn + ',' + req.body.to_sn + ')';
        db.query(query).then( (raws, field) => {
            res.send("");
        }).error((err) => {
            debug(err.code);
            res.status(400);
            res.render('error', {
                message: 'Error Dulipicated reservation',
                error: {}
            });
        });
    } else {
        var err = new Error('Too few arguments');
        err.status = 400;
        throw err;
    }
});

module.exports = router;
