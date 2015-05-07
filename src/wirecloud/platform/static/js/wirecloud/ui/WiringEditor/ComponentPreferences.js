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


Wirecloud.ui.WiringEditor.ComponentPreferences = (function () {

    "use strict";

    /**
     * Create a new instance of class ComponentPreferences.
     * @class
     *
     * @param {GenericInterface} component
     */
    var ComponentPreferences = function ComponentPreferences(component) {
        this.component = component;
        this.componentType = component.componentType;

        if (this.componentType === 'operator') {
            this.application = component.ioperator;
        } else {
            this.application = component.iwidget;
        }
    };

    StyledElements.Utils.inherit(ComponentPreferences, StyledElements.DynamicMenuItems);

    /**
     * @public
     * @function
     *
     * @returns {Array.<MenuItem>} The list of items which can display in that moment.
     */
    ComponentPreferences.prototype.build = function build() {
        var itemList = [];

        if (displayItemCollapseEndpoints.call(this)) {
            if (this.component.collapsed) {
                itemList.push(createMenuItem("Expand endpoints", "icon-collapse-top", function () {
                    this.component.collapsed = false;
                }.bind(this)));
            } else {
                itemList.push(createMenuItem("Collapse endpoints", "icon-collapse", function () {
                    this.component.collapsed = true;
                }.bind(this)));
            }
        }

        if (displayItemSortEndpoints.call(this)) {
            if (this.component.editingPos) {
                itemList.push(createMenuItem("Stop sorting", "icon-sort", function () {
                    this.component.wiringEditor.ChangeObjectEditing(this.component);
                }.bind(this)));

                return itemList;
            } else {
                itemList.push(createMenuItem("Sort endpoints", "icon-sort", function () {
                    this.component.wiringEditor.ChangeObjectEditing(this.component);
                }.bind(this)));
            }
        }

        itemList.push(createMenuItem("Logs", "icon-tags", function () {
            var dialog = new Wirecloud.ui.LogWindowMenu(this.component.entity.logManager);

            dialog.show();
        }.bind(this)));

        if (displayItemSettings.call(this)) {
            itemList.push(createMenuItem("Settings", "icon-tasks", function () {
                var dropdownMenu;

                if (this.componentType == 'operator') {
                    dropdownMenu = new Wirecloud.ui.OperatorPreferencesWindowMenu();
                } else {
                    dropdownMenu = new Wirecloud.Widget.PreferencesWindowMenu();
                }

                dropdownMenu.htmlElement.classList.add("component-settings-form");

                dropdownMenu.show(this.application);
            }.bind(this)));
        }

        return itemList;
    };

    var createMenuItem = function createMenuItem(title, iconClass, callback){
        var item;

        item = new StyledElements.MenuItem(gettext(title), callback);
        item.addIconClass(iconClass);

        return item;
    };

    var displayItemSortEndpoints = function displayItemSortEndpoints() {
        return !this.component.onbackground && !this.component.sleek && !this.component.collapsed && (this.component.sourceAnchors.length > 1 || this.component.targetAnchors.length > 1);
    };

    var displayItemCollapseEndpoints = function displayItemCollapseEndpoints() {
        return !this.component.onbackground && (this.component.sourceAnchors.length > 0 || this.component.targetAnchors.length > 0);
    };

    var displayItemSettings = function displayItemSettings() {
        return !this.component.onbackground && this.application.meta.preferenceList.length > 0;
    };

    return ComponentPreferences;

})();
