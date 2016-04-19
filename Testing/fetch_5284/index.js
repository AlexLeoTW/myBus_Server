/*jshint esversion: 6 */

const fs = require('fs');
const request = require('request');
const zlib = require('zlib');
const JSONStream = require('JSONStream');

//request('http://data.taipei/bus/BUSDATA').pipe(zlib.createGunzip()).pipe(fs.createWriteStream('data.json'));
//request('http://data.taipei/bus/BUSDATA').pipe(zlib.createGunzip()).pipe(process.stdout);
var stream = request('http://data.taipei/bus/BUSDATA').pipe(zlib.createGunzip()).pipe(JSONStream.parse('BusInfo'));

stream.on('data', function (data) {
    for (var i = 0; i < data.length; i++) {
        console.log(data[i].BusID + '\t' + parseDate(data[i].DataTime));
    }
});

function parseDate(dateString) {
    // '/Date(1461047730000+0800)/'
    var millis = Number(dateString.substring(6, dateString.length-7));  // 1461047730000
    var offset = dateString.substring(dateString.length-7, dateString.length-2);    // '+0800'
    var offsetHour = Number(offset.substring(1, 3));    // 8
    var offsetMinule = Number(offset.substring(3, 5));  // 0

    if (offset.charAt(0) === '+') {
        millis -= (offsetHour*60*60 + offsetMinule*60)*1000;
    } else {
        millis += (offsetHour*60*60 + offsetMinule*60)*1000;
    }

    millis += (-(new Date().getTimezoneOffset()/60))*60*60*1000;

    return new Date(millis);
}
