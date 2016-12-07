'use strict';

var _knockout = require('knockout');

var _knockout2 = _interopRequireDefault(_knockout);

var _jquery = require('jquery');

var _jquery2 = _interopRequireDefault(_jquery);

var _coreFunctions = require('./utils/coreFunctions');

var _observableDataView = require('./utils/observableDataView');

var _observableDataView2 = _interopRequireDefault(_observableDataView);

var _changesFlasher = require('./utils/changesFlasher');

var _changesFlasher2 = _interopRequireDefault(_changesFlasher);

var _defaultSorting = require('./utils/defaultSorting');

var _defaultSorting2 = _interopRequireDefault(_defaultSorting);

var _observableSorting = require('./utils/observableSorting');

var _observableSorting2 = _interopRequireDefault(_observableSorting);

var _defaultFilters = require('./utils/defaultFilters');

var _defaultFilters2 = _interopRequireDefault(_defaultFilters);

var _observableFilters = require('./utils/observableFilters');

var _observableFilters2 = _interopRequireDefault(_observableFilters);

require('./utils/jqueryEventDragWrapper.js');

require('./utils/slick.core.js');

require('./utils/slick.grid.js');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var isObservable = _knockout2.default.isObservable,
    isObservableArray = function isObservableArray(ob) {
    return isObservable(ob) && ob.indexOf;
},
    observable = _knockout2.default.observable,
    observableArray = _knockout2.default.observableArray,
    computed = _knockout2.default.computed;

function init(element, valueAccessor, allBindingsAccessor) {
    var options = allBindingsAccessor().slickGridWrapper;
    var columns = _knockout2.default.unwrap(options.columns);
    var internalItemsSource,
        dataView,
        grid,
        plugins = [];

    function setupFilters(itemsSource) {
        var filterableColumns = columns.filter(function (c) {
            return c.filter;
        }),
            filteredItemsSource;

        // if there are no filterable columns, no need to set up filters
        if (filterableColumns.length === 0) return itemsSource;

        // if any filter doesnt have a value, we need to make it
        if (filterableColumns.some(function (c) {
            return !c.filter.value;
        })) {
            filteredItemsSource = (0, _defaultFilters2.default)(options.columns, itemsSource);
        } else {
            filteredItemsSource = itemsSource;
        }

        // add the filters to the plugins to be initialized later
        plugins.push((0, _observableFilters2.default)());

        return filteredItemsSource;
    }

    function setupSorting(itemsSource) {
        var sorting = options.sorting,
            sortableColumns = columns.filter(function (c) {
            return c.sortable;
        }),
            sortedItemsSource;

        // if sorting is undefined, we dont need to set up sorting
        if (sorting === undefined) return itemsSource;

        // if custom sort is enabled, we don't need to make our own sortedItemsSource
        if (options.customSort) {
            sortedItemsSource = itemsSource;
        } else {
            sorting = isObservable(options.sorting) ? options.sorting : observable();
            sortedItemsSource = (0, _defaultSorting2.default)(sorting, sortableColumns, itemsSource);
        }

        // add the sorting to the plugins to be initialized later
        plugins.push((0, _observableSorting2.default)(sorting));

        return sortedItemsSource;
    }

    function setupIndex(itemsSource) {
        var indexedItemsSource;

        // if virtual scrolling is not enabled, set the items' index
        if (!options.itemsCount) {
            indexedItemsSource = _knockout2.default.computed(function () {
                return itemsSource().map(function (item, index) {
                    item.index = index;
                    return item;
                });
            });
        } else {
            indexedItemsSource = itemsSource;
        }

        return indexedItemsSource;
    }

    // when default filtering/sorting/vitualization is enabled, we need to create our own items source
    function createInternalItemsSource() {
        internalItemsSource = options.itemsSource;
        internalItemsSource = setupSorting(internalItemsSource);
        internalItemsSource = setupFilters(internalItemsSource);
        internalItemsSource = setupIndex(internalItemsSource);
    }

    function createDataView() {
        //dataView = new Slick.Data.DataView({ inlineFilters: true });

        dataView = (0, _observableDataView2.default)((0, _coreFunctions.merge)(options, { itemsSource: internalItemsSource }));

        dataView.onRowCountChanged.subscribe(function (e, args) {
            grid.updateRowCount();
            grid.render();
        });

        dataView.onRowsChanged.subscribe(function (e, args) {
            var range, invalidated;

            range = grid.getRenderedRange();

            invalidated = args.rows.filter(function (r, i) {
                return r >= range.top && r <= range.bottom;
            });

            if (invalidated.length > 0) {
                grid.invalidateRows(invalidated);
                grid.render();
                // fix for when the rows change therefore the selected row change
                //therefore the selected item changes
                if (isObservableArray(options.selectedItem)) {
                    setTimeout(function () {
                        if (grid.getSelectedRows().length > 0 && options.selectedItem()[0]) {
                            if (options.key) {
                                var newItem = grid.getDataItem(grid.getSelectedRows()[0]) || {},
                                    selectedItem = options.selectedItem()[0] || {};
                                var isNew = options.key.some(function (k) {
                                    return newItem[k] !== selectedItem[k];
                                });
                                if (!isNew) return;
                            }
                            grid.resetActiveCell();
                            grid.getSelectionModel().setSelectedRows([]);
                        }
                    }, 100);
                }
            }
        });
        /*jslint unparam: false*/
    }

    function createColumnPicker() {
        console.log("CP");
        var curWnd = windowfactory.Window.getCurrent();
        grid.columnPickerWindow = windowfactory.Window({
            _isPopup: true,
            debug: "virtualSelectioModel columnPicker Menu",
            autoShow: false,
            resizable: false,
            maxHeight: 300,
            showTaskbarIcon: false,
            alwaysOnTop: true,
            parent: curWnd,
            hideOnClose: true,
            _showOnParentShow: false,
            _alwaysAboveParent: true,
            cornerRounding: {
                "width": 0,
                "height": 0
            },
            _closeOnLostFocus: true
        });

        grid.columnPickerWindow.onReady(function () {
            new Slick.Controls.ColumnPicker(grid, options);
        });
    }

    function createGrid() {
        options.explicitInitialization = true;

        var viscols = columns.filter(function (c) {
            return c.isHidden == null || !c.isHidden;
        });

        grid = new Slick.Grid(element, dataView, viscols, options);

        (0, _jquery2.default)(element).data('slickgrid', grid);

        if (!options.disableColumnPicker) createColumnPicker();

        for (evt in options.events) {
            (function (evt, func) {
                grid[evt].subscribe(function () {
                    func.apply(this, arguments);
                });
            })(evt, options.events[evt]);
        }

        if (options.selectionModel !== undefined) {
            grid.setSelectionModel(options.selectionModel);
        } else {
            grid.setSelectionModel(new Slick.RowSelectionModel());
        }

        plugins.forEach(function (p) {
            p.init(grid);
        });

        if (options.registerPlugins != null) options.registerPlugins.forEach(function (p) {
            grid.registerPlugin(p);
        });

        //If columns collection is KO wire for changes so the grid can be updated
        if (isObservable(options.columns)) {
            var onUserColumns = function onUserColumns() {
                columns = _knockout2.default.unwrap(options.columns);
                var viscols = columns.filter(function (c) {
                    return c.isHidden == null || !c.isHidden;
                });
                grid.setColumns(viscols);

                //manually trigger the reordered event
                grid.onColumnsReordered.notify({ grid: grid }, new Slick.EventData(), grid);
            };

            options.columns.subscribe(onUserColumns);
        }

        if (options.plugins && options.plugins.changesFlasher) {
            (0, _changesFlasher2.default)(grid, options.plugins.changesFlasher);
        }

        grid.init();
    }

    function subscribeToDataView() {
        dataView.subscribe();
    }

    function subscribeToSelection() {
        if (isObservableArray(options.selectedItem)) {
            /*jslint unparam:true*/
            grid.getSelectionModel().onSelectedRangesChanged.subscribe(function (ranges) {
                var items = [];

                grid.getSelectedRows().forEach(function (row) {
                    items.push(grid.getDataItem(row));
                });

                options.selectedItem(items);
            });
            /*jslint unparam:false*/
        } else if (isObservable(options.selectedItem)) {
            /*jslint unparam:true*/
            grid.getSelectionModel().onSelectedRangesChanged.subscribe(function (ranges) {
                var rows, item;

                rows = grid.getSelectedRows();
                item = grid.getDataItem(rows[0]);

                options.selectedItem(item);
            });
            /*jslint unparam:false*/
        }
    }

    function subscribeToViewport() {
        var top;
        if (isObservable(options.viewport)) {
            grid.onViewportChanged.subscribe(function () {
                var vp = grid.getViewport();
                options.viewport(vp);
            });

            options.viewport.subscribe(function (vp) {
                // stop stack overflow due to unknown issue with slickgrid
                if (vp.top > top + 2 || vp.top < top - 2) {
                    grid.scrollRowIntoView(vp.top);
                    top = vp.top;
                }
            });
        }
    }

    function subscribeToWindowResize() {
        window.addEventListener("resize", function () {
            if (grid != undefined) {
                grid.resizeCanvas(); //grid resizes number of rows to fit in the container
                grid.onViewportChanged.notify({ grid: grid }, new Slick.EventData(), grid); //use slick grid's event to notify the viewport has changed
            } else {
                console.warn("calling onResize but grid is not defined");
            }
        });
    }

    createInternalItemsSource();
    createDataView();
    createGrid();

    subscribeToDataView();
    subscribeToSelection();
    subscribeToViewport();
    subscribeToWindowResize();

    return { controlsDescendantBindings: true };
}

_knockout2.default.bindingHandlers.slickGridWrapper = {
    init: init
};