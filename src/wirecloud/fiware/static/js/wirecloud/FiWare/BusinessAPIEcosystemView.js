/*
 *     Copyright (c) 2016 CoNWeT Lab., Universidad Politécnica de Madrid
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

/* globals Wirecloud */


(function (utils) {

    "use strict";

    var BusinessAPIEcosystemView = function BusinessAPIEcosystemView(id, options) {
        options.class = 'catalogue fiware';
        Wirecloud.ui.WorkspaceView.call(this, id, options);

        Object.defineProperty(this, 'desc', {value: options.marketplace_desc});
        if (this.desc.user != null) {
            Object.defineProperty(this, 'market_id', {value: this.desc.user + '/' + this.desc.name});
        } else {
            Object.defineProperty(this, 'market_id', {value: this.desc.name});
        }
        this.addEventListener('show', load.bind(this));

        this.status = "unloaded";
    };
    utils.inherit(BusinessAPIEcosystemView, Wirecloud.ui.WorkspaceView);

    BusinessAPIEcosystemView.prototype.getLabel = function getLabel() {
        return this.desc.title || this.desc.name;
    };

    BusinessAPIEcosystemView.prototype.goUp = function goUp() {
        return false;
    };

    Wirecloud.FiWare.BusinessAPIEcosystemView = BusinessAPIEcosystemView;

    Wirecloud.MarketManager.addMarketType('fiware-bae', 'FIWARE Business API Ecosystem', BusinessAPIEcosystemView);

    var load = function load() {
        if (this.status === "unloaded") {
            this.status = "loading";
            var id = Wirecloud.workspacesByUserAndName[this.desc.user][this.desc.name];
            Wirecloud.loadWorkspace(id).then((workspace) => {
                this.loadWorkspace(workspace);
                this.loaded = "loaded";
            }).catch(() => {
                this.status = "unloaded";
            });
        }
    };

})(Wirecloud.Utils);
