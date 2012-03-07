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


function WorkSpace (workSpaceState) {

    WorkSpace.prototype._manageAddTabElement = function(locked) {
        if (this.addTabElement) {
            if (this.isAllowed('add_tab')) {
                if (locked) {
                    this.addTabElement.hide();
                }
                else {
                    this.addTabElement.show();
                }
            }
            else {
                this.addTabElement.hide();
            }
        }
    }

    // ****************
    // CALLBACK METHODS
    // ****************

    /**
     * Initializes this WorkSpace in failsafe mode.
     */
    var _failsafeInit = function(transport, e) {
        this.valid = false;

        // Log it on the log console
        var logManager = LogManagerFactory.getInstance();
        msg = logManager.formatError(gettext("Error loading workspace: %(errorMsg)s"), transport, e);
        logManager.log(msg);

        // Show a user friend alert
        var layoutManager = LayoutManagerFactory.getInstance();
        var msg = gettext('Error loading workspace. Please, change active workspace or create a new one.');
        layoutManager.showMessageMenu(msg, Constants.Logging.ERROR_MSG);

        // Clean current status
        this.varmanager = null;
        this.contextManager = null;
        this.wiring = null;
        this.wiringInterface = null;

        // Failsafe workspace status
        layoutManager.currentViewType = "dragboard"; // workaround
        this.preferences = PreferencesManagerFactory.getInstance().buildPreferences('workspace', {}, this)

        var initialTab = {
                          'id': 0,
                          'locked': "true",
                          'igadgetList': [],
                          'name': gettext("Unusable Tab"),
                          'visible': 1,
                          'preferences': {}
                         };

        this.workSpaceGlobalInfo = {
                                    'workspace': {
                                       'tabList': [
                                         initialTab
                                       ]
                                     }
                                   };
        this.tabInstances = new Hash();
        // TODO
        this.notebook.clear()
        this.tabInstances[0] = this.notebook.createTab({'tab_constructor': Tab, 'tab_info': initialTab, 'workspace': this});
        this.visibleTab = this.tabInstances[0];

        this.loaded = true;

        layoutManager.logStep('');
        OpManagerFactory.getInstance().continueLoadingGlobalModules(Modules.prototype.ACTIVE_WORKSPACE);
    };

    // Not like the remaining methods. This is a callback function to process AJAX requests, so must be public.
    var loadWorkSpace = function (transport) {
        var layoutManager, params, param, preferenceValues;

        layoutManager = LayoutManagerFactory.getInstance();
        layoutManager.logStep('');
        layoutManager.logSubTask(gettext('Processing workspace data'));

        try {
            // JSON-coded iGadget-variable mapping
            this.workSpaceGlobalInfo = JSON.parse(transport.responseText);

            // Load workspace preferences
            params = this.workSpaceGlobalInfo.workspace.empty_params;
            preferenceValues = this.workSpaceGlobalInfo['workspace']['preferences'];
            this.preferences = PreferencesManagerFactory.getInstance().buildPreferences('workspace', preferenceValues, this, params);

            // Check if the workspace needs to ask some values before loading this workspace
            if (this.workSpaceGlobalInfo.workspace.empty_params.length > 0) {
                preferenceValues = {};
                for (i = 0; i < params.length; i += 1) {
                    param = params[i];
                    if (this.workSpaceGlobalInfo.workspace.preferences[param] != null) {
                        preferenceValues[param] = this.workSpaceGlobalInfo.workspace.preferences[param];
                    }
                }

                this.preferences.addCommitHandler(function() {
                    setTimeout(function() {
                        OpManagerFactory.getInstance().changeActiveWorkSpace(this);
                    }.bind(this), 0);
                }.bind(this));
                LayoutManagerFactory.getInstance().showPreferencesWindow('workspace', this.preferences, false);
                return;
            }

            // Load workspace tabs
            var tabs = this.workSpaceGlobalInfo['workspace']['tabList'];
            var visibleTabId = null;
            var loading_tab = this.notebook.createTab({'closeable': false});

            if (tabs.length > 0) {
                visibleTabId = tabs[0].id;
                for (var i = 0; i < tabs.length; i++) {
                    var tab = tabs[i];
                    var tabInstance = this.notebook.createTab({'tab_constructor': Tab, 'tab_info': tab, 'workspace': this});
                    this.tabInstances.set(tab.id, tabInstance);

                    if (tab.visible) {
                        visibleTabId = tab.id;
                    }
                }
            }

            this.varManager = new VarManager(this);

            this.contextManager = new ContextManager(this, this.workSpaceGlobalInfo);
            this.wiring = new Wiring(this, this.workSpaceGlobalInfo);

            // FIXME
            LayoutManagerFactory.getInstance().mainLayout.repaint();
            LayoutManagerFactory.getInstance().header._paintBreadcrum(LayoutManagerFactory.getInstance().viewsByName['workspace']);
            this.wiringInterface = LayoutManagerFactory.getInstance().viewsByName['wiring'];
            this.wiringInterface.assignWorkspace(this);

            this.restricted = !this.isOwned() && this.isShared();
            this.removable = !this.restricted && this.workSpaceGlobalInfo.workspace.removable;
            this.valid = true;

            if (this.initial_tab_id && this.tabInstances.get(this.initial_tab_id)) {
                visibleTabId = this.initial_tab_id;
            }

            this.notebook.goToTab(this.tabInstances.get(visibleTabId));
            loading_tab.close();

        } catch (error) {
            // Error during initialization
            // Loading in failsafe mode
            _failsafeInit.call(this, transport, error);
            return;
        }

        this.loaded = true;

        this._createWorkspaceMenu();

        this._update_creator_options();
        this._lockFunc(false);

        layoutManager.logStep('');
        OpManagerFactory.getInstance().continueLoadingGlobalModules(Modules.prototype.ACTIVE_WORKSPACE);
        LogManagerFactory.getInstance().log(gettext('workspace loaded'), Constants.Logging.INFO_MSG);
    }

    var onError = function (transport, e) {
        _failsafeInit.call(this, transport, e);
    }

    var renameSuccess = function(transport) {
    }
    var renameError = function(transport, e) {
        var logManager = LogManagerFactory.getInstance();
        var msg = logManager.formatError(gettext("Error renaming workspace, changes will not be saved: %(errorMsg)s."), transport, e);
        logManager.log(msg);
    }
    var deleteSuccess = function(transport) {
        var i, tab_keys = this.tabInstances.keys();

        for (i = 0; i < tab_keys.length; i += 1) {
            this.tabInstances[tab_keys[i]].destroy();
            //TODO:treatment of wiring, varManager, etc.
        }
        LayoutManagerFactory.getInstance().hideCover();
    }

    var deleteError = function(transport, e) {
        var logManager = LogManagerFactory.getInstance();
        var msg = logManager.formatError(gettext("Error removing workspace, changes will not be saved: %(errorMsg)s."), transport, e);
        logManager.log(msg);
        LayoutManagerFactory.getInstance().hideCover();
    }

    var publishSuccess = function (transport) {
        var layoutManager = LayoutManagerFactory.getInstance();
        layoutManager.logSubTask(gettext('Workspace published successfully'));
        layoutManager.logStep('');
        layoutManager._notifyPlatformReady();
        this.workspace.workSpaceGlobalInfo.workspace.params = this.params;
        CatalogueFactory.getInstance().invalidate_last_results('mashup');
    };

    var publishError = function(transport, e) {
        var logManager, layoutManager, msg;

        logManager = LogManagerFactory.getInstance();
        layoutManager = LayoutManagerFactory.getInstance();

        msg = logManager.formatError(gettext("Error publishing workspace: %(errorMsg)s."), transport, e);
        layoutManager._notifyPlatformReady();
        logManager.log(msg);
        layoutManager.showMessageMenu(msg, Constants.Logging.ERROR_MSG);
    }

    var mergeSuccess = function(transport) {
        // JSON-coded new published workspace id and mashup url mapping
        var response = transport.responseText;
        var data = JSON.parse(response);
        //update the new wsInfo
        opManager = OpManagerFactory.getInstance();
        opManager.changeActiveWorkSpace(opManager.workSpaceInstances.get(data.merged_workspace_id));
        LayoutManagerFactory.getInstance().hideCover();
    }

    var mergeError = function(transport, e) {
        var logManager, layoutManager, msg;

        logManager = LogManagerFactory.getInstance();
        msg = logManager.formatError(gettext("Error merging workspaces: %(errorMsg)s."), transport, e);
        logManager.log(msg);

        layoutManager = LayoutManagerFactory.getInstance();
        layoutManager.logStep('');
        layoutManager._notifyPlatformReady();

        layoutManager.showMessageMenu(msg, Constants.Logging.ERROR_MSG);
    }

    //**** TAB CALLBACK*****
    var createTabSuccess = function(transport) {
        var response = transport.responseText;
        var tabInfo = JSON.parse(response);

        tabInfo.igadgetList = [];
        tabInfo.preferences = {};

        var newTab = this.notebook.createTab({'tab_constructor': Tab, 'tab_info': tabInfo, 'workspace': this});
        this.tabInstances.set(tabInfo.id, newTab);
        this.setTab(newTab);

        newTab.getDragboard().paint();
        newTab.setLock(false);
    }

    var createTabError = function(transport, e) {
        var logManager = LogManagerFactory.getInstance();
        var msg = logManager.formatError(gettext("Error creating a tab: %(errorMsg)s."), transport, e);
        logManager.log(msg);
    }

    // ****************
    // PUBLIC METHODS
    // ****************


    WorkSpace.prototype.igadgetLoaded = function(igadgetId) {
        var igadget = this.getIgadget(igadgetId);
        igadget._notifyLoaded();

        // Notify to the wiring module the igadget has been loaded
        this.wiring.iGadgetLoaded(igadget);

        // Notify to the context manager the igadget has been loaded
        this.contextManager.iGadgetLoaded(igadget);

        // Notify to the variable manager the igadget has been loaded
        this.varManager.dispatchPendingVariables(igadgetId);

    }

    WorkSpace.prototype.checkForGadgetUpdates = function() {
        var i, igadgets;

        igadgets = this.getIGadgets();
        for (i = 0; i < igadgets.length; i += 1) {
            igadgets[i]._updateVersionButton();
        }
    };

    WorkSpace.prototype.getTabInstance = function(tabId) {
        return this.tabInstances.get(tabId);
    }


    WorkSpace.prototype.run_script = function() {
        ScriptManagerFactory.getInstance().run_script(this);
    }

    WorkSpace.prototype.igadgetUnloaded = function(igadgetId) {
        var igadget = this.getIgadget(igadgetId);
        if (igadget == null)
            return;

        // Notify to the wiring module the igadget has been unloaded
        this.wiring.iGadgetUnloaded(igadget);

        // Notify to the context manager the igadget has been unloaded
        this.contextManager.iGadgetUnloaded(igadget);

        igadget._notifyUnloaded();
    }

    WorkSpace.prototype.sendBufferedVars = function (async) {
        if (this.varManager) this.varManager.sendBufferedVars(async);
    }

    WorkSpace.prototype.getHeader = function(){
        return this.headerHTML;
    }

    WorkSpace.prototype.fillWithLabel = function() {
        var nameToShow = (this.workSpaceState.name.length>15)?this.workSpaceState.name.substring(0, 15)+"..." : this.workSpaceState.name;

        this.workSpaceNameHTMLElement = this.workSpaceHTMLElement.firstDescendant();
        if (this.workSpaceNameHTMLElement != null) {
            this.workSpaceNameHTMLElement.update(nameToShow);
        }else {
            var spanHTML = "<span>" + nameToShow + "</span>";
            new Insertion.Top(this.workSpaceHTMLElement, spanHTML);
            this.workSpaceNameHTMLElement = this.workSpaceHTMLElement.firstDescendant();
        }
    }

    WorkSpace.prototype.rename = function(name){
        this.updateInfo(name);
        this.fillWithLabel();
    }

    WorkSpace.prototype.updateInfo = function (workSpaceName) {
        //If the server isn't working the changes will not be saved
        if (workSpaceName == "" || workSpaceName.match(/^\s$/)){//empty name
            var msg = interpolate(gettext("Error updating a workspace: invalid name"), true);
            LogManagerFactory.getInstance().log(msg);
        } else if (!OpManagerFactory.getInstance().workSpaceExists(workSpaceName)) {
            this.workSpaceState.name = workSpaceName;

            var workSpaceUrl = URIs.GET_POST_WORKSPACE.evaluate({'id': this.workSpaceState.id, 'last_user': last_logged_user});
            var o = new Object();
            o.name = workSpaceName;
            var workSpaceData = Object.toJSON(o);
            var params = {'workspace': workSpaceData};
            PersistenceEngineFactory.getInstance().send_update(workSpaceUrl, params, this, renameSuccess, renameError);
        } else {
            var msg = interpolate(gettext("Error updating a workspace: the name %(workSpaceName)s is already in use."), {workSpaceName: workSpaceName}, true);
            LogManagerFactory.getInstance().log(msg);
        }
    }

    WorkSpace.prototype.deleteWorkSpace = function() {
        if (OpManagerFactory.getInstance().removeWorkSpace(this.workSpaceState.id)) {
            var workSpaceUrl = URIs.GET_POST_WORKSPACE.evaluate({'id': this.workSpaceState.id, 'last_user': last_logged_user});
            PersistenceEngineFactory.getInstance().send_delete(workSpaceUrl, this, deleteSuccess, deleteError);
        }
    }

    WorkSpace.prototype.getName = function () {
        return this.workSpaceState.name;
    }


    WorkSpace.prototype.getId = function () {
        return this.workSpaceState.id;
    }

    WorkSpace.prototype.getWiring = function () {
        return this.wiring;
    }

    WorkSpace.prototype.getWiringInterface = function () {
        return this.wiringInterface;
    }

    WorkSpace.prototype.getVarManager = function () {
        return this.varManager;
    }

    WorkSpace.prototype.getContextManager = function () {
        return this.contextManager;
    }

    WorkSpace.prototype.isEmpty = function () {
        if (this.tabInstances.keys().length >= 1) {
            return this.visibleTab.dragboard.getIGadgets().length === 0;
        }
        return false;
    }

    WorkSpace.prototype.downloadWorkSpaceInfo = function (initial_tab) {
        // TODO
        this.renameTabWindow = new RenameTabWindowMenu();
        this.notebook = new StyledElements.StyledNotebook({'class': 'workspace'});
        this.notebook.addEventListener('change', function (notebook, old_tab, new_tab) {
            this.visibleTab = new_tab;
        });
        LayoutManagerFactory.getInstance().viewsByName['workspace'].clear();
        LayoutManagerFactory.getInstance().viewsByName['workspace'].appendChild(this.notebook);

        LayoutManagerFactory.getInstance().logSubTask(gettext("Downloading workspace data"), 1);
        this.initial_tab_id = initial_tab;
        var workSpaceUrl = URIs.GET_POST_WORKSPACE.evaluate({'id': this.workSpaceState.id, 'last_user': last_logged_user});
        PersistenceEngineFactory.getInstance().send_get(workSpaceUrl, this, loadWorkSpace, onError);
    };

    WorkSpace.prototype.getIgadget = function(igadgetId) {
        var i, tab_keys = this.tabInstances.keys();
        for (i = 0; i < tab_keys.length; i += 1) {
            var tab = this.tabInstances.get(tab_keys[i]);
            var igadget = tab.getDragboard().getIGadget(igadgetId);

            if (igadget) {
                return igadget;
            }
        }
        return null;
    }

    WorkSpace.prototype.prepareToShow = function() {
        var layoutManager = LayoutManagerFactory.getInstance();

        if (!this.loaded) {
            return;
        }


    };

    WorkSpace.prototype.isValid = function() {
        return this.valid;
    }

    WorkSpace.prototype.getTab = function(tabId) {
        return this.tabInstances.get(tabId);
    }

    WorkSpace.prototype.setTab = function(tab) {
        if (!this.loaded || tab == null) {
            return;
        }
        if (!(tab instanceof Tab)) {
            throw new TypeError();
        }

        this.visibleTab = tab;
        this.notebook.goToTab(tab);
    }

    WorkSpace.prototype.getVisibleTab = function() {
        if (!this.loaded)
            return;

        return this.notebook.getVisibleTab();
    }

    WorkSpace.prototype.tabExists = function(tabName){
        var tabValues = this.tabInstances.values();
        for (var i = 0; i < tabValues.length; i++) {
            if (tabValues[i].tabInfo.name === tabName) {
                return true;
            }
        }
        return false;
    }

    WorkSpace.prototype.addTab = function() {
        var counter, prefixName, tabName, url, params;

        if (!this.isValid()) {
            return;
        }

        counter = this.tabInstances.keys().length + 1;
        prefixName = gettext("Tab");
        tabName = prefixName + " " + counter.toString();
        //check if there is another tab with the same name
        while (this.tabExists(tabName)) {
            tabName = prefixName + " " + (counter++).toString();
        }
        url = URIs.GET_POST_TABS.evaluate({'workspace_id': this.workSpaceState.id});
        params = {
            tab: Object.toJSON({name: tabName})
        };
        PersistenceEngineFactory.getInstance().send_post(url, params, this, createTabSuccess, createTabError);
    }

    //It returns if the tab can be removed and shows an error window if it isn't possible
    WorkSpace.prototype.removeTab = function(tab) {
        var msg=null;
        if (this.tabInstances.keys().length <= 1) {
            msg = gettext("there must be one tab at least");
            msg = interpolate(gettext("Error removing tab: %(errorMsg)s."), {
                errorMsg: msg
            }, true);
        } else if (tab.hasReadOnlyIGadgets()) {
            msg = gettext("it contains some gadgets that cannot be removed");
            msg = interpolate(gettext("Error removing tab: %(errorMsg)s."), {
                errorMsg: msg
            }, true);
        }

        if (msg) { //It cannot be deleted
            LogManagerFactory.getInstance().log(msg);
            //LayoutManagerFactory.getInstance().hideCover();
            LayoutManagerFactory.getInstance().showMessageMenu(msg, Constants.Logging.ERROR_MSG);
            return false;
        }

        this.unloadTab(tab.getId());

        return true;
    }

    WorkSpace.prototype.unloadTab = function(tabId) {
        if (!this.valid)
            return;

        var tab = this.tabInstances.get(tabId);

        this.tabInstances.unset(tabId);
        tab.destroy();

        this.visibleTab = null;
    }

    WorkSpace.prototype.unload = function() {

        var layoutManager = LayoutManagerFactory.getInstance();
        layoutManager.logSubTask(gettext("Unloading current workspace"));

        // Unload Wiring Interface
        // TODO Wiring Interface should be shared between Workspaces
        if (this.wiringInterface !== null) {
            this.wiringInterface.saveWiring();
        }

        //layoutManager.unloadCurrentView();

        this.sendBufferedVars(false);

        // After that, tab info is managed
        var tabKeys = this.tabInstances.keys();

        for (var i=0; i<tabKeys.length; i++) {
            this.unloadTab(tabKeys[i]);
        }

        if (this.preferences) {
            this.preferences.destroy();
            this.preferences = null;
        }

        if (this.wiring !== null) {
            this.wiring.unload();
        }
        if (this.contextManager !== null) {
            this.contextManager.unload();
            this.contextManager = null;
        }

        this._removeWorkspaceMenu();

        layoutManager.logStep('');
        LogManagerFactory.getInstance().log(gettext('workspace unloaded'), Constants.Logging.INFO_MSG);
        LogManagerFactory.getInstance().newCycle();
    }

    WorkSpace.prototype.goTab = function(tab) {
        if (!this.loaded)
            return;

        this.visibleTab = tab;
        this.notebook.goToTab(tab);
    }


    WorkSpace.prototype.addIGadget = function(tab, igadget, igadgetJSON, options) {
        this.varManager.addInstance(igadget, igadgetJSON, tab);
        this.contextManager.addInstance(igadget, igadget.getGadget().getTemplate());
        this.wiring.addInstance(igadget, igadgetJSON.variables);

        options.setDefaultValues.call(this, igadget.id);

        igadget.paint();
    };

    WorkSpace.prototype.removeIGadgetData = function(iGadgetId) {
            this.varManager.removeInstance(iGadgetId);
            this.wiring.removeInstance(iGadgetId);
            this.contextManager.removeInstance(iGadgetId);
    }

    WorkSpace.prototype.removeIGadget = function(iGadgetId, orderFromServer) {
        var igadget = this.getIgadget(iGadgetId);
        if (igadget) {
            var dragboard = igadget.layout.dragboard;
            dragboard.removeInstance(iGadgetId, orderFromServer); // TODO split into hideInstance and removeInstance
            this.removeIGadgetData(iGadgetId);
        }
    }

    WorkSpace.prototype.getIGadgets = function() {
        if (!this.loaded)
            return;

        var iGadgets = [];
        var keys = this.tabInstances.keys();
        for (var i = 0; i < keys.length; i++) {
            iGadgets = iGadgets.concat(this.tabInstances.get(keys[i]).getDragboard().getIGadgets());
        }

        return iGadgets;
    }

    WorkSpace.prototype.getActiveDragboard = function() {
        if (this.visibleTab) {
            return this.visibleTab.getDragboard();
        } else {
            // Shutting down the platform: no tab, no dragboard and no need to change to one
            return null;
        }
    }

    WorkSpace.prototype.shareWorkspace = function(value, groups) {
        var share_workspace_success = function (transport) {
            var response = transport.responseText;
            var result = JSON.parse(response);

            if (result['result'] != 'ok')
                LayoutManagerFactory.getInstance().showSharingWorkspaceResults(gettext("The Workspace has NOT been successfully shared."), '');
            else
                LayoutManagerFactory.getInstance().showSharingWorkspaceResults(gettext("The Workspace has been successfully shared."), result);
        }

        var share_workspace_error = function (transport) {
            var response = transport.responseText;
            var result = JSON.parse(response);

            LayoutManagerFactory.getInstance().showSharingWorkspaceResults(gettext("The Workspace has NOT been successfully shared."), '');
        }

        var url = URIs.PUT_SHARE_WORKSPACE.evaluate({'workspace_id': this.workSpaceState.id, 'share_boolean': value});
        var sharingData = Object.toJSON(groups);
        var params = (groups.length>0)?{'groups':sharingData}:{};

        PersistenceEngineFactory.getInstance().send_update(url, params, this, share_workspace_success, share_workspace_error);
    }

    WorkSpace.prototype.publish = function(data) {
        var layoutManager = LayoutManagerFactory.getInstance();
        layoutManager._startComplexTask(gettext('Publishing current workspace'), 1);

        var workSpaceUrl = URIs.POST_PUBLISH_WORKSPACE.evaluate({'workspace_id': this.workSpaceState.id});
        publicationData = Object.toJSON(data);
        params = new Hash({data: publicationData});
        PersistenceEngineFactory.getInstance().send_post(workSpaceUrl, params, {workspace: this, params: data}, publishSuccess, publishError);
    }

    WorkSpace.prototype.mergeWith = function(workspace) {
        var workSpaceUrl, layoutManager, msg;

        layoutManager = LayoutManagerFactory.getInstance();
        layoutManager._startComplexTask(gettext("Merging workspaces"), 1);
        msg = gettext('Merging "%(srcworkspace)s" into "%(dstworkspace)s"');
        msg = interpolate(msg, {srcworkspace: workspace.name, dstworkspace: this.getName()}, true);
        layoutManager.logSubTask(msg);

        workSpaceUrl = URIs.GET_MERGE_WORKSPACE.evaluate({'from_ws_id': workspace.id, 'to_ws_id': this.workSpaceState.id});
        PersistenceEngineFactory.getInstance().send_get(workSpaceUrl, this, mergeSuccess, mergeError);
    };

    // Checks if this workspace is shared with other users
    WorkSpace.prototype.isShared = function() {
        return this.workSpaceState['shared'];
    };

    // Checks if the current user is the creator of this workspace
    WorkSpace.prototype.isOwned = function() {
        return this.workSpaceState['owned'];
    };

    /**
     * Checks when an action, defined by a basic policy, can be performed.
     */
    WorkSpace.prototype._isAllowed = function (action) {
        if (EzSteroidsAPI.is_activated()) {
            return EzSteroidsAPI.evaluePolicy(action);
        } else {
            return true;
        }
    };

    /**
     * Checks if an action can be performed in this workspace by current user.
     */
    WorkSpace.prototype.isAllowed = function (action) {

        if (action != "add_remove_workspaces" && (!this.valid || this.restricted))
            return false;

        switch (action) {
        case "merge_workspaces":
            return this._isAllowed('add_remove_igadgets') || this._isAllowed('merge_workspaces');
        case "catalogue_view_gadgets":
            return this._isAllowed('add_remove_igadgets');
        case "catalogue_view_mashups":
            return this.isAllowed('add_remove_workspaces') || this.isAllowed('merge_workspaces');
        default:
            return this._isAllowed(action);
        }
    }

    /*
     * Menu with the options to configure the workspace
     */
    WorkSpace.prototype._createConfigurationMenu = function(){
        var idMenu = 'config_menu_'+this.workSpaceState.id;

        this.confMenu = this._initMenu(idMenu);

        /*** Add to the menu the proper options ***/
        var optionPosition = 0;
        var nworkspaces = OpManagerFactory.getInstance().workSpaceInstances.keys().length;

        // Mark as active option
        if (this.valid && !this.workSpaceGlobalInfo.workspace.active) {
            this.activeEntryId = this.confMenu.addOption(gettext("Initial"),
                function() {
                    LayoutManagerFactory.getInstance().hideCover();
                    this.markAsActive();
                }.bind(this),
                optionPosition++);
        }
        //Rename option
        if (this.isAllowed('rename_workspaces')) {
            this.confMenu.addOption(gettext("Rename"),
                function() {
                    LayoutManagerFactory.getInstance().showWindowMenu("renameWorkSpace");
                },
                optionPosition++);
        }
        // Workspace preferences option
        if (this.isAllowed('change_workspace_preferences')) {
            this.confMenu.addOption(gettext("Preferences"),
                function() {
                    LayoutManagerFactory.getInstance().showPreferencesWindow('workspace', this.preferences);
                }.bind(this),
                optionPosition++);
        }

        // Delete option
        if ((nworkspaces > 1) && this.removable && this.isAllowed('add_remove_workspaces')) {
            this.confMenu.addOption(gettext("Remove"),
                function() {
                    var msg = gettext('Do you really want to remove the "%(workspaceName)s" workspace?');
                    msg = interpolate(msg, {workspaceName: this.workSpaceState.name}, true);
                    LayoutManagerFactory.getInstance().showYesNoDialog(msg, function(){OpManagerFactory.getInstance().activeWorkSpace.deleteWorkSpace();})
                }.bind(this),
                optionPosition++);
        }

        //Merge workspace option
        if ((nworkspaces > 1) && this.isAllowed('merge_workspaces')) {

            // mergeWith workspace Menu
            var idMergeMenu = 'mergeMenu_'+this.workSpaceState.id;
            this.mergeMenu = LayoutManagerFactory.getInstance().initDropDownMenu(idMergeMenu);

            this.confMenu.addOption(gettext("Merge"),
                function(e) {
                    LayoutManagerFactory.getInstance().showDropDownMenu('wsList', this.mergeMenu, Event.pointerX(e), Event.pointerY(e));
                }.bind(this),
                optionPosition++);
        }

        if (optionPosition === 0) {
            this.confLauncher.addClassName('disabled_button');
        } else {
            this.confLauncher.removeClassName('disabled_button');
        }

        // add the event listener
        Event.observe(this.confLauncher, 'click',
                        function(e){
                            var target = BrowserUtilsFactory.getInstance().getTarget(e);
                            target.blur();
                            if (this.confLauncher.className.indexOf('disabled_button') >= 0) {
                                var msg = gettext("This WorkSpace is blocked, please create a new one if you want to configure it.");
                                this.messageWindowMenu = new MessageWindowMenu();
                                this.messageWindowMenu.iconElement.className += ' icon-error';
                                this.messageWindowMenu.setMsg(msg);
                                this.messageWindowMenu.show();
                            } else {
                                LayoutManagerFactory.getInstance().showToolbarMenu(this.confMenu, this.confLauncher, this.toolbarSection);
                            }
                        }.bind(this));
    }


    /*
     * Menu with the share and publish options
     */
    WorkSpace.prototype._createSharingMenu = function(){
        var idMenu = 'sharing_menu_'+this.workSpaceState.id;

        this.sharingMenu = this._initMenu(idMenu);

        /*** Add to the menu the proper options ***/
        var optionPosition = 0;

        if (this.isAllowed('share_workspaces')) {
            this.sharingMenu.addOption(gettext("Share"),
                function() {
                    LayoutManagerFactory.getInstance().showWindowMenu('shareWorkSpace');
                }.bind(this),
                optionPosition++, null, "share_workspace");
        }

        if (this.isAllowed('publish_workspaces')) {
            this.sharingMenu.addOption(gettext("Publish in gallery"),
                function() {
                    LayoutManagerFactory.getInstance().showWindowMenu('publishWorkSpace');
                }.bind(this),
                optionPosition++, null, "publish_workspace");
        }

        if (optionPosition === 0) {
            this.sharingLauncher.addClassName('disabled_button');
        } else {
            this.sharingLauncher.removeClassName('disabled_button');
        }

        // add the event listener
        Event.observe(this.sharingLauncher, 'click',
                        function(e){
                            var target = BrowserUtilsFactory.getInstance().getTarget(e);
                            target.blur();
                            if (this.sharingLauncher.className.indexOf('disabled_button') >= 0) {
                                var msg = gettext("This WorkSpace is blocked, please create a new one if you want to share it.");
                                this.messageWindowMenu = new MessageWindowMenu();
                                this.messageWindowMenu.iconElement.className += ' icon-error';
                                this.messageWindowMenu.setMsg(msg);
                                this.messageWindowMenu.show();
                            } else {
                                LayoutManagerFactory.getInstance().showToolbarMenu(this.sharingMenu, this.sharingLauncher, this.toolbarSection);
                            }
                        }.bind(this));
    }

    /*
     * Menu with the share and publish options
     */
    WorkSpace.prototype._createEditMenu = function () {
        var idMenu = 'edit_menu_' + this.workSpaceState.id;

        this.editMenu = this._initMenu(idMenu);

        /*** Add to the menu the proper options ***/
        var optionPosition = 0;

        // catalogue access option
        if (this.isAllowed('catalogue_view_gadgets') || this.isAllowed('catalogue_view_mashups')) {
            // the action of going to the catalogue is set by the catalogue module
            var catId = this.editMenu.addOption(gettext("Go to Gallery") + " »",
                                function() {},
                                optionPosition++);
            this.catalogue_link = $(catId)
        }

        // wiring access option
        if (this.isAllowed('show_wiring')) {
            // the action of going to the wiring is set by the wiring module
            var wiringId = this.editMenu.addOption(gettext("Go to Wiring tool") + " »",
                                function() {},
                                optionPosition++);
            this.wiring_link = $(wiringId)
        }

        if (optionPosition === 0) {
            this.editLauncher.addClassName('disabled_button');
        } else {
            this.editLauncher.removeClassName('disabled_button');
        }

        // add the event listener
        Event.observe(this.editLauncher, 'click',
                        function(e){
                            var target = BrowserUtilsFactory.getInstance().getTarget(e);
                            target.blur();
                            if (this.isAllowed('change_lock_status')) {
                                this._lockFunc(!this._isLocked());
                            }
                            if (this.editLauncher.className.indexOf('disabled_button') >= 0) {
                                var msg = gettext("This WorkSpace is blocked, please create a new one if you want to modify it.");
                                this.messageWindowMenu = new MessageWindowMenu();
                                this.messageWindowMenu.iconElement.className += ' icon-error';
                                this.messageWindowMenu.setMsg(msg);
                                this.messageWindowMenu.show();
                            } else {
                                LayoutManagerFactory.getInstance().showToolbarMenu(this.editMenu, this.editLauncher, this.toolbarSection);
                            }
                        }.bind(this));
    }


    /*
     * Create the necessary menus for the Toolbar
     */
    WorkSpace.prototype._createWorkspaceMenu = function() {
    }

    /*
     * Remove the toolbar menus
     */
    WorkSpace.prototype._removeWorkspaceMenu = function(){
        if (this.goToMenu)
            this.goToMenu.remove();
        if (this.confMenu)
            this.confMenu.remove();
        if (this.sharingMenu)
            this.sharingMenu.remove();
        if (this.editMenu)
            this.editMenu.remove();

        if (this.wsListMenu)
            this.wsListMenu.remove();
        if (this.mergeMenu)
            this.mergeMenu.remove();

    }

    WorkSpace.prototype.getGoToMenu = function(){
        return this.goToMenu;
    }

    WorkSpace.prototype.getWsListMenu = function(){
        return this.wsListMenu;
    }


    // *****************
    //  CONSTRUCTOR
    // *****************

    this.workSpaceState = workSpaceState;
    this.workSpaceGlobal = null;
    this.wiringInterface = null;
    this.varManager = null;
    this.tabInstances = new Hash();
    this.highlightTimeouts = {};
    this.wiring = null;
    this.varManager = null;
    this.contextManager = null;
    this.loaded = false;
    this.wiringLayer = null;
    this.visibleTab = null;
    this.valid=false;

    // menu DOM elements and objects
    this.goToMenu = null;
    this.confMenu = null;
    this.sharingMenu = null;
    this.mergeMenu = null;
    this.FloatingGadgetsMenu = null;
    this.wsListMenu = null;

    //this.goToLauncher = null;
    this.confLauncher = null;
    this.sharingLauncher = null;
    this.editLauncher = null;

    this.unlockEntryPos;

    /*
     * OPERATIONS
     */
    this._lockFunc = function (locked) {
        var i, tab_keys = this.tabInstances.keys();
        for (i = 0; i < tab_keys.length; i += 1) {
            this.tabInstances.get(tab_keys[i]).setLock(locked);
        }
        this._manageAddTabElement(locked)

    }.bind(this);

    this._isLocked = function () {
        var i, tab_keys = this.tabInstances.keys(), all = true;
        for (i = 0; i < tab_keys.length; i += 1) {
            if (!this.tabInstances.get(tab_keys[i]).dragboard.isLocked()) {
                all = false;
            }
        }
        return all;
    };

    this.markAsActive = function () {
        var workSpaceUrl = URIs.GET_POST_WORKSPACE.evaluate({'id': this.workSpaceState.id, 'last_user': last_logged_user});
        var o = new Object;
        o.active = "true"
        var workSpaceData = Object.toJSON(o);
        var params = {'workspace': workSpaceData};
        PersistenceEngineFactory.getInstance().send_update(workSpaceUrl, params, this, this.markAsActiveSuccess, this.markAsActiveError);
    }.bind(this);

    this.markAsActiveSuccess = function() {
        this.workSpaceGlobalInfo.workspace.active = true;
        this.workSpaceState.active = true;
        if (this.activeEntryId != null) {
            this.confMenu.removeOption(this.activeEntryId);
            this.activeEntryId = null;
        }
    }.bind(this);

    this.markAsActiveError = function(transport, e) {
        var logManager = LogManagerFactory.getInstance();
        var msg = logManager.formatError(gettext("Error marking as first active workspace, changes will not be saved: %(errorMsg)s."), transport, e);
        logManager.log(msg);
    }.bind(this);

    this._update_creator_options = function() {
        Element.extend(document.body);
        if (this.restricted) {
            document.body.addClassName('shared');
        } else {
            document.body.removeClassName('shared');
        }
    }
}

WorkSpace.prototype.drawAttention = function(iGadgetId) {
    var iGadget = this.getIgadget(iGadgetId);
    if (iGadget !== null) {
        this.highlightTab(iGadget.layout.dragboard.tab);
        iGadget.layout.dragboard.raiseToTop(iGadget);
        iGadget.highlight();
    }
};

WorkSpace.prototype.highlightTab = function(tab) {
    var tabElement;

    if (typeof tab === 'number') {
        tab = this.tabInstances.get(tab);
    }

    if (!(tab instanceof Tab)) {
        throw new TypeError();
    }

    tabElement = tab.tabHTMLElement;
    tabElement.addClassName("selected");
    if (tab.tabInfo.id in this.highlightTimeouts) {
        clearTimeout(this.highlightTimeouts[tab.tabInfo.id]);
    }
    this.highlightTimeouts[tab.tabInfo.id] = setTimeout(function() {
        tabElement.removeClassName("selected");
        delete this.highlightTimeouts[tab.tabInfo.id];
    }.bind(this), 10000);
};

/**
 * Returns the sub menu items for the wirecloud header
 */
WorkSpace.prototype.getSubMenuItems = function () {
    var share_window = new ShareWindowMenu(null);

    return [
        {
            'label': gettext('Share'),
            'callback': function () {
                share_window.show();
            },
        }
//        {'label': gettext('Export'), 'callback': 5}
    ]
};
