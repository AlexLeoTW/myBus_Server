/*jshint esversion:6 */

const mongoose = require('mongoose');
const mongoose_config = require('../../../mongoose_config');
mongoose.Promise = global.Promise;

// // fall- back
// mongoose.connect('mongodb://mongoose_config.user:mongoose_config.password@192.168.1.30/mongoose_config.database');
// var db = mongoose.connection;

var opts = { server: { auto_reconnect: false }, user: mongoose_config.user, pass: mongoose_config.password };
db = mongoose.createConnection(mongoose_config.host, mongoose_config.database, mongoose_config.port, opts);
// var opts = { server: { auto_reconnect: false }, user: 'username', pass: 'mypassword' }
// db = mongoose.createConnection('localhost', 'database', port, opts)
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    console.log("connected");
});

var kittySchema = new mongoose.Schema({
    name: { type: String, required: true, index: { unique: true }, trim: true }
});

kittySchema.methods.meow = function () {
      var greeting = this.name ?
          "Meow name is " + this.name :
          "I don't have a name";
      console.log(greeting);
    };

var Kitten = db.model('Kitten', kittySchema);

module.exports.Kitten = Kitten;
