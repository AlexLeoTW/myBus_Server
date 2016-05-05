var ThisAjax = 'RealRoute/aspx/RealRoute.ashx';
var IsTimeViewLink = ['http://citybus.taichung.gov.tw/tcbus2/GetTimeTable1.php?useXno=1&route=', 'http://citybus.taichung.gov.tw/tcbus2/gz/GetTimeTable1.php?useXno=1&route='];
var TimeOutTimer = 0;
var ThisLang;
//Init Data
var ProviderData;
var RouteData;
var LowFloorBus;
var NowMode = '';
var BusType = 0;
var GZProviderData;
var GZRouteData;
//Map Obj
var MAP;
var MapLayout;
var StopMark = [];
var MultiStopMark=[];
var BusMark = [];
var MultiColor = ['1e5db2', 'e10019', '00601b', '601986', 'e26103', '81511c', 'ff3399', '22ac38', 'cc66ff', '00ff00'];
var MultiInfo;

BusMark = [];

var SucFun = function(response) {
    /*if (NowMode != Routeid + '.' + Mode) {
        return;
    }*/

    var ThisDatas = response.split('_@');
    //console.log(ThisDatas);
    console.log("==============================================================================");


    //Table
    if (ThisDatas[0] != 'Error' && ThisDatas[0] != 'NoData') {
        //console.log(ThisDatas[0]);
        console.log("==============================================================================");
        var ThisData = ThisDatas[0].split('_|');
        //console.log(ThisData);
        console.log("==============================================================================");

        for (var i = 0; i < ThisData.length; i++) {
            var ThisLine = ThisData[i].split('_,');
            console.log(ThisLine);
            console.log("=========================================");
			console.log(GetArrivalStr(ThisLine[0], ThisLine[1]));
            console.log("=========================================");
        }
    }
    //Bus
    if (ThisDatas[1] != 'Error' && ThisDatas[1] != 'NoData') {
        var ThisData = ThisDatas[1].split('_|');
        console.log(ThisData);
        console.log("==============================================================================");

        for (var i = 0; i < ThisData.length; i++) {
            var ThisLine = ThisData[i].split('_,');
            console.log(ThisLine);
            console.log("=========================================");
            var busType;
            /*if (LowFloorBus[ThisLine[0]] == 'dsby')
                busimg = 'image/BusImg/NoPoor0';
            else if (LowFloorBus[ThisLine[0]] == 'lfv')
                busimg = 'image/BusImg/carr5';
            else if (LowFloorBus[ThisLine[0]] == 'dual')
                busimg = 'image/BusImg/dulcar0';
            else if (LowFloorBus[ThisLine[0]] == 'dual_s')
                busimg = 'image/BusImg/dual_s0';
            else if (LowFloorBus[ThisLine[0]] == 'ev')
                busimg = 'image/BusImg/ev0';
            else if (LowFloorBus[ThisLine[0]] == 'hyv')
                busimg = 'image/BusImg/hyv0';
            else if (LowFloorBus[ThisLine[0]] == '3d')
                busimg = 'image/BusImg/D3';
            else if (LowFloorBus[ThisLine[0]] == 'double')
                busimg = 'image/BusImg/double0';
            else
                busimg = 'image/BusImg/buscar5';
            var num = Math.round(ThisLine[1] / 45);
            if (num > 0 && num < 8)
                busimg += num + '.gif';
            else
                busimg += '8.gif';*/
        }
    }
};

function GetArrivalStr(Num, Times) {
    var RouteTime = '';

    if (Num.length > 0 && Num != 'null') {
        var Values = parseInt(Num, 10);
        if (Values >= 0 && Values <= 3)
            RouteTime = '即將進站';
		else if(Values == -3)
			RouteTime = '末班車已駛離';
        else {
            var h = Math.floor(Values / 60); //小時
            var m = Values % 60; //分
            if (h > 0)
                RouteTime = '{0}小時{1}分'.replace('{0}', h).replace('{1}', m);
            else
                RouteTime = '{0}分'.replace('{0}', m);
        }
    }
    else if (Times.length > 0 && Times != "null")
        RouteTime = Times;
    else
        RouteTime = '尚未發車';
    return RouteTime;
}

var ComFun = function() {
    if (NowMode == Routeid + '.' + Mode) {
        clearInterval(TimeOutTimer);
        TimeOutTimer = setTimeout('GetArrivalTimeEvent(' + Routeid + ',' + Mode + ')', 30000);
    }
};

SucFun("null_,21:45_,2274_|null_,21:45_,2273_|null_,21:45_,2276_|null_,21:46_,2271_|null_,21:47_,2270_|null_,21:48_,2277_|null_,21:49_,2269_|null_,21:50_,2275_|null_,21:51_,2302_|null_,21:52_,2301_|null_,21:53_,2300_|null_,21:54_,2299_|null_,21:55_,2298_|null_,21:55_,2297_|null_,21:56_,2296_|0_,21:57_,2295_|1_,21:57_,2294_|2_,21:58_,2293_|3_,21:59_,2292_|3_,21:59_,2278_|4_,22:00_,2290_|4_,22:01_,2303_|5_,22:03_,2288_|6_,22:04_,19274_|6_,22:05_,19275_|7_,22:06_,2285_|8_,22:07_,2284_|9_,22:08_,2283_|9_,22:09_,2282_|10_,22:10_,2281_|11_,22:10_,2280_|11_,22:12_,2279_|12_,22:13_,2307_|13_,22:13_,2289_|13_,22:16_,2291_|14_,22:18_,2320_|15_,22:19_,2268_|16_,22:20_,3645_|19_,22:21_,2319_|19_,22:21_,2318_|20_,22:21_,17849_|21_,22:22_,2317_|22_,22:23_,2316_|22_,22:23_,2315_|23_,22:25_,2267_|0_,22:26_,2314_|1_,22:27_,2313_|2_,22:29_,18872_|3_,22:30_,2312_|3_,22:31_,2311_|5_,22:31_,2310_|6_,22:32_,2309_|7_,22:33_,2304_|8_,22:33_,2308_|8_,22:35_,2321_|10_,22:36_,18038_|11_,22:36_,2306_|11_,22:37_,1809_|12_,22:37_,2305_@136-U8_,352_,120.647758_,24.223150_,1_|KKA-6037 _,336_,120.675620_,24.159995_,1");

//TMS_AJAX(ThisAjax, { 'Type': 'GetFreshData', 'Lang': Lang, 'Data': Routeid + '_,' + Mode + '_,' + ($('#StopTime tr').length - 1), 'BusType': BusType }, SucFun, ComFun);
