'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = observableFilters;

var _jquery = require('jquery');

var _jquery2 = _interopRequireDefault(_jquery);

var _knockout = require('knockout');

var _knockout2 = _interopRequireDefault(_knockout);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var observable = _knockout2.default.observable;

function setupFilter(fieldFilter, column, postFilterCallback) {
    var inputFilter = observable(""),
        quickOp = fieldFilter.quickFilterOp || "StartsWith";

    function sendExpression(filterValue) {
        var expression = [{ op: quickOp, values: [filterValue], isQuickSearch: true }];
        fieldFilter.value(expression);

        //repaint grid after value of column's filter object has been updated with filter expression
        if (postFilterCallback != null) postFilterCallback();
    }

    inputFilter.subscribe(sendExpression);

    return {
        bindings: {
            value: inputFilter
        }
    };
}

/*jslint unparam: true*/
function observableFilters() {
    function init(grid) {
        grid.onHeaderRowCellRendered.subscribe(function (e, args) {
            var $node = (0, _jquery2.default)(args.node),
                node = $node[0],
                fieldFilter = args.column.filter,
                filterHtml = '<input type="text" data-bind="value: value, valueUpdate: \'afterkeydown\'"/>';

            if (fieldFilter) {
                //See if the filter has been setup yet
                if (!fieldFilter.state) {
                    //Will need to repaint the grid after filter is applied due to throttling
                    var sm = args.grid.getSelectionModel();
                    if (sm != null) var callback = sm.repaintGrid;

                    //Setup the filter extension
                    fieldFilter.state = setupFilter(fieldFilter, args.column, callback);
                }

                //Setup the dom elements
                $node.html(filterHtml);
                _knockout2.default.applyBindings(fieldFilter.state.bindings, node);
            }
        });
    }

    function destroy() {}

    return {
        init: init,
        destroy: destroy
    };
};