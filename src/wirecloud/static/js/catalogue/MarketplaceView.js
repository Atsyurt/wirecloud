/*
 *     (C) Copyright 2012 Universidad Politécnica de Madrid
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

/*jshint forin:true, eqnull:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true, undef:true, curly:true, browser:true, indent:4, maxerr:50, prototypejs: true */
/*global StyledElements, LayoutManagerFactory, MarketplaceManagement, Wirecloud, gettext, CatalogueView, FiWareCatalogueView*/
var MarketplaceView = function (id, options) {
    options.id = 'marketplace';
    StyledElements.Alternative.call(this, id, options);

    this.viewsByName = {};
    this.alternatives = new StyledElements.StyledAlternatives();
    this.alternatives.addEventListener('postTransition', function () {
        LayoutManagerFactory.getInstance().header.refresh();
    });
    this.appendChild(this.alternatives);
    this.generateViews();

    this.marketMenu = new StyledElements.PopupMenu();
    this.marketMenu.append(new Wirecloud.ui.MarketplaceViewMenuItems(this));
};

MarketplaceView.prototype = new StyledElements.Alternative();

MarketplaceView.prototype.view_name = 'marketplace';

MarketplaceView.prototype.getBreadcrum = function () {
    var label, breadcrum;

    label = gettext('No marketplace registered');
    if (this.number_of_alternatives > 0) {
        label = this.alternatives.getCurrentAlternative().getLabel();
    }

    breadcrum = [
        {
            'label': 'marketplace'
        },
        {
            'label': label,
            'menu': this.marketMenu
        }
    ];
    // If no alternatives exist, it is no posible to have an extra breadcrum
    if (this.number_of_alternatives > 0) {
        if (typeof this.alternatives.getCurrentAlternative().getExtraBreadcrum === 'function') {
            breadcrum = breadcrum.concat(this.alternatives.getCurrentAlternative().getExtraBreadcrum());
        }
    }
    return breadcrum;
};

MarketplaceView.prototype.refreshViewInfo = function () {
    Wirecloud.MarketManager.getMarkets(this.addViewInfo.bind(this));
};

MarketplaceView.prototype.addViewInfo = function (view_info) {
    var info, old_views, view_element, view_constructor, first_element = null;

    old_views = this.viewsByName;

    this.number_of_alternatives = 0;
    this.viewsByName = {};

    for (info in view_info) {

        view_element = JSON.parse(view_info[info]);

        if (info in old_views) {
            this.viewsByName[info] = old_views[info];
            delete old_views[info];
        } else {
            view_constructor = Wirecloud.MarketManager.getMarketViewClass(view_element.type);
            this.viewsByName[info] = this.alternatives.createAlternative({alternative_constructor: view_constructor, containerOptions: {catalogue: this, marketplace: info}});
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

    // Refresh wirecloud header as current marketplace may have been changed
    LayoutManagerFactory.getInstance().header.refresh();
};

MarketplaceView.prototype.generateViews = function () {
    Wirecloud.MarketManager.getMarkets(this.addViewInfo.bind(this));
};
