import { has } from './coreFunctions';
import $ from 'jquery';
import ko from 'knockout';

//import windowfactory
    
    /// <param name="ko" value="window.ko" />

var   observable = ko.observable,
      computed = ko.computed,
      observableArray = ko.observableArray,
      unwrap = ko.utils.unwrapObservable;

//Setup the filter popup based on the field filter settings coming from the main grid/column
// fieldFilter: column filter object, column: grid column object, postFilterCallback: called after filter is sent (which is throttled)
function setupFilter(fieldFilter, column, postFilterCallback) {
    var internalFilter = observable([]),  //created local filter observable so it can be initialize it before grid is initialized.
        templateName,
        templateHasOptions,
        throttleSpeed = 1,  //Zeroed at clients request but use 1 ms for performance on the select all button
        quickFilter = observable(""), //Filter box on the main grid
        sendExpressionTrigger = observable(),
        sendExpressionThrottled,
        quickSearch = observable(),   //Filter box at the top of the popup
        quickOp = fieldFilter.quickFilterOp || "StartsWith",
        valueFields,
        valueComputed,
        notEmpty = observable(false),
        loading = observable(true),
        fieldListItems = fieldFilter.values,
        selectableListItems = observableArray([]),
        filterOn,
        filterCountText,
        flipped = observable(false),
        subscription = {},
        bindings,
        $filter,
        $popup,
        isShowing = observable(false);

    //*** KO BINDINGS FOR POPUP FORM ***

    //Set the proper templateName
    switch (fieldFilter.type) {
        case "string":
            templateName = "string_filter_template";
            templateHasOptions = true;
            break;
        case "string_short":
            templateName = "string_nocheckbox_filter_template";
            templateHasOptions = false;
            break;
        default:
            templateName = "number_filter_template";
            templateHasOptions = false;
    }

    //Value fields text and logic
    valueFields = {
        a: observable(),
        valA: observable(),
        b: observable(),
        valB: observable(),
        logicOperator: observable('or')
    };

    //we only want to send the expression if it is a new expression, therefore, we check equality based on the stringified expression
    internalFilter.equalityComparer = function(oldValue, newValue) {
        return JSON.stringify(oldValue) === JSON.stringify(newValue);
    };

    //Indicates if a internalFilter is active
    filterOn = computed(function () {
        return internalFilter().length > 0;
    });

    //Number of filters applied
    filterCountText = computed(function () {
        var count = internalFilter().reduce(function (acc, filterObj) {
            return acc + filterObj.values.length;
        }, 0);

        return (filterOn() ? count : "");
    });

    //Callback for when an item is checked or unchecked by the UI
    function itemChanged(itemvalue, isChecked) {
        //Since KO arrays will not notify for changes to items listen for it rather the using heavy observables
        calculateQuickFilter(true);
        sendExpressionTrigger.valueHasMutated();
    }

    //Provide the ViewModel 
    bindings = {
        comparisonA: valueFields.a,
        comparisonB: valueFields.b,
        valueA: valueFields.valA,
        valueB: valueFields.valB,
        radioFilterValue: valueFields.logicOperator,
        quickSearch: quickSearch,
        listValues: fieldListItems,
        listData: selectableListItems,
        onItemChanged: itemChanged,
        popupTemplate: templateName,
        value: quickFilter,
        filterOn: filterOn,
        filterCountText: filterCountText,
        flipped: flipped,
        notEmpty: notEmpty,
        loading: loading
    };

    //*** SUBSCRIPTION HANDLERS - PRIMARY LOGIC FOR FILTER PARTS INTERACTION ***

    //Update from fieldFilter.quickSearch from the parent grid:
    function setIncomingQuickSearch(parentQuickSearch, surpressSettingQuickFilter) {

        // Unsubscribe from listeners
        subscription.quickSearch.dispose();

        // Update quickFilter and quickSearch:
        if (!parentQuickSearch || !parentQuickSearch.values || !parentQuickSearch.values.length) {
            quickSearch("");
            if (!surpressSettingQuickFilter)
                quickFilter("");
        } else {
            quickSearch(parentQuickSearch.values[0]);
            if (!surpressSettingQuickFilter)
                quickFilter(parentQuickSearch.values[0]);
        }

        // Subscribe onQuickSearch to external observable again:
        subscription.quickSearch = quickSearch.subscribe(onQuickSearch);
    }
    subscription.fieldQuickSearch = fieldFilter.quickSearch.subscribe(setIncomingQuickSearch);

    //Update from fieldFilter value array from the parent grid:
    function setIncomingFilter(parentFilter) {
        // Unsubscribe from value to avoid calling setIncomingFilter:
        subscription.internalFilter.dispose();
        subscription.valueComputed.dispose();

        var value = [],
            comps = fieldFilter.type.substr(0, 6) === "string" ? ["EqualToString", "NotEqualToString", "Contains", "NotContains", "StartsWith", "EndsWith"] : ["EqualTo", "LessThan", "NotEqualTo", "GreaterThan"],
            val;

        if (parentFilter != null)
            value = ko.isObservable(parentFilter) ? parentFilter() : parentFilter;

        // Set NotEmpty to false if not in list:
        if (value.indexOf("NotEmpty") === -1) {
            notEmpty(false);
        }

        valueFields.a(comps[0]);
        valueFields.valA(undefined);
        valueFields.b(comps[0]);
        valueFields.valB(undefined);

        var filterInNotUsed = true;
        
        //See if there is a quickSearch which needs to be processed first - null is a valid value
        var qsfilter = value.firstOrDefault(function(val) { return val.isQuickSearch; }, null);
        setIncomingQuickSearch(qsfilter, qsfilter != null && value.length > 1);

        value.forEach(function (filter, index) {
            if (filter.isQuickSearch) {
                //Already handled above

            } else if (filter.op === "In") {
                filterInNotUsed = false;
                quickSearch(filter.quickSearch);

                //Prepopulate list for first load
                filter.values.forEach(function(val) {
                    selectableListItems.push(createCheckboxOption(val, true));
                });

                //Add dummy for first load to treat filter as not all checked; need for restoring checked items W/O quickSearch/quickFilter
                selectableListItems.push(createCheckboxOption("", false));

            } else if (filter.op === "NotEmpty") {
                // Apply notEmpty:
                notEmpty(true);

            } else {
                if (index === 0) {
                    valueFields.a(filter.op);
                    valueFields.valA(filter.values[0]);
                } else {
                    valueFields.b(filter.op);
                    valueFields.valB(filter.values[0]);
                    if (filter.logicOperator != null)
                        valueFields.logicOperator(filter.logicOperator);
                }
            }
        });

        if (filterInNotUsed) {
            for (var i = 0; i < selectableListItems().length; i += 1)
                selectableListItems()[i].selected = true;
            }

        // Push filters to
        internalFilter(value);

        // Subscribe updateFilters to external observable again:
        subscription.valueComputed = valueComputed.subscribe(onValueComputed);
        subscription.internalFilter = internalFilter.subscribe(onInternalFilter);

        //Wire the throttled here now that the filter is ready
        if (sendExpressionThrottled == null)
            sendExpressionThrottled = computed(function () {
                sendExpressionTrigger();
                quickSearch();
                valueComputed();
                sendExpression();
            });

        //Chaining seems to cause problems is disposed is called
        sendExpressionThrottled.extend({ throttle: throttleSpeed });

    }
    subscription.fieldValue = fieldFilter.value.subscribe(setIncomingFilter);

    //Listen to QuickSearch to send to the parent grid quickSearch binding.
    function onQuickSearch(filterText) {
        //Temporarily disable updates from the parent quick search text and send in the updated text
        subscription.fieldQuickSearch.dispose();

        fieldFilter.quickSearch(has(filterText)
            ? { op: quickOp, values: [filterText] }
            : undefined
        );

        calculateQuickFilter(true);
        subscription.fieldQuickSearch = fieldFilter.quickSearch.subscribe(setIncomingQuickSearch);
    }
    subscription.quickSearch = quickSearch.subscribe(onQuickSearch);

    //Listen to internalFilter to send it to the parent grid column
    function onInternalFilter(updatedFilter) {
        //Temporarily disable updates from the parent filter and send the updated filter in
        subscription.fieldValue.dispose();

        fieldFilter.value(updatedFilter);

        if (postFilterCallback != null)
            postFilterCallback();

        subscription.fieldValue = fieldFilter.value.subscribe(setIncomingFilter);
    }
    subscription.internalFilter = internalFilter.subscribe(onInternalFilter);

    //Listen for changes to the parent grid column filter text to clear filtering and update local quickSearch
    function onQuickFilter(filterText) {
        if (!isShowing()) {
            clearValuesFilter();
            selectableListItems.removeAll();
            quickSearch(filterText);
        }
    }
    subscription.quickFilter = quickFilter.subscribe(onQuickFilter);

    //Populate the list of checkboxes - this is wired when the popup is shown so it only run when open
    function onListItems(newItems) {
        //item selection persists when the list items are changed
        var items,
            checkedValues = [],
            quickfilter = "";

        //see if there are either in or quick filters
        var internal = internalFilter();
        if (internal.length > 0) {
            var filter = internal.firstOrDefault(function (f) { return f.op === "In"; });
            if (filter != null)
                checkedValues = filter.values;

            filter = internal.firstOrDefault(function (f) { return f.op === "StartsWith" && f.tag == null; });
            if (filter != null)
                quickfilter = filter.values[0];
        }
        
        if (checkedValues.length > 0) {
            //There are checked items
            items = newItems.map(function(item) {
                return createCheckboxOption(item, checkedValues.indexOf(item.toString()) > -1);
            });
        } else if (quickfilter != "") {
            //There is a quick filter applied so selected matching checkboxes
            var qflower = quickfilter.toLowerCase();
            items = newItems.map(function (item) {
                return createCheckboxOption(item, item.toString().toLowerCase().lastIndexOf(qflower, 0) === 0);
            });
        } else {
            //Default options
            items = newItems.groupJoin(selectableListItems(), "$.toString()", "$.value", function (o, i) {
                return i.elementAtOrDefault(0, createCheckboxOption(o));
            }).toArray();
        }

        //Clear and add all items
        selectableListItems(items);
        calculateQuickFilter(true);
    }
    
    //Listen to Value field changes to update quickFilter
    valueComputed = computed(function() {
        valueFields.a();
        valueFields.b();
        valueFields.logicOperator();
        valueFields.valA();
        valueFields.valB();
        return this;
    });
    function onValueComputed() {
        calculateQuickFilter();
    }
    subscription.valueComputed = valueComputed.subscribe(onValueComputed);

    //*** LOWER-LEVEL FILTER FUNCTIONS ***

    //Send the compiled filter to the server via internalFilter based on quickSearch, selectedItems and/or value wildcards
    function sendExpression() {
        var expression = [];

        //Get any value filter(s) and needed join logic
        if (valueFields.valA() != null && valueFields.valA() !== "")
            expression.push({
                op: valueFields.a(),
                values: [valueFields.valA()],
                tag: "valA"
            });

        if (valueFields.valB() != null && valueFields.valB() !== "")
            expression.push({
                op: valueFields.b(),
                values: [valueFields.valB()],
                tag: "valB"
            });

        var isValFilter = expression.length > 0;

        //Include the logic operator if there are more then one value filters - attached to both for convenience
        if (expression.length > 1) {
            expression[0].logicOperator = valueFields.logicOperator();
            expression[1].logicOperator = valueFields.logicOperator();
        }

        //If the not empty box is checked
        if (notEmpty())
            expression.push({ op: "NotEmpty", values: [] });

        if (quickFilter() != null && quickFilter() !== "") {
            //There is a quickFilter so all other filters are irrelevant (and should be empty)
            expression.push({ op: quickOp, values: [quickFilter()], isQuickSearch: true });

        } else {
            var qs = quickSearch() == null || quickSearch() === "" ? "" : quickSearch();

            if (!templateHasOptions) {
                //If the popup does not have checkboxes check if there is a quickSearch to apply
                if (qs != "")
                    expression.push({ op: quickOp, values: [quickSearch()], isQuickSearch: true });

            } else {
                var selectedList = getSelectedItems(true);
                var selectableList = getSelectableItems();

                //If there are selected items OR we need to send all options listed (all of which are checked) because a filter of some type is applied
                if ((selectedList.length < selectableList.length) || (selectedList.length === selectableList.length && (qs != "" || isValFilter)))
                    expression.push({ op: 'In', values: selectedList, quickSearch: qs });
            }
        }
        //Send it in
        internalFilter(expression);
    }

    //Set the quickFilter in the main grid based on the conditions of the popup
    function calculateQuickFilter(suppressHandler) {
        if (!isShowing())
            return;

        if (suppressHandler)
            subscription.quickFilter.dispose();

        //If there are value filters then cannot use quickFilter at all
        if ((valueFields.valA() != null && valueFields.valA() !== "") || (valueFields.valB() != null && valueFields.valB() !== "")) {
            quickFilter("");

        } else {
            var qs = quickSearch() == null || quickSearch() === "" ? "" : quickSearch();
            var qslower = qs.toLowerCase();
            if (qs === "") {
                //No quickSearch so wipe quickFilter
                quickFilter("");
            } else if (!templateHasOptions) {
                //There is a quickSearch but no checkboxes to worry about
                quickFilter(qs)
            } else {
                //Determine if all CHECKED checkboxes start with the filter string
                var checkedItems = getSelectedItems(true).sort();
                var selectableItems = getSelectableItems(true).sort();
                var matchedItems = selectableItems.where(function(item) { return item.toLowerCase().lastIndexOf(qslower, 0) === 0; }).toArray();
                checkedItems.length > 0 && JSON.stringify(checkedItems) === JSON.stringify(matchedItems)
                    ? quickFilter(qs)
                    : quickFilter("");
            }
        }
        if (suppressHandler)
            subscription.quickFilter = quickFilter.subscribe(onQuickFilter);
    }

    //Get checked checkboxes in listbox
    function getSelectedItems(valuesOnly) {
        var selectableList = selectableListItems(),
            list = new Array(selectableList.length); // We preallocate to the maximum array size (this prevents reallocation while adding items to the array)

        // This is much much faster than array.filter().map():
        for (var i = 0, j = 0; i < selectableList.length; i += 1) 
            if (selectableList[i].selected)
                list[j++] = valuesOnly ? selectableList[i].value : selectableList[i];

        list.length = j; // We clear the empty array fields after position j

        return list;
    }

    //Get checkable checkboxes in listbox
    function getSelectableItems(valuesOnly) {
        var selectableList = selectableListItems();
        if (valuesOnly) {
            // We preallocate to the maximum array size (this prevents reallocation while adding items to the array)
            var list = new Array(selectableList.length);

            // This is much much faster than array.filter().map():
            for (var i = 0, j = 0; i < selectableList.length; i += 1)
                list[j++] = valuesOnly ? selectableList[i].value : selectableList[i];
        } else {
            list = selectableList;
        }

        return list;
    }

    //converts a list item to a selectable list item
    function createCheckboxOption(value, selected) {
        return {
            selected: has(selected) ? selected : true,
            value: has(value) ? value.toString() : ""
        };
    }

    //Reset the value section options
    function clearValuesFilter() {
        valueFields.valA(undefined);
        valueFields.valB(undefined);
        valueFields.logicOperator('or');
        notEmpty(false);
    }

    //Popup placement
    function initializeFilter($node) {
        //using jQuery instead of knockout because bindings have already been applied to the filter,
        //however we need to add a click event to the filter button so that when it is clicked
        $filter = $($node.find('.slick-filter')[0]);
        $filter.click(function () {
            var curWnd = windowFactory.windowManager.getWindowByElement($node.get(0));

            var $box,
                $arrow,
                listItemsSubscription,
                popupWindow = windowFactory.createWindow({
                    _isPopup: true,
                    debug: "GridSlick Filter Popup",
                    autoShow: false,
                    resizable: false,
                    showTaskbarIcon: false,
                    _parent: curWnd,
                    _alwaysAboveParent: true,
                    _closeOnLostFocus: true,
                    cornerRounding: {
                        "width": 0,
                        "height": 0
                    },
                    _fitToElement: ".slick-filter-popup"
                });

            popupWindow.addEventListener("renderable", function (body) {
                $popup = $('<div class="slick-filter-popup" data-bind="template: { name: popupTemplate, data: $data}"></div>').appendTo(body);
                ko.applyBindings(bindings, $popup.get()[0]);

                //flip is boolean; sets 'flipped' observable in order to show the correct ui if filter is flipped (left/right); also returns the offset which needs to be applied to the popup if it is flipped
                function setFilterFlip() {
                    //Assume no flip for now
                    var flip = false;

                    //See if it would go beyond the edge of the screen
                    var parentBounds = windowFactory.windowManager.getWindow(popupWindow.getParent().getTitle()).getBounds();//windowFactory.getWindow(parentWnd.name).getBoundingBox();
                    //var currmon = windowFactory.determineMonitor(parentBounds.left + $filter.offset().left, parentBounds.top + $filter.offset().top);
                    var currmon = windowFactory.monitorManager.determineMonitor(parentBounds.left + $filter.offset().left, parentBounds.top + $filter.offset().top);
                        if (currmon != null
                            && parentBounds.left + $filter.offset().left + $popup.width() + 20 > currmon.availableRect.right
                            && !(parentBounds.left + $filter.offset().left - $popup.width() - column.width < currmon.availableRect.left))
                            //Flip if the it goes beyond the edge of current monitor other put it to the right as long as it does NOT go beyond the right side of the screen
                            flip = true;

                    //Commit the result and send back the calculation
                    flipped(flip);

                    return flip
                        ? $filter.offset().left - $popup.width() - column.width + 10
                        : $filter.offset().left + 20;
                }

                var doc = $node.get(0).ownerDocument,
                    parentWnd = doc.defaultView;                  

                //calculates the offset of the filter from the top/left corner of the window
                var offsetX = setFilterFlip(),
                    offsetY = $filter.offset().top;


                //***** SETUP THE BINDINGS *****
                quickSearch.valueHasMutated();

                //converts new fieldListItems to selectableListItems
                subscription.fieldListItems = fieldListItems.subscribe(onListItems);

                //***** BUILD THE UI *****
                //sets the correct position of the arrow on the filter
                $box = $('<div style="z-index: 5; position: absolute; left: 0px; top: 0px; width: 100%; height: 100%;"></div>').appendTo(doc.body);
                $box.one("click", function () {
                    $box.remove();
                    popupWindow.close();
                });

                $arrow = $($popup.find('div')[0]);
                $arrow.appendTo($box);
                //$arrow.css("z-index", "5");
                $arrow.css("position", "absolute");
                $arrow.css("left", offsetX + (flipped() ? ($popup.width() + 1) : -1) - $arrow.width() / 2);
                $arrow.css("top", $filter.offset().top);//$filter.offset().top - offsetY);

                //Make sure the popup does not go off the screen
                var parentBounds = windowFactory.windowManager.getWindow(popupWindow.getParent().getTitle()).getBounds();//windowFactory.getWindow(parentWnd.name).getBoundingBox();
                var positionLeft = parentBounds.left + offsetX;
                var positionTop = parentBounds.top + offsetY;
                var verticalMidpoint = parentBounds.top + $filter.offset().top + $filter.height() / 2;
                //var currmon = windowFactory.determineMonitor(positionLeft, verticalMidpoint);
                var currmon = windowFactory.monitorManager.determineMonitor(positionLeft, verticalMidpoint);

                //Check for exceptions to the Y position of the popup
                if (currmon == null) 
                    //The parent is above the top of the current monitor and there is no monitor above it
                    positionTop = 10;

                else if (positionTop < currmon.availableRect.top) 
                    //Prevent the top of the popup from going off the screen
                    positionTop = currmon.availableRect.top + 10;

                else if (positionTop > currmon.availableRect.top && positionTop + $popup.height() > currmon.availableRect.bottom)
                    //Top will go beyond the bottom of the screen as long as the top will NOT go above the top of the screen
                    positionTop = currmon.availableRect.bottom - $popup.height();
                
                popupWindow.showAt(positionLeft, positionTop);
                popupWindow.bringToFront();
                popupWindow.focus();
                isShowing(true);
            });

            popupWindow.addEventListener("closed", function () {
                //ko is still listening even after the window is closed so clean out the popup to allow checkbox list destruction
                ko.cleanNode($popup.get()[0]);

                //Finish cleanup
                $box.remove();
                subscription.fieldListItems.dispose();
                isShowing(false);
            });
        });
    }

    //Initializes the internalFilter
    function start() {
        //Setup filters with any initial values passed in by the column.filter object
        setIncomingFilter(fieldFilter.value());
    }

    return {
        bindings: bindings,
        start: start,
        init: initializeFilter
    }
}

/*jslint unparam: true*/
export default function observableFilters() {
    function init(grid) {
        grid.onHeaderRowCellRendered.subscribe(function (e, args) {
            var $node = $(args.node),
                node = $node[0],
                fieldFilter = args.column.filter,
                filterHtml = '<input type="text" data-bind="value: value, valueUpdate: \'afterkeydown\'"/>'
                           + '<div class="slick-filter" data-bind="text: filterCountText, css: { iconFilterOff: !filterOn(), iconFilterOn: false, filterOn: filterOn }"></div>';

            if (fieldFilter) {
                //See if the filter has been setup yet
                if (!fieldFilter.state) {
                    //Will need to repaint the grid after filter is applied due to throttling
                    var sm = args.grid.getSelectionModel();
                    if (sm != null)
                        var callback = sm.repaintGrid;

                    //Setup the filter extension
                    fieldFilter.state = setupFilter(fieldFilter, args.column, callback)
                }

                //Setup the dome elements
                $node.html(filterHtml);
                ko.applyBindings(fieldFilter.state.bindings, node);
                fieldFilter.state.init($node);

                //See if the filter has to be initialized
                if (!fieldFilter.state.initialized) {
                    fieldFilter.state.start();
                    fieldFilter.state.initialized = true;
                }
            }
        });
    }

    function destroy() {
    }

    return {
        init: init,
        destroy: destroy
    };
};




