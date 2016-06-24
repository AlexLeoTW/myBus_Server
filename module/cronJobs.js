/*jshint esversion: 6 */

// initial DB object
var mysql = require('promise-mysql');
var sql_config = require('../sql_config');
var db = mysql.createPool(sql_config.db);

var taichung = require('./fetch_taichung');
const routeNumToFetch = [33, 160];

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

function updateBusArrival () {
    taichung.fetchBusStatus(160, 1, 9).then((timetable) => {
        saveTimeList(160, timetable.timeList);
    });

}

function saveTimeList(route, array) {
    for (var i=0; i<array.length; i++) {
        saveTimeListEntry(route, i, array[i]);
    }
}

function saveTimeListEntry(route, sn, timestamp) {
    var query = `INSERT INTO \`Bus_arrival\` (\`route\`, \`sn\`, \`prediction\`) VALUES ('${route}', '${sn}', '${timestamp.toJSON()}')`;
    console.log(query);
    return db.getConnection().then((connection) => {
        connection.query(query).then((rows) => {
            //console.log('\tquery ok');
        }).catch((err) => {
            if (err.code.includes('ER_DUP_ENTRY')) {
                updateTimeListEntry(route, sn, timestamp);
            } else {
                console.log('\t' + err.code);
            }
        }).finally(() => {
            db.releaseConnection(connection);
        });
    });
}

function updateTimeListEntry(route, sn, timestamp) {
    var query = `UPDATE \`Bus_arrival\` SET \`route\`=${route},\`sn\`=${sn},\`prediction\`='${timestamp.toJSON()}' WHERE \`route\`=${route} AND \`sn\`=${sn}`;
    console.log(query);
    return db.getConnection().then((connection) => {
        connection.query(query).then((rows) => {
            //console.log('\tquery ok');
        }).catch((err) => {
            console.log('\t' + err.code);
        }).finally(() => {
            db.releaseConnection(connection);
        });
    });
}

module.exports.updateBusTable = updateBusTable;
module.exports.updateBusArrival = updateBusArrival;
module.exports.saveTimeTable = saveTimeTable;
