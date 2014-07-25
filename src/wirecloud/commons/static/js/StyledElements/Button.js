/*global StyledElements, Wirecloud*/

(function () {

    "use strict";

    var clickCallback = function clickCallback(e) {
        e.preventDefault();
        e.stopPropagation();
        if (this.enabled) {
            this.events.click.dispatch(this);
        }
    };

    var keydownCallback = function keydownCallback(e) {
        if (this.enabled && e.keyCode === 13) {
            this.events.click.dispatch(this);
        }
    };

    var onmouseenter = function onmouseenter() {
        this.events.mouseenter.dispatch(this);
    };

    var onmouseleave = function onmouseleave() {
        this.events.mouseleave.dispatch(this);
    };

    var onfocus = function onfocus() {
        this.events.focus.dispatch(this);
    };

    var onblur = function onblur() {
        this.events.blur.dispatch(this);
    };

    /**
     *
     * Eventos que soporta este componente:
     *      - click: evento lanzado cuando se pulsa el botón.
     */
    var StyledButton = function StyledButton(options) {
        var button, defaultOptions = {
            'text': null,
            'title': '',
            'class': '',
            'plain': false,
            'iconHeight': 24,
            'iconWidth': 24,
            'icon': null,
            'iconClass': null,
            'usedInForm': false
        };
        options = Wirecloud.Utils.merge(defaultOptions, options);

        // Necesario para permitir herencia
        if (options.extending) {
            return;
        }

        StyledElements.StyledElement.call(this, ['click', 'focus', 'blur', 'mouseenter', 'mouseleave']);

        this.wrapperElement = document.createElement("div");
        this.wrapperElement.className = Wirecloud.Utils.appendWord(options['class'], "styled_button");

        if (options.usedInForm) {
            button = document.createElement("button");
            button.setAttribute('type', 'button');
            this.wrapperElement.appendChild(button);
        } else if (options.plain) {
            button = this.wrapperElement;
            this.wrapperElement.classList.add('plain');
        } else {
            button = document.createElement("div");
            this.wrapperElement.appendChild(button);
        }
        this._button = button;
        button.setAttribute('tabindex', '0');

        if (options.title) {
            button.setAttribute('title', options.title);
        }

        if (options.icon != null) {
            this.icon = document.createElement("img");
            this.icon.className = "icon";
            this.icon.style.width = options.iconWidth + 'px';
            this.icon.style.height = options.iconHeight + 'px';
            this.icon.src = options.icon;
            button.appendChild(this.icon);
        }

        if (options.text != null || options.iconClass != null) {
            this.label = document.createElement('span');
            if (options.text != null) {
                this.label.appendChild(document.createTextNode(options.text));
            }
            if (options.iconClass != null) {
                this.label.classList.add(options.iconClass);
            }
            button.appendChild(this.label);
        }

        /* Event handlers */
        this._clickCallback = clickCallback.bind(this);
        this._keydownCallback = keydownCallback.bind(this);

        button.addEventListener('mousedown', Wirecloud.Utils.stopPropagationListener, true);
        button.addEventListener('click', this._clickCallback, true);
        button.addEventListener('keydown', this._keydownCallback, true);
        button.addEventListener('focus', onfocus.bind(this), true);
        button.addEventListener('blur', onblur.bind(this), true);
        button.addEventListener('mouseenter', onmouseenter.bind(this), false);
        button.addEventListener('mouseleave', onmouseleave.bind(this), false);

        this.buttonElement = button;
    };
    StyledButton.prototype = new StyledElements.StyledElement();

    StyledButton.prototype.focus = function focus() {
        this.buttonElement.focus();
    };

    StyledButton.prototype.blur = function blur() {
        this.buttonElement.blur();
    };

    StyledButton.prototype.setLabel = function setLabel(label) {
        this.label.textContent = label;
    };

    StyledButton.prototype.setTitle = function setTitle(title) {
        this.buttonElement.setAttribute('title', title);
    };

    StyledButton.prototype.click = function click() {
        if (this.enabled) {
            this.events.click.dispatch(this);
        }
    };

    StyledButton.prototype.destroy = function destroy() {

        this._button.removeEventListener('mousedown', Wirecloud.Utils.stopPropagationListener, true);
        this._button.removeEventListener('click', this._clickCallback, true);
        this._button.removeEventListener('keydown', this._keydownCallback, true);

        delete this._button;
        delete this._clickCallback;
        delete this._keydownCallback;

        StyledElements.StyledElement.prototype.destroy.call(this);
    };

    StyledElements.StyledButton = StyledButton;
})();
