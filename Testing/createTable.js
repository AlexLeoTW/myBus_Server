var mysql = require('mysql');
var connection = mysql.createConnection({
    host: '192.168.122.154',
    user: 'myBus',
    password: 'lUR9Np@T4i6#',
    database: 'myBus'
});

connection.connect();

connection.query('CREATE TABLE `raw` ( `plate_no` VARCHAR(7) NOT NULL , `longitude` FLOAT NOT NULL , `latitude` FLOAT NOT NULL , `timestamp` TIMESTAMP NOT NULL ) ENGINE = InnoDB;', function (err, raws) {
    if (err) {
        throw(err);
    }
    console.log('success');
});

connection.end();
