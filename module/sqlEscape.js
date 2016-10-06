/*jslint esversion: 6, node: true */

var mysql = require('promise-mysql');

/*
    escapeParam(requestBody, name, condition[, name, condition])

    ex. escapeParam('uuid', {length: 8}, 'password', null)

    options:
        - length: fixed or {max: maxLength, min: maxLength}
        - optional: true || false
        - type: boolean, number
*/
function escapeParam(requestBody) {

    for (var i=1; i < arguments.length; i+=2) {

        // check if 'condition' is provided
        if (arguments[i+1] === undefined || arguments[i+1] === null) {
            requestBody[arguments[i]] = mysql.escape(requestBody[arguments[i]]);
            continue;
        }

        // check if 'optional' set
        if (requestBody[arguments[i]] === undefined && arguments[i+1].optional !== true) {
            throw new Error(`missing ${arguments[i]}`);
        }

        // check if 'length' set
        if (arguments[i+1].length !== undefined) {
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

        // check if 'type' set
        if (typeof arguments[i+1].type !== undefined) {
            switch (arguments[i+1].type) {
                case 'boolean':
                    var newBool = escapeBoolean(requestBody[arguments[i]]);
                    if (newBool === null) {
                        return new Error(`${arguments[i]} should be a boolean, not ${requestBody[arguments[i]]}`);
                    } else {
                        requestBody[arguments[i]] = newBool;
                        continue;               // boolean type doesn't support other option
                    }
                    break;
                case 'number':
                    if (isNaN(requestBody[arguments[i]])) {
                        return new Error(`${arguments[i]} should be a number, not ${requestBody[arguments[i]]}`);
                    }
                    continue;               // boolean type doesn't support further option, and not suppose to be convert into string
                //default 'string'
            }
        }

        requestBody[arguments[i]] = mysql.escape(requestBody[arguments[i]]);
    }
}

function escapeBoolean(userInput) {
    if (isNaN(userInput)) {
        if (userInput === 'true') {
            return true;
        } else if (userInput === 'false') {
            return false;
        } else {
            return null;
        }
    } else {
        userInput = Number(userInput);
        if (userInput === 1) {
            return true;
        } else if (userInput === 0) {
            return false;
        } else {
            return null;
        }
    }
}

module.exports.escapeParam = escapeParam;
module.exports.escapeBoolean = escapeBoolean;
