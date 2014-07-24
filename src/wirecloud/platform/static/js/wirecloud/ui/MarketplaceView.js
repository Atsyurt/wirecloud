/*
 *     Copyright (c) 2012-2014 Universidad Politécnica de Madrid
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

/*global StyledElements, LayoutManagerFactory, Wirecloud, gettext*/

(function () {

    "use strict";

    var MarketplaceView, onGetMarketsSuccess, onGetMarketsFailure, onGetMarketsComplete, auto_select_initial_market, notifyError, builder, ERROR_TEMPLATE;

    ERROR_TEMPLATE = '<s:styledgui xmlns:s="http://wirecloud.conwet.fi.upm.es/StyledElements" xmlns:t="http://wirecloud.conwet.fi.upm.es/Template" xmlns="http://www.w3.org/1999/xhtml"><div class="alert alert-error"><t:message/></div></s:styledgui>';

    builder = new StyledElements.GUIBuilder();

    notifyError = function notifyError(message, context) {
        var error_alert;

        message = builder.parse(builder.DEFAULT_OPENING + message + builder.DEFAULT_CLOSING, context);
        error_alert = builder.parse(ERROR_TEMPLATE, {
            'message': message
        });

        this.errorsAlternative.clear();
        this.errorsAlternative.appendChild(error_alert);
        this.alternatives.showAlternative(this.errorsAlternative);
    };

    auto_select_initial_market = function auto_select_initial_market() {
        var market_names = Object.keys(this.viewsByName);
        if (market_names.length > 0) {
            this.alternatives.showAlternative(this.viewsByName[market_names[0]]);
        } else {
            var msg = gettext("<p>WireCloud is not connected with any marketplace.</p>" +
                "<p>Suggestions:</p>" +
                "<ul>" +
                "<li>Connect WireCloud with a new marketplace.</li>" +
                "<li>Go to the my resources view instead</li>" +
                "</ul>");
            notifyError.call(this, msg);
        }
    };

    onGetMarketsSuccess = function onGetMarketsSuccess(options, view_info) {
        var info, old_views, view_element, view_constructor, first_element = null;

        this.loading = false;

        old_views = this.viewsByName;
        this.viewsByName = {};

        for (info in view_info) {

            view_element = view_info[info];

            if (info in old_views) {
                this.viewsByName[info] = old_views[info];
                delete old_views[info];
            } else {
                view_constructor = Wirecloud.MarketManager.getMarketViewClass(view_element.type);
                this.viewsByName[info] = this.alternatives.createAlternative({alternative_constructor: view_constructor, containerOptions: {catalogue: this, marketplace_desc: view_element}});
            }

            this.number_of_alternatives += 1;
            if (first_element === null) {
                first_element = this.viewsByName[info];
            }
        }

        for (info in old_views) {
            this.alternatives.removeAlternative(old_views[info]);
            old_views[info].destroy();
        }

        if (this.isVisible()) {
            if (this.temporalAlternatives.indexOf(this.alternatives.getCurrentAlternative()) !== -1) {
                auto_select_initial_market.call(this);
            } else {
                // Refresh wirecloud header as current marketplace may have been changed
                LayoutManagerFactory.getInstance().header.refresh();
            }
        }

        if (typeof options.onSuccess === 'function') {
            options.onSuccess();
        }
    };

    onGetMarketsFailure = function onGetMarketsFailure(options, msg) {
        this.loading = false;

        this.errorsAlternative.clear();
        var msg = gettext('<p>There were an error retreiving the marketplace list.</p>');
        notifyError.call(this, msg);

        if (typeof options.onFailure === 'function') {
            options.onFailure();
        }
    };

    onGetMarketsComplete = function onGetMarketsComplete(options) {
        var i;

        for (i = 0; i < this.callbacks.length; i+= 1) {
            try {
                this.callbacks[i]();
            } catch (e) {}
        }
        this.callbacks = [];

        if (typeof options.onComplete === 'function') {
            options.onComplete();
        }
    };

    MarketplaceView = function MarketplaceView(id, options) {
        options.id = 'marketplace';
        StyledElements.Alternative.call(this, id, options);

        this.viewsByName = {};
        this.alternatives = new StyledElements.StyledAlternatives();
        this.emptyAlternative = this.alternatives.createAlternative();
        this.errorsAlternative = this.alternatives.createAlternative({containerOptions: {'class': 'marketplace-error-view'}});
        this.temporalAlternatives = [this.emptyAlternative, this.errorsAlternative];

        this.alternatives.addEventListener('postTransition', function (alternatives, out_alternative, in_alternative) {
            var new_status = this.buildStateData();

            if (this.temporalAlternatives.indexOf(out_alternative) !== -1) {
                Wirecloud.HistoryManager.replaceState(new_status);
            } else {
                Wirecloud.HistoryManager.pushState(new_status);
            }

            LayoutManagerFactory.getInstance().header.refresh();
        }.bind(this));
        this.appendChild(this.alternatives);

        this.marketMenu = new StyledElements.PopupMenu();
        this.marketMenu.append(new Wirecloud.ui.MarketplaceViewMenuItems(this));

        this.addEventListener('show', function (view) {
            if (view.loading === null) {
                Wirecloud.MarketManager.getMarkets(onGetMarketsSuccess.bind(view, {}), onGetMarketsFailure.bind(view, {}), onGetMarketsComplete.bind(view, {}));
                view.loading = true;
            }

            if (view.loading === false && !view.error) {
                if (view.alternatives.getCurrentAlternative() === view.emptyAlternative) {
                    auto_select_initial_market.call(view);
                } else {
                    view.alternatives.getCurrentAlternative().refresh_if_needed();
                }
            }
        });

        Object.defineProperty(this, 'error', {
            get: function () {
                return this.alternatives.getCurrentAlternative() === this.errorsAlternative;
            }
        });

        this.myresourcesButton = new StyledElements.StyledButton({'iconClass': 'icon-archive'});
        this.myresourcesButton.addEventListener('click', function () {
            LayoutManagerFactory.getInstance().changeCurrentView('myresources');
        });

        this.number_of_alternatives = 0;
        this.loading = null;
        this.callbacks = [];
    };
    MarketplaceView.prototype = new StyledElements.Alternative();

    MarketplaceView.prototype.view_name = 'marketplace';

    MarketplaceView.prototype.buildStateData = function buildStateData() {
        var currentState, data, subview;

        currentState = Wirecloud.HistoryManager.getCurrentState();
        data = {
            workspace_creator: currentState.workspace_creator,
            workspace_name: currentState.workspace_name,
            view: 'marketplace'
        };

        if (this.loading === false && this.error === false && this.alternatives.getCurrentAlternative() !== this.emptyAlternative) {
            subview = this.alternatives.getCurrentAlternative().alternatives.getCurrentAlternative();
            if (subview.view_name != null) {
                data.subview = subview.view_name;
                if ('buildStateData' in subview) {
                    subview.buildStateData(data);
                }
            }
            data.market = this.alternatives.getCurrentAlternative().market_id;
        }

        return data;
    };

    MarketplaceView.prototype.onHistoryChange = function onHistoryChange(state) {
        this.changeCurrentMarket(state.market);
        if ('onHistoryChange' in this.alternatives.getCurrentAlternative()) {
            this.alternatives.getCurrentAlternative().onHistoryChange(state);
        }
    };

    MarketplaceView.prototype.goUp = function goUp() {
        var current_alternative, change = false;

        current_alternative = this.alternatives.getCurrentAlternative();
        if (this.temporalAlternatives.indexOf(current_alternative) === -1) {
            change = this.alternatives.getCurrentAlternative().goUp();
        }

        if (!change) {
            LayoutManagerFactory.getInstance().changeCurrentView('workspace');
        }
    };

    MarketplaceView.prototype.getBreadcrum = function getBreadcrum() {
        var label, breadcrum, user, current_alternative;

        user = null;
        breadcrum = [];
        current_alternative = this.alternatives.getCurrentAlternative();
        if (current_alternative === this.emptyAlternative) {
            label = gettext('loading marketplace view...');
        } else if (current_alternative === this.errorsAlternative) {
            label = gettext('marketplace list not available');
        } else {
            breadcrum = [{'label': 'marketplace'}];
            label = current_alternative.getLabel();
            user = current_alternative.desc.user;
        }

        if (user != null) {
            breadcrum.push({'label': user});
        }

        breadcrum.push({
            'label': label,
        });

        return breadcrum;
    };

    MarketplaceView.prototype.getToolbarMenu = function getToolbarMenu() {
        return this.marketMenu;
    };

    MarketplaceView.prototype.getToolbarButtons = function getToolbarButtons() {
        return [this.myresourcesButton];
    };

    MarketplaceView.prototype.waitMarketListReady = function waitMarketListReady(callback) {
        if (this.loading === false) {
            callback();
            return;
        }

        this.callbacks.push(callback);
        if (this.loading === null) {
            Wirecloud.MarketManager.getMarkets(onGetMarketsSuccess.bind(this, {}), onGetMarketsFailure.bind(this, {}), onGetMarketsComplete.bind(this, {}));
            this.loading = true;
        }
    };

    MarketplaceView.prototype.refreshViewInfo = function refreshViewInfo(options) {

        if (this.loading === true) {
            return;
        }

        if (typeof options !== 'object') {
            options = {};
        }

        this.loading = true;
        LayoutManagerFactory.getInstance().header.refresh();

        this.number_of_alternatives = 0;

        Wirecloud.MarketManager.getMarkets(onGetMarketsSuccess.bind(this, options), onGetMarketsFailure.bind(this, options), onGetMarketsComplete.bind(this, options));
    };

    MarketplaceView.prototype.addMarket = function addMarket(market_info) {
        var view_constructor = Wirecloud.MarketManager.getMarketViewClass(market_info.type);
        market_info.permissions = {'delete': true};
        this.viewsByName[market_info.name] = this.alternatives.createAlternative({alternative_constructor: view_constructor, containerOptions: {catalogue: this, marketplace_desc: market_info}});

        this.number_of_alternatives += 1;
        this.alternatives.showAlternative(this.viewsByName[market_info.name]);
    };

    MarketplaceView.prototype.changeCurrentMarket = function changeCurrentMarket(market) {
        this.alternatives.showAlternative(this.viewsByName[market]);
    };

    Wirecloud.ui.MarketplaceView = MarketplaceView;
})();
