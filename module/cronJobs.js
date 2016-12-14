/*jshint esversion: 6 */

// initial DB object
var mysql = require('promise-mysql');
var sql_config = require('../sql_config');
var db = mysql.createPool(sql_config.db);
var debug = require('debug')('myBus:cron');
var util = require('./util');
const BusArrival = require('./BusArrival');

var taichung = require('./fetch_taichung');
const routeToFetch = [
    {route: 5, isReverse: true},
    {route: 5, isReverse: false},
    {route: 160, isReverse: true},
    {route: 160, isReverse: false}
];

db.on('enqueue', function () {
    console.log('Waiting for available connection slot');
});

function updateBusTable (route) {
    clearTimetable(route).then(
        taichung.fetchTimeTable(route).then(function (timetable) {
            console.log(timetable);
            return walkThroughTimetable(timetable.timeList);
        }).then((tableEntry) => {
            console.log(JSON.stringify(tableEntry));
            saveTimeTable(route, tableEntry);
        })
    );
}

function isReverse (direction) {
    if (typeof direction === 'boolean') {
        return direction;
    } else if (direction.toLowerCase() === 'foeard') {
        return false;
    } else if (direction.toLowerCase() === 'reverse') {
        return true;
    } else {
        throw new Exception('Unknown direction');
    }
}

function clearTimetable (route) {
    var query = `DELETE FROM \`Time_table\` WHERE \`route\`=${route} `;
    console.log(query);
    return db.getConnection().then((connection) => {
        connection.query(query).then((rows) => {
            console.log('Delete OK');
        }).catch((err) => {
            console.log(err.code);
        }).finally(() => {
            db.releaseConnection(connection);
        });
    });
}

function walkThroughTimetable (timetable, location, result) {
    if (!location) {location = '';}
    if (!result) {result = [];}

    for (var key in timetable) {
        if (!timetable.hasOwnProperty(key)) {
            continue;       // skip this property
        }
        if (typeof timetable[key] == "object" && timetable[key] !== null && isNaN(key)) {
            //console.log(location + '\t' + key);
            walkThroughTimetable(timetable[key], (location + `.${key}`), result);
        } else {
            //console.log(timetable[key]);
            var entry = `${location}.${timetable[key].hour}.${timetable[key].minute}.${timetable[key].local}`;
            //console.log(`${location}.${timetable[key].hour}.${timetable[key].minute}.${timetable[key].local}`);
            result.push(entry);
            //console.log(entry);
        }
    }

    return result;
}

function saveTimeTable(route, entryArray) {
    console.log(`saveTimeTable(${entryArray.length})`);
    if (entryArray.length > 0) {
        var entry = entryArray.pop();
        var column = entry.split('.');
        //saveTimetableEntry(route, column[1], isReverse(column[2]), column[3], column[4], Number(column[5]));
        //return saveTimeTable(route, entryArray);
        return saveTimetableEntry(
            route, column[1], isReverse(column[2]), column[3], column[4],Number(column[5])
        ).then(
            saveTimeTable(route, entryArray)
        );
        //(route, column[1], isReverse(column[2]), column[3], column[4], Number(column[5]));
    }
}

function saveTimetableEntry (route, weekday, is_reverse, hour, minute, local) {
    var query = `INSERT INTO \`Time_table\` (\`route\`, \`weekday\`, \`hour\`, \`minute\`, \`local\`) VALUES ('${route}', '${weekday}', '${hour}', '${minute}', '${local}')`;
    return db.getConnection().then((connection) => {
        connection.query(query).then((rows) => {
            console.log('\tquery ok');
        }).catch((err) => {
            console.log('\t' + err.code);
        }).finally(() => {
            db.releaseConnection(connection);
        });
    });
}

/* ========================================================================================================= */

function updateRealTime(pos) {
    if (pos === undefined) {
        updateRealTime(0);
    } else if (pos < routeToFetch.length) {
        var mergedData;
        db.query(`SELECT COUNT(*) AS total FROM \`Bus_stop\` WHERE \`route\` = ${routeToFetch[pos].route} AND \`is_reverse\` = ${routeToFetch[pos].isReverse}`)
            .then((data) => {
                return taichung.fetchBusStatus(routeToFetch[pos].route, routeToFetch[pos].isReverse, data.total);
            })
            .then(mergeWithStopInfo)
            .then((data) => {
                mergedData = data;
                debug(`Updating realtime data for route ${mergedData.route} ${mergedData.isReverse?'foward':'reverse'} [ ${mergedData.stopInfo.length} stops, ${mergedData.busInfo.length} bus online ]`);
            })
            .then(() => {
                return saveBusArrival(mergedData);
            })
            .then(() => {
                return saveBusStatus(mergedData);
            })
            .then(() => {
                updateRealTime(pos+1);
            })
            .catch((err) => {
                debug(`ERROR when Updating realtime data for route ${routeToFetch[pos].route} ${routeToFetch[pos].isReverse?'foward':'reverse'}`);
                console.error(err);
            });
    } else if (pos === routeToFetch.length) {           // updateArrivalMongo() after updateRealTime()
        BusArrival.updateArrivalMongo();
    }
}

function mergeWithStopInfo(arrivalTime) {
    return db.query(`SELECT * FROM \`Bus_stop\` WHERE \`route\`=${arrivalTime.route} AND \`is_reverse\`=${arrivalTime.isReverse}`)
        .then((rows) => {
            return taichung.mergeBusStatus(arrivalTime, rows);
        });
}

function saveBusArrival(data, connection) {
    //console.log(`saveBusArrival(${data}, ${connection})`);
    if (data.stopInfo && data.stopInfo.length <= 0) {
        db.releaseConnection(connection);
    } else if (connection === undefined) {
        return db.getConnection().then((connection) => {
            saveBusArrival(data, connection);
        });
    } else {
        var stopInfo = data.stopInfo.pop();
        stopInfo.route = data.route;
        stopInfo.isReverse = data.isReverse;
        return saveBusArrivalEntry(stopInfo, connection).then(() => {
            saveBusArrival(data, connection);
        });
    }
}

// TODO ERROR retry
// INSERT or UPDATE
function saveBusArrivalEntry(data, connection, errCounter) {
    // INSERT INTO `Bus_arrival` VALUES (1,2,false,'2010-01-19 03:14:07') ON DUPLICATE KEY UPDATE `prediction`='2020-01-19 03:14:07'
    return connection.query(`INSERT INTO \`Bus_arrival\`(\`route\`,\`sn\`,\`is_reverse\`,\`prediction\`) VALUES (${data.route},${data.sn},${data.isReverse},'${util.toSqlTimestamp(data.nextBus.timestamp)}') ON DUPLICATE KEY UPDATE \`prediction\`='${util.toSqlTimestamp(data.nextBus.timestamp)}'`);
}

// TODO Enhance ERROR handling
function saveBusStatus(data, connection) {
    //console.log(`saveBusStatus(${data}, ${connection})`);

    if ((data.busInfo === null || data.busInfo.length <= 0) && connection !== undefined) {
        // release connection when all data stored
        db.releaseConnection(connection);
    } else if (connection === undefined) {
        // start from here!
        return db.getConnection().then((connection) => {
            return clearOutdatedBus(connection).then(() => {
                saveBusStatus(data, connection);
            });
        });
    } else {
        var busData = data.busInfo.pop();
        busData.route = data.route;
        busData.isReverse = data.isReverse;

        return updateBusStatusEntry(busData, connection)
            .then( () => {
                return updateReservation(busData, connection);
            })
            .then( () => {
                saveBusStatus(data, connection);
            });
    }
}

function clearOutdatedBus(connection) {
    // remove entry over 30 min
    return connection.query(`DELETE FROM \`Bus_status\` WHERE ABS(\`last_update\`-CURRENT_TIMESTAMP) > 1800`)
    .catch((err) => {console.error(err);});
}

function updateBusStatusEntry(data, connection) {
    // INSERT INTO `Bus_status`(`plate_number`, `route`, `closestStop`, `nextStop`, `longitude`, `latitude`, `is_reverse`)
    // VALUES ('503-U9', 160, 4, 3, 120.635368, 24.151159, true)
    // ON DUPLICATE KEY
    // UPDATE`plate_number`='503-U9',`route`=160,`closestStop`=4,`nextStop`=3,`longitude`=120.635368,`latitude`=24.151159,`is_reverse`=true,`last_update`=CURRENT_TIMESTAMP
    return connection.query('INSERT INTO `Bus_status`(`plate_number`, `route`, `closestStop`, `nextStop`, `longitude`, `latitude`, `is_reverse`) ' +
                            `VALUES ('${data.plate_no}', ${data.route}, ${data.closestStop}, ${data.nextStop}, ${data.longitude}, ${data.latitude}, ${data.isReverse}) ` +
                            'ON DUPLICATE KEY ' +
                            `UPDATE \`plate_number\`='${data.plate_no}',\`route\`=${data.route},\`closestStop\`=${data.closestStop},\`nextStop\`=${data.nextStop},\`longitude\`=${data.longitude},\`latitude\`=${data.latitude},\`is_reverse\`=${data.isReverse},\`last_update\`=CURRENT_TIMESTAMP`
                        )
        .catch((err) => {
            debug(`ERROR when updating bus info ${JSON.stringify(data)}`);
            console.error(err);
        });
}

function updateReservation (bus, connection) {
    passengerOnboard(bus, connection)
    .then( () => {
            tripFinish(bus, connection);
        });
}

// bus = {
//     plate_no:'ABC-123',
//     route:160,
//     isReverse:false,
//     closestStop: 2,
//     nextStop:2,
//     latitude:24.001,
//     longitude:120.03451
// }
function passengerOnboard (bus, connection) {
    if (bus.closestStop !== bus.nextStop) {
        return Promise.resolve("Success");
    }
    return connection.query(`UPDATE \`Reservation_List\` SET \`onboard\`='${bus.plate_no}' ` +
                            `WHERE \`route\`=${bus.route} AND \`is_reverse\`=${bus.isReverse} AND \`from_sn\`=${bus.closestStop} AND \`onboard\` IS NULL`)
        .then( (result) => {
            if (result.affectedRows > 0) {
                debug(`Estimate [${result.affectedRows}] person on board ${bus.plate_no} @${bus.route}:${bus.isReverse?'foward':'reverse'}:${bus.closestStop}`);
            }
        })
        .catch( (err) => {
            console.error(`ERROR when updating Reservation_List for ${bus.plate_no}`);
        });
}

function tripFinish (bus, connection) {
    if (bus.closestStop !== bus.nextStop) {
        return Promise.resolve("Success");
    }
    var query = (`DELETE FROM \`Reservation_List\` ` +
                            `WHERE \`route\`=${bus.route} AND \`is_reverse\`=${bus.isReverse} AND \`to_sn\`=${bus.closestStop} AND \`onboard\`='${bus.plate_no}'`);
    return connection.query(query)
        .then( (result) => {
            if (result.affectedRows > 0) {
                debug(`Estimate [${result.affectedRows}] person off board ${bus.plate_no} @${bus.route}:${bus.isReverse?'foward':'reverse'}:${bus.closestStop}`);
            }
        })
        .catch( (err) => {
            console.error(`ERROR when deleteing Reservation_List for ${bus.plate_no}`);
            console.error(`[${query}]`);
        });
}

/* ========================================================================================================= */
// TODO finish and add cron
function updateRouteList() {
    return taichung.fetchRouteList().then((routeList) => {
        return saveRouteList();
    });
}

function saveRouteList(routeList, connection) {
    if (routeList.keys().length > 0 && connection === undefined) {
        return db.getConnection((connection) => {
            saveRouteList(routeNameList, connection);
        });
    } else if (routeList.keys().length > 0) {
        var key = routeList.keys()[0];
        var entry = routeList[key];
        entry.routeNo = key;
        delete routeList[key];
        return deleteRouteEntry(connection).then(() => {
            saveRouteEntry(entry, connection);
        }).then(() => {
            saveRouteList(routeList, connection);
        });
    } else {
        if (connection !== undefined) {
            db.releaseConnection(connection);
        } else {
            return;
        }
    }
}

function saveRouteEntry(entry, connection) {
    return deleteRouteEntry(connection).then(() => {
        connection.query(`INSERT INTO \`Route_info\` (\`route\`, \`name\`, \`start\`, \`end\`, \`map\`) ` +
            `VALUES ('${entry.routeNo}', '${entry.name}', '${entry.from}', '${entry.to}', '${entry.map}');`);
    }).then(() => {
        deleteRouteOperator(entry.routeNo, connection);
    }).then(() => {
        saveRouteOperator(entry.routeNo, entry.operator, connection);
    });
}

function deleteRouteEntry(connection) {
    return connection.query('DELETE FROM `Route_info`');
}

function saveRouteOperator(routeNo, operators, connection) {
    if (operator.length > 0) {
        //return connection.query(`INSERT INTO \`Route_operator\` (\`routeNo\`, \`operator\`) VALUES ('${routeNo}', '${}');`);
        var operatorName = operators.pop();
        return query(`INSERT INTO \`Route_operator\` (\`routeNo\`, \`operator \`) VALUES ('${routeNo}', 'operatorName')`).then(() => {
            saveRouteOperator(routeNo, operators, connection);
        });
    } else {
        return;
    }
}

function deleteRouteOperator(routeNo, connection) {
    return connection.query(`DELETE FROM \`Route_operator\` WHERE \`routeNo\`=${routeNo}`);
}

/* ========================================================================================================= */

function updateStopList(pos) {
    if (pos === undefined) {
        return updateStopList(0);
    } else if (pos < routeToFetch.length) {
        debug(`Update stop list for route ${routeToFetch[pos].route} ${routeToFetch[pos].isReverse?'foward':'reverse'}`);
        return taichung.fetchStopList({route:routeToFetch[pos].route, isReverse:routeToFetch[pos].isReverse}).then((data) => {
            return saveStopList(data);
        }).then(() => {
            updateStopList(pos+1);
        });
    }
}

function saveStopList(data, pos) {
    if (pos === undefined) {
        return saveStopList(data, 0);
    } else if (pos < data.stops.length) {
        return saveStopEntry(data.route, data.isReverse ? data.stops.length-pos : pos+1, data.isReverse, data.stops[pos].longitude, data.stops[pos].latitude, data.stops[pos].name).then(() => {
            saveStopList(data, pos+1);
        });
    }
}

function saveStopEntry(route, sn, isReverse, longitude, latitude, name) {
    // debug(`saveStopEntry(${route}, ${sn}, ${isReverse}, ${longitude}, ${latitude}, ${name})`)
    return db.query(   `INSERT INTO Bus_stop (route, sn, is_reverse, longitude, latitude, name) ` +
                `VALUES(${route}, ${sn}, ${isReverse}, ${longitude}, ${latitude}, "${name}") ` +
                `ON DUPLICATE KEY UPDATE longitude=${longitude}, latitude=${latitude}, name="${name}"`
    ).catch((err) => {
        console.error(err);
    });
}

module.exports.updateBusTable = updateBusTable;
module.exports.updateRealTime = updateRealTime;
module.exports.updateRouteList = updateRouteList;
module.exports.updateStopList = updateStopList;
