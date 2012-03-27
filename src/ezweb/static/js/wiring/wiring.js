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


function Wiring (workspace, workSpaceGlobalInfo) {

    // *****************
    //  PRIVATE METHODS
    // *****************

    Wiring.prototype.processFilter = function (filterData) {
        var filterObject = new Filter (filterData.id, filterData.name, filterData.label,
                                       filterData.nature, filterData.code, filterData.category,
                                       filterData.params, filterData.help_text);

        this.filters.set(filterData.id, filterObject);
    }

    Wiring.prototype.processTab = function (tabData) {
        var igadgets = tabData['igadgetList'];
        var dragboard = this.workspace.getTab(tabData['id']).getDragboard();

        for (var i = 0; i < igadgets.length; i++) {
            this.addInstance(dragboard.getIGadget(igadgets[i].id), igadgets[i].variables);
        }
    }

    /**
     * @private
     *
     * Recreates the correct <code>wConnectable</code> that represents the given
     * variable and inserts it into wiring data structures.
     *
     * @param {JSON} varData json from persistence representing a variable.
     */
    Wiring.prototype.processVar = function (varData) {
        var varManager, readOnly, channel, fParams;

        varManager = this.workspace.getVarManager();
        readOnly = varData.readOnly;
        channel = new wChannel(varData.name, varData.id, false, readOnly);

        // Setting channel filter
        channel.setFilter(this.filters.get(varData.filter));

        if (varData.filter_params) {
            fParams = JSON.parse(varData.filter_params);
        } else {
            fParams = []
        }

        channel.setFilterParams(fParams);

        // Connecting channel input
        var connectable_ins = varData.ins;
        for (var j = 0; j < connectable_ins.length; j++) {
            // Input can be: {wEvent}
            var current_input = connectable_ins[j];

            var in_connectable = null;
            var var_id = current_input.var_id;
            in_connectable = varManager.getVariableById(var_id).getConnectable();

            in_connectable.connect(channel);
        }

        // Connecting channel output (except connections to wChannels)
        var connectable_outs = varData.outs;
        for (var j = 0; j < connectable_outs.length; j++) {
            // Outputs can be: {wSlot}
            var current_output = connectable_outs[j];

            var out_connectable = null;
            var var_id = current_output.var_id;
            out_connectable = varManager.getVariableById(var_id).getConnectable();

            channel.connect(out_connectable);
        }

        // Save it on the channel list
        this.channels.push(channel);
        this.channelsById[channel.getId()] = channel;
    }

    /**
     * @private
     *
     * Connects channels with other channels.
     */
    Wiring.prototype._connectInouts = function (varData) {
        var channel = this.channelsById[varData.id];
        var connectable_inouts = varData.out_inouts;

        for (var j = 0; j < connectable_inouts.length; j++) {
            var out_inout = this.channelsById[connectable_inouts[j]];
            if (!channel.isConnectable(out_inout)) {
                var msg = gettext("Wiring: Loop detected while recovering wiring status from persistence.\nOutput connection to channel \"%(targetChannel)s\" from channel \"%(sourceChannel)s\" will be ignored.");
                msg = interpolate(msg,
                                  {sourceChannel: channel.getName(),
                                   targetChannel: out_inout.getName()},
                                  true);

                LogManagerFactory.getInstance().log(msg, Constants.Logging.WARN_MSG);
                continue;
            }
            channel.connect(out_inout);
        }
    }

    /**
     * @private
     *
     * Parses workSpaceData and fills the wiring data structures to recreate
     * the status saved into persistence.
     */
    Wiring.prototype._loadWiring = function (workSpaceData) {
        var workSpace = workSpaceData['workspace'];
        var ws_vars_info = workSpace['channels'];
        var tabs = workSpace['tabList'];
        var filters = workSpace['filters'];
        var i;

        for (i = 0; i < tabs.length; i++) {
            this.processTab(tabs[i]);
        }

        // Load all platform filters.
        // WARNING: Filters must be loaded before workspace variables
        for (i = 0; i < filters.length; i++) {
            this.processFilter(filters[i]);
        }

        // Load WorkSpace variables
        for (i = 0; i < ws_vars_info.length; i++) {
            this.processVar(ws_vars_info[i]);
        }

        // Load inter-channel connections
        for (i = 0; i < ws_vars_info.length; i++) {
            this._connectInouts(ws_vars_info[i]);
        }

        this.loaded = true;
    }

    /**
     * @private
     *
     * Generates and returns a new provisional channel id.
     */
    Wiring.prototype._newProvisionalChannelId = function () {
        return -this.currentProvisionalId++;
    }


    // ****************
    // PUBLIC METHODS
    // ****************

    Wiring.prototype.getConnectableId = function (variables, name, igadgetId) {
        for (var i = 0; i < variables.length; i++) {
            var variable = variables[i];

            if ((variable.name == name) && (variable.igadgetId == igadgetId)) {
                return variable.connectable.id;
            }
        }
    }

    Wiring.prototype.iGadgetLoaded = function (iGadget) {
        var entry = this.iGadgets[iGadget.getId()];
    }

    Wiring.prototype.iGadgetUnloaded = function (iGadget) {
        var entry = this.iGadgets[iGadget.getId()];

        for (var i = 0; i < entry.slots.length; i++) {
            entry.slots[i].variable.setHandler(null);
        }
    }

    Wiring.prototype.addInstance = function (igadget) {
        var varManager, iGadgetId, gadgetEntry, i, variableDef,
            connectables, variable, connectable;


        if (this.iGadgets[iGadgetId]) {
            var msg = gettext("Error adding iGadget into the wiring module of the workspace: Gadget instance already exists.");
            LogManagerFactory.getInstance().log(msg);
        }

        varManager = this.workspace.getVarManager();
        iGadgetId = igadget.getId();
        connectables  = igadget.getGadget().getTemplate().getConnectables();

        gadgetEntry = {
            events: [],
            slots: [],
            connectables: []
        };

        // IGadget variables
        for (i = 0; i < connectables.events.length; i += 1) {
            variableDef = connectables.events[i];
            variable = varManager.getVariableByName(iGadgetId, variableDef.name);
            connectable = new wEvent(variable, variableDef.type, variableDef.friend_code, variableDef.connectable_id);
            gadgetEntry.events.push(connectable);
            gadgetEntry.connectables.push(connectable);
        }
        for (i = 0; i < connectables.slots.length; i += 1) {
            variableDef = connectables.slots[i];
            variable = varManager.getVariableByName(iGadgetId, variableDef.name);
            connectable = new wSlot(variable, variableDef.type, variableDef.friend_code, variableDef.connectable_id);
            gadgetEntry.slots.push(connectable);
            gadgetEntry.connectables.push(connectable);
        }

        this.iGadgets[iGadgetId] = gadgetEntry;
    }

    /**
     * Removes an iGadget from this wiring instance. This method should be only
     * used by the Workspace class.
     */
    Wiring.prototype.removeInstance = function (iGadgetId) {
        var entry = this.iGadgets[iGadgetId];

        if (!entry) {
            var msg = gettext("Wiring error: Trying to remove an inexistent igadget.");
            LogManagerFactory.getInstance().log(msg);
            return;
        }

        for (var i = 0; i < entry.events.length; i++) {
            entry.events[i].destroy();
        }
        entry.events.clear();

        for (var i = 0; i < entry.slots.length; i++) {
            entry.slots[i].destroy();
        }
        entry.slots.clear();

        delete this.iGadgets[iGadgetId];
    }

    /**
     * Returns a list of all connectable associated to a given iGadget.
     *
     * @param {Number} iGadget id of the iGadget to look up for connectables
     * @return {Array}
     */
    Wiring.prototype.getIGadgetConnectables = function(iGadget) {
        var iGadgetEntry = this.iGadgets[iGadget.id];

        if (iGadgetEntry == null) {
            var msg = gettext("Wiring error: Trying to retrieve the connectables of an inexistent igadget.");
            LogManagerFactory.getInstance().log(msg);
            return [];
        }

        return iGadgetEntry.connectables;
    }

    /**
     * Returns a list of all events associated to a given iGadget.
     *
     * @param {Number} iGadget id of the iGadget to look up for connectables
     * @return {Array}
     */
    Wiring.prototype.getIGadgetEvents = function(iGadget) {
        var iGadgetEntry = this.iGadgets[iGadget.id];

        if (iGadgetEntry == null) {
            var msg = gettext("Wiring error: Trying to retrieve the connectables of an inexistent igadget.");
            LogManagerFactory.getInstance().log(msg);
            return [];
        }

        return iGadgetEntry.events;
    }

    /**
     * Returns a list of all slots associated to a given iGadget.
     *
     * @param {Number} iGadget id of the iGadget to look up for connectables
     * @return {Array}
     */
    Wiring.prototype.getIGadgetSlots = function(iGadget) {
        var iGadgetEntry = this.iGadgets[iGadget.id];

        if (iGadgetEntry == null) {
            var msg = gettext("Wiring error: Trying to retrieve the connectables of an inexistent igadget.");
            LogManagerFactory.getInstance().log(msg);
            return [];
        }

        return iGadgetEntry.slots;
    }

    /**
     * Returns a list with all channel managed by this wiring instance.
     *
     * @return {Array}
     */
    Wiring.prototype.getChannels = function() {
        return this.channels;
    }

    /**
     * Returns the list of filter that this wiring instance manages sorted by
     * name.
     *
     * @return {Array}
     */
    Wiring.prototype.getFiltersSort = function() {
        var sortByLabel = function (a, b) {
            var x = a.getName();
            var y = b.getName();
            return ((x < y) ? -1 : ((x > y) ? 1 : 0));
        }
        return this.filters.values().sort(sortByLabel);
    }

    /**
     * Checks if there is currently a channel with a given name.
     */
    Wiring.prototype.channelExists = function(channelName) {
        return this.channels.getElementByName(channelName) ? true : false;
    }

    /**
     * Creates a new Channel
     *
     * @param {String} channelName name of the new channel
     */
    Wiring.prototype.createChannel = function (channelName) {
        if (this.channelExists(channelName)) {
            var msg = gettext("Error creating channel %(channelName)s: Channel already exists");
            msg = interpolate(msg, {channelName: channelName}, true);
            LogManagerFactory.getInstance().log(msg);
            return;
        }

        var channelId = this._newProvisionalChannelId();

        //create a channel. Params: variable, name, id, provisional id, readOnly
        var channel = new wChannel(channelName, channelId, true, false);
        this.channels.push(channel);

        // Save it on the provisional channel list
        this.provisionalChannels[channelId] = channel;

        return channel;
    }

    /**
     * Removes the given channel form the wiring.
     *
     * @param {wChannel} channel channel to remove. This channel must belong to
     *        this wiring instance.
     */
    Wiring.prototype.removeChannel = function (channel) {
        // Mark it to remove from persistence
        this.channelsForRemoving.push(channel.getId());

        // Remove it from the list of channels
        this.channels.remove(channel);

        // Free memory
        channel.destroy();
    }

    /**
     * Unloads this wiring instance. After this, this wiring instance can not be
     * use any more.
     */
    Wiring.prototype.unload = function () {
        for (var i = 0; i < this.channels.length; i++) {
            var channel = this.channels[i];
            channel.destroy();
        }

        loaded = false;
    }

    /**
     * @private
     */
    Wiring.prototype.serializationSuccess = function (transport) {
        // JSON-coded ids mapping
        var response = transport.responseText;
        var json = JSON.parse(response);

        var provisional_id, new_id, mappings = json['ids'];
        for (var provisional_id in mappings) {
            var new_id = mappings[provisional_id];

            var curChannel = this.provisionalChannels[provisional_id];
            delete this.provisionalChannels[provisional_id];

            curChannel.id = new_id;
            curChannel.provisional_id = false;
        }

        // Cleaning state variables
        this.channelsForRemoving = [];
    }

    /**
     * @private
     */
    Wiring.prototype.serializationError = function (transport, e) {
        var logManager = LogManagerFactory.getInstance();
        var msg = logManager.formatError(gettext("Error saving wiring status: %(errorMsg)s."), transport, e);
        logManager.log(msg);
    }

    /**
     * Saves the wiring state.
     */
    Wiring.prototype.serialize = function () {
        var serialized_channels = {};

        // Channels
        for (var i = 0; i < this.channels.length; i++) {
            var channel = this.channels[i];
            var serialized_channel = new Object();

            // Filling channel info!!!
            serialized_channel['id'] = channel.id;
            serialized_channel['name'] = channel._name;
            serialized_channel['type'] = channel._type;
            serialized_channel['friend_code'] = channel._friendCode;
            serialized_channel['provisional_id'] = channel.provisional_id;
            serialized_channel['readOnly'] = channel.readOnly;
            if (channel.getFilter() == null)
                serialized_channel['filter'] = null;
            else
                serialized_channel['filter'] = channel.getFilter().getId();

            serialized_channel['filter_params'] = channel.getFilterParams();

            // Inputs (except inouts)
            serialized_channel['ins'] = [];
            for (var j = 0; j < channel.inputs.length; j++) {
                var input = channel.inputs[j];

                if (input instanceof wInOut)
                    continue;

                serialized_channel['ins'].push(input.id);
            }

            // Outputs (except inouts)
            serialized_channel.outs = [];
            var inouts = [];
            for (var j = 0; j < channel.outputs.length; j++) {
                var output = channel.outputs[j];

                if (output instanceof wInOut) {
                    inouts.push(output);
                    continue;
                }

                serialized_channel['outs'].push(output.id);
            }

            // Inouts connected as output
            serialized_channel['inouts'] = [];
            for (var j = 0; j < inouts.length; j++) {
                var inout = inouts[j];
                serialized_channel['inouts'].push({id: inout.id,
                                                   provisional_id: inout.provisional_id});
            }

            serialized_channels[channel.id] = serialized_channel;
        }

        // Send data to persistence engine
        var param = {'json': Object.toJSON({'inOutList': serialized_channels})};

        var url = URIs.GET_POST_WIRING.evaluate({'id': this.workspace.workSpaceState.id});
        Wirecloud.io.makeRequest(url, {
            method: 'POST',
            parameters: param,
            onSuccess: this.serializationSuccess.bind(this),
            onFailure: this.serializationError.bind(this),
            onException: this.serializationError.bind(this)
        });
    }

    // ***************
    // CONSTRUCTOR
    // ***************
    this.workspace = workspace;

    this.loaded = false;
    this.iGadgets = {};
    this.channels = [];
    this.channelsById = {};
    this.filters = new Hash();
    this.channelsForRemoving = [];
    this.provisionalChannels = [];
    this.currentProvisionalId = 1;

    this._loadWiring(workSpaceGlobalInfo);

    delete this['channelsById']; // this variable is only used on wiring loading
}
