(function ($) {
  // register namespace
  $.extend(true, window, {
    "Slick": {
      "RowMoveManager": RowMoveManager
    }
  });

  function RowMoveManager(options) {
    var _grid;
    var _canvas;
    var _dragging;
    var _self = this;
    var _handler = new Slick.EventHandler();
    var _defaults = {
      cancelEditOnDrag: false
    };

    function init(grid) {
      options = $.extend(true, {}, _defaults, options);
      _grid = grid;
      _canvas = _grid.getCanvasNode();
      _handler
        .subscribe(_grid.onDragInit, handleDragInit)
        .subscribe(_grid.onDragStart, handleDragStart)
        .subscribe(_grid.onDrag, handleDrag)
        .subscribe(_grid.onDragEnd, handleDragEnd);
    }

    function destroy() {
      _handler.unsubscribeAll();
    }

    function handleDragInit(e, dd) {
      // prevent the grid from cancelling drag'n'drop by default
      e.stopImmediatePropagation();
    }

    function handleDragStart(e, dd) {
      var cell = _grid.getCellFromEvent(e);

      if (options.cancelEditOnDrag && _grid.getEditorLock().isActive()) {
        _grid.getEditorLock().cancelCurrentEdit();
      }

      if (_grid.getEditorLock().isActive() || !/move|selectAndMove/.test(getBehavior(cell.row, cell.cell))) {
        return false;
      }

      _dragging = true;
      e.stopImmediatePropagation();

      var selectedRows = _grid.getSelectedRows();

      if (selectedRows.length == 0 || $.inArray(cell.row, selectedRows) == -1) {
        selectedRows = [cell.row];
        _grid.setSelectedRows(selectedRows);
      }

      var rowHeight = _grid.getOptions().rowHeight;

      dd.selectedRows = selectedRows;

      dd.selectionProxy = $("<div class='slick-reorder-proxy'/>")
          .css("position", "absolute")
          .css("zIndex", "99999")
          .css("width", $(_canvas).innerWidth())
          .css("height", rowHeight * selectedRows.length)
          .appendTo(_canvas);

      dd.guide = $("<div class='slick-reorder-guide'/>")
          .css("position", "absolute")
          .css("zIndex", "99998")
          .css("width", $(_canvas).innerWidth())
          .css("top", -1000)
          .appendTo(_canvas);

      dd.insertBefore = -1;
    }

    function getBehavior(row, cell) {
      var column = _grid.getColumns()[cell];
      var data = _grid.getData();
      var rowMetadata = data.getItemMetadata && data.getItemMetadata(row);

      // look up by id, then index
      var columnOverrides = rowMetadata &&
            rowMetadata.columns &&
            (rowMetadata.columns[column.id] || rowMetadata.columns[_grid.getColumnIndex(column.id)]);

      return (columnOverrides && columnOverrides.behavior) ||
        (rowMetadata && rowMetadata.formatter) ||
        column.behavior;
    }

    function handleDrag(e, dd) {
      if (!_dragging) {
        return;
      }

      e.stopImmediatePropagation();

      var top = e.pageY - $(_canvas).offset().top;
      dd.selectionProxy.css("top", top - 5);

      var insertBefore = Math.max(0, Math.min(Math.round(top / _grid.getOptions().rowHeight), _grid.getDataLength()));
      if (insertBefore !== dd.insertBefore) {
        var eventData = {
          "rows": dd.selectedRows,
          "insertBefore": insertBefore
        };

        if (_self.onBeforeMoveRows.notify(eventData) === false) {
          dd.guide.css("top", -1000);
          dd.canMove = false;
        } else {
          dd.guide.css("top", insertBefore * _grid.getOptions().rowHeight);
          dd.canMove = true;
        }

        dd.insertBefore = insertBefore;
      }
    }

    function handleDragEnd(e, dd) {
      if (!_dragging) {
        return;
      }
      _dragging = false;
      e.stopImmediatePropagation();

      dd.guide.remove();
      dd.selectionProxy.remove();

      if (dd.canMove) {
        var eventData = {
          "rows": dd.selectedRows,
          "insertBefore": dd.insertBefore
        };
        // TODO:  _grid.remapCellCssClasses ?
        _self.onMoveRows.notify(eventData);
      }
    }

    $.extend(this, {
      "onBeforeMoveRows": new Slick.Event(),
      "onMoveRows": new Slick.Event(),

      "init": init,
      "destroy": destroy
    });
  }
})(jQuery);
