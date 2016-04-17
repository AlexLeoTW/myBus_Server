function sendRoutelist(res, connection) {
    connection.query('SELECT * FROM route', function (err, rows) {
        if (err) { throw err; }
        res.send(JSON.stringify(rows));
    });
}

function sendBusInfo(res, plate_no, connection) {
    connection.query('SELECT * FROM bus WHERE plate_no ==' + plate_no, function(err, rows) {
        res.send();
    });
    connection.release();
}


/*
    raw
        plate_no, longitude, latitude, timestamp

    data_cache
        plate_no, seg_location, seg_time

    time
        plate_no, route, stop, elapseTime

    route
        no, name, from, to

    stop
        no, route, name
*/
