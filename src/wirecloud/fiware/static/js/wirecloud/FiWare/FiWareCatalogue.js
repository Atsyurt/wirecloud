/*
 *     Copyright (c) 2012-2014 CoNWeT Lab., Universidad Politécnica de Madrid
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
/*global gettext, Wirecloud */

(function () {

    "use strict";

    var FiWareCatalogue, _onSearchSuccess, _onSearchFailure;

    _onSearchSuccess = function _onSearchSuccess(transport) {
        var raw_data = JSON.parse(transport.responseText);
        this.onSuccess(raw_data);
    };

    _onSearchFailure = function _onSearchFailure(transport) {
        this.onFailure();
    };

    FiWareCatalogue = function FiWareCatalogue(options) {
        if (options.user != null) {
            this.market_user = options.user;
        } else {
            this.market_user = 'public';
        }
        this.market_name = options.name;
        Object.defineProperty(this, 'permissions', {'value': options.permissions});
    };

    FiWareCatalogue.prototype.isAllow = function isAllow(action) {
        if (action in this.permissions) {
            return this.permissions[action];
        } else {
            return false;
        }
    };

    FiWareCatalogue.prototype.search = function search(options) {
        var url;

        if (options == null) {
            throw new TypeError();
        }

        if (options.search_criteria === '' && options.store === 'All stores') {
            url = Wirecloud.URLs.FIWARE_RESOURCES_COLLECTION.evaluate({market_user: this.market_user, market_name: this.market_name});
        } else if (options.search_criteria !== '' && options.store === 'All stores') {
            url = Wirecloud.URLs.FIWARE_FULL_SEARCH.evaluate({market_user: this.market_user, market_name: this.market_name, search_string: options.search_criteria});
        } else if (options.search_criteria === '' && options.store !== 'All stores') {
            url = Wirecloud.URLs.FIWARE_STORE_RESOURCES_COLLECTION.evaluate({market_user: this.market_user, market_name: this.market_name, store: options.store});
        } else {
            url = Wirecloud.URLs.FIWARE_STORE_SEARCH.evaluate({market_user: this.market_user, market_name: this.market_name, store: options.store, search_string: options.search_criteria});
        }

        Wirecloud.io.makeRequest(url, {
            method: 'GET',
            requestHeaders: {'Accept': 'application/json'},
            onSuccess: _onSearchSuccess.bind(options),
            onFailure: _onSearchFailure.bind(options)
        });
    };

    FiWareCatalogue.prototype.get_offering_info = function get_offering_info(store, offering_name, options) {
        if (options == null) {
            options = {};
        }

        var url = Wirecloud.URLs.FIWARE_OFFERING_ENTRY.evaluate({market_user: this.market_user, market_name: this.market_name, store: store, offering_id: offering_name});
        Wirecloud.io.makeRequest(url, {
            method: 'GET',
            requestHeaders: {'Accept': 'application/json'},
            onSuccess: function (response) {
                var offering;
                if (typeof options.onSuccess === 'function') {
                    offering = new FiWareCatalogueResource(JSON.parse(response.responseText), this);
                    try {
                        options.onSuccess(offering);
                    } catch (e) {}
                }
            }.bind(this),
            onFailure: function (response) {
                var msg = Wirecloud.GlobalLogManager.formatAndLog(gettext("Error deleting resource: %(errorMsg)s."), response);
                try {
                    options.onFailure(msg);
                } catch (e) {}
            }
        });
    };

    FiWareCatalogue.prototype.is_purchased = function is_purchased(offering) {
        return offering.state === 'purchased' || offering.state === 'rated';
    };

    FiWareCatalogue.prototype.start_purchase = function start_purchase(resource, options) {

        if (options == null) {
            options = {};
        }

        var url = Wirecloud.URLs.FIWARE_STORE_START_PURCHASE.evaluate({market_user: this.market_user, market_name: this.market_name, store: resource.store});
        Wirecloud.io.makeRequest(
            url,
            {
                contentType: 'application/json',
                requestHeaders: {'Accept': 'application/json'},
                postBody: JSON.stringify({offering_url: resource.usdl_url}),
                onSuccess: function (transport) {
                    var data = JSON.parse(transport.responseText);

                    if (typeof options.onSuccess === 'function') {
                        options.onSuccess(data);
                    }
                }.bind(this),
            }
        );
    };

    FiWareCatalogue.prototype.getStores = function getStores(onSuccess, onError) {
        var context, url = Wirecloud.URLs.FIWARE_STORE_COLLECTION.evaluate({market_user: this.market_user, market_name: this.market_name});

        context = {
            onSuccess: onSuccess,
            onFailure: onError
        };

        Wirecloud.io.makeRequest(url, {
            method: 'GET',
            requestHeaders: {'Accept': 'application/json'},
            onSuccess: _onSearchSuccess.bind(context),
            onFailure: _onSearchFailure.bind(context)
        });
    };

    Wirecloud.FiWare.FiWareCatalogue = FiWareCatalogue;
})();
