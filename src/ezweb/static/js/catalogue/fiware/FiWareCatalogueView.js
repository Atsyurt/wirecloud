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

var FiWareCatalogueView = function (id, options) {
    options.id = 'fi-ware_catalogue';
    StyledElements.Alternative.call(this, id, options);

	this.alternatives = new StyledElements.StyledAlternatives();
    this.appendChild(this.alternatives);

	this.viewsByName = {
        'search': this.alternatives.createAlternative({alternative_constructor: CatalogueSearchView, containerOptions: {catalogue: this, resource_painter: FiWareResourcePainter}}),
        'details': this.alternatives.createAlternative({alternative_constructor: FiWareResourceDetailsView, containerOptions: {catalogue: this}}),
		'publish': this.alternatives.createAlternative({alternative_constructor: FiWareCataloguePublishView, containerOptions: {catalogue: this}}),
    };

	this.fiWareCatalogue = new FiWareCatalogue(this);
};

FiWareCatalogueView.prototype = new StyledElements.Alternative();

FiWareCatalogueView.prototype.getLabel = function () {
    return gettext('fi-ware marketplace');
};

FiWareCatalogueView.prototype.search = function (callback, options) {
	
	this.fiWareCatalogue.search(this._onSearch.bind(this, callback), options);
};

FiWareCatalogueView.prototype._onSearch = function (callback, raw_data) {
	var preferred_versions, i, data, key, raw_data, resources, resource,fiWareCatalogue

    if (raw_data.resources) {
        preferred_versions = CookieManager.readCookie('preferred_versions', true);
        if (preferred_versions === null) {
            preferred_versions = {};
        }

        resources = [];

        for (i = 0; i < raw_data.resources.length; i += 1) {
            resource = new FiWareCatalogueResource(raw_data.resources[i]);
            resources.push(resource);
            key = resource.getVendor() + '/' + resource.getName();
            if (key in preferred_versions) {
                resource.changeVersion(preferred_versions[key]);
            }
        }

        data = {
            'resources': resources,
            'preferred_versions': preferred_versions,
            'query_results_number': resources.length,
            'resources_per_page': 10,
            'current_page': 1
        };

        callback(data);
    } 
};

FiWareCatalogueView.prototype.instanciate = function (resource) {
    //is mashup?
    if (resource.isMashup()) {
        LayoutManagerFactory.getInstance().showWindowMenu(
            "addMashup",
            function () {
                OpManagerFactory.getInstance().addMashupResource(this);
            }.bind(resource),
            function () {
                OpManagerFactory.getInstance().mergeMashupResource(this);
            }.bind(resource));

        return;
    }

    // Normal instantiation!
    ShowcaseFactory.getInstance().addGadget(resource.getVendor(), resource.getName(),
        resource.getVersion().text, resource.getUriTemplate());
};

FiWareCatalogueView.prototype.getSubMenuItems = function () {
    return [
        {
            'label': gettext('publish'),
            'callback': alert.bind(null, 'hola')
        }
    ];
};

FiWareCatalogueView.prototype.changeCurrentView = function (view_name) {
    if (!(view_name in this.viewsByName)) {
        throw new TypeError();
    }

    this.alternatives.showAlternative(this.viewsByName[view_name]);
};

FiWareCatalogueView.prototype.home = function () {
    this.changeCurrentView('search');
};

FiWareCatalogueView.prototype.createUserCommand = function(command/*, ...*/) {
    return this.ui_commands[command].apply(this, Array.prototype.slice.call(arguments, 1));
};

FiWareCatalogueView.prototype.ui_commands = {};

FiWareCatalogueView.prototype.ui_commands.instanciate = function (resource) {
    return function (e) {
        Event.stop(e);
		this.instanciate(resource);
        LayoutManagerFactory.getInstance().changeCurrentView('workspace');
    }.bind(this)
};

FiWareCatalogueView.prototype.ui_commands.showDetails = function (resource) {
    return function (e) {
        Event.stop(e);
        this.viewsByName.details.paint(resource);
        this.alternatives.showAlternative(this.viewsByName.details);
    }.bind(this)
};

FiWareCatalogueView.prototype.ui_commands.publish = function (resource) {
    return function (e) {
        this.alternatives.showAlternative(this.viewsByName.publish);
    }.bind(this)
};

FiWareCatalogueView.prototype.ui_commands.delete = function (resource,options) {
	// First ask the user
    msg = gettext('Do you really want to remove the "%(name)s" (vendor: "%(vendor)s", version: "%(version)s") gadget?');
    context = {
       	name: resource.getName(),
       	vendor: resource.getVendor(),
       	version: resource.getVersion().text
    };

	doRequest = function(){
		this.fiWareCatalogue.delete(options)
	};

   	msg = interpolate(msg, context, true);
   	return function () {
       	LayoutManagerFactory.getInstance().showYesNoDialog(msg, doRequest.bind(this));
   	}.bind(this);
};
