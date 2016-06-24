/*jshint esversion: 6 */

var cronJobs = require('./cronJobs');
var mysql = require('promise-mysql');
var sql_config = require('../sql_config');
var db = mysql.createPool(sql_config.db);

/*returnPlus123().then((x) => {
    console.log(x);
    return x + '123';
}).then((x) => {
    console.log(x);
    returnPlus123(x);
});

function returnPlus123(x) {
    return new Promise((resolve, reject) => {
        resolve(x + '123');
    });
}*/

/*var arr = [];

for (var i=0; i<138; i++) {
    arr.push(i);
}

function recursivePrint(arr) {
    if (arr.length > 0) {
        return promisePrint(arr.pop()).then(recursivePrint(arr));
    }
}

recursivePrint(arr);

function promisePrint(x) {
    return new Promise((resolve, reject) => {
        if (x) {
            console.log(x);
            resolve();
        } else {
            reject('No x');
        }
    });
}*/

//cronJobs.updateBusTable(160);
//cronJobs.updateBusArrival();
var timetable = JSON.parse('[".weekday.reverse.05.45.+8",".weekday.reverse.06.10.+8",".weekday.reverse.06.30.+8",".weekday.reverse.06.50.+8",".weekday.reverse.07.10.+8",".weekday.reverse.07.30.+8",".weekday.reverse.07.50.+8",".weekday.reverse.08.20.+8",".weekday.reverse.08.50.+8",".weekday.reverse.09.10.+8",".weekday.reverse.09.30.+8",".weekday.reverse.09.50.+8",".weekday.reverse.10.00.+8",".weekday.reverse.10.20.+8",".weekday.reverse.10.40.+8",".weekday.reverse.11.00.+8",".weekday.reverse.11.30.+8",".weekday.reverse.12.00.+8",".weekday.reverse.12.30.+8",".weekday.reverse.13.00.+8",".weekday.reverse.13.30.+8",".weekday.reverse.14.00.+8",".weekday.reverse.14.30.+8",".weekday.reverse.15.00.+8",".weekday.reverse.15.20.+8",".weekday.reverse.15.40.+8",".weekday.reverse.16.00.+8",".weekday.reverse.16.20.+8",".weekday.reverse.16.40.+8",".weekday.reverse.17.00.+8",".weekday.reverse.17.20.+8",".weekday.reverse.17.40.+8",".weekday.reverse.18.00.+8",".weekday.reverse.18.20.+8",".weekday.reverse.18.40.+8",".weekday.reverse.19.00.+8",".weekday.reverse.19.20.+8",".weekday.reverse.19.40.+8",".weekday.reverse.20.00.+8",".weekday.reverse.20.20.+8",".weekday.reverse.20.40.+8",".weekday.reverse.21.00.+8",".weekday.reverse.21.20.+8",".weekday.reverse.21.40.+8",".weekday.reverse.22.00.+8",".weekday.reverse.22.20.+8",".weekend.foward.00.10.+8",".weekend.foward.06.50.+8",".weekend.foward.07.10.+8",".weekend.foward.07.30.+8",".weekend.foward.07.40.+8",".weekend.foward.08.10.+8",".weekend.foward.08.30.+8",".weekend.foward.08.50.+8",".weekend.foward.09.20.+8",".weekend.foward.09.50.+8",".weekend.foward.10.00.+8",".weekend.foward.10.20.+8",".weekend.foward.10.40.+8",".weekend.foward.11.00.+8",".weekend.foward.11.20.+8",".weekend.foward.11.40.+8",".weekend.foward.12.00.+8",".weekend.foward.12.30.+8",".weekend.foward.13.00.+8",".weekend.foward.13.30.+8",".weekend.foward.14.00.+8",".weekend.foward.14.30.+8",".weekend.foward.14.45.+8",".weekend.foward.15.00.+8",".weekend.foward.15.30.+8",".weekend.foward.15.45.+8",".weekend.foward.16.00.+8",".weekend.foward.16.15.+8",".weekend.foward.16.30.+8",".weekend.foward.16.45.+8",".weekend.foward.17.00.+8",".weekend.foward.17.15.+8",".weekend.foward.17.30.+8",".weekend.foward.17.45.+8",".weekend.foward.18.00.+8",".weekend.foward.18.15.+8",".weekend.foward.18.30.+8",".weekend.foward.18.45.+8",".weekend.foward.19.00.+8",".weekend.foward.19.15.+8",".weekend.foward.19.30.+8",".weekend.foward.19.45.+8",".weekend.foward.20.00.+8",".weekend.foward.20.15.+8",".weekend.foward.20.30.+8",".weekend.foward.20.45.+8",".weekend.foward.21.00.+8",".weekend.foward.21.15.+8",".weekend.foward.21.30.+8",".weekend.foward.21.45.+8",".weekend.foward.22.10.+8",".weekend.foward.22.35.+8",".weekend.foward.23.00.+8",".weekend.foward.23.30.+8",".weekend.reverse.05.45.+8",".weekend.reverse.06.10.+8",".weekend.reverse.06.30.+8",".weekend.reverse.06.50.+8",".weekend.reverse.07.10.+8",".weekend.reverse.07.30.+8",".weekend.reverse.07.50.+8",".weekend.reverse.08.20.+8",".weekend.reverse.08.50.+8",".weekend.reverse.09.10.+8",".weekend.reverse.09.30.+8",".weekend.reverse.09.50.+8",".weekend.reverse.10.00.+8",".weekend.reverse.10.20.+8",".weekend.reverse.10.40.+8",".weekend.reverse.11.00.+8",".weekend.reverse.11.30.+8",".weekend.reverse.12.00.+8",".weekend.reverse.12.30.+8",".weekend.reverse.13.00.+8",".weekend.reverse.13.30.+8",".weekend.reverse.13.45.+8",".weekend.reverse.14.00.+8",".weekend.reverse.14.30.+8",".weekend.reverse.14.45.+8",".weekend.reverse.15.00.+8",".weekend.reverse.15.15.+8",".weekend.reverse.15.30.+8",".weekend.reverse.15.45.+8",".weekend.reverse.16.00.+8",".weekend.reverse.16.15.+8",".weekend.reverse.16.30.+8",".weekend.reverse.16.45.+8",".weekend.reverse.17.00.+8",".weekend.reverse.17.15.+8",".weekend.reverse.17.30.+8",".weekend.reverse.17.45.+8",".weekend.reverse.18.00.+8",".weekend.reverse.18.15.+8",".weekend.reverse.18.30.+8",".weekend.reverse.18.45.+8",".weekend.reverse.19.00.+8",".weekend.reverse.19.15.+8",".weekend.reverse.19.30.+8",".weekend.reverse.19.45.+8",".weekend.reverse.20.00.+8",".weekend.reverse.20.15.+8",".weekend.reverse.20.30.+8",".weekend.reverse.20.45.+8",".weekend.reverse.21.00.+8",".weekend.reverse.21.20.+8",".weekend.reverse.21.40.+8",".weekend.reverse.22.00.+8",".weekend.reverse.22.20.+8"]');
cronJobs.saveTimeList(timetable, 160);

/*var timetable = { route: 160,
    descritpion: '高鐵臺中站  -  僑光科技大學',
    operator: '和欣客運',
    timeList: {
        weekday: {
            foward: [
                {hour: 0, minute: 10, local: '+8'},
                {hour: 06, minute: 50, local: '+8'}
            ],
            reverse: [
                {hour: 05, minute: 45, local: "+8"},
                {hour: 06, minute: 10, local: "+8"}
            ]
        },
        weekend: {
            foward: [
                {hour: 0, minute: 10, local: "+8"},
                {hour: 06, minute: 50, local: "+8"}
            ],
            reverse: [
                {hour: 05, minute: 45, local: "+8"},
                {hour: 06, minute: 10, local: "+8"}
            ]
        }
    }
};*/
//console.log(cronJobs.walkThroughTimetable(timetable.timeList, ''));

/*function testSql () {
    var query = `SELECT * FROM \`Bus_arrival\``;
    console.log(query);
    return db.getConnection().then((connection) => {
        connection.query(query).then((rows) => {
            console.log(rows);
        }).catch((err) => {
            console.log('\t' + err.code);
        }).finally(() => {
            db.releaseConnection(connection);
        });
    });
}*/
