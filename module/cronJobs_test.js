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
cronJobs.updateBusArrival();

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
