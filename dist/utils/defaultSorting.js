'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

exports.default = function (sorting, sortableColumns, itemsSource) {
    var sortedItemsSource, defaultSort, sortBy;

    function lower(x) {
        if (typeof x === "string") {
            return x.toLowerCase();
        }
        return x;
    }

    function comparer(on) {
        return function (x) {
            return (0, _coreFunctions.has)(x, on) ? lower(x[on]) : -Number.MAX_VALUE;
        };
    }

    function sortItems(items, args) {
        var ordered;

        if (!args || args.length === 0) {
            return items;
        }

        function thenBy(source, a) {
            return a.sortAsc ? source.thenBy(comparer(a.column)) : source.thenByDescending(comparer(a.column));
        }

        function orderBy(source, a) {
            return a.sortAsc ? source.orderBy(comparer(a.column)) : source.orderByDescending(comparer(a.column));
        }

        ordered = orderBy(items, args[0]);
        ordered = args.skip(1).aggregate(ordered, thenBy);

        items = ordered.toArray();

        return items;
    }

    sortedItemsSource = _knockout2.default.computed(function () {
        if (sorting() === undefined) return itemsSource();
        var sortCols = Object.keys(sorting()).map(function (id) {
            return {
                column: id,
                sortAsc: sorting()[id]
            };
        });
        orderedItems = sortItems(itemsSource(), sortCols);
        return orderedItems;
    });

    return sortedItemsSource;
};

var _coreFunctions = require('./coreFunctions');

var _knockout = require('knockout');

var _knockout2 = _interopRequireDefault(_knockout);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }