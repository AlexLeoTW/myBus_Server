/*jslint esversion: 6, node: true, nomen: true, unparam: true */
'use strict';

var debug = require('debug')('myBus:rv2');
var express = require('express');
var router = express.Router();
var busInfo = require('../Testing/businfo.js');

// initial DB object
var mysql = require('promise-mysql');
var sql_config = require('../sql_config');
var db = mysql.createPool(sql_config.db);

router.get('/route', function (req, res) {
    debug(JSON.stringify(req.query));
    if (req.query.route) {
        var query = `SELECT * FROM \`Bus_stop\` WHERE \`route\`=${Number(req.query.route)}`;
        db.query(query).then((rows, field)=>{
            res.send(JSON.stringify(rows));
        }, (err)=>{
            throw err;
        });
    } else {
        var err = new Error('Too few arguments');
        err.status = 400;
        throw err;
    }
});

router.get('/bus', function(req, res) {
    res.set("Connection", "close");
    res.send('this is bus');
});

router.post('/register', (req, res) => {
    res.set("Connection", "close");
    res.send('');
});

router.get('/lineStatus', (req, res) => {
    res.set("Connection", "close");
    res.send('1');
});

router.post('/reservation', (req, res) => {
    // INSERT INTO `Reservation_List`(`UUID`, `route`, `is_reverse`, `from_sn`, `to_sn`) VALUES ('B397A7F7',160,false,1,3)
    var query = "INSERT INTO `Reservation_List`(`UID`, `route`, `is_reverse`, `from_sn`, `to_sn`) ";

    if (req.body.UID && req.body.route && req.body.from_sn && req.body.to_sn && !isNaN(req.body.from_sn) && !isNaN(req.body.to_sn)) {
        ['UID', 'route', 'from_sn', 'to_sn'].forEach((item, index) => {
            req.body[item] = mysql.escape(req.body[item]);
        });

        query += `VALUES (${req.body.UID},${req.body.route},${(req.body.from_sn<req.body.to_sn)},${req.body.from_sn},${req.body.to_sn})`;
        debug(query);
        db.query(query).then( (raws, field) => {
            res.send("Register OK");
        }, (err) => {
            if (err.code.includes('ER_DUP_ENTRY')) {
                //UPDATE `Reservation_List` SET `route`=160,`is_reverse`=true,`from_sn`=5,`to_sn`=3 WHERE `UID`='b397a7f7'
                debug(err.code);
                query = `UPDATE \`Reservation_List\` SET \`route\`=${req.body.route},\`is_reverse\`=${(req.body.from_sn<req.body.to_sn)},\`from_sn\`=${req.body.from_sn},\`to_sn\`=${req.body.to_sn} WHERE \`UID\`=${req.body.UID}`;
                debug(query);
                db.query(query).then(() => {
                    res.send("Register Update OK");
                });
            } else {
                throw err;
            }
        }).error((err) => {
            debug(err.code);
            if (err.code.includes('ER_NO_REFERENCED_ROW')) {
                res.status(400);
                res.render('error', {
                    message: 'Error you are not registered yet',
                    error: {}
                });
            } else {
                res.status(500);
                res.render('error', {
                    message: 'Unknown Error',
                    error: {}
                });
            }
        });
    } else {
        var err = new Error('Too few arguments');
        err.status = 400;
        throw err;
    }
});

module.exports = router;
