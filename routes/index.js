/*jslint node: true, nomen: true, unparam: true */
'use strict';

var debug = require('debug')('myBus:route');
var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var sql_config = require('../sql_config');
var connection = mysql.createConnection(sql_config);
var meterToCord = 0.00000900900901;

/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', { title: 'myBus' });
});

router.post('/getRoute', function (req, res, next) {
    //var lang = req.body.lang || 'zh-TW';

    res.set("Connection", "close");
    connection.connect();
    debug(req.body);

    connection.query("SELECT * FROM `route` ", function (err, rows, fields) {
        var route = {};

        if (err) { throw err; }
        route.count = rows.length;
        route.routes = rows;
        res.json(route);
    });
    connection.end();
});

/*
 * TO-DO: add SQL content
*/
router.post('/findBusStopBy_location', function (req, res, next) {
    var latitude = Number(req.body.latitude),
        longitude = Number(req.body.longitude),
        radius = Number(req.body.radius);
        //lang = req.body.lang || 'zh-TW';

    res.set("Connection", "close");
    connection.connect();
    debug(req.body);

    if (!isNaN(latitude) && !isNaN(longitude) && !isNaN(radius)) {
        var selectArea = {
            'top': latitude + meterToCord * radius / 2,
            'left': longitude - meterToCord * radius / 2,
            'right': longitude + meterToCord * radius / 2,
            'down': latitude - meterToCord * radius / 2
        };

        connection.query('SELECT * FROM bus_stop', function (err, rows, fields) {
            var stop = {};

            if (err) { throw err; }
            stop.stopCount = rows.length;
            stop.stops = rows;
            res.json(stop);
        });
    }
    connection.end();
});

router.post('/findBusStopBy_route', function (req, res, next) {
    var route = Number(req.body.route);
        //lang = req.body.lang || 'zh-TW';

    res.set("Connection", "close");
    connection.connect();
    debug(req.body);

    if (!isNaN(route)) {
        connection.query('SELECT * FROM bus_stop', function (err, rows, fields) {
            var stop = {};

            if (err) { throw err; }
            stop.stopCount = rows.length;
            stop.stops = rows;
            res.json(stop);
        });
    }
    connection.end();
});

/*
 * TO-DO: add SQL content
*/
router.post('/getEstimateTime', function (req, res, next) {});

/*
 * TO-DO: add SQL content
*/
router.post('/registerUser', function (req, res, next) {});

/*
 * TO-DO: add SQL content
*/
router.post('/userLogin', function (req, res, next) {});

/*
 * TO-DO: add SQL content
*/
router.post('/addBusStop', function (req, res, next) {});

/*
 * TO-DO: add SQL content
*/
router.post('/getTimeSliceList', function (req, res, next) {});

/*
 * TO-DO: add SQL content
*/
router.post('/addTimeSliceList', function (req, res, next) {});

module.exports = router;
