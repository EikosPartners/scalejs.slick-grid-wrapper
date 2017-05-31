"use strict";

(function ($) {
  function SlickColumnPicker(grid, options) {
    var $menu;
    var window;
    var columnCheckboxes;

    function init() {
      grid.onHeaderContextMenu.subscribe(handleHeaderContextMenu);
      window = grid.columnPickerWindow;

      //Override the control panel document object to avoid openfin contextual problem with mouse clicks and movements
      // var document = window != null
      //     ? window.getDocument()
      //     : grid.getCanvasNode().ownerDocument;

      //getDocument function called above has ben deprecated from windowfactory, might need a new fix for openfin context issue
      var document = grid.getCanvasNode().ownerDocument;

      var $container = $("<div class='slick-columnpicker' />").appendTo(document.body);
      $("<div class='slick-columnpicker-header'><label>GRID COLUMNS</></div>").appendTo($container);
      $menu = $("<div class='slick-columnpicker-list'/>").appendTo($container);

      window._fitToElement = $container[0];

      $menu.bind("click", updateColumn);
    }

    function handleHeaderContextMenu(e, args) {
      e.preventDefault();
      $menu.empty();
      columnCheckboxes = [];

      //Always get the latest columns collection which can be changed by several entities
      var columns = options.selectionModel.getViewModelColumns();

      for (var i = 0; i < columns.length; i++) {
        var $div = $("<div />").appendTo($menu);
        var $input = $("<input type='checkbox' />").data("column-id", columns[i].id);
        columnCheckboxes.push($input);

        if (grid.getColumnIndex(columns[i].id) != null) {
          $input.attr("checked", "checked");
        }

        $("<label />").text(columns[i].name).prepend($input).appendTo($div);

        //See if a filter is applied
        if (columns[i].filter != null) {
          var value = columns[i].filter.value();
          if (value != null && value.length > 0) $div.addClass('filtered');
        }
      }

      var parentVector = window._parent.getPosition();
      window.moveTo(parentVector.left + e.pageX, parentVector.top + e.pageY);
      window.show();
      window.focus();
    }

    function updateColumn(e) {
      //Always get the latest columns collection which can be changed by several entities
      var columns = options.selectionModel.getViewModelColumns();

      if ($(e.target).is(":checkbox")) {
        var visibleColumns = [];
        $.each(columnCheckboxes, function (i, e) {
          if ($(this).is(":checked")) {
            visibleColumns.push(columns[i]);
            columns[i].isHidden = false;
          } else {
            columns[i].isHidden = true;
          }
        });

        if (!visibleColumns.length) {
          $(e.target).attr("checked", "checked");
          return;
        }

        grid.setColumns(visibleColumns);
      }
    }

    function getAllColumns() {
      return columns;
    }

    init();

    return {
      "getAllColumns": getAllColumns
    };
  }

  // Slick.Controls.ColumnPicker
  $.extend(true, window, { Slick: { Controls: { ColumnPicker: SlickColumnPicker } } });
})(jQuery);