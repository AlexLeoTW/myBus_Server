/*jshint esversion: 6*/

var express = require('express');
var debug = require('debug')('ibus:route');
var router = express.Router();

var mysql = require('mysql');
var sql_config = require('../sql_config');
var db = mysql.createPool(sql_config.db);

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/bus', (req, res, next) => {
    console.log('req.query.station = ' + req.query.station);
    console.log('req.query.route = ' + req.query.route);
    console.log('req.query.is_reverse = ' + req.query.is_reverse);
    if (req.query.station && req.query.route && req.query.is_reverse) {
        var station;
        var query = '';

        /** Get Bus Station Cordniate **/
        //SELECT * FROM `bus_stop` ORDER BY ABS(`longitude`-450) LIMIT 1
        //var query = 'SELECT * FROM `bus_stop` ORDER BY ABS(`longitude`-' + 450 + ') LIMIT 1';

        //SELECT * FROM `bus_stop` WHERE `name` LIKE '%臺中%' AND `route`=160
        //SELECT * FROM `bus_stop` WHERE `route`=160 AND `sn`=1
        query = 'SELECT * FROM `bus_stop` ';
        if (isNaN(Number(req.query.station))) {
            // 站名搜尋
            query += 'WHERE `route`=' + req.query.route + ' AND `name` LIKE \'%' + req.query.station + '%\'';
        } else {
            // sm 搜尋
            query += 'WHERE `route`=' + req.query.route + ' AND `sn`='+req.query.station;
        }
        db.query(query, (err, results) => {
            if (err) throw err;
            console.log(JSON.stringify(results));
            returnBusList(res, req.query.route, results[0], req.query.is_reverse, req.query.limit);
        });
    } else {
        var err = new Error('Too few conditions');
        err.status = 413;
        throw err;
    }
});

function returnBusList(res, route, station, is_reverse, limit) {
    console.log(JSON.stringify(station));
    /** Get Bus List **/
    //SELECT * FROM `Bus_status` WHERE `route`=160 AND `is_reverse`=true ORDER BY ABS(`longitude`-450)
    query = 'SELECT * FROM `Bus_status` ' +
            'WHERE `route`=' + route + ' AND `is_reverse`=' + is_reverse + ' ' +
            'ORDER BY ABS(`longitude`-' + station.longitude + ')';
    console.log(query);
    db.query(query, (err, results) => {
        if (err) throw err;
        if (limit) {
            res.send(JSON.stringify(results.slice(0, limit)));
        } else {
            res.send(JSON.stringify(results));
        }
    });
}

module.exports = router;
