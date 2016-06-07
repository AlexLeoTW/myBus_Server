
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

module.exports.toTimestamp = toTimestamp;
