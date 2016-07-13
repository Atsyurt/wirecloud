/*
 *     Copyright 2012-2016 (c) CoNWeT Lab., Universidad Politécnica de Madrid
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

/* global LayoutManagerFactory, StyledElements, Wirecloud */

(function (ns, se, utils) {

    "use strict";

    var WorkspaceView = function WorkspaceView(id, options) {
        StyledElements.Alternative.call(this, id, options);
        this.wrapperElement.classList.add("wc-workspace");

        this.wsMenu = new StyledElements.PopupMenu();
        this.wsMenu.append(new Wirecloud.ui.WorkspaceListItems(function (context, workspace) {
            Wirecloud.changeActiveWorkspace(workspace);
        }));
        this.wsMenu.appendSeparator();
        this.wsMenu.append(new Wirecloud.ui.WorkspaceViewMenuItems(this));

        this.wallet = new Wirecloud.ui.MACWallet();
        this.walletButton = this.buildAddWidgetButton();

        this.wiringButton = new StyledElements.Button({
            'class': "btn-display-wiring-view",
            'iconClass': 'icon-puzzle-piece',
            'title': utils.gettext('Wiring')
        });
        this.wiringButton.addEventListener('click', function () {
            LayoutManagerFactory.getInstance().changeCurrentView('wiring');
        });

        this.myresourcesButton = new StyledElements.Button({
            'iconClass': 'icon-archive',
            class: "wc-show-catalogue",
            'title': utils.gettext('My Resources')
        });
        this.myresourcesButton.addEventListener('click', function () {
            LayoutManagerFactory.getInstance().changeCurrentView('myresources');
        });

        this.marketButton = new StyledElements.Button({
            'iconClass': 'icon-shopping-cart',
            class: "wc-show-marketplace",
            'title': utils.gettext('Get more components')
        });
        this.marketButton.addEventListener('click', function () {
            LayoutManagerFactory.getInstance().changeCurrentView('marketplace');
        });

        this.layout = new StyledElements.OffCanvasLayout();
        this.appendChild(this.layout);

        // Init wiring error badge
        Wirecloud.addEventListener('activeworkspacechanged', function (Wirecloud, workspace) {
            this.layout.slideOut();

            var layoutManager, params, preferenceValues, iwidgets;

            layoutManager = LayoutManagerFactory.getInstance();
            layoutManager.logStep('');
            layoutManager.logSubTask(gettext('Processing workspace data'));

            try {
                this.loadWorkspace(workspace);
            } catch (error) {
                // Error during initialization
                // Loading in failsafe mode
                _failsafeInit.call(this, transport, error);
                return;
            }

            this._updateWiringErrors = function (entry) {
                var errorCount = workspace.wiring.logManager.errorCount;
                this.wiringButton.setBadge(errorCount ? errorCount : null, 'danger');
            }.bind(this);

            workspace.wiring.logManager.addEventListener('newentry', this._updateWiringErrors);
            this._updateWiringErrors();

            Wirecloud.GlobalLogManager.log(gettext('Workspace loaded'), Wirecloud.constants.LOGGING.INFO_MSG);
        }.bind(this));

        Object.defineProperties(this, {
            activeTab: {
                get: function () {
                    return this.notebook.getVisibleTab();
                }
            },
            tabs: {
                get: function () {
                    return this.notebook.tabs;
                }
            },
            title: {
                get: function () {
                    return this.model.title;
                }
            },
            widgets: {
                get: function () {
                    return get_widgets.call(this);
                }
            }
        });

        Wirecloud.addEventListener('loaded', function () {
            this.showcase =  new Wirecloud.ui.ComponentSidebar();
            this.layout.appendChild(this.showcase);

            this.showcase.addEventListener('create', function (showcase, group, button) {
                button.disable();

                if (group.meta.type === 'widget') {
                    this.activeTab.createWidget(group.meta).then(function () {
                        button.enable();
                    });
                } else {
                    Wirecloud.mergeWorkspace(group.meta, {
                        onSuccess: function () {
                            button.enable();
                        },
                        onFailure: function (msg, details) {
                            button.enable();
                            var dialog;
                            if (details != null && 'missingDependencies' in details) {
                                // Show missing dependencies
                                dialog = new Wirecloud.ui.MissingDependenciesWindowMenu(null, details);
                            } else {
                                dialog = new Wirecloud.ui.MessageWindowMenu(msg, Wirecloud.constants.LOGGING.ERROR_MSG);
                            }
                            dialog.show();
                        }
                    });
                }
            }.bind(this));
        }.bind(this));
    };
    WorkspaceView.prototype = new StyledElements.Alternative();

    WorkspaceView.prototype.view_name = 'workspace';

    WorkspaceView.prototype.findTab = function findTab(id) {
        var i;

        for (i = 0; i < this.notebook.tabs.length; i++) {
            if (this.notebook.tabs[i].id === id) {
                return this.notebook.tabs[i];
            }
        }

        return null;
    };

    WorkspaceView.prototype.findWidget = function findWidget(id) {
        var i, widget;

        for (i = 0; i < this.notebook.tabs.length; i++) {
            widget = this.notebook.tabs[i].findWidget(id);
            if (widget != null) {
                return widget;
            }
        }

        return null;
    };

    WorkspaceView.prototype.showSettings = function showSettings() {
        (new Wirecloud.ui.PreferencesWindowMenu('workspace', this.model.preferences)).show();
        return this;
    };

    WorkspaceView.prototype.loadWorkspace = function loadWorkspace(workspace) {
        var loadingTab;

        this.layout.content.clear();
        this.walletButton.active = false;

        this.notebook = new StyledElements.Notebook({
            'class': 'se-notebook-bottom'
        });
        this.notebook.appendTo(this.layout.content);

        loadingTab = this.notebook.createTab();
        loadingTab.disable();
        loadingTab.addClassName('loading');

        this.model = workspace;
        this.model.view = this;

        this.model.operators.forEach(function (operator) {
            this.layout.content.appendChild(operator.wrapperElement);
        }, this);

        var initialTab = null;
        var statusTab = null;
        var status = Wirecloud.HistoryManager.getCurrentState();

        this.model.tabs.forEach(function (model) {
            var tab = this.notebook.createTab({
                tab_constructor: Wirecloud.ui.WorkspaceTabView,
                model: model,
                workspace: this
            });

            if (status.tab != null && status.tab === model.title) {
                statusTab = tab;
            }

            if (model.initial) {
                initialTab = tab;
            }

        }, this);

        if (statusTab != null) {
            this.notebook.goToTab(statusTab);
        } else {
            this.notebook.goToTab(initialTab);
        }

        this.notebook.removeTab(loadingTab);

        if (this.model.isAllowed('edit')) {
            var button = new StyledElements.Button({
                title: utils.gettext("New tab"),
                iconClass: "fa fa-plus",
                class: "wc-create-workspace-tab"
            });
            this.notebook.addButton(button);
            button.addEventListener('click', on_click_createtab.bind(this));
        }

        if (Wirecloud.Utils.isFullscreenSupported()) {
            this.fullscreenButton = new StyledElements.Button({'iconClass': 'icon-resize-full', title: gettext('Full screen')});
            this.notebook.addButton(this.fullscreenButton);
            Wirecloud.Utils.onFullscreenChange(this.notebook, function () {
                this.fullscreenButton.removeIconClassName('icon-resize-full');
                this.fullscreenButton.removeIconClassName('icon-resize-small');
                if (this.notebook.fullscreen) {
                    this.fullscreenButton.addIconClassName('icon-resize-small');
                    this.fullscreenButton.setTitle(gettext('Exit full screen'));
                    this.notebook.addClassName('fullscreen');
                } else {
                    this.fullscreenButton.addIconClassName('icon-resize-full');
                    this.fullscreenButton.setTitle(gettext('Full screen'));
                    this.notebook.removeClassName('fullscreen');
                }
            }.bind(this));
            this.fullscreenButton.addEventListener('click', function () {
                if (this.notebook.fullscreen) {
                    this.notebook.exitFullscreen();
                } else {
                    this.notebook.requestFullscreen();
                }
            }.bind(this));
        }

        if (Wirecloud.contextManager.get('mode') === 'embedded') {
            this.seeOnWirecloudButton = new StyledElements.Button({
                'class': 'powered-by-wirecloud'
            });
            this.notebook.addButton(this.seeOnWirecloudButton);
            this.seeOnWirecloudButton.addEventListener('click', function () {
                var url = Wirecloud.URLs.WORKSPACE_VIEW.evaluate({owner: encodeURIComponent(this.model.owner), name: encodeURIComponent(this.model.title)});
                window.open(url, '_blank')
            }.bind(this));
        } else {
            this.poweredByWirecloudButton = new StyledElements.Button({
                'class': 'powered-by-wirecloud'
            });
            this.notebook.addButton(this.poweredByWirecloudButton);
            this.poweredByWirecloudButton.addEventListener('click', function () {window.open('http://conwet.fi.upm.es/wirecloud/', '_blank')});
        }

        this.model.addEventListener('createoperator', function (workspace_model, operator) {
            this.layout.content.appendChild(operator.wrapperElement);
        }.bind(this));
        this.model.addEventListener('removeoperator', function (workspace_model, operator) {
            this.layout.content.removeChild(operator.wrapperElement);
        }.bind(this));
    };

    WorkspaceView.prototype.buildAddWidgetButton = function buildAddWidgetButton() {
        var button = new se.ToggleButton({
            title: utils.gettext("Search component"),
            class: "btn-primary wc-show-component-sidebar",
            iconClass: "icon-archive",
            stackedIconClass: "icon-plus-sign"
        });
        button.addEventListener('click', function (button) {
            if (button.active) {
                this.showcase.searchComponents.refresh();
                this.layout.slideIn();
            } else {
                this.layout.slideOut();
            }
        }.bind(this));

        return button;
    };

    WorkspaceView.prototype.buildStateData = function buildStateData() {
        var currentState = Wirecloud.HistoryManager.getCurrentState();
        return {
            workspace_owner: currentState.workspace_owner,
            workspace_name: currentState.workspace_name,
            view: 'workspace'
        };
    };

    WorkspaceView.prototype.getBreadcrum = function getBreadcrum() {
        var entries, current_state;

        current_state = Wirecloud.HistoryManager.getCurrentState();
        if ('workspace_owner' in current_state) {
            entries = [
                {
                    'label': current_state.workspace_owner
                }, {
                    'label': current_state.workspace_name,
                }
            ];
        } else {
            entries = [{
                'label': utils.gettext('loading...')
            }];
        }

        return entries;
    };

    WorkspaceView.prototype.getTitle = function getTitle() {
        var current_state = Wirecloud.HistoryManager.getCurrentState();
        if ('workspace_owner' in current_state) {
            return current_state.workspace_owner + '/' + current_state.workspace_name;
        } else {
            return utils.gettext('loading...');
        }
    };

    WorkspaceView.prototype.getToolbarMenu = function getToolbarMenu() {
        var context, current_state;
        current_state = Wirecloud.HistoryManager.getCurrentState();
        if ('workspace_owner' in current_state) {
            context = Wirecloud.contextManager;
            if (context && context.get('username') !== 'anonymous') {
                return this.wsMenu;
            }
        }
        return null;
    };

    WorkspaceView.prototype.getToolbarButtons = function getToolbarButtons() {
        if (Wirecloud.contextManager && Wirecloud.contextManager.get('username') !== 'anonymous') {
            this.walletButton.setDisabled(Wirecloud.activeWorkspace == null || !Wirecloud.activeWorkspace.isAllowed('edit'));
            this.wiringButton.setDisabled(Wirecloud.activeWorkspace == null || !Wirecloud.activeWorkspace.isAllowed('edit'));
            return [this.walletButton, this.wiringButton, this.myresourcesButton, this.marketButton];
        } else {
            return [];
        }
    };

    WorkspaceView.prototype.onHistoryChange = function onHistoryChange(newState) {
        var target_tab, nextWorkspace, alert_msg;

        nextWorkspace = Wirecloud.workspacesByUserAndName[newState.workspace_owner][newState.workspace_name];
        if (nextWorkspace == null) {
            if (Wirecloud.activeWorkspace != null) {
                Wirecloud.activeWorkspace.unload();
                Wirecloud.activeWorkspace = null;
            }
            alert_msg = document.createElement('div');
            alert_msg.className = 'alert alert-info';
            alert_msg.textContent = utils.gettext('The requested workspace is no longer available (it was deleted).');
            LayoutManagerFactory.getInstance().viewsByName.workspace.clear();
            LayoutManagerFactory.getInstance().viewsByName.workspace.appendChild(alert_msg);
            Wirecloud.trigger('viewcontextchanged');
        } else if (Wirecloud.activeWorkspace == null || (nextWorkspace.id !== Wirecloud.activeWorkspace.id)) {
            Wirecloud.changeActiveWorkspace(nextWorkspace, newState.tab, {replaceNavigationState: 'leave'});
        } else if (newState.tab != null) {
            target_tab = findTabByTitle.call(this, newState.tab);
            this.notebook.goToTab(target_tab);
            document.title = newState.workspace_owner + '/' + newState.workspace_name;
        } else {
            document.title = newState.workspace_owner + '/' + newState.workspace_name;
        }
    };

    var findTabByTitle = function findTabByTitle(title) {
        var i;

        for (i = this.notebook.tabs.length - 1; i >= 0; i--) {
            if (this.notebook.tabs[i].title === title) {
                return this.notebook.tabs[i];
            }
        }

        return null;
    };

    WorkspaceView.prototype.rename = function rename(title) {
        return new Promise(function (resolve, reject) {
            this.model.rename(title).then(function () {
                var state, layoutManager = LayoutManagerFactory.getInstance();

                state = {
                    workspace_owner: this.model.owner,
                    workspace_name: this.model.title,
                    view: "workspace",
                    tab: Wirecloud.HistoryManager.getCurrentState().tab
                };
                Wirecloud.HistoryManager.replaceState(state);

                layoutManager.header.refresh();
                resolve();
            }.bind(this), function (reason) {
                reject(reason);
            });
        }.bind(this));
    };

    WorkspaceView.prototype.remove = function remove() {
        return new Promise(function (resolve, reject) {
            var dialog = new Wirecloud.ui.AlertWindowMenu();

            dialog.setMsg(utils.interpolate(utils.gettext('Do you really want to remove the "%(title)s" workspace?'), {
                title: this.title
            }));
            dialog.setHandler(function () {
                this.model.remove().then(function () {
                    resolve();
                }, function (reason) {
                    reject(reason);
                });
            }.bind(this));
            dialog.show();
        }.bind(this));
    };

    WorkspaceView.prototype.publish = function publish(data) {
        return this.model.publish(data);
/*
                                    Wirecloud.LocalCatalogue._includeResource(JSON.parse(response.responseText));
        layoutManager.viewsByName.myresources.viewsByName.search.mark_outdated();


                             */


    };

    WorkspaceView.prototype.drawAttention = function drawAttention(widgetId) {
        var widget = this.findWidget(id);

        if (widget !== null) {
            this.highlightTab(widget.tab);
            widget.tab.dragboard.raiseToTop(widget);
            widget.highlight();
        }
    };

    WorkspaceView.prototype.highlightTab = function highlightTab(tab) {

        if (typeof tab === 'string') {
            tab = this.findTab(tab);
        }

        tab.tabElement.classList.add("highlight");
    };

    WorkspaceView.prototype.unhighlightTab = function unhighlightTab(tab) {

        if (typeof tab === 'string') {
            tab = this.findTab(tab);
        }

        tab.tabElement.classList.remove("highlight");
    };

    // ==================================================================================
    // PRIVATE MEMBERS
    // ==================================================================================

    var get_widgets = function get_widgets() {
        return Array.prototype.concat.apply([], this.notebook.tabs.map(function (tab) {
            return tab.widgets;
        }));
    };

    // ==================================================================================
    // EVENT HANDLERS
    // ==================================================================================

    var on_click_createtab = function on_click_createtab(button) {
        button.disable();
        this.model.createTab().then(function (tab) {
            this.notebook.createTab({
                tab_constructor: Wirecloud.ui.WorkspaceTabView,
                model: tab,
                workspace: this
            });
            button.enable();
        }.bind(this), function () {
            button.enable();
        });
    };

    Wirecloud.ui.WorkspaceView = WorkspaceView;

})(Wirecloud.ui, StyledElements, StyledElements.Utils);
