'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

exports.default = function (opts) {
    var onRowCountChanged = new Slick.Event(),
        onRowsChanged = new Slick.Event(),
        itemsSource = opts.itemsSource,
        itemsCount = opts.itemsCount,
        itemsCountSub,
        itemsSourceSub,
        items = {};

    if (!opts.groupItemMetadataProvider) {
        opts.groupItemMetadataProvider = new Slick.Data.GroupItemMetadataProvider();
    }

    function getLength() {
        if (isObservable(itemsCount)) {
            return itemsCount();
        }

        return itemsSource().length;
    }

    function getItems() {
        return items;
    }

    function getItem(index) {
        var item = items[index];

        if (item && item.__group) {
            // Format the title for the item.
            var collapseExpandButton = "<input class='toggle-group collapse' type='button'></input>";
            item.title = collapseExpandButton + ' ' + item.groupingCol + ': ' + item.value + ' (' + item.count + ' items)';
        }

        return item;
    }

    function getItemMetadata(index) {
        var item = items[index];

        if (item === undefined) {
            return null;
        }

        // overrides for grouping rows
        if (item.__group) {
            return opts.groupItemMetadataProvider.getGroupRowMetadata(item);
        }

        if (item.__groupTotals) {
            return opts.groupItemMetadataProvider.getTotalsRowMetadata(item);
        }

        return item ? item.metadata : null;
    }

    function subscribeToItemsCount() {
        var oldCount = 0;

        if (isObservable(itemsCount)) {
            itemsCount.subscribe(function (newCount) {
                onRowCountChanged.notify({ previous: oldCount, current: newCount }, null, null);
                oldCount = newCount;
            });
        } else {
            itemsCountSub = computed({
                read: function read() {
                    var newItems = itemsSource() || [],
                        newCount = newItems.length;

                    if (newCount !== oldCount) {
                        onRowCountChanged.notify({ previous: oldCount, current: newCount }, null, null);
                        oldCount = newCount;
                    }
                }
            });
        }
    }

    function subscribeToItemsSource() {
        itemsSourceSub = computed({
            read: function read() {
                var newItems = itemsSource() || [],
                    rows = new Array();
                var oldItems = items;

                items = {}; // Clear items lookup table.

                newItems.forEach(function (item, index) {
                    var oldItem = oldItems[item.index];
                    var isNew = oldItem == null || Object.keys(item).some(function (key) {
                        return item[key] !== oldItem[key];
                    });

                    if (isNew) rows.push(item.index);
                    items[item.index] = item;
                });

                if (rows.length > 0) {
                    onRowsChanged.notify({ rows: rows }, null, null);
                }
            }
        });
    }

    function refresh(newItemsSource) {
        itemsSource = newItemsSource;
        if (itemsCountSub) itemsCountSub.dispose();
        if (itemsSourceSub) itemsSourceSub.dispose();
        subscribe();
    }

    function subscribe() {
        subscribeToItemsSource();
        subscribeToItemsCount();
    }

    if (!isObservable(opts.itemsSource)) {
        throw new Error('`itemsSource` must be an observableArray.');
    }

    return {
        // data provider interface
        getLength: getLength,
        getItem: getItem,
        getItemMetadata: getItemMetadata,
        getItems: getItems,
        // additional funcitonality
        subscribe: subscribe,
        refresh: refresh,
        // events
        onRowCountChanged: onRowCountChanged,
        onRowsChanged: onRowsChanged
    };
};

var _coreFunctions = require('./coreFunctions');

var _knockout = require('knockout');

var _knockout2 = _interopRequireDefault(_knockout);

require('./slick.groupitemmetadataprovider');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var gridTemplate = '<!-- Numeric Filter Popup -->\r\n<div id="number_filter_template">\r\n    <div data-bind="css: { iconArrowLeft: !flipped(), iconArrowRight: flipped }"></div>\r\n    <div class="numberFilter">\r\n        <div>\r\n            <span> Quick Search:</span>\r\n            <input data-bind="value: quickSearch, valueUpdate: \'afterkeydown\'"/>\r\n        </div>\r\n        <br/>\r\n\r\n        <div><strong style="text-decoration: underline">or</strong> show rows where..</div>\r\n        <div class="numberFilterBox">\r\n            <div style="display: none">\r\n                <input type="checkbox" data-bind="checked: notEmpty"/>\r\n                <span>Are Not Empty</span>\r\n            </div>\r\n            <div>\r\n                <select data-bind="value: comparisonA">\r\n                    <option value="EqualTo">Is Equal To</option>\r\n                    <option value="LessThan">Is Less Than</option>\r\n                    <option value="NotEqualTo">Is Not Equal To</option>\r\n                    <option value="GreaterThan">Is Greater Than</option>\r\n                </select>\r\n            </div>\r\n            <input type="text" data-bind="value: valueA, valueUpdate: \'afterkeydown\'"/>\r\n\r\n            <div>\r\n                <input type="radio" name="filterLogic" value="or" data-bind="checked: radioFilterValue" />\r\n                <label>or</label>\r\n                <input type="radio" name="filterLogic" value="and" data-bind="checked: radioFilterValue" />\r\n                <label>and</label>\r\n            </div>\r\n\r\n            <div>\r\n                <select data-bind="value: comparisonB">\r\n                    <option value="EqualTo">Is Equal To</option>\r\n                    <option value="LessThan">Is Less Than</option>\r\n                    <option value="NotEqualTo">Is Not Equal To</option>\r\n                    <option value="GreaterThan">Is Greater Than</option>\r\n                </select>\r\n            </div>\r\n            <input type="text" data-bind="value: valueB, valueUpdate: \'afterkeydown\'"/>\r\n        </div>\r\n    </div>\r\n</div>\r\n\r\n<!-- Sting Filter Popup without Checkbox selection -->\r\n<div id="string_nocheckbox_filter_template">\r\n    <div data-bind="css: { iconArrowLeft: !flipped(), iconArrowRight: flipped }"></div>\r\n    <div class="numberFilter">\r\n        <div>\r\n            <span> Quick Search:</span>\r\n            <input data-bind="value: quickSearch, valueUpdate: \'afterkeydown\'"/>\r\n        </div>\r\n        <br/>\r\n\r\n        <div><strong style="text-decoration: underline">or</strong> show rows where..\r\n        </div>\r\n        <div class="numberFilterBox">\r\n            <div style="display: none">\r\n                <input type="checkbox" data-bind="checked: notEmpty"/>\r\n                <span>Are Not Empty</span>\r\n            </div>\r\n            <div>\r\n                <select data-bind="value: comparisonA">\r\n                    <option value="EqualToString">Is Equal To</option>\r\n                    <!--<option value="NotEqualToString">Is Not Equal To</option>--> <!--AWAITING TUDOR IMPLEMENTATION-->\r\n                    <option value="Contains">Contains</option>\r\n                    <!--<option value="NotContains">Does Not Contain</option>--> <!--AWAITING TUDOR IMPLEMENTATION-->\r\n                    <option value="StartsWith">Starts With</option>\r\n                    <option value="EndsWith">Ends With</option>\r\n                </select>\r\n            </div>\r\n            <input type="text" data-bind="value: valueA, valueUpdate: \'afterkeydown\'"/>\r\n\r\n            <div>\r\n                <input type="radio" name="filterLogic" value="or" data-bind="checked: radioFilterValue"/>\r\n                <label>or</label>\r\n                <input type="radio" name="filterLogic" value="and" data-bind="checked: radioFilterValue"/>\r\n                <label>and</label>\r\n            </div>\r\n\r\n            <div>\r\n                <select data-bind="value: comparisonB">\r\n                    <option value="EqualToString">Is Equal To</option>\r\n                    <!--<option value="NotEqualToString">Is Not Equal To</option>--> <!--AWAITING TUDOR IMPLEMENTATION-->\r\n                    <option value="Contains">Contains</option>\r\n                    <!--<option value="NotContains">Does Not Contain</option>--> <!--AWAITING TUDOR IMPLEMENTATION-->\r\n                    <option value="StartsWith">Starts With</option>\r\n                    <option value="EndsWith">Ends With</option>\r\n                </select>\r\n            </div>\r\n            <input type="text" data-bind="value: valueB, valueUpdate: \'afterkeydown\'"/>\r\n        </div>\r\n    </div>\r\n</div>\r\n\r\n<!-- String Filter Popup with virtualized Checkbox selection -->\r\n<div id="string_filter_template">\r\n    <div data-bind="css: { iconArrowLeft: !flipped(), iconArrowRight: flipped }"></div>\r\n    <div class="numberFilter">\r\n        <div>\r\n            <span> Quick Search:</span>\r\n            <input data-bind="value: quickSearch, valueUpdate: \'afterkeydown\'" />\r\n        </div>\r\n\r\n        <div class="listFilterBox" style="padding: 5px 2px 10px 5px; overflow-y: hidden; white-space: nowrap;">\r\n            <div data-bind="visible: loading" style="width: 219px; top: 35px; left: 14px; height: 210px; background: black url(\'images/spin-circle.gif\') no-repeat scroll center; opacity: .4; position: absolute;"></div>\r\n            <div data-bind="virtualCheckboxList: listValues"></div>\r\n        </div>\r\n\r\n        <div><strong style="text-decoration: underline">or</strong> show rows where..</div>\r\n        \r\n        <div class="numberFilterBox">\r\n            <div style="display: none">\r\n                <input type="checkbox" data-bind="checked: notEmpty" />\r\n                <span>Are Not Empty</span>\r\n            </div>\r\n            <div>\r\n                <select data-bind="value: comparisonA">\r\n                    <option value="EqualToString">Is Equal To</option>\r\n                    <!--<option value="NotEqualToString">Is Not Equal To</option>--> <!--AWAITING TUDOR IMPLEMENTATION-->\r\n                    <option value="Contains">Contains</option>\r\n                    <!--<option value="NotContains">Does Not Contain</option>--> <!--AWAITING TUDOR IMPLEMENTATION-->\r\n                    <option value="StartsWith">Starts With</option>\r\n                    <option value="EndsWith">Ends With</option>\r\n                </select>\r\n            </div>\r\n            <input type="text" data-bind="value: valueA, valueUpdate: \'afterkeydown\'" />\r\n\r\n            <div>\r\n                <input type="radio" name="filterLogic" value="or" data-bind="checked: radioFilterValue" />\r\n                <label>or</label>\r\n                <input type="radio" name="filterLogic" value="and" data-bind="checked: radioFilterValue" />\r\n                <label>and</label>\r\n            </div>\r\n\r\n            <div>\r\n                <select data-bind="value: comparisonB">\r\n                    <option value="EqualToString">Is Equal To</option>\r\n                    <!--<option value="NotEqualToString">Is Not Equal To</option>--> <!--AWAITING TUDOR IMPLEMENTATION-->\r\n                    <option value="Contains">Contains</option>\r\n                    <!--<option value="NotContains">Does Not Contain</option>--> <!--AWAITING TUDOR IMPLEMENTATION-->\r\n                    <option value="StartsWith">Starts With</option>\r\n                    <option value="EndsWith">Ends With</option>\r\n                </select>\r\n            </div>\r\n            <input type="text" data-bind="value: valueB, valueUpdate: \'afterkeydown\'" />\r\n        </div>\r\n    </div>\r\n</div>';
//import { registerTemplates } from 'scalejs.mvvm';

var isObservable = _knockout2.default.isObservable,
    computed = _knockout2.default.computed;

//Register the HTML templates for grid slick
//registerTemplates(gridTemplate);

;