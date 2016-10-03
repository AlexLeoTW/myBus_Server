/*jslint esversion: 6, node: true */

var mysql = require('promise-mysql');

/*
    escapeParam(requestBody, name, condition[, name, condition])

    ex. escapeParam('uuid', {length: 8}, 'password', null)

    options:
        - length: fixed or {max: maxLength, min: maxLength}
        -
*/
function escapeParam(requestBody) {
    for (var i=1; i < arguments.length; i+=2) {
        if (arguments[i+1] !== null && arguments[i+1].length !== undefined) {
            var argLength = requestBody[arguments[i]].toString().length;
            var lengthLimit = arguments[i+1].length;

            if (lengthLimit.max !== undefined && argLength > lengthLimit.max) {
                throw new Error(`${requestBody[arguments[i]]} exceed max length limit, ` +
                                `should be ${lengthLimit.max} ~ ${lengthLimit.min ? lengthLimit.min : 0}`);
            } else if (lengthLimit.min !== undefined && argLength > lengthLimit.min) {
                throw new Error(`${requestBody[arguments[i]]} is too short, ` +
                                `should be ${lengthLimit.max} ~ ${lengthLimit.min ? lengthLimit.min : 0}`);
            } else if (argLength !== lengthLimit) {
                throw new Error(`${requestBody[arguments[i]]} is too ${requestBody[arguments[i]].toString().length > arguments[i+1].length ? 'long' : 'short'},` +
                                `should be ${arguments[i+1].length} characters long`);
            }
        }

        requestBody[arguments[i]] = mysql.escape(requestBody[arguments[i]]);
    }
}

module.exports.escapeParam = escapeParam;
