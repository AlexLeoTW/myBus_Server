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

//GetSelect
var SucFun = function(response) {
    var ThisData = response.split('_@');
    ProviderData = ThisData[0].split('_|');
    if (ProviderData[0] == 'Error' || ProviderData[0] == 'NoData')
        ProviderData = [];
    RouteData = ThisData[1].split('_|');
    if (RouteData[0] == 'Error' || RouteData[0] == 'NoData')
        RouteData = [];

    GZProviderData = ThisData[2].split('_|');
    if (GZProviderData[0] == 'Error' || GZProviderData[0] == 'NoData')
        GZProviderData = [];
    GZRouteData = ThisData[3].split('_|');
    if (GZRouteData[0] == 'Error' || GZRouteData[0] == 'NoData')
        GZRouteData = [];
}
TMS_AJAX(ThisAjax, { 'Type': 'GetSelect', 'Lang': Lang }, SucFun, function() { });

//LowFloorBus
var SucFun = function(response) {
    var ThisData = response.split('_|');
    if (ThisData[0] != 'Error' && ThisData[0] != 'NoData') {
        var ebus = '';
        for (var z = 0; z < ThisData.length; z++) {
            var ThisValue = ThisData[z].split('_,');
            ebus += '\'' + ThisValue[1] + '\':\'' + ThisValue[0] + '\',';
        }
        LowFloorBus = eval('({' + ebus.substring(0, ebus.length - 1) + '})');
    }
}
TMS_AJAX(ThisAjax, { 'Type': 'GetLowFloorBus' }, SucFun, function() { });

$(document).ready(function() {
    //Init Map
    MAP = new googleMap(); //pa:[DIV ID][y][x]
    MAP.init({ objID: 'map-canvas', size: 15, X: 120.684895, Y: 24.136953 });
	//20140421 增加Google Link
    //MAP.Control(function() { window.open('http://citybus.taichung.gov.tw/tcbus2/'); }, 'Google圖資', '', 'TOP_RIGHT');
    //InitHead
    $('.TabbedPanelsTabGroup').find('li').addClass('TabbedPanelsTab');
    //Create Body
    ChangeDiv(0, 999);
});

function ChangeDiv(ThisKey, NowType) {
    //CheackData
    if (NowType == 999) {
        if (ProviderData == undefined || RouteData == undefined) {
            if (TimeOutTimer < 30) {
                TimeOutTimer++;
                setTimeout('ChangeDiv(' + ThisKey + ',999)', 500);
            }
            else {
                alert('No Route Info');
                return;
            }
        }
        else
            ChangeDiv(ThisKey, 0);
    }
    else {
        //Init Head
        $('.TabbedPanelsTabGroup').find('li').each(function(index) {
            $(this).removeClass().unbind("click");
            if (NowType == index)
                $(this).addClass('TabbedPanelsTab TabbedPanelsTabSelected');
            else
                $(this).addClass('TabbedPanelsTab').click(function() { ChangeDiv(ThisKey, index); });
        });
        var TargetDiv = $('#ControlDiv');

        ///***Single****///
        if (NowType == 0) {
            ClearList('Multi');
            ThisLang = ['業者', '路線', '全部', '請選擇'];
            var Str = '<table  border="0" cellspacing="1" cellpadding="1" style=" width: 100%; "><tr style=" text-align: center; "><td class="font02" style=" width: 30px; ">類別</td>' +
                                    '<td class="font02"><input type="radio" name="BusMode" checked>市區公車</td><td class="font02"><input type="radio" name="BusMode">公路客運</td></tr></table>' +
                            '<table name="SelectTable" border="0" cellspacing="1" cellpadding="1"><tr><td class="font02" NoWrap>' + ThisLang[0] + '</td><td><label>' +
                                    '<select class="font03" id="Provider"></select></label></td></tr>' +
                                '<tr><td class="font02" NoWrap>' + ThisLang[1] + '</td><td><select class="font03" id="Route"></select></td></tr></table>' +
            //GZ Mode
                            '<table name="SelectTable" border="0" cellspacing="1" cellpadding="1" style=" display: none; ">' +
                                '<tr><td class="font02" NoWrap>' + ThisLang[0] + '</td><td><label><select class="font03" id="GZProvider"></select></label></td></tr>' +
                                '<tr><td class="font02" NoWrap>' + ThisLang[1] + '</td><td><select class="font03" id="GZRoute" style=" width: 250px; "></select></td></tr>' +
								'<tr><td colspan="2"><span style="color:red; font-size:10px; font-family:微軟正黑體; float: right;">資料來源：交通部公路總局</span></td></tr></table>';
            TargetDiv.html(Str);
            var Obj = $('#Provider');
            Obj[0].options[0] = new Option(ThisLang[2].toString(), '-1');
            for (var i = 0; i < ProviderData.length; i++) {
                var ThisSplit = ProviderData[i].split('_,');
                Obj[0].options[i + 1] = new Option(ThisSplit[1], ThisSplit[0]);
            }
            ChangeRoute(-1, 'Route');
            $('#Provider').change(function() { ChangeRoute($(this).val(), 'Route'); });
            $('#Route').change(function() { GetSingleRoute($(this), 0); });

            var Obj = $('#GZProvider');
            Obj[0].options[0] = new Option(ThisLang[2], '-1');
            for (var i = 0; i < GZProviderData.length; i++) {
                var ThisSplit = GZProviderData[i].split('_,');
                Obj[0].options[i + 1] = new Option(ThisSplit[1], ThisSplit[0]);
            }
            ChangeRoute(-1, 'GZRoute');
            $('#GZProvider').change(function() { ChangeRoute($(this).val(), 'GZRoute'); });
            $('#GZRoute').change(function() { GetSingleRoute($(this), 1); });

            //Radio Button
            $('[name=BusMode]').each(function(Index) {
                $(this).click(function() {
					$('#IsTimesImg').remove();
                    $('[name=SelectTable]').hide();
                    $('[name=SelectTable]').eq(Index).show();
                    //BusType = Index;
                    //Clear Map
                    ClearList();
                    //Init Select
                    $('select  option[value=-1]').attr('selected', 'selected');
                });
            });
        }
        else {///***Group****///
            ClearList('All');
			if ($('#IsTimesImg').length > 0)
                $('#IsTimesImg').remove();
            MultipleRoute();
        }
    }
}

///SubFunction///
function ClearList(ClearMode) {
    //Table
    if (ClearMode == 'All')
        $('#ControlDiv').html('');
    $('#AnsTable').html('');
    //Ajax
    clearInterval(TimeOutTimer);
    NowMode = '';
    //Kml
    MAP.ClearKml();
    if (ClearMode == 'Multi') {
        for (var i = 0; i < MultiStopMark.length; i++) {
            if (MultiStopMark[i] != undefined && MultiStopMark[i].length != 0)
                MAP.ChangeMark(MultiStopMark[i], 'Hide');
        }
        MAP.ChangeMark(BusMark, 'Hide');
        MultiStopMark = [];
    }
    else {
        //Stop
        MAP.ChangeMark(StopMark, 'Hide');
        //Bus
        MAP.ChangeMark(BusMark, 'Hide');
    }
    StopMark = [];
    BusMark = [];
}

function ChangeRoute(Index, ObjName) {
    var SubLang = ['請選擇'];
    var Obj = $('#' + ObjName);
    Obj[0].options.length = 0;
    Obj[0].options[0] = new Option(SubLang[0], '-1');
    var Counts = 1;
    var NowNameZh = '';
    var RouteLine;
    if (ObjName == 'Route')
        RouteLine = RouteData;
    else
        RouteLine = GZRouteData;
    for (var i = 0; i < RouteLine.length; i++) {
        var ThisSplit = RouteLine[i].split('_,');
        if ((ThisSplit[1] == Index || Index == '-1') && NowNameZh != ThisSplit[2]) {
            NowNameZh = ThisSplit[2];
            Obj[0].options[Counts++] = new Option(ThisSplit[2] + ' ' + ThisSplit[3], ThisSplit[0]);
        }
    }
}

function RouteInfo(Key, LineMode) {
    var ThisData = [];
    var ModeData;
    if (LineMode != 1)
        ModeData = RouteData;
    else
        ModeData = GZRouteData;
    for (var i = 0; i < ModeData.length; i++) {
        var ThisSplit = ModeData[i].split('_,');
        if (ThisSplit[0] == Key)
            ThisData.push(ThisSplit);
    }
    if (LineMode != 1)
        ModeData = ProviderData;
    else
        ModeData = GZProviderData;
    //ID to NameZh
    for (var i = 0; i < ThisData.length; i++) {
        for (var j = 0; j < ModeData.length; j++) {
            var ThisSplit = ModeData[j].split('_,');
            if (ThisSplit[0] == ThisData[i][1]) {
                ThisData[i][1] = ThisSplit[1];
                break;
            }
        }
    }
    return ThisData;
}

function GetSingleRoute(Obj, RouteMode) {
    var routeKML = '';
    var Routeid = Obj.val();
    BusType = RouteMode;
    ThisData = RouteInfo(Routeid, RouteMode);
    //var RouteNameZh = ThisData[0][3];
    var RouteProviderName = [];
    for (var i = 0; i < ThisData.length; i++)
        RouteProviderName.push(ThisData[i][1]);
    if (Routeid == -1)
        return;
    NowMode = Routeid + '.1';

    //班表
    $('#IsTimesImg').remove();
    //if (BusType==0)
    //20150126 Change Start
        $('#map-canvas').append('<div id="IsTimesImg" style=" position: absolute; top: 30px; right: 2px; ">' +
            //'<img border="0" src="image/TimesViews.png" onclick="window.open(\'' + IsTimeViewLink[BusType] + Routeid + '\')" style=" cursor: pointer; "></div>');
			'<img border="0" src="image/map_button6.gif" onclick="window.open(\'' + IsTimeViewLink[BusType] + Routeid + '\')" style=" cursor: pointer; "></div>');
		if (ImgList[Routeid])
		    $('#IsTimesImg').append('<img border="0" src="image/map_button5.gif" onclick="window.open(\'' + ImgList[Routeid] + '\')" style=" cursor: pointer; ">');
    /*if (ImgList[Routeid])
        $('#map-canvas').append('<div id="IsTimesImg" style=" position: absolute; top: 30px; right: 2px; ">' +
            '<img border="0" src="image/map_button5.gif" onclick="window.open(\'' + ImgList[Routeid] + '\')" style=" cursor: pointer; "></div>');*/
    //20150126 Change End

    //TableHead
    var TimeTable = '<table width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td>' +
	'<div style="margin-top:8px; width:90%; margin-left:auto; margin-right:auto; margin-bottom:5px; ">' +
                                    '<table id="RouteInfoData" width="100%" border="0" cellspacing="2" cellpadding="1"><tr>' +
                                            '<td colspan="2" align="center" class="font02">路線:' + ThisData[0][2] + ' (' + RouteProviderName.join(' ') + ')</td></tr>' +
                                        '<tr><td colspan="2" align="center" class="font02" >' +
                                        ThisData[0][3] + '</td></tr>' +
                                        '<tr><td width="50%"><a href="#"><div name="GoBackKey" class="go">往:' + ThisData[0][5] + '</div></a></td>' +
                                            '<td width="50%"><div name="GoBackKey" class="back">往:' + ThisData[0][4] + '</div></td></tr></table></div>' +
                            '<div style="margin-top:10px; border:solid 1px  #B3B3B3; height: 370px; overflow-y: auto;">' +
                                '<div id="StopTime" style="margin-top:8px; width:90%; margin-left:auto; margin-right:auto; margin-bottom:5px; "></div>';
    $('#AnsTable').html(TimeTable);
    //Kml&Bus
    GoBackMode(Routeid, ThisData[0][2], -1);
    //Stop
    GetStopInfo(Routeid, 1);
}

// Route Kml
function GoBackMode(Id, Str, Mode) {
    //MultiMode

    if (Mode == -999) {
        var ChangeName = Str.replace('區', 'Area').replace('副', 'Auxiliary').replace('繞', 'Circle');
        MAP.MultiKml("http://citybus.taichung.gov.tw/itravel/kml/" + "Route" + ChangeName + "_" + Id[1] + "Trip_" + MultiColor[Id[0]] + ".kml?" + new Date().getTime(), Id[0]);
    }
    else {//Single
        if (Mode == -1) {
            MAP.ClearKml();
            var PlotKmlData = [];
            var ChangeName = Str.replace('區', 'Area').replace('副', 'Auxiliary').replace('繞', 'Circle');
            PlotKmlData.push(Id + 'Go', "http://citybus.taichung.gov.tw/itravel/kml/" + "Route" + ChangeName + "_GoTrip_" + MultiColor[0] + ".kml?" + new Date().getTime());
            PlotKmlData.push(Id + 'Back', "http://citybus.taichung.gov.tw/itravel/kml/" + "Route" + ChangeName + "_BackTrip_" + MultiColor[1] + ".kml?" + new Date().getTime());
            MAP.PlotKml(PlotKmlData);
            Mode = 1;
        }
        if (Mode == 1) {
            MAP.ChangeKml(Id + 'Back', 'Hide');
            MAP.ChangeKml(Id + 'Go', 'Show');
        }
        else if (Mode == 2) {
            MAP.ChangeKml(Id + 'Go', 'Hide');
            MAP.ChangeKml(Id + 'Back', 'Show');
        }
    }
}

//Table Control
//var stopData;
function GetStopInfo(Routeid, Mode) {
    var SucFun = function(response) {
        MAP.ChangeMark(StopMark, 'Hide');
        StopMark = [];

        var Str = '<table  width="100%" border="0" cellpadding="0" cellspacing="0" class="table01"><thead>' +
                '<tr><th>站序</th><th>站牌名稱</th><th>站牌編號</th><th>預估到站</th></tr></thead>';
        var ThisData = response.split('_|');
		//stopData = ThisData;
        if (ThisData[0] != 'Error' && ThisData[0] != 'NoData') {
            for (var i = 0; i < ThisData.length; i++) {
                var ThisLine = ThisData[i].split('_,');
                //Tr
                Str += '<tr align="center"><td>' + (i + 1) + '</td><td>' + ThisLine[1] + '</td><td>' + ThisLine[5] + '</td><td>載入中</td></tr>';

                //StopControl
                //Marker
                var MarkImage = 'aspx/GetImg.ashx?Num=' + (i + 1) + '&img=image\\' + (Mode == 1 ? 'stop11.png' : 'stop21.png');
                StopMark.push(MAP.SingleMark({ title: ThisLine[1], X: ThisLine[3], Y: ThisLine[2], NO: (i + 1), Cursor: ThisLine[0] }, MarkImage));

                google.maps.event.addListener(StopMark[i], 'click', function() {
                    var TargetStr = $('#StopTime').find('tr').eq(this.lmkId).find('td:eq(3)').html();
                    MAP.OpenInfo(this, HtmlTable(this.lmkId - 1, this.getTitle(), this.getCursor(), TargetStr));
                });

                //LinkTable
                google.maps.event.addListener(StopMark[i], 'mouseover', function() {
                    $('#StopTime').find('tr').css('backgroundColor', '');
                    $('#StopTime').find('tr').eq(this.lmkId).css('backgroundColor', '#F9D562');
                });
            }
        }
        Str += '</table>';
        $('#StopTime').html(Str);
        $('#StopTime').find('tr:odd').addClass('odd');

        //AddMode
        if (Mode == 1) {
            $('[name=GoBackKey]:eq(0)').removeClass().unbind("click").addClass('goclick');
            $('[name=GoBackKey]:eq(1)').click(function() {
                clearTimeout(TimeOutTimer);
                $(this).removeClass().unbind("click").addClass('backclick');
                $('[name=GoBackKey]:eq(0)').removeClass().addClass('go');
                GoBackMode(Routeid, '', 2);
                GetStopInfo(Routeid, 2);
                NowMode = Routeid + '.2';
            });
        }
        else {
            $('[name=GoBackKey]:eq(1)').removeClass().unbind("click").addClass('backclick');
            $('[name=GoBackKey]:eq(0)').click(function() {
                clearTimeout(TimeOutTimer);
                $(this).removeClass().unbind("click").addClass('goclick');
                $('.backclick').removeClass().addClass('back');
                GoBackMode(Routeid, '', 1);
                GetStopInfo(Routeid, 1);
                NowMode = Routeid + '.1';
            });
        }
        //TrClickMode
        $('#StopTime').find('tr:gt(0)').each(function(Index) {
            $(this).click(function() {
                var TargetTr = $(this).find('td');
                var StopName = TargetTr[1].innerHTML;
                var StopId = TargetTr[2].innerHTML;
                var Arrival = TargetTr[3].innerHTML;

                MAP.OpenInfo(StopMark[Index], HtmlTable(Index, StopName, StopId, Arrival));
            });
        });
    }
    TMS_AJAX(ThisAjax, { 'Type': 'GetStop', 'Lang': Lang, 'Data': Routeid + '_,' + Mode, 'BusType': BusType }, SucFun, function() { GetArrivalTimeEvent(Routeid, Mode); });
}

function HtmlTable(Index, StopName, StopId, Arrival) {
	MAP.ChangeZoom(17);
    var FastHead = NowMode.split('.');
    FastHead = FastHead[0] + (FastHead[1] - 1);
    var Str = '<table border="0" cellpadding="1" cellspacing="1"><Tr><td align="center" class="font05">' + StopName + '(' + StopId + ')' + '</td></Tr><Tr><td align="center" class="font05">速撥碼：' + FastHead  + StopId  + '</td></Tr>' ;
    if (Arrival != undefined)
        Str += '<Tr><td align="center">' + Arrival + '</td></Tr>';
    Str += '<Tr><td align="center" ><input type="button" class="font01" value="查詢經過路線" ' +
            'onclick="OpenThroughRoute(' + Index + ',\'' + StopId + '\',\'' + StopName + '\')" /></td></tr></Table>';
    return Str;
}

function GetArrivalTimeEvent(Routeid, Mode) {
    MAP.ChangeMark(BusMark, 'Hide');
    BusMark = [];

    var SucFun = function(response) {
        if (NowMode != Routeid + '.' + Mode)
            return;

        var ThisDatas = response.split('_@');

        //Table
        if (ThisDatas[0] != 'Error' && ThisDatas[0] != 'NoData') {
            var ThisData = ThisDatas[0].split('_|');
			//for(var i = 0 ;i < stopData.length; i++){
			//
			//	var ThisStop = stopData[i].split('_,')[4];
			//	var TargetTd = $('#StopTime').find('tr:eq(' + (i + 1) + ')').find('td:eq(3)');
			//	for(var j =0 ; j <ThisData.length; j++){
			//		var ThisLine = ThisData[j].split('_,');
			//		if(ThisLine[2] == ThisStop){
			//			TargetTd.text(GetArrivalStr(ThisLine[0], ThisLine[1]));
			//			break;
			//		}
			//		/*else
			//		{
			//			TargetTd.text(GetArrivalStr('null', 'null'));
			//		}*/
			//	}
			//}
            for (var i = 0; i < ThisData.length; i++) {
                var ThisLine = ThisData[i].split('_,');
				var TargetTd = $('#StopTime').find('tr:eq(' + (i + 1) + ')').find('td:eq(3)');
				TargetTd.text(GetArrivalStr(ThisLine[0], ThisLine[1]));
            }
        }
        //Bus
        if (ThisDatas[1] != 'Error' && ThisDatas[1] != 'NoData') {
            var ThisData = ThisDatas[1].split('_|');
            for (var i = 0; i < ThisData.length; i++) {
                var ThisLine = ThisData[i].split('_,');
                var busimg;
                if (LowFloorBus[ThisLine[0]] == 'dsby')
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
                    busimg += '8.gif';
                //Marker
                BusMark.push(MAP.SingleMark({ title: ThisLine[0], X: ThisLine[2], Y: ThisLine[3], NO: ThisLine[4] + '_,' + LowFloorBus[ThisLine[0]] , zIndex: 100 }, busimg));
                google.maps.event.addListener(BusMark[i], 'click', function() {
                    var ThisInfo = this.lmkId.split('_,');
                    var WindowStr = '<div style="overflow: auto;"><table border="0" cellpadding="1" cellspacing="1">';
                    //Provider
                    WindowStr += '<tr><td align="center" class="font05">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td></tr>';
                    WindowStr += '<tr><td align="center" class="font05">客運業者：';
                    if (parseFloat(ThisInfo[0]) < 20) {
                        for (var i = 0; i < ProviderData.length; i++) {
                            var TempStr = ProviderData[i].split('_,');
                            if (TempStr[0] == ThisInfo[0]) {
                                WindowStr += TempStr[1];
                                break;
                            }
                        }
                    }
                    else {
                        for (var i = 0; i < GZProviderData.length; i++) {
                            var TempStr = GZProviderData[i].split('_,');
                            if (TempStr[0] == ThisInfo[0]) {
                                WindowStr += TempStr[1];
                                break;
                            }
                        }
                    }
                    WindowStr += '</td></tr>';
                    //Number
                    WindowStr += '<tr><td align="center">車牌號碼：' + this.title + '</td></tr>';
                    //BusType
                    //ThisInfo[1]
                    WindowStr += '<tr><td align="center" class="font05">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td></tr>';
                    WindowStr += '</table></div>';
                    MAP.OpenInfo(this, WindowStr);
                });
            }
        }
    }
    var ComFun = function() {
        if (NowMode == Routeid + '.' + Mode) {
            clearInterval(TimeOutTimer);
            TimeOutTimer = setTimeout('GetArrivalTimeEvent(' + Routeid + ',' + Mode + ')', 30000);
        }
    }
    TMS_AJAX(ThisAjax, { 'Type': 'GetFreshData', 'Lang': Lang, 'Data': Routeid + '_,' + Mode + '_,' + ($('#StopTime tr').length - 1), 'BusType': BusType }, SucFun, ComFun);
}

//查詢經過路線
function OpenThroughRoute(MarkIndex, StopId, StopName) {
    var FastHead = NowMode.split('.');
    var SucFun = function(response) {
        if (response == 'err01')
            alert('參數錯誤');
        else {
            var HtmlStr = '';
            if (response == 'err03')
                HtmlStr = '查無資料';
            else {
                var Arrival = $('#StopTime').find('tr:eq(' + parseInt(MarkIndex + 1, 10) + ')').find('td:eq(3)').text();
                HtmlStr = '<table border="0" cellpadding="1" cellspacing="1">' +
                            '<Tr><td align="center" class="font06">' + StopName + '(' + StopId + ')' + '</td></Tr>' +
                            '<Tr><td align="center" class="font02">' + Arrival + '</td></Tr>' +
                            '<Tr><td align="center" class="font02">經過路線</td></Tr>' +
                            '<Tr><Td><Div class="throughRouteDiv">' +
                                    '<table border="0" cellpadding="2" cellspacing="2">';
                var ThisData = response;

                for (var i = 0; i < response.length; i++) {
                    HtmlStr += '<Tr><Td width="12px"><img src="image/icon_14.png" width="12" height="12" /></Td>' +
                            '<Td width="21px"  align="center"  bgcolor="#0087C3" class="font04" '+
							'onclick="ChangeRouteInfo('+response[i].Type+','+response[i].RouteID+');" style="cursor: pointer;">' + response[i].RouteName + '</Td>' +
                            '<Td width="133px"  align="left" class="font02">' +
                            (response[i].GoBack == '1' ? response[i].Dept + '->' + response[i].Dest : response[i].Dest + '->' + response[i].Dept) + '</Td>' +
                            '<Td width="35px"  align="center" class="font02">' + GetArrivalStr(response[i].Time1, response[i].Time2) + '</Td></Tr>';
                }
                HtmlStr += '</Table></Div></td></Tr></Table>';
            }
            MAP.OpenInfo(StopMark[MarkIndex], HtmlStr);
        }
    }
    TMS_AJAX('ItravelAPI/ExpoAPI/CrossRoutes.ashx', { 'StopName': StopName.UTF8Bytes(), 'routeID': FastHead[0], 'Type': BusType }, SucFun, function() { });
}

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
function GetTicketDiv() {
    CreateDesktop();
    var NewDiv = $('<div>').css({ 'position': 'absolute', 'width': '50%', 'height': '50%', 'z-index': '10', 'background-color': '#FFFFFF', 'top': '25%', 'left': '25%' });
    $('#Desktop').append(NewDiv);
    var ThisInfo = $('#RouteInfoData').find('td:first').html();
    var ThisInfo2 = $('#RouteInfoData').find('td:eq(1)').html();
    var NewHtml = '<div><img src="image/X.png" width="18" height="18" border="0" style=" float: right; cursor: pointer; " onclick="$(\'#Desktop\').remove();"></div>' +
                  '<div style="margin-top:18px; width:75%; margin-left:auto; margin-right:auto; margin-bottom:5px; ">' +
                        '<table width="100%" border="1"><tr align="center"><td colspan="2" class="font02" height="30px" style=" background-color: #e8eaeb; font-family:微軟正黑體;">' + ThisInfo + '</td></tr>' +
                            '<tr align="center"><td colspan="2" class="font02" height="30px" style=" background-color: #e8eaeb; font-family:微軟正黑體;">' + ThisInfo2 + '</td></tr>' +
                            '<tr align="center"><td style=" background-color: #e8eaeb; font-family:微軟正黑體;">起  點</td><td style=" background-color: #f6f6f6; "><p style=" float: left; "><select class="font03" name="TicketFare"></p></select></td></tr>' +
                            '<tr align="center"><td style=" background-color: #e8eaeb; font-family:微軟正黑體;">迄  點</td><td style=" background-color: #f6f6f6; "><p style=" float: left; "><select class="font03" name="TicketFare"></select></p>' +
                                '<p style=" float: right; "><img id="GetFare" src="image/07.png" border="0" style=" cursor: pointer; "></p></tr>' +
                            '<tr align="center"><td style=" background-color: #e8eaeb; font-family:微軟正黑體;">票  價</td><td class="font02" style=" background-color: #f6f6f6; font-family:微軟正黑體;"><p>NoData</p></td></tr>' +
                        '</table></div>';
    NewDiv.append(NewHtml);
    $('[name=TicketFare]').each(function() {
        var StopData = $('#StopTime tr');
        for (var i = 1; i < StopData.length; i++) {
            this.options[i - 1] = new Option($(StopData[i]).find('td:eq(1)').html(), $(StopData[i]).find('td:eq(2)').html());
        }
    });
    ChangeImgFun('#GetFare', '.png', '-1.png');
    $('#GetFare').click(function() {
        var StopNum = [];
        if (BusType == '1')
            StopNum.push($('#GZRoute').val());
        else
            StopNum.push($('#Route').val());
        $('[name=TicketFare]').each(function() {
            StopNum.push($(this).val());
        });
        if (StopNum[1] == StopNum[2])
            alert('Same Stop');
        else {
            var SucFun = function(response) {
                var ThisSplit = response.split('_,');
                var Str = '';
                if (ThisSplit.length != 2)
                    Str = 'Error';
                else
                    Str = '票價：{0}、折扣票價：{1}'.replace('{0}', ThisSplit[0]).replace('{1}', ThisSplit[1]);
                $('#GetFare').closest('table').find('td:last').html('<p>' + Str + '</p>');
            }
            TMS_AJAX(ThisAjax, { 'Type': 'GetFareData', 'Lang': Lang, 'Data': StopNum.join('_,'), 'BusType': BusType }, SucFun, function() { });
        }
    });
}

///Multiple///
function MultipleRoute() {
    var MessageImgStr = '<td><img src="image/MessageImg.png" title="您可以透過關鍵字搜尋，以獲得直達路線資訊。例如：車站、百貨"></td>';
    var HtmlStr = '<table border="0" cellspacing="2" cellpadding="2">' +
                    '<tr><td><img src="image/01.png" width="19" height="19" border="0"></td><td class="font02">上車站</td><td><input type="text" name="StationPoint"></td>' + MessageImgStr + '</tr>' +
                    '<tr><td><img src="image/02.png" width="19" height="19" border="0"></td><td class="font02">下車站</td><td><input type="text" name="StationPoint"></td>' + MessageImgStr + '</tr>' +
                '</table><font style="color: red; float: right;">目前尚未提供公路客運之群組資訊</font>'+
				'<table width="100%" border="0" cellspacing="2" cellpadding="2" style="margin-top:5px;">' +
                    '<tr><td align="right"><img src="image/03.png" name="PlanImg" width="73" height="32" border="0" style=" cursor: pointer; "></td>' +
                        '<td align="left"><img src="image/04.png" name="PlanImg" width="73" height="32" border="0" style=" cursor: pointer; "></td></tr></table>';
    $('#ControlDiv').html(HtmlStr);
    ChangeImgFun('[name=PlanImg]', '.png', '-1.png');
    //FastSearch
    $('[name=StationPoint]').each(function(Index) {
        $(this).autocomplete({
            source: function(request, response) {
                $.ajax({
                    url: 'iTravelAPI/ExpoAPI/LocationInfo.ashx',
                    data: { 'keyword': request.term, 'type': 6 },
                    //dataType: "json",
                    success: function(Jdata) {
                        if (Jdata != 'NoData') {
                            Jdata = eval(Jdata);
                            var ThisArray = [];
                            var ThisCheck = '';
                            for (var i = 0; i < Jdata.length; i++) {
                                if (ThisCheck != Jdata[i].Name) {
                                    ThisCheck = Jdata[i].Name;
                                    ThisArray.push({ 'label': Jdata[i].Name, 'Name': Jdata[i].Name });

                                    if (ThisArray.length >= 10)
                                        break;
                                }
                            }
                            response(ThisArray);
                        }
                    }
                });
            },
            minLength: 1,
            autoFocus: true
        });
    });
    //GetPlan
    $('[name=PlanImg]:first').click(function() {
        var ChooseStopName = [];
        $('[name=StationPoint]').each(function() {
            ChooseStopName.push($(this).val());
        });
        if (ChooseStopName[0].length == 0 && ChooseStopName[1].length == 0) {
            alert('尚未輸入起迄點');
            return;
        }
        $('[name=StationPoint]:eq(0)').val(ChooseStopName[1]);
        $('[name=StationPoint]:eq(1)').val(ChooseStopName[0]);
    });

    $('[name=PlanImg]:eq(1)').click(function() { GetTravelPlan(); });
}

///Multiplan///
function GetTravelPlan() {
    var ChooseStopName = [];
    $('[name=StationPoint]').each(function() {
        ChooseStopName.push($(this).val());
    });
    if (ChooseStopName[0].length == 0 || ChooseStopName[1].length == 0) {
        alert('必須輸入起始站跟抵達站!');
        return;
    }
    else {
        var SucFun = function(response) {
            if (response == 'Error' || response == 'NoData')
                alert('無查詢結果');
            else {
                //ClearMap
                ClearList('Multi');

                MultiInfo = response.split('_|');
                var ThisTable = '<table width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td><div style="margin-top:10px; ">' +
                                            '<table width="100%" border="0" cellspacing="2" cellpadding="1">' +
                                                '<tr><td width="50%"><a href="#"><div name="MultiButton" class="goclick">群組資訊</div></a></td>' +
                                                '<td width="50%"></td></tr></table>' +
                                            '<div id="LineList" style="margin-top:8px; width:98%; margin-left:auto; margin-right:auto; margin-bottom:5px; height:280px; ' +
                                                'overflow:auto;"><table width="100%" border="0" cellpadding="0" cellspacing="0" class="table01">' +
                                                    '<thead><tr><th colspan="3">顯示路線</th><th>抵達下車站<br>時間 </th></tr></thead>';

                for (var i = 0; i < MultiInfo.length; i++) {
                    var LineSplit = MultiInfo[i].split('_,');
					var HanniberNeed = '預計抵達時間:';
                    if (LineSplit[6].length > 0 && LineSplit[6] != 'null')
                        HanniberNeed = '預計等候時間:';
                    var StopValue = parseInt(LineSplit[9].split(':')[0] * 60, 10) + parseInt(LineSplit[9].split(':')[1], 10)
                                    - parseInt(LineSplit[7].split(':')[0] * 60, 10) - parseInt(LineSplit[7].split(':')[1], 10);

                    ThisTable += '<tr><td><input type="checkbox" name="GroupLineStop" /></td><td align="center" bgcolor="#' + MultiColor[i] + '">' +
                                        '<img src="image/005.png" width="20" height="20" border="0"><br><span class="font04">' + LineSplit[0] + '</span></td>' +
                                    '<td>經' + LineSplit[5] + '站,' + HanniberNeed + GetArrivalStr(LineSplit[6], LineSplit[7]) + '<br>車內時間約' + StopValue + '分 </td>' +
                                    '<td align="center">' + LineSplit[9] + '</td></tr>';
                }

                ThisTable += '</table></div><div id="LineInfo" style="margin-top:8px; width:98%; margin-left:auto; margin-right:auto; margin-bottom:5px; ' +
                                'height:280px; background-color:#F2F2F2;display: none;"></div></div></td></tr></table>';
                $('#AnsTable').html(ThisTable);
                BusType = 0;
                $('#LineList').find('tr:odd').addClass('odd');
                //GroupMenu
                $('[name=MultiButton]').click(function() {
                    $('#LineList').show();
                    $('#LineInfo').hide();
                    $(this).removeClass().addClass('goclick');
                    //Init
                    NowMode = '';
                    //Ajax
                    clearInterval(TimeOutTimer);
                    //Kml
                    MAP.MultiKml('SingleMode', -1);
                    //Stop
                    for (var i = 0; i < MultiStopMark.length; i++)
                        MAP.ChangeMark(MultiStopMark[i], 'Hide');
                    //Bus
                    MAP.ChangeMark(BusMark, 'Hide');
                    $('[name=GroupLineStop]').prop("checked", false);
                });

                //20140717 NewMode
                $('[name=GroupLineStop]').each(function(Index) {
                    $(this).click(function() {
                        if ($(this).prop('checked')) {
                            if (MultiStopMark[Index] == undefined || MultiStopMark[Index].length == 0) {
                                //Kml
                                var LineData = MultiInfo[Index].split('_,');
                                GoBackMode([Index, (LineData[4] == '1' ? 'Go' : 'Back')], LineData[0], -999);
                                OnlyStopMark(LineData[1], LineData[4], Index);
                            }
                            else {
                                MAP.MultiKml('MultiMode', Index);
                                MAP.ChangeMark(MultiStopMark[Index], 'Show');
                            }
                        }
                        else {
                            MAP.MultiKml('MultiMode', Index);
                            MAP.ChangeMark(MultiStopMark[Index], 'Hide');
                        }
                    });
                });
				//20140808 Open First Line
				$('[name=GroupLineStop]:first').trigger('click');

                //ChangeLine
                $('#LineList').find('tr:gt(0)').each(function(Index) {
                    $(this).find('td:gt(0)').click(function() {
                        LoadingPage(0);
                        //PageChange
                        $('[name=MultiButton]').removeClass().addClass('go');
                        $('#LineList').hide();
                        $('#LineInfo').show();
                        //GetData
                        var LineData = MultiInfo[Index].split('_,');

                        var Routeid = LineData[1];
                        var ThisData = RouteInfo(Routeid);
                        var RouteProviderName = [];
                        for (var i = 0; i < ThisData.length; i++)
                            RouteProviderName.push(ThisData[i][1]);
                        NowMode = Routeid + '.' + LineData[4];
                        var TimeTable = '<table width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td>' +
                            '<div style="margin-top:10px; border:solid 1px  #B3B3B3; height: 270px; overflow-y: auto;">' +
                                '<div style="margin-top:8px; width:90%; margin-left:auto; margin-right:auto; margin-bottom:5px; ">' +
                                    '<table id="RouteInfoData" width="100%" border="0" cellspacing="2" cellpadding="1"><tr>' +
                                            '<td colspan="2" align="center" class="font02">路線:' + LineData[0] + ' (' + RouteProviderName.join(' ') + ')</td></tr>' +
                                        '<tr><td colspan="2" align="center" class="font02" NoWrap>' + ThisData[0][3] + '</td></tr></table></div>' +
                                '<div id="StopTime" style="margin-top:8px; width:90%; margin-left:auto; margin-right:auto; margin-bottom:5px; "></div>';
                        $('#LineInfo').html(TimeTable);

                        //ChangeKml & Stop
                        for (var i = 0; i < MultiStopMark.length; i++)
                            MAP.ChangeMark(MultiStopMark[i], 'Hide');
                        if (MultiStopMark[Index] == undefined || MultiStopMark[Index].length == 0) {
                            GoBackMode([Index, (LineData[4] == '1' ? 'Go' : 'Back')], LineData[0], -999);
                            OnlyStopMark(LineData[1], LineData[4], Index);
                        }
                        else
                            MAP.ChangeMark(MultiStopMark[Index], 'Show');
                        MAP.MultiKml('SingleMode', Index);
                        CreateGroupTable(Index);
                    });
                });
            }
        }
        TMS_AJAX(ThisAjax, { 'Type': 'GetTravelPlan', 'Lang': Lang, 'Data': ChooseStopName.join('_,') }, SucFun, function() { });
    }
}
//GroupStopMark
function OnlyStopMark(Routeid, Mode, MultiKey) {
    var SucFun = function(response) {
        var ThisData = response.split('_|');
        var TempStopMark = [];
        if (ThisData[0] != 'Error' && ThisData[0] != 'NoData') {
            for (var i = 0; i < ThisData.length; i++) {
                var ThisLine = ThisData[i].split('_,');
                //Marker
                var MarkImage = 'aspx/GetImg.ashx?Num=' + (i + 1) + '&img=image\\stop' + (parseInt(MultiKey, 10) + 1) + '1.png';
                TempStopMark.push(MAP.SingleMark({ title: ThisLine[1], X: ThisLine[3], Y: ThisLine[2], NO: (i + 1), Cursor: ThisLine[0] }, MarkImage));
            }
            MultiStopMark[MultiKey] = TempStopMark;
        }
    }
    TMS_AJAX(ThisAjax, { 'Type': 'GetStop', 'Lang': Lang, 'Data': Routeid + '_,' + Mode, 'BusType': BusType }, SucFun, function() { });
}

//CreateGroupTable
function CreateGroupTable(MainKey) {
    if (MultiStopMark[MainKey] == undefined || MultiStopMark[MainKey].length == 0)
        setTimeout('CreateGroupTable(' + MainKey + ');', 500);
    else {
        //CreateTable
        var Mark2Table = '<table  width="100%" border="0" cellpadding="0" cellspacing="0" class="table01"><thead>' +
                                            '<tr><th>站序</th><th>站牌名稱</th><th>站牌編號</th><th>預估到站</th></tr></thead>';
        for (var i = 0; i < MultiStopMark[MainKey].length; i++) {
            var ThisMark = MultiStopMark[MainKey][i];
            //Tr
            Mark2Table += '<tr align="center"><td>' + (i + 1) + '</td><td>' + ThisMark.getTitle() + '</td><td>' + ThisMark.getCursor() + '</td><td>載入中</td></tr>';

            google.maps.event.addListener(ThisMark, 'click', function() {
            var TargetStr = $('#StopTime').find('tr').eq(this.lmkId).find('td:eq(3)').html();
                MAP.OpenInfo(this, HtmlTable(this.lmkId - 1, this.getTitle(), this.getCursor(), TargetStr));
            });

            //LinkTable
            google.maps.event.addListener(ThisMark, 'mouseover', function() {
                $('#StopTime').find('tr').css('backgroundColor', '');
                $('#StopTime').find('tr').eq(this.lmkId).css('backgroundColor', '#F9D562');
            });
        }
        Mark2Table += '</table>';
        $('#StopTime').html(Mark2Table);
        $('#StopTime').find('tr:odd').addClass('odd');

        //TrClickMode
        $('#StopTime').find('tr:gt(0)').each(function(Index) {
            $(this).click(function() {
                var TargetTr = $(this).find('td');
                var StopName = TargetTr[1].innerHTML;
                var StopId = TargetTr[2].innerHTML;
                var Arrival = TargetTr[3].innerHTML;
                MAP.OpenInfo(MultiStopMark[MainKey][Index], HtmlTable(Index, StopName, StopId, Arrival));
            });
        });
        var ThisData = NowMode.split('.');
        GetArrivalTimeEvent(ThisData[0], ThisData[1], MainKey);
        LoadingPage(1);
    }
}
function ChangeRouteInfo(ThisType, ThisValue) {
    $('[name=BusMode]:eq(' + ThisType + ')').trigger('click');
    if (ThisType == 1)
        $('#GZRoute option[value=' + ThisValue + ']').attr("selected", true).trigger('change');
    else
        $('#Route option[value=' + ThisValue + ']').attr("selected", true).trigger('change');
}
