/*jshint esversion:6 */

const request = require('request-promise-native');
var mysql = require('promise-mysql');
var sql_config = require('../sql_config');
var db = mysql.createPool(sql_config.db);
const keys = require('../api_keys');
const util = require('./util');


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
            return estimateByWayPoints(rows, config.traffic_model);
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
            if (config.traffic_model) {
                result.time[config.traffic_model] = response;
            } else {
                result.time.best_guess = response;
            }

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
function estimateByWayPoints(points, traffic_model) {
    console.log('ding!!');
    var gMapGet = {
        uri: 'https://maps.googleapis.com/maps/api/directions/json',
        qs: {
            origin: `${points[0].latitude},${points[0].longitude}`,
            destination: `${points[points.length-1].latitude},${points[points.length-1].longitude}`,
            key: keys.gmap,
            //traffic_model: config.traffic_model,
            waypoints: '' //'Charlestown,MA|via:Lexington,MA'
        },
        headers: {
            'User-Agent': 'Request-Promise'
        },
        json: true // Automatically parses the JSON string in the response
    };

    if (traffic_model) {
        gMapGet.traffic_model = traffic_model;
    }

    for(var i=1; i<points.length-1; i++) {
        gMapGet.qs.waypoints += `via:${points[points.length-1].latitude},${points[points.length-1].longitude}|`;
    }
    gMapGet.qs.waypoints = gMapGet.qs.waypoints.substring(0, gMapGet.qs.waypoints.length-1); // remove ending '|'

    console.log('fire!!');
    console.log(JSON.stringify(gMapGet));
    return request(gMapGet)
        .then( (response) => {
            return response.routes[0].legs[0].duration.value;
        });
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

            var square = squareLocate(config.from, rows);
            console.log(`square=${JSON.stringify(square)}`);
            waypoints.push(config.from);
            console.log(`push [${JSON.stringify(config.from)}]`);
            waypoints.push(square.square[1]);
            console.log(`push [${JSON.stringify(square.square[1])}]`);

            var i;
            for (i=0; i<rows.length; i++) {
                if (rows[i].sn > square.square[1].sn) {
                    break;
                }
            }
            for (; rows[i].type !== 'stop'; i++) {
                waypoints.push(rows[i]);
                console.log(`push [${JSON.stringify(rows[i])}]`);
            }
            waypoints.push(rows[i]);
            console.log(`push [${JSON.stringify(rows[i])}]`);
            result.to = {
                sn: rows[i].sn,
                longitude: rows.longitude,
                latitude: rows[i].latitude
            };

            return waypoints;
        })
        .then( (points) => {
            return estimateByWayPoints(points, config.traffic_model);
        })
        .then( (response) => {
            if (config.traffic_model) {
                result.time[config.traffic_model] = response;
            } else {
                result.time.best_guess = response;
            }
            return result;
        });
}

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
