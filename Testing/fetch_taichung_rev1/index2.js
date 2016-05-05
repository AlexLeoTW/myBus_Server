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
        //console.log(response.statusCode); // 200
        //console.log(response.headers['content-type']); // 'image/png'
    }).on('data', function(data) {
        timetable += iconv.decode(data, 'utf-8');
    }).on('end', function() {
        //console.log(timetable);
        parseTimeTable(timetable);
    });

request.post({
    url:'http://citybus.taichung.gov.tw/iTravel/RealRoute/aspx/RealRoute.ashx',
    formData: {
        //Type=GetFreshData&Lang=Cht&Data=160_%2C1_%2C9&BusType=0
        Type: 'GetFreshData',
        Lang: 'Cht',
        Data: '160_,1_,9',
        BusType: 0
    }},
    function optionalCallback(err, httpResponse, body) {
        if (err) {
            return console.error('upload failed:', err);
        }
        //console.log('Upload successful!  Server responded with:', body);
        parseRealTime(body);
    }
);

parseRealTime("null_,21:45_,2274_|null_,21:45_,2273_|null_,21:45_,2276_|null_,21:46_,2271_|null_,21:47_,2270_|null_,21:48_,2277_|null_,21:49_,2269_|null_,21:50_,2275_|null_,21:51_,2302_|null_,21:52_,2301_|null_,21:53_,2300_|null_,21:54_,2299_|null_,21:55_,2298_|null_,21:55_,2297_|null_,21:56_,2296_|0_,21:57_,2295_|1_,21:57_,2294_|2_,21:58_,2293_|3_,21:59_,2292_|3_,21:59_,2278_|4_,22:00_,2290_|4_,22:01_,2303_|5_,22:03_,2288_|6_,22:04_,19274_|6_,22:05_,19275_|7_,22:06_,2285_|8_,22:07_,2284_|9_,22:08_,2283_|9_,22:09_,2282_|10_,22:10_,2281_|11_,22:10_,2280_|11_,22:12_,2279_|12_,22:13_,2307_|13_,22:13_,2289_|13_,22:16_,2291_|14_,22:18_,2320_|15_,22:19_,2268_|16_,22:20_,3645_|19_,22:21_,2319_|19_,22:21_,2318_|20_,22:21_,17849_|21_,22:22_,2317_|22_,22:23_,2316_|22_,22:23_,2315_|23_,22:25_,2267_|0_,22:26_,2314_|1_,22:27_,2313_|2_,22:29_,18872_|3_,22:30_,2312_|3_,22:31_,2311_|5_,22:31_,2310_|6_,22:32_,2309_|7_,22:33_,2304_|8_,22:33_,2308_|8_,22:35_,2321_|10_,22:36_,18038_|11_,22:36_,2306_|11_,22:37_,1809_|12_,22:37_,2305_@136-U8_,352_,120.647758_,24.223150_,1_|KKA-6037 _,336_,120.675620_,24.159995_,1");

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

/*function parseTime(string, format) {
    var result = {
        // hour: 0,
        // minute: 0,
        // second: 0
    };
    var divideSign = ':';

    if (format.includes(hh)) {
        if (format.length > 2) {
            divideSign = format.charAt(format.indexof('hh')+2);
            result.hour = Number(string.substring(0, string.indexof(divideSign)));
            format = format.substring(format.indexof(divideSign)+1, format.length);
            string = string.substring(string.indexof(divideSign)+1, string.length);
        } else {
            result.hour = Number(string);
        }
    }
    if (format.includes(mm)) {
        divideSign = format.charAt(format.indexof('mm')+2);
        result.minute = Number(string.substring(0, string.indexof(divideSign)));
        format = format.substring(format.indexof(divideSign)+1, format.length);
        string = string.substring(string.indexof(divideSign)+1, string.length);
    }
    if (format.includes(ss)) {
        divideSign = format.charAt(format.indexof('mm')+2);
        result.second = Number(string.substring(0, string.indexof(divideSign)));
        format = format.substring(format.indexof(divideSign)+1, format.length);
        string = string.substring(string.indexof(divideSign)+1, string.length);
    }
}*/

function parseRealTime(dataString) {
    var realTimeData = {
        timeList: [
            { hour: 0, minute: 0 }
        ],
        busList: [
            {plate_no: '', longitude: 0.0, latitude: 0.0}
        ]
    };
    var dataPack = dataString.split('_@');
    //console.log(dataPack[0]);
    //console.log(dataPack[1]);
    realTimeData.timeList = parsetArrivalList(dataPack[0]);
    realTimeData.busList = parseBusList(dataPack[1]);

    console.log('JSON = [' + JSON.stringify(realTimeData) + ']');
}

function parsetArrivalList(data) {
    var result = [
        {hour: 0, minute: 0}
    ];
    var rows = data.split('_|');

    for (var i=0; i<rows.length; i++) {
        var timeObj = {};
        var time = (rows[i].split('_,'))[1].split(':');
         timeObj.hour = Number(time[0]);
         timeObj.minute = Number(time[1]);
         result.push(timeObj);
    }

    return result;
}

function parseBusList(data) {

    var result = [
        //{plate_no: '', longitude: 0.0, latitude: 0.0}
    ];

    if ( data.toUpperCase().localeCompare('NoData'.toUpperCase()) === 0) {
        return null;
    }

    var rows = data.split('_|');
    var busObj = {};
    for (var i=0; i<rows.length; i++) {
        var chunks = rows[i].split('_,');
        busObj.plate_no = chunks[0];
        busObj.longitude = Number(chunks[1]);
        busObj.latitude = Number(chunks[2]);
        result.push(busObj);
    }
    return result;
}
