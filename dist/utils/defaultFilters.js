'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

exports.default = function (columns, itemsSource) {
    var filteredItemsSource,
        evaluateFunc = {
        EqualTo: function EqualTo(s, v) {
            return parseFloat(s) === parseFloat(v);
        },
        EqualToString: function EqualToString(s, v) {
            return s.toString() === v.toString();
        },
        NotEqualToString: function NotEqualToString(s, v) {
            return s.toString() !== v.toString();
        },
        GreaterThan: function GreaterThan(s, v) {
            return parseFloat(s) > parseFloat(v);
        },
        LessThan: function LessThan(s, v) {
            return parseFloat(s) < parseFloat(v);
        },
        NotEqualTo: function NotEqualTo(s, v) {
            return parseFloat(s) !== parseFloat(v);
        },
        In: function In(s, v) {
            return v.some(function (x) {
                return s.match(new RegExp('^' + x + '$', 'i'));
            });
        },
        Contains: function Contains(s, v) {
            return s.match(new RegExp(v, 'i'));
        },
        NotContains: function NotContains(s, v) {
            return !s.match(new RegExp(v, 'i'));
        },
        StartsWith: function StartsWith(s, v) {
            return s.match(new RegExp('^' + v, 'i'));
        },
        EndsWith: function EndsWith(s, v) {
            return s.match(new RegExp(v + '$', 'i'));
        },
        NotEmpty: function NotEmpty(s) {
            return s !== "";
        }
    };

    function evaluateOperation(e, v) {
        var isValid;
        evaluate = evaluateFunc[e.op];

        if (e.op === "In" || e.op === "NotEmpty") {
            isValid = evaluate(v.toString(), e.values);
        } else {
            for (var i = 0; i < e.values.length; i += 1) {
                isValid = evaluate(v, valueOrDefault(e.values[i], "").toString());
                if (!isValid) break;
            }
        }

        return isValid;
    }

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

    computed(function () {
        columns().forEach(function (c) {
            var quickSearch = observable(''),
                quickFilterOp = c.filter.quickFilterOp;

            if (c.filter.value) return;

            c.filter = {
                type: c.filter.type,
                quickFilterOp: quickFilterOp,
                value: observable(),
                quickSearch: quickSearch,
                values: observable([]),
                custom: true
            };

            quickSearch.subscribe(function () {
                //gets the initial list values based on current filters
                var listValues = itemsSource().where(function (v) {
                    var keep = true;
                    ops = operations.filter(function (o) {
                        return o.id !== c.id;
                    });

                    for (var i = 0; i < ops.length; i++) {
                        keep = evaluateOperation(ops[i], v[ops[i].id]);
                        if (!keep) break;
                    }
                    return keep;
                }).distinct(function (r) {
                    if ((0, _coreFunctions.has)(r[c.id])) return r[c.id];
                }).orderBy(comparer(c.id)).select(function (r) {
                    return valueOrDefault(r[c.id], "").toString();
                });

                if (quickSearch() && quickSearch().values[0]) {
                    s = quickSearch().values[0].toLowerCase();
                    listValues = listValues.where(function (v) {
                        v = v.toLowerCase();

                        if (quickFilterOp === "Contains") {
                            return v.indexOf(s) !== -1;
                        }
                        return v.indexOf(s) === 0;
                    });
                }
                c.filter.values(listValues.take(50).toArray());
            });
        });
    });

    filteredItemsSource = computed(function () {
        operations = columns().where("$.filter.custom").selectMany(function (c) {
            return c.filter.value();
        }, function (c, v) {
            return {
                id: c.id,
                op: v.op,
                values: v.values
            };
        }).toArray();
        if (operations.length > 0) {
            var newItems = itemsSource().filter(function (v) {
                var keep;
                for (var i = 0; i < operations.length; i++) {
                    keep = evaluateOperation(operations[i], v[operations[i].id]);
                    if (!keep) break;
                }
                return keep;
            });
            return newItems;
        }
        return itemsSource();
    });

    return filteredItemsSource;
};

var _coreFunctions = require('./coreFunctions');

var _knockout = require('knockout');

var _knockout2 = _interopRequireDefault(_knockout);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var observable = _knockout2.default.observable,
    computed = _knockout2.default.computed;
//valueOrDefault = core.object.valueOrDefault;