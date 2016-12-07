'use strict';
'use strict;';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = observableSorting;

var _knockout = require('knockout');

var _knockout2 = _interopRequireDefault(_knockout);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function observableSorting(sorting) {
    function init(grid) {

        // on grid sort, update sorting fields in the columns
        grid.onSort.subscribe(function (e, args) {
            var sort = args.multiColumnSort ? args.sortCols : [args];

            sort = sort.reduce(function (sortObj, arg) {
                sortObj[arg.sortCol.field] = arg.sortAsc;
                return sortObj;
            }, {});

            sorting(sort);
        });

        // when sorting changes, set the sort columns on the grid
        _knockout2.default.computed(function () {
            if (sorting() === undefined) return;

            var fieldToId = grid.getColumns().reduce(function (table, column) {
                table[column.field] = column.id;
                return table;
            }, {});

            var sortCols = Object.keys(sorting()).map(function (field) {
                return {
                    columnId: fieldToId[field],
                    sortAsc: sorting()[field]
                };
            });

            grid.setSortColumns(sortCols);
        });
    }

    function destroy() {}

    return {
        init: init,
        destroy: destroy
    };
};