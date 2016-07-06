/*jshint esversion: 6 */

const request = require('request');
const jsdom = require("jsdom");
const iconv = require('iconv-lite');
const util = require('./util');
var fs = require("fs");
var jquery = fs.readFileSync("../node_modules/jquery/dist/jquery.js", "utf-8");
var timetable = '';

function fetchTimeTable(routeNo) {
    return new Promise((resolve, reject) => {
        request.get(`http://citybus.taichung.gov.tw/tcbus2/GetTimeTable1.php?useXno=1&route=${routeNo}`)
            .on('error', function(err) {
                reject(err);
            }).on('response', function(response) {
                //console.log(`statusCode = ${response.statusCode}`); // 200
                //console.log(`content-type = ${response.headers['content-type']}`); // 'image/png'
            }).on('data', function(data) {
                timetable += iconv.decode(data, 'utf-8');
            }).on('end', function() {
                //console.log('Data:');
                //console.log(`[${timetable}]`);
                //console.log('===========================================================');
                resolve(timetable);
            });
    }).then((timetable) => {
        return parseTimeTable(timetable);
    });
}

function parseTimeTable(timetableHtml) {
    var timetable = {
        route: '',
        descritpion: '',
        operator: '',
        timeList: {
            weekday: {
                foward: [],
                reverse: []
            },
            weekend: {
                foward: [],
                reverse: []
            }
        }
    };
    var i = 0;      // more efficient

    return new Promise((resolve, reject) => {
        jsdom.env({
            html: timetableHtml,
            src: [jquery],
            done: function (err, window) {
                timetable.route = Number(window.$(".table01 tbody:first tr td").text());
                timetable.descritpion = window.$(".table01 tbody:nth-child(4) tr td").text().trim();
                timetable.operator = window.$(".table01 tbody:nth-child(6) tr td").text().trim();

                var i = 0;
                switch (testWeekDayType(window, ".table01 tbody:nth-child(7) tr:first td")) { // 平日、假日
                    case 'same':
                        for (i=0; i<2; i++) {
                            timeListString = getTimeListString(window,    // 去程、返程
                                '.table01 tbody:nth-child(7) tr:nth-child(2) td:nth-child(' + (i+1) + ')',
                                '.table01 tbody:nth-child(7) tr:nth-child(3) td:nth-child(' + (i+1) + ')'
                            );
                            timetable.timeList.weekday[timeListString.type] = parseTimeListString(timeListString.listString);
                        }
                        break;
                    case 'weekDay_weekEnd':
                        for (i=0; i<2; i++) {
                            timeListString = getTimeListString(window,    // 去程、返程
                                '.table01 tbody:nth-child(7) tr:nth-child(2) td:nth-child(' + (i+1) + ')',
                                '.table01 tbody:nth-child(7) tr:nth-child(3) td:nth-child(' + (i+1) + ')'
                            );
                            timetable.timeList.weekday[timeListString.type] = parseTimeListString(timeListString.listString);
                        }
                        for (i=0; i<2; i++) {
                            timeListString = getTimeListString(window,    // 去程、返程
                                '.table01 tbody:nth-child(7) tr:nth-child(2) td:nth-child(' + (i+3) + ')',
                                '.table01 tbody:nth-child(7) tr:nth-child(3) td:nth-child(' + (i+3) + ')'
                            );
                            timetable.timeList.weekend[timeListString.type] = parseTimeListString(timeListString.listString);
                        }
                        break;
                    default:
                        reject(new Error("Error when testing weekday type"));
                }
                //console.log("JSON = [" + JSON.stringify(timetable) + "]");
                resolve(timetable);
            }
        });
    });
}

function testWeekDayType(window, weekdayLocation) { // 平日、假日
    // result = "same", "weekDay_weekEnd", "error"
    var typeList = [];
    var listLength = window.$(weekdayLocation).length;

    if (listLength == 2) {
        if (window.$(weekdayLocation + ':nth-child(1)').text().trim().includes('平日') && window.$(weekdayLocation + ':nth-child(2)').text().trim().includes('假日')) {
            return 'weekDay_weekEnd';
        } else {
            return 'error';
        }
    } else if (listLength == 1) {
        return 'same';
    } else {
        return 'error';
    }
}

function getTimeListString(window, typeLocation, timeLocation) {    // 去程、返程
    var result = {
        type: '',
        listString: ''
    };
    var colName = window.$(typeLocation).text().trim();
    var rawListString = '';

    if (colName.includes('去程')) {
        result.type = 'foward';
        result.listString = window.$(timeLocation).text().trim();
        return result;
    } else if (colName.includes('返程')) {
        result.type = 'reverse';
        result.listString = window.$(timeLocation).text().trim();
        return result;
    } else {
        console.log('Warning: Unknown Trip Type' + colName);
        return result;
    }
}

function parseTimeListString(raw) {
    var list = raw.split(' ');
    var result = [];

    for (var k=0; k<list.length; k++) {
        var elementTime = list[k].split(':');
        var timestamp = {
            hour: elementTime[0],
            minute: elementTime[1],
            local: '+8'
        };
        result.push(timestamp);
    }

    return result;
}

/* ========================================================================================================= */

function fetchBusStatus(routeNo, isReverse, stopCnt, lang) {

    return new Promise((resolve, reject) => {
        request.post({
            url:'http://citybus.taichung.gov.tw/iTravel/RealRoute/aspx/RealRoute.ashx',
            formData: {
                //Type=GetFreshData&Lang=Cht&Data=160_%2C1_%2C9&BusType=0
                Type: 'GetFreshData',
                Lang: `${lang?lang:'Cht'}`,
                Data: `${routeNo}_,${isReverse?2:1}_,${stopCnt}`,
                BusType: 0
            }},
            function optionalCallback(err, httpResponse, body) {
                if (err) {
                    reject(err);
                }
                //console.log('routeNo = ', routeNo, 'fromNo = ', fromNo, 'toNo = ', toNo);
                //console.log(JSON.stringify(parseRealTime(body)));
                resolve(parseRealTime(body, routeNo, isReverse));
            }
        );
    });
}

function parseRealTime(dataString, route, isReverse) {
    var realTimeData = {
        route: route,
        isReverse: isReverse,
        timeList: [
            //{ hour: 0, minute: 0 }
        ],
        busList: [
            //{plate_no: '', longitude: 0.0, latitude: 0.0}
        ]
    };
    var dataPack = dataString.split('_@');

    realTimeData.timeList = parsetArrivalList(dataPack[0]);
    realTimeData.busList = parseBusList(dataPack[1]);

    return realTimeData;
}

function parsetArrivalList(data) {
    var result = [
        //{hour: 0, minute: 0}
    ];
    var rows = data.split('_|');

    for (var i=0; i<rows.length; i++) {
        //var time = (rows[i].split('_,'))[1].split(':');
         result.push(parseArrivalEntry(rows[i]));
    }

    return result;
}

function parseArrivalEntry(entry) {
    entry = entry.split('_,');

    if (entry[0] && entry[0] !== 'null') {
        var countDown = Number(entry[0]);

        if (countDown === -3) {
            return '末班車已駛離';
        } else {
            var milli = new Date().valueOf() - countDown*60*1000;
            return new Date(milli);
        }
    } else if (entry[1] && entry[1] !== 'null') {
        var time = entry[1].split(':');
        return util.toTimestamp({
            hour: time[0],
            minute: time[1],
            local: '+8'
        });
    } else {
        return 'ERROR';
    }
}

function parseBusList(data) {
    var result = [
        //{plate_no: '', longitude: 0.0, latitude: 0.0}
    ];

    if ( data.toUpperCase().localeCompare('NoData'.toUpperCase()) === 0) {
        return null;
    }

    var rows = data.split('_|');

    for (var i=0; i<rows.length; i++) {
        var busObj = {};
        var chunks = rows[i].split('_,');
        busObj.plate_no = chunks[0];
        busObj.longitude = Number(chunks[2]);
        busObj.latitude = Number(chunks[3]);
        result.push(busObj);
    }
    return result;
}

/* ========================================================================================================= */

function mergeBusStatus(rawData, busStops) {
    var i = 0;
    var result = {
        route: rawData.route,
        isReverse: rawData.isReverse,
        stopInfo:[
            // {sn:1, name:'高鐵臺中站', busStatus: {nextBus:{plate_no:'ABC-123', timestamp:"2016-07-05T08:25:34.489Z"}}}
            // {sn:1, name:'高鐵臺中站', busStatus: null}}
        ],
        busInfo: [
            // {plate_no:'ABC-123', closestStop: 2, nextStop:2, latitude:24.001, longitude:120.03451}
        ]
    };

    for (i=0; i<rawData.timeList.length; i++) {
        result.stopInfo.push({
            sn: i,
            name: busStops[0].name,
            nextBus: {timestamp: rawData.timeList[i]}
        });
    }

    for (i=0; i<rawData.busList.length; i++) {
        result.busInfo.push({
            plate_no: rawData.busList[i].plate_no,
            latitude: rawData.busList[i].latitude,
            longitude: rawData.busList[i].longitude
        });
    }

    for (i=0; i<result.busInfo.length; i++) {
        result.busInfo[i].closestStop = closestStop(result.busInfo[i], busStops).sn;
        result.busInfo[i].nextStop = squareLocate(result.busInfo[i], busStops).square[rawData.isReverse?0:1].sn;
    }

    console.log(JSON.stringify(result));
}

function squareLocate(coordinate, busStops, extraRange) {
    var closestPoint = null;
    var closestDistenceToSquare = 300000;
    var square = [];

    for (var i=0; i<busStops.length-1; i++) {
        closestPoint = closestPointInSquare(coordinate, [busStops[i], busStops[i+1]]);
        console.log(`closestPoint: ${JSON.stringify(closestPoint)}`);
        var currentDistence = util.distenceInKm(coordinate, closestPoint);

        if (currentDistence < closestDistenceToSquare) {
            console.log(`distence = ${currentDistence}`);
            closestDistenceToSquare = currentDistence;
            square = [busStops[i], busStops[i+1]];
        }
    }

    if (extraRange && closestDistenceToSquare > extraRange) {
        return null;
    } else {
        return {square: square, distence: closestDistenceToSquare};
    }
}

function closestPointInSquare(target, square) {
    var closestPoint = {longitude: 0, latitude: 0};

    for (var dimension in closestPoint) {
        console.log(`dimension: ${dimension}`);
        if (target[dimension] > Math.max(square[0][dimension], square[1][dimension])) {
            closestPoint[dimension] = Math.max(square[0][dimension], square[1][dimension]);
        } else if (target[dimension] < Math.min(square[0][dimension], square[1][dimension])) {
            closestPoint[dimension] = Math.min(square[0][dimension], square[1][dimension]);
        } else {
            closestPoint[dimension] = target[dimension];
        }
    }

    return closestPoint;
}

function closestStop(coordinate, busStops/*, range*/) {
    var minDest = {sn: 1, distence: 300000};

    for (var i=0; i<busStops.length; i++) {
        var tempDistence = util.distenceInKm(coordinate, busStops[i]);
        if (tempDistence < minDest.distence) {
            minDest.sn = i+1;
            minDest.distence = tempDistence;
        }
    }

    return minDest;
}

module.exports.fetchTimeTable = fetchTimeTable;
module.exports.fetchBusStatus = fetchBusStatus;
module.exports.mergeBusStatus = mergeBusStatus;
