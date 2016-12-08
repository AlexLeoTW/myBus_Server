/*jshint esversion:6 */

const request = require('request-promise-native');
var mysql = require('promise-mysql');
var sql_config = require('../sql_config');
var db = mysql.createPool(sql_config.db);
const keys = require('../api_keys');
const util = require('./util');
const validTrafficModels = ['optimistic', 'best_guess', 'pessimistic'];


/*
 * Google Maps Directions API
 *     config = {
 *         route: 160,
 *         isReverse: true,
 *         from: 8,
 *         to: 7,
 *         [traffic_model: best_guess / pessimistic / optimistic]
 *     }
*/
function estimate(config) {
    return db.query('SELECT * FROM `Google_Matrix_Points` ' +
            `WHERE \`route\`=${config.route} AND \`is_reverse\`=${config.isReverse} AND ` +
            '`sn` BETWEEN ' +
            `(SELECT \`sn\` FROM \`Google_Matrix_Points\`WHERE \`route\`=${config.route} AND \`is_reverse\`=${config.isReverse} AND \`stop_sn\`=${config.from_sn}) ` +
            `AND` +
            `(SELECT \`sn\` FROM \`Google_Matrix_Points\`WHERE \`route\`=${config.route} AND \`is_reverse\`=${config.isReverse} AND \`stop_sn\`=${config.to_sn}) ` +
            `ORDER BY \`sn\` ASC`)
        .then( (rows) => {
            if (typeof config.traffic_model === 'string') {
                return estimateByWayPoints(rows, [config.traffic_model]);
            } else if (config.traffic_model && config.traffic_model.length > 0) {
                return estimateByWayPoints(rows, config.traffic_model);
            } else {
                return estimateByWayPoints(rows);
            }
        })
        .then(function (response) {
            var result = {
                route: config.route,
                isReverse: config.isReverse,
                from_sn: config.from_sn,
                to_sn: config.to_sn,
                time: {
                    // best_guess: Number,
                    // pessimistic: Number
                }
            };
            result.time = response;

            return result;
        })
        .catch(function (err) {
            console.error(err);
        });
}

// var points = [
//     {longitude: 120.683912, latitude: 24.136519},
//     {longitude: 120.683912, latitude: 24.136519},
// ];
function estimateByWayPoints(points, trafficModelList) {
    var gMapGet = {
        origin: `${points[0].latitude},${points[0].longitude}`,
        destination: `${points[points.length-1].latitude},${points[points.length-1].longitude}`,
        key: keys.gmap,
        waypoints: '' //'Charlestown,MA|via:Lexington,MA'
    };

    for(var i=1; i<points.length-1; i++) {
        gMapGet.waypoints += `via:${points[points.length-1].latitude},${points[points.length-1].longitude}|`;
    }
    gMapGet.waypoints = gMapGet.waypoints.substring(0, gMapGet.waypoints.length-1); // remove ending '|'

    return gMapGetAll(gMapGet, trafficModelList);
}

// var gMapGet = {
//     uri: 'https://maps.googleapis.com/maps/api/directions/json',
//     qs: {
//         origin: '24.18638,120.64434',
//         destination: '24.1850625,120.6419152',
//         waypoints: '' //'Charlestown,MA|via:Lexington,MA'
//     },
//     headers: {
//         'User-Agent': 'Request-Promise'
//     },
//     json: true // Automatically parses the JSON string in the response
// };
// var trafficModelList = ['optimistic', 'best_guess', 'pessimistic'];
function gMapGetAll(gMapGet, trafficModelList, result) {
    if (!result) {                                              // Initial

        // Overwrite default settings with user provided values
        var get = {
            uri: 'https://maps.googleapis.com/maps/api/directions/json',
            qs: {
                // origin: '24.18638,120.64434',
                // destination: '24.1850625,120.6419152',
                // waypoints: 'Charlestown,MA|via:Lexington,MA',
                key: keys.gmap,
                departure_time: 'now'
            },
            headers: {
                'User-Agent': 'Request-Promise'
            },
            json: true // Automatically parses the JSON string in the response
        };
        for (var key in gMapGet) {
            if (gMapGet.hasOwnProperty(key)) {
                get.qs[key] = gMapGet[key];
            }
        }

        if(!trafficModelList) {
            trafficModelList = validTrafficModels.slice(0);
        }

        result = {
            optimistic: 0,
            best_guess: 0,
            pessimistic: 0
        };

        return gMapGetAll(get, validTrafficModels.slice(0), result);

    } else if (trafficModelList.length <= 0) {                  // END
        return result;
    } else {                                                    // Loop
        var traffic_model = trafficModelList.pop();
        gMapGet.qs.traffic_model = traffic_model;
        return request(gMapGet)
            .then( (response) => {
                if (response.status === 'NOT_FOUND') {
                    console.error('ERROR when estimateByWayPoints(), no route were found');
                    return gMapGetAll({}, [], result);
                } else {
                    result[traffic_model] = response.routes[0].legs[0].duration.value;
                    return gMapGetAll(gMapGet, trafficModelList, result);
                }
            });
    }
}


// config = {
//     route: 160,
//     isReverse: false,
//     from: {
//         longitude: 120.683912,
//         latitude: 24.136519
//     },
//     [traffic_model: best_guess* / pessimistic / optimistic]
// }
function estimateFromLocation(config) {
    var result = {
        route: config.route,
        isReverse: config.isReverse,
        from: config.from,
        //to: config.to_sn,
        time: {
            // best_guess: Number,
            // pessimistic: Number
        }
    };

    return db.query(`SELECT * FROM \`Google_Matrix_Points\` WHERE \`route\` = ${config.route} AND \`is_reverse\` = ${config.isReverse} ` +
                `ORDER BY ABS(\`longitude\`-${config.from.longitude}) ASC LIMIT 25 ;`)
        .then( (rows) => {
            // sort by `sn` ASC
            return rows.sort(function(a, b) {
                return a.sn - b.sn;
            });
        })
        .then( (rows) => {
            // from location to nextStop
            var waypoints = [];
            var i;

            var square = squareLocate(config.from, rows);
            waypoints.push(config.from);
            // console.log(`push [${JSON.stringify(config.from)}]`);
            waypoints.push(square.square[1]);
            // console.log(`push [${JSON.stringify(square.square[1])}]`);

            if (waypoints[1].type === 'waypoint') {
                for (i=0; i<rows.length; i++) {
                    if (rows[i].sn > square.square[1].sn) {
                        break;
                    }
                }
                for (; rows[i].type !== 'stop'; i++) {
                    waypoints.push(rows[i]);
                    // console.log(`push [${JSON.stringify(rows[i])}]`);
                }
                waypoints.push(rows[i]);
                // console.log(`push [${JSON.stringify(rows[i])}]`);
            }

            result.to = {
                sn: waypoints[waypoints.length-1].stop_sn,
                longitude: waypoints[waypoints.length-1].longitude,
                latitude: waypoints[waypoints.length-1].latitude
            };

            return waypoints;
        })
        .then( (points) => {
            if (typeof config.traffic_model === 'string') {
                return estimateByWayPoints(points, [config.traffic_model]);
            } else if (config.traffic_model && config.traffic_model.length > 0) {
                return estimateByWayPoints(points, config.traffic_model);
            } else {
                return estimateByWayPoints(points);
            }
        })
        .then( (response) => {
            result.time = response;
            return result;
        });
}

// Validate traffic_model
// https://developers.google.com/maps/documentation/distance-matrix/intro?hl=zh-tw#traffic-model
function TrafficModel (traffic_model) {
    this.traffic_model = traffic_model;
}
TrafficModel.prototype.isValid = function () {
    for (var i = 0; i < validTrafficModels.length; i++) {
        if (this.traffic_model === validTrafficModels[i]){
            return true;
        }
    }
    return false;
};
TrafficModel.prototype.toString = function () {
    return this.traffic_model;
};


// TODO: move / merge squareLocate with 'fetch_taichung'
function squareLocate(coordinate, busStops, extraRange) {
    var closestPoint = null;
    var closestDistenceToSquare = 300000;
    var square = [];

    for (var i=0; i<busStops.length-1; i++) {
        closestPoint = closestPointInSquare(coordinate, [busStops[i], busStops[i+1]]);
        // console.log(`closestPoint: ${JSON.stringify(closestPoint)}`);
        var currentDistence = util.distenceInKm(coordinate, closestPoint);

        if (currentDistence < closestDistenceToSquare) {
            // console.log(`distence = ${currentDistence}`);
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
        // console.log(`dimension: ${dimension}`);
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

module.exports.estimate = estimate;
module.exports.estimateByWayPoints = estimateByWayPoints;
module.exports.estimateFromLocation = estimateFromLocation;
module.exports.gMapGetAll = gMapGetAll;
