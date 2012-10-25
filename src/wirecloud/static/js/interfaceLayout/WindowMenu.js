/*
*     (C) Copyright 2008 Telefonica Investigacion y Desarrollo
*     S.A.Unipersonal (Telefonica I+D)
*
*     This file is part of Morfeo EzWeb Platform.
*
*     Morfeo EzWeb Platform is free software: you can redistribute it and/or modify
*     it under the terms of the GNU Affero General Public License as published by
*     the Free Software Foundation, either version 3 of the License, or
*     (at your option) any later version.
*
*     Morfeo EzWeb Platform is distributed in the hope that it will be useful,
*     but WITHOUT ANY WARRANTY; without even the implied warranty of
*     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
*     GNU Affero General Public License for more details.
*
*     You should have received a copy of the GNU Affero General Public License
*     along with Morfeo EzWeb Platform.  If not, see <http://www.gnu.org/licenses/>.
*
*     Info about members and contributors of the MORFEO project
*     is available at
*
*     http://morfeo-project.org
 */

/**
 * Base class for managing window menus whose HTML code is in templates/index.html.
 */

function WindowMenu(title, extra_class) {
    // Allow hierarchy
    if (arguments.length == 0)
        return;

    this.childWindow = null;
    this.htmlElement = document.createElement('div');  // create the root HTML element
    Element.extend(this.htmlElement);
    this.htmlElement.className = "window_menu";
    if (extra_class != null) {
        this.htmlElement.addClassName(extra_class);
    }

    // Window Top
    var windowTop = document.createElement('div');
    windowTop.className = "window_top";
    this.htmlElement.appendChild(windowTop);

    this._closeListener = this._closeListener.bind(this);
    this.closeButton = new StyledElements.StyledButton({
        'class': "closebutton",
        'plain': true
    });
    this.closeButton.insertInto(windowTop);
    this.closeButton.addEventListener("click", this._closeListener);

    this.titleElement = document.createElement('div');
    Element.extend(this.titleElement);
    this.titleElement.className = "window_title";
    windowTop.appendChild(this.titleElement);

    var clearer = document.createElement('div');
    Element.extend(clearer);
    clearer.addClassName("floatclearer");
    windowTop.appendChild(clearer);

    // Window Content
    this.windowContent = document.createElement('div');
    Element.extend(this.windowContent);
    this.windowContent.className = "window_content";
    this.htmlElement.appendChild(this.windowContent);

    this.iconElement = document.createElement('div');
    Element.extend(this.iconElement);
    this.iconElement.className = "window-icon icon-size";
    this.windowContent.appendChild(this.iconElement);

    this.msgElement = document.createElement('div');
    Element.extend(this.msgElement);
    this.msgElement.className = "msg";
    this.windowContent.appendChild(this.msgElement);

    // Window Bottom
    this.windowBottom = document.createElement('div');
    Element.extend(this.windowBottom);
    this.windowBottom.className = "window_bottom";
    this.htmlElement.appendChild(this.windowBottom);

    // Initial title
    this.setTitle(title);
}


WindowMenu.prototype.setTitle = function setTitle(title) {
    this.titleElement.setTextContent(title);
};

/**
 * @private
 *
 * Click Listener for the close button.
 */
WindowMenu.prototype._closeListener = function(e) {
    this.hide();
}

/**
 * Updates the message displayed by this <code>WindowMenu</code>
 */
WindowMenu.prototype.setMsg = function (msg) {
    this.msgElement.setTextContent(msg);

    if (isElement(this.htmlElement.parentNode)) {
        this.calculatePosition();
    }
}

/**
 * @private
 *
 * Calculates a usable absolute position for the window
 */
WindowMenu.prototype.calculatePosition = function() {
    var coordenates = [];

    var windowHeight = BrowserUtilsFactory.getInstance().getHeight();
    var windowWidth = BrowserUtilsFactory.getInstance().getWidth();

    this.htmlElement.setStyle({'max-height' : 'none'});
    var menuHeight = this.htmlElement.getHeight();
    var menuWidth = this.htmlElement.getWidth();

    if (menuWidth > windowWidth/2) {
        menuWidth = windowWidth/2; //IE6 hack
        this.htmlElement.setStyle({'width': menuWidth+'px'});
    }

    coordenates[1] = windowHeight/2 - menuHeight/2;
    coordenates[0] = windowWidth/2 - menuWidth/2;

    if (windowHeight < menuHeight) {
        var windowStyle = document.defaultView.getComputedStyle(this.htmlElement, null);

        var padding;
        padding = windowStyle.getPropertyCSSValue("padding-top").
                  getFloatValue(CSSPrimitiveValue.CSS_PX);
        padding+= windowStyle.getPropertyCSSValue("padding-bottom").
                  getFloatValue(CSSPrimitiveValue.CSS_PX);

        this.htmlElement.setStyle({'max-height': windowHeight - padding + 'px',
                                   'top': '0px'});
    } else {
        this.htmlElement.style.top = coordenates[1]+"px";
    }
    this.htmlElement.style.left = coordenates[0]+"px";

    if (this.childWindow != null) {
        this.childWindow.calculatePosition();
    }
}

/**
 *
 */
WindowMenu.prototype.setHandler = function (handler) {
    this.operationHandler = handler;
}

/**
 * Makes this WindowMenu visible.
 *
 * @param parentWindow
 */
WindowMenu.prototype.show = function (parentWindow) {
    this._parentWindowMenu = parentWindow;

    if (this._parentWindowMenu != null) {
        this._parentWindowMenu._addChildWindow(this);
    } else {
        LayoutManagerFactory.getInstance()._showWindowMenu(this);
    }

    document.body.appendChild(this.htmlElement);
    this.calculatePosition();
    this.htmlElement.style.display = "block";
    this.setFocus();
}

/**
 * Makes this WindowMenu hidden.
 */
WindowMenu.prototype.hide = function () {
    if (!isElement(this.htmlElement.parentNode)) {
        // This windowmenu is currently hidden => Nothing to do
        return;
    }

    this.htmlElement.parentNode.removeChild(this.htmlElement);
    if (this.msgElement != null) {
        this.msgElement.update();
    }
    if (this.childWindow != null) {
        this.childWindow.hide();
    }

    if (this._parentWindowMenu != null) {
        this._parentWindowMenu._removeChildWindow(this);
        this._parentWindowMenu = null;
    } else {
        LayoutManagerFactory.getInstance().hideCover();
    }
}

WindowMenu.prototype._addChildWindow = function (windowMenu) {
    if (windowMenu !== this) {
        this.childWindow = windowMenu;
    } else {
        throw TypeError('Window menus cannot be its own child');
    }
};

WindowMenu.prototype._removeChildWindow = function (windowMenu) {
    if (this.childWindow === windowMenu) {
        this.childWindow = null;
    }
};

WindowMenu.prototype.setFocus = function () {
}

/**
 * Specific class representing alert dialogs
 */
function AlertWindowMenu () {
    WindowMenu.call(this, gettext('Warning'));

    // Warning icon
    this.iconElement.className += ' icon-warning';

    // Accept button
    this.acceptButton = document.createElement('button');

    Element.extend(this.acceptButton);
    this.acceptButton.appendChild(document.createTextNode(gettext('Yes')));
    this._acceptListener = this._acceptListener.bind(this);
    this.acceptButton.observe("click", this._acceptListener);
    this.windowBottom.appendChild(this.acceptButton);

    // Cancel button
    this.cancelButton = document.createElement('button');
    Element.extend(this.cancelButton);
    this.cancelButton.appendChild(document.createTextNode(gettext('No')));
    this.cancelButton.observe("click", this._closeListener);
    this.windowBottom.appendChild(this.cancelButton);

    this.acceptHandler = null;
    this.cancelHandler = null;
}
AlertWindowMenu.prototype = new WindowMenu();

AlertWindowMenu.prototype._acceptListener = function(e) {
    this.acceptHandler();
    this.hide();
}

AlertWindowMenu.prototype._closeListener = function(e) {
    WindowMenu.prototype._closeListener.call(this, e);
    if (this.cancelHandler) this.cancelHandler();
}

AlertWindowMenu.prototype.setHandler = function(acceptHandler, cancelHandler) {
    this.acceptHandler = acceptHandler;
    this.cancelHandler = cancelHandler;
}

AlertWindowMenu.prototype.setFocus = function() {
    this.acceptButton.focus();
}


/**
 * Specific class representing alert dialogs.
 */
function MessageWindowMenu (element) {
    WindowMenu.call(this, '');

    // Accept button
    this.button = document.createElement('button');
    Element.extend(this.button);
    this.button.appendChild(document.createTextNode(gettext('Accept')));
    this.windowBottom.appendChild(this.button);
    this.button.observe("click", this._closeListener);
}
MessageWindowMenu.prototype = new WindowMenu();

MessageWindowMenu.prototype.setFocus = function() {
    setTimeout(this.button.focus.bind(this.button), 0);
    //this.button.focus();
};

MessageWindowMenu.prototype.show = function (parentWindow) {
    WindowMenu.prototype.show.call(this, parentWindow);
    this.setFocus();
};

MessageWindowMenu.prototype.setType = function(type) {
    var titles = ['', gettext('Error'), gettext('Warning'), gettext('Info')];
    var icons = ['', 'icon-error', 'icon-warning', 'icon-info'];

    // Update title
    this.setTitle(titles[type]);

    // Update icon
    this.iconElement.className += ' ' + icons[type];
}

/**
 * Specific class for info dialogs.
 */
function InfoWindowMenu(title) {
    if (arguments.length == 0)
        return;

    WindowMenu.call(this, title);

    // Extra HTML Elements
    this.iconElement.className += ' icon-info';

    this.checkbox = document.createElement('input');
    Element.extend(this.checkbox);
    this.checkbox.setAttribute('type', 'checkbox');
    this.windowBottom.appendChild(this.checkbox);
    this.windowBottom.appendChild(document.createTextNode(gettext('Don\'t show me anymore')));

    // Event Listeners
    this._dontShowAnymore = this._dontShowAnymore.bind(this);

    this.checkbox.observe("click", this._dontShowAnymore);
}
InfoWindowMenu.prototype = new WindowMenu();

InfoWindowMenu.prototype._dontShowAnymore = function(e) {
    var layoutManager = LayoutManagerFactory.getInstance();
    var changes = {};
    changes['tip-' + this.type] = {value: false};
    PreferencesManagerFactory.getInstance().getPlatformPreferences().set(changes);

    this.hide();
}

/**
 *
 */
InfoWindowMenu.prototype.show = function (type, parentWindow) {
    this.type = type;
    this.checkbox.checked = false;

    WindowMenu.prototype.show.call(this, parentWindow);
}

/**
 * Specific class for tip dialogs.
 */
function TipWindowMenu() {
    InfoWindowMenu.call(this, gettext('Do you know what ... ?'));
}
TipWindowMenu.prototype = new InfoWindowMenu();


/**
 * Form dialog.
 */
var FormWindowMenu = function FormWindowMenu (fields, title, extra_class) {

    // Allow hierarchy
    if (arguments.length === 0) {
        return;
    }

    WindowMenu.call(this, title, extra_class);
    // TODO
    this.windowContent.parentNode.removeChild(this.windowContent);
    this.windowContent = null;
    this.iconElement = null;
    this.msgElement = null;
    this.windowBottom.parentNode.removeChild(this.windowBottom);
    this.windowBottom = null;

    this.form = new Form(fields, {
        factory: Wirecloud.form.WirecloudInterfaceFactory
    });
    this.form.insertInto(this.htmlElement);
    this.form.addEventListener('submit', function (form, data) {
        try {
            this.executeOperation(data);
        } catch (e) {};
        this.hide();
    }.bind(this));
    this.form.addEventListener('cancel', this._closeListener);
};
FormWindowMenu.prototype = new WindowMenu();

FormWindowMenu.prototype.setValue = function setValue (newValue) {
    this.form.setData(newValue);
};

FormWindowMenu.prototype.show = function (parentWindow) {
    this.form.reset();
    WindowMenu.prototype.show.call(this, parentWindow);
};

/**
 * Specific class for platform preferences windows.
 *
 * @param manager
 *
 * @author jmostazo-upm
 */
function PreferencesWindowMenu(scope, manager) {
    WindowMenu.call(this, '');

    this.manager = manager;
    var table = manager.getPreferencesDef().getInterface();
    this.windowContent.insertBefore(table, this.msgElement);

    // Accept button
    this.acceptButton = document.createElement('button');

    Element.extend(this.acceptButton);
    this.acceptButton.appendChild(document.createTextNode(gettext('Save')));
    this._executeOperation = this._executeOperation.bind(this);
    this.acceptButton.observe("click", this._executeOperation);
    this.windowBottom.appendChild(this.acceptButton);

    // Cancel button
    this.cancelButton = document.createElement('button');

    Element.extend(this.cancelButton);
    this.cancelButton.appendChild(document.createTextNode(gettext('Cancel')));
    this.cancelButton.observe("click", this._closeListener);
    this.windowBottom.appendChild(this.cancelButton);
}
PreferencesWindowMenu.prototype = new WindowMenu();

PreferencesWindowMenu.prototype.setCancelable = function(cancelable) {
    this.closeButton.setDisabled(!cancelable);
    if (cancelable === true) {
        this.cancelButton.style.display = '';
    } else {
        this.cancelButton.style.display = 'none';
    }
};

PreferencesWindowMenu.prototype._executeOperation = function() {
    // Validate input fields
    var validationManager = new ValidationErrorManager();
    for (var fieldId in this.fields)
        validationManager.validate(this.fields[fieldId].inputInterface);

    // Build Error Message
    var errorMsg = validationManager.toHTML();

    // Show error message if needed
    if (errorMsg != "") {
        this.setMsg(errorMsg);
    } else {
        this.manager.save();
        this.hide();
    }
}

PreferencesWindowMenu.prototype.show = function (parentWindow) {
    this.setTitle(this.manager.buildTitle());
    this.manager.resetInterface('platform');
    WindowMenu.prototype.show.call(this, parentWindow);
}

/**
 * Specific class for uploading files.
 *
 * @param scope
 *
 */
function UploadWindowMenu (title, targetElement) {
    WindowMenu.call(this, gettext(title));

    this.targetElement = null;
    this.iframe = document.createElement('iframe');
    this.iframe.setAttribute('id', 'uploader_frame');
    this.iframe.setAttribute('src', URIs.FILE_UPLOADER);
    this.iframe.setAttribute('width', "100%");
    this.iframe.setAttribute("frameBorder", "0");

    var iframeDiv = document.createElement('div');
    Element.extend(iframeDiv);
    iframeDiv.addClassName('iframeDiv');
    this.windowContent.appendChild(iframeDiv)

    iframeDiv.appendChild(this.iframe);

    var warning = document.createElement('div');
    Element.extend(warning);
    warning.addClassName('msg warning');
    warning.update(gettext("WARNING: Your file will be uploaded to a shared space. <br /> Wirecloud is not responsible for the content of the uploaded files."));
    this.windowContent.appendChild(warning);
}

UploadWindowMenu.prototype = new WindowMenu();

UploadWindowMenu.prototype.show = function(parentWindow, targetElement) {
    //reload the iframe for IE
    this.iframe.setAttribute('src', URIs.FILE_UPLOADER);
    this.targetElement = targetElement;

    WindowMenu.prototype.show.call(this, parentWindow);
}

UploadWindowMenu.prototype._closeListener = function(){

    //Take the value of the URL if it succeed and set that value to the targetElement
    try {
        if (this.iframe.contentDocument) {
            var urlElement = this.iframe.contentDocument.getElementById('url');
        }
        else { //IE
            var urlElement = this.iframe.contentWindow.document.getElementById('url')
        }

        if (urlElement) {
            this.targetElement.value = urlElement.innerHTML;
        }
    }
    catch (err) {
    //do nothing
    }
    finally {
        //hide the window
        this.hide();
    }

}

function ParametrizeWindowMenu(inputInterface) {
    var fields, sourceOptions, statusOptions;

    statusOptions = [
        {label: gettext('Normal'), value: 'normal'},
        {label: gettext('Read Only'), value: 'readonly'}
    ];

    if (inputInterface.canBeHidden) {
        statusOptions.push({label: gettext('Hidden'), value: 'hidden'});
    }

    sourceOptions = [
        {label: gettext('Current value'), value: 'current'},
        {label: gettext('Default value'), value: 'default'},
        {label: gettext('Parametrized value'), value: 'custom'}
    ];

    fields = {
        'status': {label: gettext('Status'), type: 'select', initialEntries: statusOptions, required: true},
        'source': {label: gettext('Value source'), type: 'select', initialEntries: sourceOptions, required: true},
        'separator': {type: 'separator'},
        'value': {label: gettext('Value'), type: 'parametrizedText', variable: inputInterface.variable}
    }
    FormWindowMenu.call(this, fields, gettext('Parametrization'), 'variable_parametrization');

    this.inputInterface = inputInterface;

    // TODO
    var valueInput = this.form.fieldInterfaces['value'];
    var sourceInput = this.form.fieldInterfaces['source'].inputElement;
    var updateFunc = function() {
        this.valueInput.setDisabled(this.sourceInput.getValue() !== 'custom');
    }.bind({valueInput: valueInput, sourceInput: sourceInput});
    valueInput.update = updateFunc;
    Event.observe(sourceInput.inputElement, 'change', updateFunc);
}
ParametrizeWindowMenu.prototype = new FormWindowMenu();

ParametrizeWindowMenu.prototype.executeOperation = function(newValue) {
    this.inputInterface.setValue(newValue);
};
