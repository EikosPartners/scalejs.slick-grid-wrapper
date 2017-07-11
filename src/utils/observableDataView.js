import gridTemplate from '../html/scalejs.grid-slick-0.2.2.15.html';
import { has } from './coreFunctions';
import ko from 'knockout';
//import { registerTemplates } from 'scalejs.mvvm';
import './slick.groupitemmetadataprovider';
  
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
        let item = items[index];

        if (item && item.__group) {
            // Format the title for the item.
            let toggleClass = item.collapsed ? 'expand' : 'collapse';
            let collapseExpandButton = `<input class='toggle-group ${toggleClass}' id="group-${item.value}" type='button'></input>`
            item.title = `${collapseExpandButton} ${item.groupingCol}: ${item.value} (${item.count} items)`;
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
            read: function read() {
                var newItems = itemsSource() || [],
                    rows = new Array();
                var oldItems = items;

                items = {}; // Clear items lookup table.

                newItems.forEach(function (item, index) {
                    const oldItem = oldItems[item.index];
                    const isNew = oldItem == null || Object.keys(item).some((key) => {
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

