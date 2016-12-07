/*jshint esversion:6 */

const mongoose = require('mongoose');
const mongoose_config = require('../../mongoose_config');
const util = require('../util');
mongoose.Promise = global.Promise;

var opts = {
    server: { auto_reconnect: false },
    user: mongoose_config.user,
    pass: mongoose_config.password
};
db = mongoose.createConnection(
    mongoose_config.host,
    mongoose_config.database,
    mongoose_config.port,
    opts
);

var arrivalSchema = mongoose.Schema({
    plate_no: { type: String, required: true, unique: true},
    route: { type: Number, required: true},
    is_reverse: {type: Boolean, required: true},
    arrival: [
        {sn: Number, time: Date}
    ],
    lastUpdate: { type: Date, default: Date.now }
}, {
    // documents will be expired in 30 min.
    createdAt: { type: Date, expires: 1800, default: Date.now }
});

// bus = {stopSn: 6}
arrivalSchema.methods.getArrival = function (bus) {
    if (!this.arrival) {
        this.arrival = [];
    }

    for (var i=0; i<this.arrival.length && i<bus.stopSn; i++) {
        if (this.arrival[i].sn == bus.stopSn) {
            return this.arrival[i];
        }
    }
    return null;
};

// bus = {stopSn: 6, second: 100}
arrivalSchema.methods.setArrival = function (bus) {
    if (!this.arrival) {
        this.arrival = [];
    }

    // if found, edit
    for (var i=0; i<this.arrival.length && i<bus.stopSn; i++) {
        if (this.arrival[i].sn == bus.stopSn) {
            this.arrival[i].time = new Date(Date.now() + 1000*bus.second);
        }
    }

    //if not found, add
    this.arrival.push({
        sn: bus.stopSn,
        time: new Date(Date.now() + 1000*bus.second)
    });
    this.arrival.sort(function (a, b) {
        return a.sn - b.sn;
    });
};

var BusArrival = db.model('BusArrival', arrivalSchema);

module.exports.BusArrival = BusArrival;
