/*
 *  This file is part of Wirecloud.
 *  Copyright (C) 2015  CoNWeT Lab., Universidad Politécnica de Madrid
 *
 *  Wirecloud is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU Affero General Public License as
 *  License, or (at your option) any later version.
 *
 *  Wirecloud is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU Affero General Public License for more details.
 *
 *  You should have received a copy of the GNU Affero General Public License
 *  along with Wirecloud.  If not, see <http://www.gnu.org/licenses/>.
 */

/*global StyledElements, Wirecloud */


Wirecloud.ui.WiringEditor.Behaviour = (function () {

    "use strict";

    /**
     * Create a new instance of class Behaviour.
     * @class
     *
     * @param {Object.<String, *>} data
     * @param {Object.<String, *>} [options]
     */
    var Behaviour = function Behaviour(data, index, options) {
        var countersElement;

        StyledElements.EventManagerMixin.call(this, Behaviour.events);
        data = Behaviour.normalize(data, index);

        this.wrapperElement = document.createElement('div');
        this.wrapperElement.className = "behaviour";

        this.bodyElement = document.createElement('div');
        this.bodyElement.className = "behaviour-body";
        this.wrapperElement.appendChild(this.bodyElement);

        this.title = data.title;
        this.description = data.description;

        this.titleElement = document.createElement('span');
        this.titleElement.className = "behaviour-title";
        this.titleElement.textContent = this.title;
        this.bodyElement.appendChild(this.titleElement);

        this.descriptionElement = document.createElement('span');
        this.descriptionElement.className = "behaviour-description";
        this.descriptionElement.textContent = this.description;
        this.bodyElement.appendChild(this.descriptionElement);

        countersElement = document.createElement('div');
        countersElement.className = "behaviour-elements";
        this.bodyElement.appendChild(this.countersElement);

        this.components = data.components;
        this.connections = data.connections;

        this.connectionsElement = document.createElement('div');
        this.connectionsElement.className = "badge badge-connections";
        countersElement.appendChild(this.connectionsElement);

        this.operatorsElement = document.createElement('div');
        this.operatorsElement.className = "badge badge-operators";
        countersElement.appendChild(this.operatorsElement);

        this.widgetsElement = document.createElement('div');
        this.widgetsElement.className = "badge badge-widgets";
        countersElement.appendChild(this.widgetsElement);

        this.headingElement = document.createElement('div');
        this.headingElement.className = "behaviour-heading";
        this.wrapperElement.appendChild(this.headingElement);

        Object.defineProperty(this, 'active', {
            'get': function get() {
                return this.wrapperElement.classList.contains('active');
            },
            'set': function set(value) {
                if (value) {
                    this.wrapperElement.classList.add('active');
                } else {
                    this.wrapperElement.classList.remove('active');
                }
            }
        });

        this.active = data.active;
        updateCounterList.call(this);
    };

    StyledElements.Utils.inherit(Behaviour, null, StyledElements.EventManagerMixin);

    Behaviour.events = ['click', 'preferences.click'];

    Behaviour.normalize = function normalize(data, index) {
        if (typeof data !== 'object') {
            data = {
                active: false,
                title: "New behaviour " + index,
                description: "No description provided.",
                components: {
                    operator: {},
                    widget: {}
                },
                connections: []
            };
        }

        if (typeof data.active !== 'boolean') {
            data.active = false;
        }

        if (typeof data.title !== 'string' || !data.title.length) {
            data.title = "New behaviour " + index;
        }

        if (typeof data.description !== 'string' || !data.description.length) {
            data.description = "No description provided.";
        }

        if (typeof data.components !== 'object') {
            data.components = {
                operator: {},
                widget: {}
            };
        }

        if (!Array.isArray(data.connections)) {
            data.connections = [];
        }

        return data;
    };

    Behaviour.prototype = {

        'removeComponent': function removeComponent(type, id) {
            delete this.components[type][id];
            updateCounterList.call(this);

            return this;
        },

        'saveSettings': function saveSettings(data) {
            var prop;

            if (data.title && data.title.length) {
                this.title = data.title;
                this.titleElement.innerHTML = data.title;
            }

            if (data.description && data.description.length) {
                this.description = data.description;
                this.descriptionElement.innerHTML = data.description;
            }

            return this;
        }

    };

    /**
     * @public
     * @function
     *
     * @param {String} componentType
     * @param {String} componentId
     * @returns {Boolean} If the component given is saved.
     */
    Behaviour.prototype.containsComponent = function containsComponent(componentType, componentId) {
        return componentId in this.components[componentType];
    };

    /**
     * @public
     * @function
     *
     * @param {Behaviour} behaviour
     * @returns {Boolean} If the behaviour given is the same behaviour saved.
     */
    Behaviour.prototype.equals = function equals(behaviour) {
        return (behaviour instanceof Behaviour) && Object.is(this, behaviour);
    };

    /**
     * @public
     * @function
     *
     * @param {String} componentType
     * @param {String} componentId
     * @returns {Boolean} If the component given has view registered.
     */
    Behaviour.prototype.hasComponentView = function hasComponentView(componentType, componentId) {
        return Object.keys(this.components[componentType][componentId]).length;
    };

    /**
     * @public
     * @function
     *
     * @param {String} componentType
     * @param {String} componentId
     * @returns {Object.<String, *>} The current view of the component given.
     */
    Behaviour.prototype.getComponentView = function getComponentView(componentType, componentId) {
        return this.components[componentType][componentId];
    };

    /**
     * @public
     * @function
     *
     * @param {String} connectionId
     * @returns {Object.<String, *>} The current view of the component given.
     */
    Behaviour.prototype.getConnectionView = function getConnectionView(connectionId) {
        var connectionView, found, i;

        for (found = false, i = 0; !found && i < this.connections.length; i++) {
            if (this.connections[i].id == connectionId) {
                connectionView = this.connections[i];
                found = true;
            }
        }

        return connectionView;
    };

    /**
     * @public
     * @function
     *
     * @param {String} connectionId
     * @returns {Behaviour} The instance on which this function was called.
     */
    Behaviour.prototype.removeConnection = function removeConnection(connectionId) {
        var index;

        if ((index=this.connections.indexOf(connectionId)) != -1) {
            this.connections.splice(index, 1);
        }

        return this;
    };

    /**
     * @public
     * @function
     *
     * @returns {Object.<String, *>} The current information saved.
     */
    Behaviour.prototype.serialize = function serialize() {
        var data = {
            active: this.active,
            title: this.title,
            description: this.description,
            components: this.components,
            connections: this.connections
        };

        return StyledElements.Utils.cloneObject(data);
    };

    /**
     * @public
     * @function
     *
     * @param {String} componentType
     * @param {String} componentId
     * @param {Object.<String, *>} componentView
     * @returns {Behaviour} The instance on which this function was called.
     */
    Behaviour.prototype.updateComponent = function updateComponent(componentType, componentId, componentView) {
        if (typeof componentView === 'undefined') {
            if (!this.containsComponent(componentType, componentId)) {
                this.components[componentType][componentId] = {};
            }
        } else {
            this.components[componentType][componentId] = componentView;
        }

        updateCounterList.call(this);

        return this;
    };

    /**
     * @public
     * @function
     *
     * @param {String} componentId
     * @returns {Behaviour} The instance on which this function was called.
     */
    Behaviour.prototype.updateConnection = function updateConnection(connectionId) {
        var index;

        if ((index=this.connections.indexOf(componentId)) == -1) {
            this.connections.push(connectionId);
        }

        return this;
    };

    /**
     * @private
     * @function
     *
     * @returns {Behaviour} The instance on which this function was called.
     */
    var updateCounterList = function updateCounterList() {
        this.connectionsElement.textContent = this.connections.length;
        this.operatorsElement.textContent = Object.keys(this.components.operator).length;
        this.widgetsElement.textContent = Object.keys(this.components.widget).length;

        return this;
    };

    return Behaviour;

})();
