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


Wirecloud.ui.WiringEditor.BehaviourEngine = (function () {

    "use strict";

    /**
     * Create a new instance of class BehaviourEngine.
     * @class
     *
     * @param {Object.<String, *>} [options]
     */
    var BehaviourEngine = function BehaviourEngine(options) {
        StyledElements.EventManagerMixin.call(this, BehaviourEngine.events);
        Wirecloud.ui.WiringEditor.BehaviourManagerMixin.call(this);

        this.currentViewpoint = BehaviourEngine.viewpoints.GLOBAL;
        this.readOnly = false;
        this.updateOnly = false;
    };

    StyledElements.Utils.inherit(BehaviourEngine, null,
        StyledElements.EventManagerMixin, Wirecloud.ui.WiringEditor.BehaviourManagerMixin);

    // ==================================================================================
    // STATIC METHODS
    // ==================================================================================

    BehaviourEngine.events = ['activate', 'append', 'beforeActivate', 'beforeRemove'];

    BehaviourEngine.viewpoints = {
        'GLOBAL': 0,
        'INDEPENDENT': 1
    };

    /**
     * @static
     * @function
     *
     * @param {Object.<String, *>} state
     * @param {Boolean} [exhaustive=false]
     * @returns {Object.<String, *>} The wiring state normalized.
     */
    BehaviourEngine.normalizeWiring = function normalizeWiring(state, exhaustive) {
        var i;

        if (typeof exhaustive !== 'boolean') {
            exhaustive = false;
        }

        if (typeof state !== 'object') {
            state = {};
        }

        if (!Array.isArray(state.connections)) {
            state.connections = [];
        }

        if (typeof state.operators !== 'object') {
            state.operators = {};
        }

        if (exhaustive) {
            if (typeof state.visual_part !== 'object') {
                state.visual_part = {
                    behaviours: [],
                    components: {
                        operator: {},
                        widget: {}
                    },
                    connections: []
                };
            }

            if (!Array.isArray(state.visual_part.behaviours)) {
                state.visual_part.behaviours = [];
            }

            for (i = 0; i < state.visual_part.behaviours.length; i++) {
                if (typeof state.visual_part.behaviours[i] !== 'object') {
                    state.visual_part.behaviours[i] = {
                        components: {
                            operator: {},
                            widget: {}
                        },
                        connections: []
                    };
                }

                if (typeof state.visual_part.behaviours[i].components !== 'object') {
                    state.visual_part.behaviours[i].components = {};
                }

                if (!Array.isArray(state.visual_part.behaviours[i].connections)) {
                    state.visual_part.behaviours[i].connections = [];
                }
            }

            if (typeof state.visual_part.components !== 'object') {
                state.visual_part.components = {};
            }

            if (!Array.isArray(state.visual_part.connections)) {
                state.visual_part.connections = [];
            }
        }

        return StyledElements.Utils.cloneObject(state);
    };

    // ==================================================================================
    // PUBLIC METHODS
    // ==================================================================================

    BehaviourEngine.prototype = {

        'updateConnection': function updateConnection(connectionIndex, connectionView) {
            if (this.readOnly) {
                return this;
            }

            if (connectionIndex in this.globalBehaviour.connections) {
                this.globalBehaviour.connections[connectionIndex] = connectionView;
            } else {
                if (!this.onlyUpdatable) {
                    this.globalBehaviour.connections.push(connectionView);
                }
            }

            return this;
        },

        'containsComponent': function containsComponent(type, id) {
            var i, found;

            for (found = false, i = 0; !found && i < this.behaviourList.length; i++) {
                if (this.behaviourList[i].containsComponent(type, id)) {
                    found = true;
                }
            }

            return found;
        },

        'getAllComponents': function getAllComponents(type) {
            return this.globalBehaviour.components[type];
        },

        'getAllConnections': function getAllConnections() {
            return this.globalBehaviour.connections;
        },

        'getConnection': function getConnection(connectionIndex) {
            var connectionView;

            if (connectionIndex in this.globalBehaviour.connections) {
                connectionView = this.globalBehaviour.connections[connectionIndex];
            }

            return connectionView;
        },

        'removeComponent': function removeComponent(type, id, cascadeRemove) {
            var i;

            if (this.readOnly || this.onlyUpdatable) {
                return -1;
            }

            if (typeof cascadeRemove !== 'boolean') {
                cascadeRemove = false;
            }

            if (!this.containsComponent(type, id)) {
                return -1;
            }

            if (cascadeRemove) {
                for (i = 0; i < this.behaviourList.length; i++) {
                    this.behaviourList[i].removeComponent(type, id);
                }
            } else {
                if (!this.activeBehaviour.containsComponent(type, id)) {
                    return 0;
                }

                this.activeBehaviour.removeComponent(type, id);

                if (this.containsComponent(type, id)) {
                    return 1;
                }
            }

            delete this.globalBehaviour.components[type][id];

            return 2;
        },

        'removeConnection': function removeConnection(connectionIndex) {
            if (this.readOnly || this.onlyUpdatable) {
                return -1;
            }

            if (connectionIndex in this.globalBehaviour.connections) {
                this.globalBehaviour.connections.splice(connectionIndex, 1);
            }

            return this;
        },

        'serialize': function serialize() {
            var cleaned_data, i;

            cleaned_data = {
                'global': cloneObject(this.globalBehaviour)
            };

            for (i = 0; i < this.behaviourList.length; i++) {
                cleaned_data[i] = cloneObject(this.behaviourList[i].serialize());
            }

            return cleaned_data;
        },

        'updateComponent': function updateComponent(type, id, view) {
            if (this.readOnly) {
                return this;
            }

            view = cloneObject(view);

            if (this.globalOutlook) {
                if (!this.onlyUpdatable) {
                    this.activeBehaviour.updateComponent(type, id);
                }

                this.globalBehaviour.components[type][id] = view;
            }

            return this;
        },

        'viewOf': function viewOf(type, id, behaviour) {
            var view;

            if (this.globalOutlook) {
                view = this.globalBehaviour.components[type][id];
            }

            return view;
        }

    };

    /**
     * @public
     * @function
     *
     * @param {Behaviour} behaviour
     * @returns {BehaviourEngine} The instance on which this function was called.
     */
    BehaviourEngine.prototype.activateBehaviour = function activateBehaviour(behaviour) {
        this.dispatchEvent('beforeActivate')({
            'behaviour': this.currentBehaviour,
            'behaviourEngine': this
        });

        desactivateAllExcept.call(this, behaviour);

        this.dispatchEvent('activate')({
            'behaviour': this.currentBehaviour,
            'behaviourEngine': this
        });

        return this;
    };

    /**
     * @public
     * @function
     *
     * @param {Behaviour} behaviour
     * @returns {BehaviourEngine} The instance on which this function was called.
     */
    BehaviourEngine.prototype.appendBehaviour = function appendBehaviour(behaviour) {
        this._appendBehaviour(behaviour);

        if (behaviour.active || !this.currentBehaviour) {
            desactivateAllExcept.call(this, behaviour);
        }

        this.dispatchEvent('append')({
            'behaviour': this.currentBehaviour,
            'behaviourEngine': this
        });

        return this;
    };

    /**
     * Remove the set of behaviours saved.
     * @public
     * @function
     *
     * @returns {BehaviourEngine} The instance on which this function was called.
     */
    BehaviourEngine.prototype.empty = function empty() {
        delete this.currentBehaviour;
        delete this.currentState;
        delete this.currentViewpoint;

        this.currentViewpoint = BehaviourEngine.viewpoints.GLOBAL;
        this.emptyBehaviourList();

        return this;
    };

    /**
     * Save the current wiring state given and all behaviours that contains them.
     * @public
     * @function
     *
     * @param {Object.<String, *>} state
     * @returns {BehaviourEngine} The instance on which this function was called.
     */
    BehaviourEngine.prototype.loadWiring = function loadWiring(state) {
        var i;

        this.empty();
        this.currentState = BehaviourEngine.normalizeWiring(state);

        for (i = 0; i < this.currentState.visual_part.behaviours.length; i++) {
            this.appendBehaviour(this.createBehaviour(this.currentState.visual_part.behaviours[i]));
        }

        if (!this.manager.hasChildren()) {
            this.appendBehaviour(this.createBehaviour());
        }

        return this;
    };

    /**
     * @public
     * @function
     *
     * @param {Behaviour} behaviour
     * @returns {BehaviourEngine} The instance on which this function was called.
     */
    BehaviourEngine.prototype.removeBehaviour = function removeBehaviour(behaviour) {
        var found, i, index, oldBehaviour;

        if (this.erasureEnabled && (index=this.getBehaviourIndexOf(behaviour)) != -1) {
            if (this.currentBehaviour.equals(behaviour)) {
                for (found = false, i = 0; !found && i < this.behaviourList.length; i++) {
                    if (!this.behaviourList[i].equals(behaviour)) {
                        oldBehaviour = this.behaviourList[i];
                        found = true;
                    }
                }
            } else {
                oldBehaviour = this.currentBehaviour;
            }

            this.activateBehaviour(behaviour);
            this.dispatchEvent('beforeRemove')({
                'behaviour': behaviour,
                'behaviourEngine': this
            });

            this.activateBehaviour(oldBehaviour);
            this._removeBehaviour(behaviour);
        }

        return this;
    };

    /**
     * @private
     * @function
     *
     * @param {Behaviour} behaviour
     * @returns {BehaviourEngine} The instance on which this function was called.
     */
    var desactivateAllExcept = function desactivateAllExcept(behaviour) {
        var i, found;

        for (found = false, i = 0; i < this.behaviourList.length; i++) {
            this.behaviourList[i].active = false;

            if (!found && this.behaviourList[i].equals(behaviour)) {
                this.currentBehaviour = this.behaviourList[i];
                found = true;
            }
        }

        this.currentBehaviour.active = true;

        return this;
    };

    return BehaviourEngine;

})();
