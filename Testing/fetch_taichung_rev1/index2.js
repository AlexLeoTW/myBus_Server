/*jshint esversion: 6 */

const fs = require('fs');
const request = require('request');
const jsdom = require("jsdom");
const iconv = require('iconv-lite');
var reftt = fs.readFileSync("ref_timetable.html", "utf-8");

var timetable = '';

request.get('http://citybus.taichung.gov.tw/tcbus2/GetTimeTable1.php?useXno=1&route=160')
    .on('error', function(err) {
        console.log(err);
    }).on('response', function(response) {
        console.log(response.statusCode); // 200
        console.log(response.headers['content-type']); // 'image/png'
    }).on('data', function(data) {
        timetable += iconv.decode(data, 'utf-8');
    }).on('end', function() {
        //console.log(timetable);
        parseTimeTable(timetable);
    });

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

    jsdom.env(
        reftt,
        ["http://code.jquery.com/jquery.js"],
        function (err, window) {
            timetable.route = Number(window.$(".table01 tbody:first tr td").text());
            timetable.descritpion = window.$(".table01 tbody:nth-child(4) tr td").text().trim();
            timetable.operator = window.$(".table01 tbody:nth-child(6) tr td").text().trim();
            /*timetable.timeList = {
                weekday: {
                    foward: [],
                    reverse: []
                },
                weekend: {
                    foward: [],
                    reverse: []
                }
            };*/

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
                    throw new Error("Error when testing weekday type");
            }
            console.log("JSON = [" + JSON.stringify(timetable) + "]");
        }
    );

    return timetable;
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
        var timeStruct = {
            hour: 0,
            minute: 0
        };
        var elementTime = list[k].split(':');
        timeStruct.hour = Number(elementTime[0]);
        timeStruct.minute = Number(elementTime[1]);
        result.push(timeStruct);
    }

    return result;
}

function parseData(dataString) {
    var ThisDatas = response.split('_@');
    console.log(ThisDatas);
    console.log("==============================================================================");
}
