/*jshint esversion:6 */
var Kitten = require('./schema/kittySchema').Kitten;

var fluffy = new Kitten({ name: 'fluffy' });

fluffy.save(function (err, fluffy) {
    if (err) return console.error(err);
    console.log(`Save OK [${fluffy.name}]`);
});

Kitten.findOne({ name: 'fluffy' }).exec()
    .then((data) => {
        console.log(JSON.stringify(data));
        console.log(data);
        data.meow();
    })
    .catch((err) => {
        console.error(err);
    });
