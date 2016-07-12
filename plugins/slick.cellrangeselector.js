(function ($) {
  // register namespace
  $.extend(true, window, {
    "Slick": {
      "CellRangeSelector": CellRangeSelector
    }
  });

  function CellRangeSelector(options) {
    var _grid;
    var _canvas;
    var _dragging;
    var _decorator;
    var _self = this;
    var _lastActiveCell;
    var _dragSelectionAfterActiveChanged = false;
    var _handler = new Slick.EventHandler();
    var _defaults = {
      selectionCss: {
        "border": "2px dashed blue"
      }
    };

    function init(grid) {
      options = $.extend(true, {}, _defaults, options);
      _decorator = new Slick.CellRangeDecorator(grid, options);
      _grid = grid;
      _canvas = _grid.getCanvasNode();
      _handler
        .subscribe(_grid.onDragInit, handleDragInit)
        .subscribe(_grid.onDragStart, handleDragStart)
        .subscribe(_grid.onDrag, handleDrag)
        .subscribe(_grid.onDragEnd, handleDragEnd)
        .subscribe(_grid.onMouseUp, handleMouseUp);

      initForShiftSelection(_handler, _grid);
    }

    function initForShiftSelection(handler, grid)
    {
      _handler
        .subscribe(_grid.onActiveCellChanged, handleActiveCellChange);
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
      if (_self.onBeforeCellRangeSelected.notify(cell) !== false) {
        if (_grid.canCellBeSelected(cell.row, cell.cell)) {
          _dragging = true;
          e.stopImmediatePropagation();
        }
      }
      if (!_dragging) {
        return;
      }

      _grid.focus();

      var start = _grid.getCellFromPoint(
          dd.startX - getOffset(_canvas).left,
          dd.startY - getOffset(_canvas).top);

      dd.range = {start: start, end: {}};

      return _decorator.show(new Slick.Range(start.row, start.cell));
    }

    function handleDrag(e, dd) {
      if (!_dragging) {
        return;
      }
      e.stopImmediatePropagation();

      var end = _grid.getCellFromPoint(
          e.pageX - getOffset(_canvas).left,
          e.pageY - getOffset(_canvas).top);

      if (!_grid.canCellBeSelected(end.row, end.cell)) {
        return;
      }

      dd.range.end = end;
      _decorator.show(new Slick.Range(dd.range.start.row, dd.range.start.cell, end.row, end.cell));
    }

    function handleDragEnd(e, dd) {
      if (!_dragging) {
        return;
      }
      _dragSelectionAfterActiveChanged = true;
      _dragging = false;

      _decorator.hide();
      _self.onCellRangeSelected.notify({
        range: new Slick.Range(
            dd.range.start.row,
            dd.range.start.cell,
            dd.range.end.row,
            dd.range.end.cell
        )
      },
      e);
      e.stopImmediatePropagation();
    }

    function handleActiveCellChange(e, args) {
      if (e.shiftKey && _lastActiveCell)
        _self.onCellRangeSelected.notify({
            range:  new Slick.Range(
              _lastActiveCell.row,
              _lastActiveCell.cell,
              args.row,
              args.cell
            )}, e);

      if (e.button == null) {
        _self.onCellRangeSelected.notify({
        range: new Slick.Range(
          args.row,
          args.cell,
          args.row,
          args.cell
        )}, e);
      }

      _dragSelectionAfterActiveChanged = false;
      _lastActiveCell=args;
    }

    function handleMouseUp(e, args) {
      // if no region was selected with mouse dragging and not doing shift-selection and cell is selectable, add clicked cell to selection
      if (!_dragSelectionAfterActiveChanged && !e.shiftKey && _grid.canCellBeSelected(args.row,args.cell)) {
        _self.onCellRangeSelected.notify({
        range:  new Slick.Range(
          args.row,
          args.cell,
          args.row,
          args.cell
        )}, e);
      }
    }

    function getOffset(element) {
      var docRect = document.documentElement.getBoundingClientRect(),
          elemRect = element.getBoundingClientRect();
      return {top: elemRect.top - docRect.top, left: elemRect.left - docRect.left};
    }

    $.extend(this, {
      "init": init,
      "destroy": destroy,
      "onBeforeCellRangeSelected": new Slick.Event(),
      "onCellRangeSelected": new Slick.Event()
    });
  }
})(jQuery);
