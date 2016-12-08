/*jshint esversion:6 */

const gmap = require('./gMapFetch');
const MatrixTime = require('./schema/MatrixTimeSchema').MatrixTime;


// restrive travel time estimation from Google Directions
// options = {
//     route: Number || String,
//     isReverse: Boolean,
//     from_sn: Number,
//     to_sn: Number
// };
function getMatrixEstimation (options/*: Object*/, result) { // exports
    if ((options.to_sn - options.from_sn) * (options.isReverse ? -1 : 1) < 0) {
        throw new Error(`from ${options.from_sn} to ${options.to_sn} is not ${options.isReverse?'reverse':'foward'}`);
    }

    if (!options || options.from_sn === options.to_sn) {    // END
        return result;
    } else if (!result) {                                   // Initial
        result = {
            route: options.route,
            isReverse: options.isReverse,
            from_sn: options.from_sn,
            to_sn: options.to_sn,
            time: {
                optimistic: 0,
                best_guess: 0,
                pessimistic: 0
            }
            //lastUpdate: new Date() // will be overwrite on by earlier record later.
        };
        return getMatrixEstimation(options, result);
    } else {                                                // Loop
        return setmentTimeCache({
            route: options.route,
            isReverse: options.isReverse,
            from_sn: options.from_sn,
            to_sn: options.from_sn + (options.isReverse?-1:1)
        })
            .then( (cache) => {
                result.time.optimistic += cache.time.optimistic;
                result.time.best_guess += cache.time.best_guess;
                result.time.pessimistic += cache.time.pessimistic;
            })
            .then( () => {
                options.from_sn += (options.isReverse?-1:1);
                return getMatrixEstimation(options, result);
            });
    }
}

// restrive or add to cache
// options = {
//     route: Number || String,
//     isReverse: Boolean,
//     from_sn: Number,
//     to_sn: Number
// };
function setmentTimeCache (options/*: Object*/) {
    if (Math.abs(options.from_sn - options.to_sn) !== 1) {
        throw new Error(`${options.from_sn} to ${options.to_sn} is not allowed`);
    }

    return MatrixTime.findOne({
        route: options.route,
        is_reverse: options.isReverse,
        from_sn: options.from_sn,
        to_sn: options.to_sn,
    }).exec()
    .then( (data) => {
        if (data) {
            return data;
        } else {
            return cacheAndReturn(options);
        }
    });
}

// restrive best_guess and pessimistic time, save, and retrun
function cacheAndReturn (options) {
    var data;/* = {
        route: options.route,
        is_reverse: options.isReverse,
        from_sn: options.from_sn,
        to_sn: options.to_sn,
        time: {
            best_guess: 0,
            pessimistic: 0
        }
    };*/

    return gmap.estimate({
        route: options.route,
        isReverse: options.isReverse,
        from_sn: options.from_sn,
        to_sn: options.to_sn,
    })
    .then( (gmap) => {
        data = gmap;
        // isReverse --rename--> is_reverse
        data.is_reverse = data.isReverse;
        delete data.isReverse;

        return (new MatrixTime(data)).save();
    })
    .then( () => {
        return MatrixTime.findOne({
            route: options.route,
            is_reverse: options.isReverse,
            from_sn: options.from_sn,
            to_sn: options.to_sn,
        });
    })
    .then( (data) => {
        // is_reverse --rename--> isReverse
        data.isReverse = data.is_reverse;
        delete data.is_reverse;
        return data;
    });
}

module.exports.getMatrixEstimation = getMatrixEstimation;
