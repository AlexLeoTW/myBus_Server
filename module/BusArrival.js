/*jshint esversion:6 */

const gmap = require('./gMapFetch');
const MatrixTime = require('./MatrixTime');
const BusArrival = require('./schema/BusArrivalSchema').BusArrival;
var mysql = require('promise-mysql');
var sql_config = require('../sql_config');
var db = mysql.createPool(sql_config.db);
var debug = require('debug')('myBus:gMap');
const avgPassengerSwapTime = 2.384987893;

function updateArrivalMongo() {     // <-- exports
    // ORDER BY `nextStop`
    return db.query('SELECT * FROM `Bus_status` WHERE `route` = 5 OR `route` = 160 ORDER BY `is_reverse`,`nextStop` ASC ')
        .then( (busList) => {
            // sort by reservationList layer stack (low to high)
            var foward = [];
            var reverse = [];
            var slicePoint = 0;

            // divide 'busList' into 'foward' and 'reverse' two arrays
            for (var i=0; i<busList.length; i++) {
                if (busList[i].is_reverse) {
                    slicePoint = i;
                    break;
                }
            }
            foward = busList.slice(0, slicePoint+1);
            reverse = busList.slice(slicePoint+1);

            foward.reverse();
            busList = foward.concat(reverse);

            return busList;
        })
        .then(updateArrivalPerBus);
}

// Control Recursive Promise Call
function updateArrivalPerBus(busList) {
    if (!busList || busList.length === 0) {    // END
        return;
    } else {
        var bus = busList.pop();
        return db.query(`SELECT * FROM \`Reservation_List\` WHERE \`route\` = ${bus.route} AND \`is_reverse\` = ${bus.is_reverse}`)
        .then( (reservationList) => {
            return buildDataObj(bus, reservationList);
        })
        .then( (busData) => {
            debug(`Cacheing [${busData.plate_no}]`);
            return BusArrival.cache(busData);
        })
        .then( (obj) => {
            updateArrivalPerBus(busList);
        });
    }
}

// var bus = {
//     plate_number: '123-AB',
//     route: 160,
//     longitude: 120.6839,
//     latitude: 24.1365,
//     is_reverse: false
// };
function buildDataObj(bus, reservationList) {
    // {
    //     plate_no: { type: String, required: true, unique: true},
    //     route: { type: Number, required: true},
    //     is_reverse: {type: Boolean, required: true},
    //     arrival: [
            // {sn: Number, time: {
            //     optimistic: Date,
            //     best_guess: Date,
            //     pessimistic: Date
            // }}
    //     ],
    //     lastUpdate: { type: Date, default: Date.now }
    // }
    var busData = {
        plate_no: bus.plate_number,
        route: bus.route,
        is_reverse: bus.is_reverse,
        arrival: []
    };
    var nextStopOffset = {
        // optimistic: 0,
        // best_guess: 0,
        // pessimistic: 0
    };

    return gmap.estimateFromLocation({
        route: bus.route,
        isReverse: bus.is_reverse,
        from: {
            longitude: bus.longitude,
            latitude: bus.latitude
        },
    })
    .then( (nextStop) => {
        // console.log(`nextStop.time = ${JSON.stringify(nextStop.time)}`);
        busData.arrival.push({
            sn: nextStop.to.sn,
            time: {
                optimistic: new Date(Date.now() + nextStop.time.optimistic*1000),
                best_guess: new Date(Date.now() + nextStop.time.best_guess*1000),
                pessimistic: new Date(Date.now() + nextStop.time.pessimistic*1000)
            }
        });
        nextStopOffset = nextStop.time;
    })
    .then( () => {
        // how many bus stops is there
        return db.query(`SELECT COUNT(*) AS total FROM \`Google_Matrix_Points\` WHERE \`route\` = ${bus.route} AND \`is_reverse\` = ${bus.is_reverse} AND \`type\` = 'stop'`);
    })
    .then( (result) => {
        // console.log(`getMatrixEstimationList(fromSn: ${busData.arrival[0].sn}, toSn: ${bus.is_reverse?1:result[0].total}, isReverse: ${bus.is_reverse?'true':'false'})`);
        return getMatrixEstimationList({
            route: bus.route,
            isReverse: bus.is_reverse,
            fromSn: busData.arrival[0].sn,
            toSn: bus.is_reverse?1:result[0].total,
            'offset': nextStopOffset
        });
    })
    .then( (estimationList) => {
        if (bus.is_reverse) {
            busData.arrival = estimationList.concat(busData.arrival);
        } else {
            busData.arrival = busData.arrival.concat(estimationList);
        }
    })
    .then( () => {
        // caculate influence caused by passengers getting on and off the bus
        var i, j, arrayKey, traffic_model;
        for (i = 0; reservationList && i < reservationList.length; i++) {
            var reservation = reservationList[i];

            // un-onboarded passenger found
            if (reservationList[i].onboard && reservationList[i].from_sn > busData.arrival[0].sn) {
                arrayKey = undefined;
                // set arrayKey as passenger from_sn location
                for (j = 0; j < busData.arrival.length; j++) {
                    if (busData.arrival[j].sn === reservationList[i].from_sn) {
                        arrayKey = j;
                        break;
                    }
                }
                // add passenger caused time to each traffic_model in (prediction)time
                for (traffic_model in busData.arrival[arrayKey].time) {
                    if (busData.arrival[arrayKey].time.hasOwnProperty(traffic_model)) {
                        busData.arrival[arrayKey].time[traffic_model] = new Date(busData.arrival[arrayKey].time[traffic_model].valueOf() + avgPassengerSwapTime*1000);
                    }
                }
            } else if (reservationList[i].onboard === bus.plate_number) {
                arrayKey = undefined;
                // set arrayKey as passenger to_sn location
                for (j = 0; j < busData.arrival.length; j++) {
                    if (busData.arrival[j].sn === reservationList[i].to_sn) {
                        arrayKey = j;
                        break;
                    }
                }
                // add passenger caused time to each traffic_model in (prediction)time
                for (traffic_model in busData.arrival[arrayKey].time) {
                    if (busData.arrival[arrayKey].time.hasOwnProperty(traffic_model)) {
                        busData.arrival[arrayKey].time[traffic_model] = new Date(busData.arrival[arrayKey].time[traffic_model].valueOf() + avgPassengerSwapTime*1000);
                    }
                }
            }
        }
    })
    .then( () => {
        return busData;
    });

}

// var options = {
//     route: 160,
//     isReverse: false,
//     fromSn: 6,
//     toSn: 9,
//     offset: {
//         best_guess: 100,
//         pessimistic: 105
//     }
// };
function getMatrixEstimationList(options, result) {
    if (result === undefined) {                                  // Initial
        result = [];
        return getMatrixEstimationList(options, result);
    } else if (options.fromSn === options.toSn) {   // END
        result.sort(function (a, b) {
            return a.sn - b.sn;
        });
        return result;
    } else {                                        // Loop
        // console.log(`MatrixTime.getMatrixEstimation(from_sn: ${options.fromSn}, to_sn: ${options.toSn}, isReverse: ${options.isReverse})`);
        return MatrixTime.getMatrixEstimation({
            route: options.route,
            isReverse: options.isReverse,
            from_sn: options.fromSn,
            to_sn: options.toSn
        })
            .then( (data) => {
                result.push({
                    sn: data.to_sn,
                    time: {
                        optimistic: new Date(Date.now() + (data.time.optimistic + options.offset.optimistic)*1000),
                        best_guess: new Date(Date.now() + (data.time.best_guess + options.offset.best_guess)*1000),
                        pessimistic: new Date(Date.now() + (data.time.pessimistic + options.offset.pessimistic)*1000)
                    }
                });
            })
            .then( () => {
                options.toSn += options.isReverse?1:-1;
                return getMatrixEstimationList(options, result);
            });
    }
}

// -----------------------------------------------------------------------------

// options = {
//         route: 160,
//         isReverse: false
// };
function arrivalList(options) {
    var cityBusArrival,
        busList;

    return db.query(`SELECT * FROM \`Bus_arrival\` WHERE \`route\` = ${options.route} AND \`is_reverse\` = ${options.isReverse} `)
    .then((result) => {
        cityBusArrival = result;

        return BusArrival.find({
            route: options.route,
            is_reverse: options.isReverse
        }).exec();
    })
    .then( (result) => {
        busList = result;
    })
    //return Promise.all(aa, bb)
    .then((values) => {
        var overwriteMap = [];

        // var cityBusArrival = values[0],
        //     busList = values[1];
        for (var i=0; i<busList.length; i++) {

            for(var j=0; j<busList[i].arrival.length; j++) {
                var nowSn = busList[i].arrival[j].sn;
                var nowTime = busList[i].arrival[j].time.best_guess;

                if (!overwriteMap[nowSn-1] || nowTime < cityBusArrival[nowSn-1].prediction) {
                    cityBusArrival[nowSn-1].prediction = nowTime;
                    overwriteMap[nowSn-1] = true;
                    // console.log(`cityBusArrival[${nowSn}].prediction = ${nowTime}`);
                }
            }
        }
        return cityBusArrival;
    });
}

module.exports.updateArrivalMongo = updateArrivalMongo;
module.exports.buildDataObj = buildDataObj;
module.exports.arrivalList = arrivalList;
