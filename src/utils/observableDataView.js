import gridTemplate from './scalejs.grid-slick-0.2.2.15.html';
import { has } from './coreFunctions';
import ko from 'knockout';
//import { registerTemplates } from 'scalejs.mvvm';
  
var isObservable = ko.isObservable,
    computed = ko.computed;


//Register the HTML templates for grid slick
//registerTemplates(gridTemplate);

export default function (opts) {
    var onRowCountChanged = new Slick.Event(),
        onRowsChanged = new Slick.Event(),
        itemsSource = opts.itemsSource,
        itemsCount = opts.itemsCount,
        itemsCountSub,
        itemsSourceSub,
        items = {};

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
        return items ? items[index] : null;
    }

    function getItemMetadata(index) {
        var item = items[index];
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
                read: function () {
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
            read: function () {
                var newItems = itemsSource() || [],
                    rows = new Array(newItems.length);

                items = {}; // Clear items lookup table.

                newItems.forEach(function (item, index) {
                    items[item.index] = item;
                    rows[index] = item.index;
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

