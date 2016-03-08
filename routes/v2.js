/*jslint node: true, nomen: true, unparam: true */
'use strict';

var express = require('express');
var router = express.Router();
var busInfo = require('../Testing/businfo.js');

// initial DB object
var mysql = require('mysql');
var sql_config = require('../sql_config');
var connection = mysql.createConnection(sql_config);

router.get('/bus', function(req, res, next) {
    res.set("Connection", "close");
    res.send(busInfo.getBus('req.body.id', mysql, 'myBusV2.raw'));
});

module.exports = router;
