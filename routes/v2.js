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

// BusArrival /w gMapFetch
const BusArrival = require('../module/BusArrival');

router.get('/route', (req, res) => {
    //debug(JSON.stringify(req.query));
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
    try {
        sqlEscape.escapeParam(req.query,
            'route', {type: 'number', optional: false},
            'is_reverse', {type: 'boolean', optional: false},
            'original', {type: 'boolean', optional: true}
        );
    } catch (err) {
        res.status(406);
        res.json({
            description: err.message
        });
        return;
    }

    if (req.query.original) {
        var query = `SELECT * FROM \`Bus_arrival\` WHERE \`route\` = ${req.query.route} `;
        if (req.query.is_reverse !== undefined) {
            query += `AND \`is_reverse\` = ${sqlEscape.escapeBoolean(req.query.is_reverse)}`;
        }
        db.query(query).then((rows) => {
            if (rows.length === 0) {
                res.send(JSON.stringify(null));
            } else {
                res.json(rows);
            }
        });
    } else {
        BusArrival.arrivalList({
            route: req.query.route,
            isReverse: req.query.is_reverse
        })
        .then((data) => {
            res.json(data);
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

    //debug(query);
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
    passport.authenticate('standard', {session: false}),
    (req, res) => {
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
            return;
        }

        if (req.user.UUID !== req.body.UID.substring(1, req.body.UID.length-1) &&
            http_auth.permissionLevel[req.user.permission] < http_auth.permissionLevel.arduino) {
            console.log('out');
            res.status(401);
            res.json({
                description: `you are not ${req.body.UID}`
            });
            return;
        }

        db.query(`SELECT COUNT(*) AS violationCount FROM \`violation_log\` WHERE \`UID\` = ${req.body.body} AND \`timestamp\` BETWEEN timestamp(DATE_SUB(NOW(), INTERVAL 30 DAY)) AND NOW()`)
            .then( (result) => {
                if (result.violationCount > 3) {
                    res.status(403);
                    res.json({
                        violationCount: result.violationCount,
                        description: `You received perment ban for abuse our service over 3 times`
                    });
                } else {
                    var query = `INSERT INTO \`Reservation_List\`(\`UID\`, \`route\`, \`is_reverse\`, \`from_sn\`, \`to_sn\`) ` +
                                `VALUES (${req.body.UID},${req.body.route},${(req.body.from_sn>req.body.to_sn)},${req.body.from_sn},${req.body.to_sn})`;
                    return db.query(query);
                }
            })
            .then((rows, field) => {
                res.status(200);
                res.json({description: "Register OK"});
            })
            .catch( (err) => {
                if (err.code.includes('ER_DUP_ENTRY')) {
                    debug(`Reservation with id ${req.body.UID} already exist, update`);
                    //UPDATE `Reservation_List` SET `route`=160,`is_reverse`=true,`from_sn`=5,`to_sn`=3 WHERE `UID`='b397a7f7'
                    var query = `UPDATE \`Reservation_List\` SET \`route\`=${req.body.route},\`is_reverse\`=${(req.body.from_sn<req.body.to_sn)},\`from_sn\`=${req.body.from_sn},\`to_sn\`=${req.body.to_sn} WHERE \`UID\`=${req.body.UID}`;
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
    }
);

router.delete('/reservation',
    passport.authenticate('standard', {session: false}), (req, res) => {
        try {
            sqlEscape.escapeParam(req.query,
                'UID', null
            );
        } catch (err) {
            //console.log(res);
            res.status(406);
            res.json({
                description: err.message
            });
            return;
        }

        if (req.query.UID.toUpperCase() === `'${req.user.UUID.toUpperCase()}'`) {
            // DELETE FROM `Reservation_List` WHERE `Reservation_List`.`UID` = 'b397a7f7'
            db.query(`DELETE FROM \`Reservation_List\` WHERE \`Reservation_List\`.\`UID\` = ${req.query.UID}`)
            .then( (result, err) => {
                if (result.affectedRows > 0) {
                    res.status(200);
                    res.json({
                        description: `Delete ${result.affectedRows} reservation`
                    });
                } else {
                    res.status(404);
                    res.json({
                        description: 'You have NOT make any reservation yet'
                    });
                }
            });
        } else {
            debug(`User ${req.user.UUID} try to delete ${req.query.UID.substring(1, req.query.UID.length-1)}'s reservation'`);
            res.status(401);
            res.send('{"description":"Unauthorized"}');
        }
    });

router.get('/reservation',
    (req, res) => {
        try {
            sqlEscape.escapeParam(req.query,
                'plate_number', null
            );
        } catch (err) {
            //console.log(res);
            res.status(406);
            res.json({
                description: err.message
            });
            return;
        }

        var result = {
            route: 0,
            is_reverse: false,
            sn: 0,
            onBoard: 0,
            offBoard: 0
        };

        db.query(`SELECT * FROM \`Bus_status\` WHERE \`plate_number\`=${req.query.plate_number}`)
            .then( (rows) => {
                var bus = rows[0];
                result.route = bus.route;
                result.is_reverse = bus.is_reverse;
                result.sn = bus.nextStop;
                return db.query('SELECT `from_sn`,`to_sn` FROM `Reservation_List` ' +
                    `WHERE \`route\` = ${bus.route} AND \`is_reverse\`=${bus.is_reverse} AND \`to_sn\`=${bus.nextStop} OR \`from_sn\`=${bus.nextStop} `);
            })
            .then ( (rows) => {
                for (var i = 0; i < rows.length; i++) {
                    if ( rows[i].from_sn === result.sn ) {
                        result.onBoard++;
                    } else if ( rows[i].to_sn === result.sn ) {
                        result.offBoard++;
                    }
                }
                res.status(200);
                res.json(result);
            });
            // .catach( (err) => {
            //     console.error(err);
            //     res.status(500);
            //     res.json({description: 'DB ERROR'});
            // });
    });

router.post('/violation',
    passport.authenticate('arduino', {session: false}),
    (req, res) => {
        try {
            sqlEscape.escapeParam(req.body,
                'plate_number', null
            );
        } catch (err) {
            //console.log(res);
            res.status(406);
            res.json({
                description: err.message
            });
            return;
        }
        // SELECT * FROM `Bus_status` WHERE `plate_number` = '287-U8'
        db.query(`SELECT *  FROM \`Bus_status\` WHERE \`plate_number\` = ${req.body.plate_number}`)
            .then( (rows) => {
                var bus = rows[0];
                return db.query('SELECT * FROM `Reservation_List` ' +
                    `WHERE \`route\` = ${bus.route} AND \`is_reverse\`=${bus.is_reverse} AND \`to_sn\`=${bus.closestStop} OR \`from_sn\`=${bus.closestStop} `);
            })
            .then( (violations) => {
                // INSERT INTO `violation_log` (`UID`, `vsn`, `route`, `from_sn`, `to_sn`, `timestamp`) VALUES ('00000000', NULL, '160', '1', '9', CURRENT_TIMESTAMP);
                var query = '';
                for (var i = 0; i < violations.length; i++) {
                    query += 'INSERT INTO `violation_log` (`UID`, `vsn`, `route`, `from_sn`, `to_sn`, `timestamp`) ' +
                                `VALUES ('${violations[i].UID}', NULL, '${violations[i].route}', '${violations[i].from_sn}', '${violations[i].to_sn}', CURRENT_TIMESTAMP); \n`;
                    debug(`User ${violations[i].UID}' violation: [route:${violations[i].route}, from_sn:${violations[i].from_sn}, to_sn:${violations[i].to_sn}]`);
                }
                return db.query(query);
            })
            .then( (result) => {
                res.status(200);
                res.json({
                    description: `${result.affectedRows} users loged as violation`
                });
            })
            .catch( (err) => {
                debug('err saving violation_log, may be the database is down.');
                res.status(500);
                res.json({
                    description: 'error when saving violation log'
                });
            });
    }
);

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
        if (req.params.uuid.toUpperCase() === req.user.UUID.toUpperCase()) {
            res.send(JSON.stringify(req.user));
        } else {
            debug(`User ${req.user.UUID} try to access ${req.params.uuid}'s account info'`);
            res.status(401);
            res.send('{"description":"Unauthorized"}');
        }

    }
);

module.exports = router;
