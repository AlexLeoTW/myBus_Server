/*jshint esversion: 6 */

// initial DB object
var mysql = require('promise-mysql');
var sql_config = require('../sql_config');
var db = mysql.createPool(sql_config.db);
var debug = require('debug')('myBus:cron');

var taichung = require('./fetch_taichung');
const routeToFetch = [
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
        console.log(column);
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
    console.log(query);
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

function updateRealTime(pos) {
    if (pos === undefined) {
        updateRealTime(0);
    } else if (pos < routeToFetch.length) {
        var mergedData;
        taichung.fetchBusStatus(routeToFetch[pos].route, routeToFetch[pos].isReverse, 9)
        .then(mergeWithStopInfo).then((data) => {
            mergedData = data;
        }).then(() => {
            debug(`Update realtime data for route ${mergedData.route} ${mergedData.isReverse?'foward':'reverse'}`);
            saveBusArrival(mergedData);
            saveBusStatus(mergedData);
        });

        updateRealTime(pos+1);
    }
}

function mergeWithStopInfo(arrivalTime) {
    return db.getConnection().then((connection) => {
        return connection.query(`SELECT * FROM \`Bus_stop\` WHERE \`route\`=${arrivalTime.route} AND \`is_reverse\`=${arrivalTime.isReverse}`)
        .then((rows) => {
            return taichung.mergeBusStatus(arrivalTime, rows);
        }).catch((err) => {
            console.log(err);
        }).finally(() => {
            db.releaseConnection(connection);
        });
    });
}

function saveBusArrival(data, connection) {
    //console.log(`saveBusArrival(${data}, ${connection})`);
    if (data.stopInfo && data.stopInfo.length <= 0) {
        db.releaseConnection(connection);
    } else if (connection === undefined) {
        //console.log(`open SQL connection...`);
        return db.getConnection().then((connection) => {
            clearBusArrival(data, connection).then(() => {
                saveBusArrival(data, connection);
            });
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

function clearBusArrival(config, connection) {
    //debug(`clearBusArrival(${config.route}, ${config.isReverse})`);
    return connection.query(`DELETE FROM \`Bus_arrival\` WHERE \`route\`=${config.route} AND \`is_reverse\`=${config.isReverse}`)
    .catch((err) => {
        console.log(err);
    });
}

function saveBusArrivalEntry(data, connection) {
    //debug(`saveBusArrivalEntry({route: ${data.route}, sn: ${data.sn}, isReverse: ${data.isReverse}})`);
    //console.log(`saveBusArrivalEntry({route: ${data.route}, sn: ${data.sn}, isReverse: ${data.isReverse}})`);
    return connection.query(`INSERT INTO \`Bus_arrival\`(\`route\`, \`sn\`, \`is_reverse\`, \`prediction\`) VALUES (${data.route},${data.sn},${data.isReverse},${JSON.stringify(data.nextBus.timestamp)})`)
    .catch((err) => {
        console.log(err);
    });
}

function saveBusStatus(data, connection) {
    //console.log(`saveBusStatus(${data}, ${connection})`);
    if (data.busInfo === null || data.busInfo.length <= 0) {
        if (connection !== undefined) {
            db.releaseConnection(connection);
        }
    } else if (connection === undefined) {
        return db.getConnection().then((connection) => {
            return clearBusOutdated(connection).then(() => {
                saveBusStatus(data, connection);
            });
        });
    } else {
        var busData = data.busInfo.pop();
        busData.route = data.route;
        busData.isReverse = data.isReverse;

        return updateBusStatus(busData, connection).then(() => {
            saveBusStatus(data, connection);
        });
    }
}

function clearBusOutdated(connection) {
    //debug("clear outdated bus");
    return connection.query(`DELETE FROM \`Bus_status\` WHERE ABS(\`last_update\`-CURRENT_TIMESTAMP) > 1800`)
    .catch((err) => {console.log(err);});
}

function updateBusStatus(data, connection) {
    //debug(`updateBusStatus(${data.plate_no})`);
    //console.log(`updateBusStatus(${data.plate_no})`);
    return connection.query(`INSERT INTO \`Bus_status\`(\`plate_number\`, \`route\`, \`closestStop\`, \`nextStop\`, \`longitude\`, \`latitude\`, \`is_reverse\`) \
    VALUES ('${data.plate_no}', ${data.route}, ${data.closestStop}, ${data.nextStop}, ${data.longitude}, ${data.latitude}, ${data.isReverse})`)
    .catch((err) => {
        if (err.code.includes('ER_DUP_ENTRY')) {
            connection.query(`UPDATE \`Bus_status\` SET \`plate_number\`='${data.plate_no}',\`route\`=${data.route},\`closestStop\`=${data.closestStop},\`nextStop\`=${data.nextStop},\`longitude\`=${data.longitude},\`latitude\`=${data.latitude},\`is_reverse\`=${data.isReverse},\`last_update\`=CURRENT_TIMESTAMP \
                            WHERE \`plate_number\`='${data.plate_no}'`);
        } else {
            console.log(err);
        }
    });
}

module.exports.updateBusTable = updateBusTable;
module.exports.updateRealTime = updateRealTime;
