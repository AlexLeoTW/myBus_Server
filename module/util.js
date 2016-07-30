/*jshint esversion: 6 */

/*
    Time
*/
// time = {hour: 12, minute: 12, local: +8};
// TODO: rename -> toJsDate
function toTimestamp(time) {
    var timestamp = new Date();

    if (time.hour && !isNaN(time.hour)) {
        timestamp.setUTCHours(Number(time.hour));
    }

    if (time.minute && !isNaN(time.minute)) {
        timestamp.setUTCMinutes(Number(time.minute));
    }

    if (time.local && !isNaN(time.local)) {
        timestamp = new Date(timestamp.valueOf() - Number(time.local)*60*60*1000);   // 8*60*60*1000 (offset: -8 hr to match UTC)
    }

    return timestamp;
}

// convert JavaScript Date Object to SQL timestamp
// ex. '2016-07-06 14:30:00:+00:00'
// TODO: append onto prototype chain
function toSqlTimestamp(date) {
    if (date.getUTCFullYear) {
        return `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()} ${date.getUTCHours()}:${date.getUTCMinutes()}:${date.getUTCSeconds()}:+00:00`;
    } else {
        return '1970-01-01 00:00:00:+00:00';
    }

}



/*
    Geolocation
*/
const earthRadiusKm = 6371.009;

function distenceInKm (location1, location2)/*(lon1, lat1, lon2, lat2)*/ {
    if (Math.abs(location1.latitude -location2.latitude) > 5 ||
        Math.abs(location1.longitude - location2.longitude) > 5) {
        return Math.asin(
                Math.sin(location1.longitude)*Math.sin(location2.longitude) +
                Math.cos(location1.longitude)*Math.cos(location2.longitude) *
                Math.cos(location1.latitude-location2.latitude)
            ) * earthRadiusKm;
    } else {
        return 2*Math.asin(
                Math.sqrt(
                    Math.pow((location1.longitude-location2.longitude)/2, 2) +
                    Math.cos(location1.longitude)*Math.cos(location2.longitude) *
                    Math.pow((location1.latitude-location2.latitude), 2)
                )
            ) * earthRadiusKm;
    }
}



/*
    Data Escape
*/
function escapeBoolean(userInput) {
    if (isNaN(userInput)) {
        userInput = userInput.substring(0, 5);
        if (userInput.includes('true')) {
            return true;
        } else if (userInput.includes('false')) {
            return false;
        } else {
            return ull;
        }
    } else {
        userInput = Number(userInput);
        if (userInput === 1) {
            return true;
        } else if (userInput === 0) {
            return false;
        } else {
            return null;
        }
    }
}

module.exports.toTimestamp = toTimestamp;
module.exports.toSqlTimestamp = toSqlTimestamp;
module.exports.earthRadiusKm = earthRadiusKm;
module.exports.distenceInKm = distenceInKm;
module.exports.escapeBoolean = escapeBoolean;
