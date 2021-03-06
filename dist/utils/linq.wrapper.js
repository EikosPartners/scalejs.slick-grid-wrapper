'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.diff = undefined;

var _linq = require('linq');

var _linq2 = _interopRequireDefault(_linq);

var _coreFunctions = require('./coreFunctions');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_linq2.default.Utils.extendTo(Array);

function diff(first, second, fields) {
    var ps1,
        ps2,
        inserts,
        updates,
        deletes,
        d = {};

    if (!(0, _coreFunctions.is)(first, 'object') || !(0, _coreFunctions.is)(second, 'object')) {
        return first !== second ? [first, second] : undefined;
    }

    ps1 = Object.keys(first);
    ps2 = Object.keys(second);

    if (fields) {
        ps1 = ps1.intersect(fields).toArray();
        ps2 = ps2.intersect(fields).toArray();
    }

    inserts = ps2.except(ps1);
    updates = ps2.intersect(ps1).where(function (p) {
        return second[p] !== first[p];
    });
    deletes = ps1.except(ps2);

    inserts.forEach(function (p) {
        d[p] = [undefined, second[p]];
    });
    deletes.forEach(function (p) {
        d[p] = [first[p], undefined];
    });
    updates.forEach(function (p) {
        var u = diff(first[p], second[p]);
        if (u) {
            d[p] = u;
        }
    });

    return d === {} ? undefined : d;
}

exports.diff = diff;