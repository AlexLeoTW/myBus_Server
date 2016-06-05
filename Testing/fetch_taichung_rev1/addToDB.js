/*jshint esversion: 6 */

const request = require('request');
const mysql = require('mysql');
var db  = mysql.createPool({
  connectionLimit : 10,
  host            : '192.168.1.30',
  user            : 'bob',
  password        : 'secret'
});



function bus(realTimeData) {
    var now;
    for (var i = 0; i < realTimeData.timeList.length; i++) {
        now = new Date();
        if ( timeDiff(realTimeData.timeList[i].Hour, realTimeData.timeList[i].Minute, now.getHours(), now.getMinutes()) < 2 ) {
            var query = "INSERT INTO `Bus_arrival`(`route`, `prediction`) VALUES (160, '2016-05-06 15:56:23')";
            db.query("", (err, results) => {

            }
        }
    }
}

function timeDiff(fromHr, fromMin, toHr, toMin) {
    return (toHr-fromHr)*60 + (toMin-toHr);
}
