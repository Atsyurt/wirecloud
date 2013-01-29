/**
 * @param draggableElement {HTMLElement} Element to drag
 * @param handler {HTMLElement} Element where the drag & drop operation must to be started
 * @param data {Object} context
 */
function Draggable(handler, data, onStart, onDrag, onFinish, canBeDragged, onScroll) {
    var xStart = 0, yStart = 0, xScrollStart = 0, yScrollStart = 0;
    var xScrollDelta, yScrollDelta;
    var dragboardCover;
    var draggable = this;
    var enddrag, drag, startdrag, scroll;
    canBeDragged = canBeDragged ? canBeDragged : Draggable._canBeDragged;

    // remove the events
    enddrag = function (e) {
        e = e || window.event; // needed for IE

        // Only attend to left button (or right button for left-handed persons) events
        if (!BrowserUtilsFactory.getInstance().isLeftButton(e.button)) {
            return;
        }

        Event.stopObserving(document, "mouseup", enddrag);
        Event.stopObserving(document, "mousemove", drag);

        if (dragboardCover != null) {
            dragboardCover.parentNode.removeEventListener("scroll", scroll, true);
            dragboardCover.parentNode.removeChild(dragboardCover);
            dragboardCover = null;
        }

        onFinish(draggable, data, e);

        handler.addEventListener("mousedown", startdrag, false);

        document.onmousedown = null; // reenable context menu
        document.onselectstart = null; // reenable text selection in IE
        document.oncontextmenu = null; // reenable text selection
    };

    // fire each time it's dragged
    drag = function (e) {
        e = e || window.event; // needed for IE

        var clientX = parseInt(e.clientX, 10);
        var clientY = parseInt(e.clientY, 10);
        var xDelta = clientX - xStart - xScrollDelta;
        var yDelta = clientY - yStart - yScrollDelta;

        onDrag(e, draggable, data, xDelta, yDelta);
    };

    // initiate the drag
    startdrag = function (e) {
        e = e || window.event; // needed for IE

        // Only attend to left button (or right button for left-handed persons) events
        if (!BrowserUtilsFactory.getInstance().isLeftButton(e.button)) {
            return false;
        }

        if (!canBeDragged(draggable, data)) {
            return false;
        }

        document.oncontextmenu = Draggable._cancel; // disable context menu
        document.onmousedown = Draggable._cancel; // disable text selection in Firefox
        document.onselectstart = Draggable._cancel; // disable text selection in IE
        handler.removeEventListener("mousedown", startdrag, false);

        xStart = parseInt(e.clientX, 10);
        yStart = parseInt(e.clientY, 10);

        Event.observe(document, "mouseup", enddrag);
        Event.observe(document, "mousemove", drag);

        yScrollDelta = 0;
        xScrollDelta = 0;

        options = onStart(draggable, data, e);
        // TODO
        if (options != null && options.dragboard) {
            var dragboard = options.dragboard;
            dragboardCover = document.createElement("div");
            Element.extend(dragboardCover);
            dragboardCover.addClassName("cover");
            dragboardCover.observe("mouseup", enddrag, true);
            dragboardCover.observe("mousemove", drag, true);

            dragboardCover.style.zIndex = "1000000";
            dragboardCover.style.position = "absolute";
            dragboardCover.style.top = "0";
            dragboardCover.style.left = "0";
            dragboardCover.style.width = "100%";
            dragboardCover.style.height = dragboard.scrollHeight + "px";

            yScrollStart = parseInt(dragboard.scrollTop, 10);
            xScrollStart = parseInt(dragboard.scrollLeft, 10);

            dragboardCover.addEventListener("scroll", scroll, true);

            dragboard.insertBefore(dragboardCover, dragboard.firstChild);
        }
        e.stopPropagation();
        return false;
    };

    // fire each time the dragboard is scrolled while dragging
    scroll = function (e) {
        e = e || window.event; // needed for IE

        var dragboard = dragboardCover.parentNode;
        dragboardCover.style.height = dragboard.scrollHeight + "px";
        var scrollTop = parseInt(dragboard.scrollTop, 10);

        // yScrollDeltaDiff = diff between old scroll y delta and the new scroll y delta
        var oldYDelta = yScrollDelta;
        yScrollDelta = yScrollStart - scrollTop;
        var yScrollDeltaDiff = yScrollDelta - oldYDelta;

        var scrollLeft = parseInt(dragboard.scrollLeft, 10);
        // xScrollDeltaDiff = diff between old scroll x delta and the new scroll x delta
        var oldXDelta = xScrollDelta;
        xScrollDelta = xScrollStart - scrollLeft;
        var xScrollDeltaDiff = xScrollDelta - oldXDelta;

        onScroll(e, draggable, data, xScrollDeltaDiff, yScrollDeltaDiff);
    };

    // add mousedown event listener
    handler.addEventListener("mousedown", startdrag, false);

    /**********
     * Public methods
     **********/

    this.destroy = function () {
        handler.removeEventListener("mousedown", startdrag, false);
        startdrag = null;
        enddrag = null;
        drag = null;
        scroll = null;
        draggable = null;
        data = null;
        handler = null;
    };
}

Draggable._cancelbubbling = function (e) {
    e = e || window.event; // needed for IE
    Event.stop(e);
};

Draggable._canBeDragged = function () {
    return true;
};

Draggable._cancel = function () {
    return false;
};
