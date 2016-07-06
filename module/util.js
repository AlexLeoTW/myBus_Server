/*jshint esversion: 6 */

/*
    time = {hour: 12, minute: 12, local: +8};
*/
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

module.exports.toTimestamp = toTimestamp;
module.exports.earthRadiusKm = earthRadiusKm;
module.exports.distenceInKm = distenceInKm;
