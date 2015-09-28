(function ($) {
  // register namespace
  $.extend(true, window, {
    "Slick": {
      "CellSelectionModel": CellSelectionModel
    }
  });


  function CellSelectionModel(options) {
    var _grid;
    var _canvas;
    var _ranges = [];
    var _self = this;
    var _selector = new Slick.CellRangeSelector({
      "selectionCss": {
        "border": "2px solid black"
      }
    });
    var _options;
    var _defaults = {
      selectActiveCell: false
    };


    function init(grid) {
      _options = $.extend(true, {}, _defaults, options);
      _grid = grid;
      _canvas = _grid.getCanvasNode();
      _grid.onActiveCellChanged.subscribe(handleActiveCellChange);
      _grid.onKeyDown.subscribe(handleKeyDown);
      grid.registerPlugin(_selector);
      _selector.onCellRangeSelected.subscribe(handleCellRangeSelected);
      _selector.onBeforeCellRangeSelected.subscribe(handleBeforeCellRangeSelected);
    }

    function destroy() {
      _grid.onActiveCellChanged.unsubscribe(handleActiveCellChange);
      _grid.onKeyDown.unsubscribe(handleKeyDown);
      _selector.onCellRangeSelected.unsubscribe(handleCellRangeSelected);
      _selector.onBeforeCellRangeSelected.unsubscribe(handleBeforeCellRangeSelected);
      _grid.unregisterPlugin(_selector);
    }

    function removeInvalidRanges(ranges) {
      var result = [];

      for (var i = 0; i < ranges.length; i++) {
        var r = ranges[i];
        if (_grid.canCellBeSelected(r.fromRow, r.fromCell) && _grid.canCellBeSelected(r.toRow, r.toCell)) {
          result.push(r);
        }
      }

      return result;
    }

    function setSelectedRanges(ranges) {
      // simle check for: empty selection didn't change, prevent firing onSelectedRangesChanged
      if ((!_ranges || _ranges.length === 0) && (!ranges || ranges.length === 0)) { return; }

      _ranges = removeInvalidRanges(ranges);
      _self.onSelectedRangesChanged.notify(_ranges);
    }

    function getSelectedRanges() {
      return _ranges;
    }

    function handleBeforeCellRangeSelected(e, args) {
      if (_grid.getEditorLock().isActive()) {
        e.stopPropagation();
        return false;
      }
    }

    function handleCellRangeSelected(e, args) {
      updateCellRanges(args.range, e);
    }

    function isActiveCellInExistingRanges() {
      //if activeCell was already selected, substract the range, otherwise add the range.
      var activeCell = _grid.getActiveCell();
      for(var i=0; i<_ranges.length; i++) {
        if (_ranges[i].contains(activeCell.row,activeCell.cell))
          return true;
      }
      return false;
    }

    function updateCellRanges(range, e) {
      var ranges;
      if (e.ctrlKey || e.metaKey) {
        if (isActiveCellInExistingRanges()){
          ranges = substractRange(range);
        } else {
          ranges = getNonoverlappingRanges(range);
        }
      } else if (!isNaN(range.fromCell)) {
        ranges = [range];
      } else {
        ranges = [];
      }
      setSelectedRanges(ranges);
    }


    function getNonoverlappingRanges(range) {
      var ranges = _ranges;
      var rangesToBeAdded = [range];
      for (var i = 0; i < ranges.length; i++) {
        var r = ranges[i];
        var choppedRange = [];
        var ra;
        while ((ra = rangesToBeAdded.shift()) != null)
        {
          if (r.fromCell>ra.toCell || ra.fromCell>r.toCell || r.fromRow>ra.toRow || ra.fromRow>r.toRow) {
              // no overlap, add whole range
              choppedRange.push(ra);
          } else {
            if (r.fromCell<=ra.toCell && r.fromCell>ra.fromCell) {
              choppedRange.push(new Slick.Range(ra.fromRow, ra.fromCell, ra.toRow, r.fromCell-1));
            }
            if (r.toCell>=ra.fromCell && r.toCell<ra.toCell) {
              choppedRange.push(new Slick.Range(ra.fromRow, r.toCell+1, ra.toRow, ra.toCell));
            }
            var fc = Math.max(r.fromCell,ra.fromCell);
            var tc = Math.min(r.toCell,ra.toCell);
            if (r.fromRow<=ra.toRow && r.fromRow>ra.fromRow) {
              choppedRange.push(new Slick.Range(ra.fromRow, fc, r.fromRow-1, tc));
            }
            if (r.toRow>=ra.fromRow && r.toRow<ra.toRow) {
              choppedRange.push(new Slick.Range(r.toRow+1, fc, ra.toRow, tc));
            }
          }
        }
        rangesToBeAdded = choppedRange;
      }
      ranges = ranges.concat(rangesToBeAdded);
      return ranges;
    }

    function substractRange(range) {
      var allRanges = [];
      for (var i = 0; i < _ranges.length; i++) {
        var r = _ranges[i];
        var rangesAfterSubstraction = [];
        var r_left = {fromRow: r.fromRow, toRow: r.toRow, fromCell: r.fromCell, toCell: Math.min(range.fromCell-1, r.toCell)};
        var r_right = {fromRow: r.fromRow, toRow: r.toRow, fromCell: Math.max(range.toCell+1, r.fromCell), toCell: r.toCell};
        var r_top = {fromRow: r.fromRow, toRow: Math.min(range.fromRow-1, r.toRow), fromCell: Math.max(r_left.toCell+1,r.fromCell), toCell: Math.min(r_right.fromCell-1,r.toCell) };
        var r_bottom = {fromRow: Math.max(range.toRow+1, r.fromRow), toRow: r.toRow, fromCell: Math.max(r_left.toCell+1,r.fromCell), toCell: Math.min(r_right.fromCell-1,r.toCell) };
        rangesAfterSubstraction = [r_left, r_right, r_top, r_bottom];
        for (var ii=0; ii < rangesAfterSubstraction.length; ii++) {
          var rr = rangesAfterSubstraction[ii];
          // add only valid ranges
          if (rr.fromRow <= rr.toRow && rr.toRow<=r.toRow && rr.fromRow>=r.fromRow && rr.fromCell <= rr.toCell && rr.toCell<=r.toCell && rr.fromCell>=r.fromCell)
            allRanges.push(new Slick.Range(rr.fromRow,rr.fromCell,rr.toRow,rr.toCell));
        }
      }
      return allRanges;
    }

    function handleActiveCellChange(e, args) {
      if (_options.selectActiveCell && args.row != null && args.cell != null) {
        updateCellRanges(new Slick.Range(args.row,args.cell),e);
      }
    }

    function handleKeyDown(e) {
      /***
       * Кey codes
       * 37 left
       * 38 up
       * 39 right
       * 40 down
       */
      var ranges, last;
      var active = _grid.getActiveCell();

      if ( active && e.shiftKey && !e.ctrlKey && !e.altKey &&
          (e.which == 37 || e.which == 39 || e.which == 38 || e.which == 40) ) {

        ranges = getSelectedRanges();
        if (!ranges.length)
         ranges.push(new Slick.Range(active.row, active.cell));

        // keyboard can work with last range only
        last = ranges.pop();

        // can't handle selection out of active cell
        if (!last.contains(active.row, active.cell))
          last = new Slick.Range(active.row, active.cell);

        var dRow = last.toRow - last.fromRow,
            dCell = last.toCell - last.fromCell,
            // walking direction
            dirRow = active.row == last.fromRow ? 1 : -1,
            dirCell = active.cell == last.fromCell ? 1 : -1;

        if (e.which == 37) {
          dCell -= dirCell;
        } else if (e.which == 39) {
          dCell += dirCell ;
        } else if (e.which == 38) {
          dRow -= dirRow;
        } else if (e.which == 40) {
          dRow += dirRow;
        }

        // define new selection range
        var new_last = new Slick.Range(active.row, active.cell, active.row + dirRow*dRow, active.cell + dirCell*dCell);
        if (removeInvalidRanges([new_last]).length) {
          ranges.push(new_last);
          var viewRow = dirRow > 0 ? new_last.toRow : new_last.fromRow;
          var viewCell = dirCell > 0 ? new_last.toCell : new_last.fromCell;
         _grid.scrollRowIntoView(viewRow);
         _grid.scrollCellIntoView(viewRow, viewCell);
        }
        else
          ranges.push(last);

        setSelectedRanges(ranges);

        e.preventDefault();
        e.stopPropagation();
      }
    }

    $.extend(this, {
      "getSelectedRanges": getSelectedRanges,
      "setSelectedRanges": setSelectedRanges,

      "init": init,
      "destroy": destroy,

      "onSelectedRangesChanged": new Slick.Event()
    });
  }
})(jQuery);
