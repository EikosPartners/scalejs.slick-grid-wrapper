'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = changesFlasher;

var _coreFunctions = require('./coreFunctions');

var _linq = require('./linq.wrapper');

function changesFlasher(grid, opts) {
    //var diff;
    var oldItems = {};

    opts = (0, _coreFunctions.merge)({
        speed: 1000,
        key: 'id'
    }, opts);

    opts.fields = (0, _coreFunctions.has)(opts.fields) ? opts.fields : grid.getColumns().map(function (c) {
        return c.field;
    });

    function keySelector(item) {
        if (typeof opts.key === 'string') {
            return item[opts.key];
        }
        var key = opts.key.map(function (k) {
            return item[k];
        }).join('_');
        return key;
    }

    function cacheData() {
        var item, i;

        for (i = 0; i < grid.getDataLength(); i += 1) {
            item = grid.getDataItem(i);
            if ((0, _coreFunctions.has)(item)) {
                oldItems[keySelector(item)] = item;
            }
        }
    }

    grid.getData().onRowsChanged.subscribe(function (e, args) {
        var rows = args.rows,
            timestamp = new Date().getTime().toString(),
            cssKeyChanged = 'flash_chaged_' + timestamp,
            cssKeyChanges = 'flash_changes_' + timestamp,
            stylesChanged = (0, _coreFunctions.clone)((0, _coreFunctions.has)(grid.getCellCssStyles(cssKeyChanged)) || {}),
            stylesChanges = (0, _coreFunctions.clone)((0, _coreFunctions.has)(grid.getCellCssStyles(cssKeyChanges)) || {});

        rows.forEach(function (row) {
            var newItem, oldItem, d, cssChanged, cssChanges;

            newItem = grid.getDataItem(row);
            if (!(0, _coreFunctions.has)(newItem)) {
                return;
            }

            oldItem = oldItems[keySelector(newItem)];

            if (!(0, _coreFunctions.has)(oldItem)) {
                return;
            }

            if ((0, _coreFunctions.has)(oldItem) && oldItem !== newItem) {
                d = (0, _linq.diff)(oldItem, newItem, opts.fields);
                //console.timeEnd('diff');
                cssChanged = {};
                cssChanges = {};

                Object.keys(d).forEach(function (dp) {
                    var oldValue = d[dp][0],
                        newValue = d[dp][1];
                    if (newValue > oldValue) {
                        cssChanges[dp] = 'slick-cell-changed-up';
                        cssChanged[dp] = 'slick-cell-changed';
                    }
                    if (newValue < oldValue) {
                        cssChanges[dp] = 'slick-cell-changed-down';
                        cssChanged[dp] = 'slick-cell-changed';
                    }
                });

                stylesChanged[row] = cssChanged;
                stylesChanges[row] = cssChanges;
            }
        });

        grid.setCellCssStyles(cssKeyChanged, stylesChanged);
        grid.setCellCssStyles(cssKeyChanges, stylesChanges);

        cacheData();

        setTimeout(function () {
            grid.removeCellCssStyles(cssKeyChanges);
        }, 100);

        setTimeout(function () {
            grid.removeCellCssStyles(cssKeyChanged);
        }, opts.speed);
    });
};