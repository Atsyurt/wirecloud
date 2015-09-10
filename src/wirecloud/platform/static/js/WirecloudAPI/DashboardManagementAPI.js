/*
 *     Copyright (c) 2015 CoNWeT Lab., Universidad Politécnica de Madrid
 *
 *     This file is part of Wirecloud Platform.
 *
 *     Wirecloud Platform is free software: you can redistribute it and/or
 *     modify it under the terms of the GNU Affero General Public License as
 *     published by the Free Software Foundation, either version 3 of the
 *     License, or (at your option) any later version.
 *
 *     Wirecloud is distributed in the hope that it will be useful, but WITHOUT
 *     ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 *     FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public
 *     License for more details.
 *
 *     You should have received a copy of the GNU Affero General Public License
 *     along with Wirecloud Platform.  If not, see
 *     <http://www.gnu.org/licenses/>.
 *
 */

/*global MashupPlatform*/

(function () {

    "use strict";

    var platform = window.parent;
    var Wirecloud = platform.Wirecloud;
    var resource = MashupPlatform.priv.resource;
    var InputEndpoint = MashupPlatform.priv.InputEndpoint;
    var OutputEndpoint = MashupPlatform.priv.OutputEndpoint;
    var resource_element = resource.workspace.getIWidget(resource.id).content;
    var counter = 1;

    // Widget facade
    var Widget = function Widget(real_widget) {
        var endpoint_name;

        var inputs = {};
        for (endpoint_name in real_widget.inputs) {
            inputs[endpoint_name] = new InputEndpoint(real_widget.inputs[endpoint_name], false);
        }

        var outputs = {};
        for (endpoint_name in real_widget.outputs) {
            outputs[endpoint_name] = new OutputEndpoint(real_widget.outputs[endpoint_name], false);
        }

        Object.defineProperties(this, {
            'inputs': {value: inputs},
            'outputs': {value: outputs},
            'remove': {
                value: function close() {
                    real_widget.remove();
                }
            }
        });
    };

    // Operator facade
    var Operator = function Operator(real_operator) {
        var endpoint_name;

        var inputs = {};
        for (endpoint_name in real_operator.inputs) {
            inputs[endpoint_name] = new InputEndpoint(real_operator.inputs[endpoint_name], this);
        }

        var outputs = {};
        for (endpoint_name in real_operator.outputs) {
            outputs[endpoint_name] = new OutputEndpoint(real_operator.outputs[endpoint_name], this);
        }

        Object.defineProperties(this, {
            'inputs': {value: inputs},
            'outputs': {value: outputs},
            'remove': {
                value: function close() {
                    real_operator.remove();
                }
            }
        });
    };

    // Workspace facade
    var Workspace = function Workspace(workspace) {
        Object.defineProperties(this, {
            'owner': {value: workspace.creator},
            'name': {value: workspace.name},
        });
    };

    var addWidget = function addWidget(ref, options) {

        if (ref == null) {
            throw new TypeError('missing widget_ref parameter');
        }

        // default options
        options = Wirecloud.Utils.merge({
            title: null,
            refposition: null,
            permissions: null,
            preferences: {},
            properties: {},
            top: "0px",
            left: "0px",
            width: null, //auto
            height: null
        }, options);

        options.permissions = Wirecloud.Utils.merge({
                close: true,
                rename: false
        }, options.permissions);

        var widget_def = Wirecloud.LocalCatalogue.getResourceId(ref);
        var widget_title = options.title ? options.title : widget_def.title;
        var layout = Wirecloud.activeWorkspace.getActiveDragboard().freeLayout;

        if (options.refposition != null) {
            var current_position = Wirecloud.Utils.getRelativePosition(resource_element, resource.tab.wrapperElement);
            options.left = (current_position.x + options.refposition.left - layout.dragboardLeftMargin) + "px";
            options.top = (current_position.y + options.refposition.bottom - layout.dragboardTopMargin) + "px";
        }

        var widgetinfo = {
            id: resource.id + '/' + counter++,
            title: widget_title,
            volatile: true,
            permissions: options.permissions,
            properties: options.properties,
            preferences: options.preferences,
            top: options.top,
            left: options.left,
            width: options.width,
            height: options.height
        };
        var widget = new platform.IWidget(widget_def, layout, widgetinfo);
        Wirecloud.activeWorkspace.getActiveDragboard().addIWidget(widget);
        resource.addEventListener('unload', widget.remove.bind(widget));

        return new Widget(widget.internal_iwidget);
    };

    var onCreateWorkspaceSuccess = function onCreateWorkspaceSuccess(workspace) {
        this(new Workspace(workspace));
    };

    var createWorkspace = function createWorkspace(options) {
        if (options != null && typeof options.onSuccess === 'function') {
            options.onSuccess = onCreateWorkspaceSuccess.bind(options.onSuccess);
        }

        Wirecloud.createWorkspace(options);
    };

    if ('widget' in MashupPlatform) {
        Object.defineProperties(MashupPlatform.widget, {
            createInputEndpoint: {value: function createInputEndpoint(callback) {
                var endpoint = new Wirecloud.wiring.WidgetTargetEndpoint(resource);
                endpoint.callback = callback;
                return new InputEndpoint(endpoint, true);
            }},
            createOutputEndpoint: {value: function createOutputEndpoint() {
                return new OutputEndpoint(new Wirecloud.wiring.WidgetSourceEndpoint(resource), true);
            }}
        });
    } else {
        Object.defineProperties(MashupPlatform.widget, {
            createInputEndpoint: {value: function createInputEndpoint(callback) {
                var endpoint = new Wirecloud.wiring.OperatorTargetEndpoint(resource);
                endpoint.callback = callback;
                return new InputEndpoint(endpoint, true);
            }},
            createOutputEndpoint: {value: function createOutputEndpoint() {
                return new OutputEndpoint(new Wirecloud.wiring.OperatorSourceEndpoint(resource), true);
            }}
        });
    }

    Object.defineProperties(MashupPlatform.mashup, {
        addWidget: {value: addWidget},
        createWorkspace: {value: createWorkspace}
    });

})();
