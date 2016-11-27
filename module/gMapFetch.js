/*jshint esversion:6 */

const request = require('request-promise-native');
var mysql = require('promise-mysql');
var sql_config = require('../sql_config');
var db = mysql.createPool(sql_config.db);
const keys = require('../api_keys');


/*
 * Google Maps Directions API
 *     config = {
 *         route: 160,
 *         is_reverse: true,
 *         from: 8,
 *         to: 7,
 *         [traffic_model: best_guess / pessimistic / optimistic]
 *     }
*/
function estimate(config) {
    return db.query('SELECT * FROM `Google_Matrix_Points` ' +
            `WHERE \`route\`=${config.route} AND \`is_reverse\`=${config.is_reverse} AND ` +
            '`sn` BETWEEN ' +
            `(SELECT \`sn\` FROM \`Google_Matrix_Points\`WHERE \`route\`=${config.route} AND \`is_reverse\`=${config.is_reverse} AND \`stop_sn\`=${config.from}) ` +
            `AND` +
            `(SELECT \`sn\` FROM \`Google_Matrix_Points\`WHERE \`route\`=${config.route} AND \`is_reverse\`=${config.is_reverse} AND \`stop_sn\`=${config.to}) ` +
            `ORDER BY \`sn\` ASC`)
        .then((rows) => {
            var gMapGet = {
                uri: 'https://maps.googleapis.com/maps/api/directions/json',
                qs: {
                    origin: `${rows[0].latitude}, ${rows[0].longitude}`,
                    destination: `${rows[rows.length-1].latitude}, ${rows[rows.length-1].longitude}`,
                    key: keys.gmap,
                    waypoints: '' //'Charlestown,MA|via:Lexington,MA'
                },
                headers: {
                    'User-Agent': 'Request-Promise'
                },
                json: true // Automatically parses the JSON string in the response
            };

            for(var i=1; i<rows.length-1; i++) {
                gMapGet.qs.waypoints += `via:${rows[rows.length-1].latitude},${rows[rows.length-1].longitude}|`;
            }
            gMapGet.qs.waypoints = gMapGet.qs.waypoints.substring(0, gMapGet.qs.waypoints.length-1);

            return request(gMapGet);
        })
        .then(function (repos) {
            return repos.routes[0].legs[0].duration;
        })
        .catch(function (err) {
            console.error(err);
        });
}

module.exports.estimate = estimate;
