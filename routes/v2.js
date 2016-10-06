/*jslint esversion: 6, node: true, nomen: true, unparam: true */
// TODO: enhance readability using res.format() https://expressjs.com/en/4x/api.html#res.format

'use strict';

var debug = require('debug')('myBus:rv2');
var express = require('express');
var router = express.Router();
var passport = require('passport');
var http_auth = require('../module/http_auth.js');
var sqlEscape = require('../module/sqlEscape.js');

// initial DB object
var mysql = require('promise-mysql');
var sql_config = require('../sql_config');
var db = mysql.createPool(sql_config.db);

router.get('/route', (req, res) => {
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

router.get('/bus', (req, res) => {
    res.set("Connection", "close");
    res.send('this is bus');
});

router.post('/register', (req, res) => {
    http_auth.register(req.body.uuid, req.body.password, req.body.phone).then((user) => {
        res.send(JSON.stringify(user));
    }, (err) => {
        res.status(err.code);
        res.json({
            description: err.message
        });
    });
});

router.get('/busArrival', (req, res) => {
    if (req.query.route === undefined) {
        res.status(400);
        res.json({
            description: 'Too few arguments (missing route)'
        });
    } else {
        var query = `SELECT * FROM \`Bus_arrival\` WHERE \`route\` = ${req.query.route} `;
        if (req.query.is_reverse !== undefined) {
            query += `AND \`is_reverse\` = ${sqlEscape.escapeBoolean(req.query.is_reverse)}`;
        }
        db.query(query).then((rows) => {
            if (rows.length === 0) {
                res.send(JSON.stringify(null));
            } else {
                res.send(JSON.stringify(rows));
            }
        });
    }
});

router.get('/lineStatus', (req, res) => {
    var query = '';

    if (req.query.verbose === undefined || sqlEscape.escapeBoolean(req.query.verbose) === true) {
        query += 'SELECT * ';
    } else {
        query += 'SELECT `closestStop` ';
    }

    query += 'FROM `Bus_status` ';

    if (req.query.route && req.query.is_reverse) {
        query += `WHERE \`route\` = ${db.escape(req.query.route)} AND \`is_reverse\` = ${sqlEscape.escapeBoolean(req.query.is_reverse)} `;
    } else {
        res.status(400);
        res.json({
            description: 'Too few arguments'
        });
    }

    if (req.query.sn) {
        query += `ORDER BY ABS(closestStop-${req.query.sn})`;
    }

    debug(query);
    res.set("Connection", "close");
    db.query(query).then((rows) => {
        if (rows.length === 0) {
            res.send(JSON.stringify(null));
        } else if (req.query.sn === undefined) {
            res.send(JSON.stringify(rows));
        } else {
            res.send(JSON.stringify(rows[0].closestStop));
        }
    });
});

router.post('/reservation',
    passport.authenticate('standard',{session: false}), (req, res) => {
    // INSERT INTO `Reservation_List`(`UUID`, `route`, `is_reverse`, `from_sn`, `to_sn`) VALUES ('B397A7F7',160,false,1,3)
    try {
        sqlEscape.escapeParam(req.body,
            'UID', null,
            'route', {type: 'number'},
            //'is_reverse', {optional: true},     // actually not needed anymore
            'from_sn', {type: 'number'},
            'to_sn', {type: 'number'}
        );
    } catch (err) {
        res.status(406);
        res.json({
            description: err.message
        });
    }

    var query = `INSERT INTO \`Reservation_List\`(\`UID\`, \`route\`, \`is_reverse\`, \`from_sn\`, \`to_sn\`) ` +
                `VALUES (${req.body.UID},${req.body.route},${(req.body.from_sn<req.body.to_sn)},${req.body.from_sn},${req.body.to_sn})`;
    db.query(query).then((rows, field) => {
        res.json({description: "Register OK"});
    }, (err) => {
        if (err.code.includes('ER_DUP_ENTRY')) {
            debug(`Reservation with id ${req.body.UID} already exist, update`);
            //UPDATE `Reservation_List` SET `route`=160,`is_reverse`=true,`from_sn`=5,`to_sn`=3 WHERE `UID`='b397a7f7'
            query = `UPDATE \`Reservation_List\` SET \`route\`=${req.body.route},\`is_reverse\`=${(req.body.from_sn<req.body.to_sn)},\`from_sn\`=${req.body.from_sn},\`to_sn\`=${req.body.to_sn} WHERE \`UID\`=${req.body.UID}`;
            db.query(query).then(() => {
                res.json({description: "Register UPDATE OK"});
            });
        } else if (err.code.includes('ER_NO_REFERENCED_ROW')) {
            res.status(400);
            res.json({
                description: 'Error you are not registered yet'
            });
        } else {
            res.status(500);
            res.json({description: 'Unknown Error'});
        }
    });
});

router.post('/environment', (req, res) => {
    // INSERT INTO `Weather` (`route`, `sn`, `is_reverse`, `humidity`, `temperature`, `timestamp`) VALUES ('160', '2', '0', '50', '32', CURRENT_TIMESTAMP);
    // UPDATE `Weather` SET `route`='160',`sn`='2',`is_reverse`='true',`humidity`='50',`temperature`='32',`timestamp`=NOW() WHERE `route`='160' AND `sn`='2' AND `is_reverse`='true'
    var query = '';

    if (req.body.route === undefined || req.body.sn === undefined || req.body.is_reverse === undefined) {
        res.status(400);
        res.json({
            description: 'Too few arguments (route, sn, is_reverse are required)'
        });
        return;
    }

    query = `UPDATE \`Weather\` SET ` +
            `${req.body.humidity ? `\`humidity\`='${req.body.humidity}',` : ''}` +
            `${req.body.temp ? `\`temperature\`='${req.body.temp}',` : ''}` +
            `\`timestamp\`=CURRENT_TIMESTAMP ` +
            `WHERE \`route\`='${req.body.route}' AND \`sn\`='${req.body.sn}' AND \`is_reverse\`='${sqlEscape.escapeBoolean(req.body.sn)}'`;

    db.query(query).then((result) => {
        if (result.affectedRows <= 0) {
            query = `INSERT INTO \`Weather\` (\`route\`, \`sn\`, \`is_reverse\`, \`timestamp\`, ` +
                    `${req.body.humidity ? '`humidity`, ': ''}` +
                    `${req.body.tempe ? '`temperature`, ': ''}` +
                    `) VALUES ('${req.body.route}', '${req.body.sn}', '${req.body.is_reverse}', CURRENT_TIMESTAMP, ` +
                    `${req.body.humidity ? `'${req.body.humidity}', ` : ''}` +
                    `${req.body.temp ? `'${req.body.temp}'` : ''}` +
                    `)`;

            return db.query(query).then(() => {
                res.send('OK');
            });
        } else {
            res.send('OK');
        }
    });
});

router.get('/account/:uuid',
    passport.authenticate('standard',{session: false}),
    (req, res) => {
        if (req.params.uuid === req.user.UUID) {
            res.send(JSON.stringify(req.user));
        } else {
            debug(`User ${req.user.UUID} try to access ${req.params.uuid}'s account info'`);
            res.status(401);
            res.send('{"description":"Unauthorized"}');
        }

    }
);

module.exports = router;
