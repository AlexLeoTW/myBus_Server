/*jslint esversion: 6, node: true, nomen: true, unparam: true */
'use strict';

var debug = require('debug')('myBus:rv2');
var express = require('express');
var router = express.Router();
var busInfo = require('../Testing/businfo.js');

// initial DB object
var mysql = require('mysql');
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
    // thisStop=FCU001&busNo=NO.160&arrStop=001&UID=b397a7f7
    // INSERT INTO `Reservation_List`(`UUID`, `route`, `is_reverse`, `from_sn`, `to_sn`) VALUES ('B397A7F7',160,false,1,3)
    var query = "INSERT INTO `Reservation_List`(`UUID`, `route`, `is_reverse`, `from_sn`, `to_sn`) ";
    console.log(JSON.stringify(req.body));
    if (req.body.UID && req.body.route && req.body.from_sn && req.body.to_sn) {
        query += 'VALUES (\'' + req.body.UID + '\',' + req.body.route + ',' + (req.body.from_sn<req.body.to_sn) + ',' + req.body.from_sn + ',' + req.body.to_sn + ')';
        debug('query=[' +  query + ']');
        db.query(query, (err, rows, fields) => {
            if (err) {
                debug(err.code);
                if (err.code == 'ER_DUP_ENTRY') {
                    err = new Error('Duplicated reservation');
                    err.status = 400;
                    /*res.render('error', {
                        message: err.message,
                        error: {}
                    });*/
                    // Promise
                }
            }
        });
    } else {
        var err = new Error('Too few arguments');
        err.status = 400;
        throw err;
    }

    res.set("Connection", "close");
    res.send('');
});

module.exports = router;
