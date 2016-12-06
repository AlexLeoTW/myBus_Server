/*jshint esversion:6 */

const mongoose = require('mongoose');
const mongoose_config = require('../../mongoose_config');
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

var timeSchema = mongoose.Schema({
    route: { type: String, required: true},
    is_reverse: { type: Boolean, required: true},
    from_sn: { type: Number, required: true},
    to_sn: { type: Number, required: true},
    time: {
        best_guess: Number,
        pessimistic: Number
    },
    lastUpdate: { type: Date, default: Date.now }
}, {
    // documents will be expired in ONE hour
    createdAt: { type: Date, expires: 3600, default: Date.now }
});

var MatrixTime = db.model('MatrixTime', timeSchema);

module.exports.MatrixTime = MatrixTime;
