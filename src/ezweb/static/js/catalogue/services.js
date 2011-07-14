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

/*jslint white: true, onevar: true, undef: true, nomen: false, eqeqeq: true, plusplus: true, bitwise: true, regexp: true, newcap: true, immed: true, strict: true */
/*global alert, Constants, CookieManager, document, Element, gettext, Hash, interpolate */
/*global LayoutManagerFactory, LogManagerFactory, OpManagerFactory, ResourceState, ResponseCommand, ShowcaseFactory, Template, URIs, window */
"use strict";

var CatalogueService = function () {
    this.persistence_engine = null;

    this.set_persistence_engine = function (persistence_engine) {
        this.persistence_engine = persistence_engine;
    };

    this.set_response_command_processor = function (command_processor) {
        this.resp_command_processor = command_processor;
    };

    this.parse_response_data = function (response_data) {};
};

var CatalogueSearcher = function () {
    CatalogueService.call(this);

    this.scope = null;
    this.view_all_template = null;
    this.simple_search_template = null;
    this.configured = false;
    this.resp_command_processor = null;
    this.last_search_options = {};
    this.base_options = null;

    this.set_base_options = function(options) {
        this.base_options = options;
    };

    this.set_scope = function (scope) {
        this.scope = scope;

        if (this.last_search_options[scope]) {
            return true;
        }

        this.last_search_options[scope] = Object.clone(this.base_options);
        this.last_search_options[scope].scope = scope;

        return false;
    };

    this.invalidate_last_results = function (scope) {
        delete this.last_search_options[scope];
    };

    this.get_scope = function () {
        return this.scope;
    };

    this.get_command_id_by_scope = function () {
        switch (this.scope) {
        case 'gadget':
            return 'PAINT_GADGETS';
        case 'mashup':
            return 'PAINT_MASHUPS';
        default:
            alert('Missing scope type');
            return '';
        }
    };

    this.configure = function () {
        this.view_all_template = new Template(URIs.GET_POST_RESOURCES + '/#{starting_page}/#{resources_per_page}');
        this.simple_search_template = new Template(URIs.GET_RESOURCES_SIMPLE_SEARCH + '/simple_or/#{starting_page}/#{resources_per_page}');

        this.configured = true;
    };

    this.save_search_options = function (operation, criteria, starting_page, resources_per_page, order_by, search_boolean, search_scope) {
        this.last_search_options[search_scope] = {
            operation: operation,
            criteria: criteria,
            starting_page: starting_page,
            resources_per_page: resources_per_page,
            order_by: order_by,
            boolean_operator: search_boolean,
            scope: search_scope
        };
    };

    this.process_response = function (response, command) {
        var response_json, resource_list, preferred_versions, resources, i,
            key, resource;

        response_json = JSON.parse(response.responseText);
        resource_list = response_json.resources;

        if (resource_list) {
            preferred_versions = CookieManager.readCookie('preferred_versions', true);
            if (preferred_versions === null) {
                preferred_versions = {};
            }

            resources = [];

            for (i = 0; i < resource_list.length; i += 1) {
                resource = new ResourceState(resource_list[i]);
                resources.push(resource);
                key = resource.getVendor() + '/' + resource.getName();
                if (key in preferred_versions) {
                    resource.changeVersion(preferred_versions[key]);
                }
            }

            return {
                'resources': resources,
                'preferred_versions': preferred_versions,
                'query_results_number': response.getResponseHeader('items'),
                'resources_per_page': command.resources_per_page,
                'current_page': command.current_page
            };
        }
    };

    this.repeat_last_search = function () {
        var search_options = this.last_search_options[this.scope],
            operation = search_options.operation,
            criteria = search_options.criteria,
            starting_page = search_options.starting_page,
            resources_per_page = search_options.resources_per_page,
            order_by = search_options.order_by,
            boolean_operator = search_options.boolean_operator,
            scope = search_options.scope;

        this.search(operation, criteria, starting_page, resources_per_page, order_by, boolean_operator, scope);
    };

    this.search = function (operation, search_criteria, starting_page, resources_per_page, order_by, search_boolean, search_scope) {
        var url, params, response_command, command_id, success_callback, error_callback;

        if (!this.configured) {
            this.configure();
        }

        // Saving search options in order to repeat search!
        this.save_search_options(operation, search_criteria, starting_page, resources_per_page, order_by, search_boolean, search_scope);

        if (search_scope) {
            this.set_scope(search_scope);
        }

        url = null;
        params = new Hash({
            'orderby': order_by,
            'search_criteria': search_criteria,
            'search_boolean': search_boolean,
            'scope': this.scope
        });
        response_command = new ResponseCommand(this.resp_command_processor, this);
        command_id = this.get_command_id_by_scope();

        response_command.resources_per_page = resources_per_page;
        response_command.current_page = starting_page;

        switch (operation) {
        case 'VIEW_ALL':
            url = this.view_all_template.evaluate({'starting_page': starting_page, 'resources_per_page': resources_per_page});
            response_command.set_id(command_id);

            break;
        case 'SIMPLE_SEARCH':
            url = this.simple_search_template.evaluate({'starting_page': starting_page, 'resources_per_page': resources_per_page});
            response_command.set_id(command_id);

            break;
        default:
            // Unidentified search => Skipping!
            alert('Unidentified search');
            return;
        }

        success_callback = function (response) {
            var processed_response_data = this.caller.process_response(response, this);

            // "this" is binded to a "ResponseCommand" object
            this.set_data(processed_response_data);

            // processing command
            this.process();
        };

        error_callback = function (transport, e) {
            var logManager, layoutManager, msg;

            logManager = LogManagerFactory.getInstance();
            layoutManager = LayoutManagerFactory.getInstance();

            msg = logManager.formatError(gettext("Error searching the catalogue: %(errorMsg)s."), transport, e);
            logManager.log(msg);
            layoutManager.showMessageMenu(msg, Constants.Logging.ERROR_MSG);
        };

        this.persistence_engine.send_get(url, response_command, success_callback, error_callback, params);
    };
};

var CatalogueResourceSubmitter = function () {
    CatalogueService.call(this);

    this.configured = false;
    this.resp_command_processor = null;

    this.configure = function () {
        this.submit_gadget_url = URIs.GET_POST_RESOURCES;

        this.configured = true;
    };

    this.process_response = function (response_text, command) {
        var resource_state, resource;

        resource_state = JSON.parse(response_text);
        resource = new ResourceState(resource_state);
        // Change version to the added one
        resource.changeVersion(resource_state.versions[0].version);

        return resource;
    };

    this.change_preferred_version = function (resource, version) {
        var preferred_versions, response_command, key;

        preferred_versions = CookieManager.readCookie('preferred_versions', true);
        if (preferred_versions === null) {
            preferred_versions = {};
        }
        key = resource.getVendor() + '/' + resource.getName();
        if (version !== '') {
            preferred_versions[key] = version.text;
        } else {
            delete preferred_versions[key];
        }
        CookieManager.createCookie('preferred_versions', preferred_versions, 30);
        resource.changeVersion(version);

        // CommandResponse creation
        response_command = new ResponseCommand(this.resp_command_processor, this);
        response_command.set_id('PAINT_RESOURCE_DETAILS');
        response_command.set_data(resource);
        response_command.process();
    };

    this.add_gadget_from_template = function (template_uri) {
        var error_callback, success_callback, layoutManager, response_command, params;

        error_callback = function (transport, e) {
            var logManager, msg;

            logManager = LogManagerFactory.getInstance();

            msg = logManager.formatError(gettext("The resource could not be added to the catalogue: %(errorMsg)s."), transport, e);

            logManager.log(msg);
            layoutManager._notifyPlatformReady();
            layoutManager.showMessageMenu(msg, Constants.Logging.ERROR_MSG);
        };

        success_callback = function (response) {
            var processed_response_data;
            layoutManager.logSubTask(gettext('Processing catalogue response'));

            processed_response_data = this.caller.process_response(response.responseText, this);

            // "this" is binded to a "ResponseCommand" object
            this.set_data(processed_response_data);

            layoutManager._notifyPlatformReady();

            // processing command
            this.process();
        };

        layoutManager = LayoutManagerFactory.getInstance();
        layoutManager._startComplexTask(gettext("Adding the resource to the catalogue"), 2);
        layoutManager.logSubTask(gettext('Sending resource template to the catalogue'));

        response_command = new ResponseCommand(this.resp_command_processor, this);
        response_command.set_id('SUBMIT_GADGET');

        params = new Hash({template_uri: template_uri});

        this.persistence_engine.send_post(URIs.GET_POST_RESOURCES, params, response_command, success_callback, error_callback);
    };

    this.add_gadget_from_wgt = function () {
        var checkFile, response_command, upload, iframe;
        checkFile = function () {
            var iframe, doc, layoutManager, logManager, msg, processed_response_data;

            iframe = document.getElementById("upload");

            if (iframe.contentDocument) {
                doc = iframe.contentDocument;
            } else if (iframe.contentWindow) {
                doc = iframe.contentWindow.document;
            } else {
                doc = window.frames.upload.document;
            }

            layoutManager = LayoutManagerFactory.getInstance();

            doc.body.getTextContent = Element.prototype.getTextContent;
            if (doc.location.href.search("error") >= 0) {
                logManager = LogManagerFactory.getInstance();
                msg = gettext("The resource could not be added to the catalogue: %(errorMsg)s");
                msg = interpolate(msg, {errorMsg: doc.body.getTextContent()}, true);

                layoutManager._notifyPlatformReady();
                layoutManager.showMessageMenu(msg, Constants.Logging.ERROR_MSG);
                logManager.log(msg);
                return;
            } else {
                layoutManager.logSubTask(gettext('Gadget uploaded successfully'));
                layoutManager.logStep('');
                layoutManager._notifyPlatformReady();

                // "this" is binded to a "ResponseCommand" object
                processed_response_data = this.caller.process_response(doc.body.getTextContent(), this);
                this.set_data(processed_response_data);
                this.process();
            }
        };

        response_command = new ResponseCommand(this.resp_command_processor, this);
        response_command.set_id('SUBMIT_PACKAGED_GADGET');

        LayoutManagerFactory.getInstance()._startComplexTask(gettext("Uploading packaged gadget"), 1);
        upload = document.getElementById("upload_form");
        iframe = document.getElementById("upload");

        iframe.onload = checkFile.bind(response_command);

        upload.submit();
    };

    this.delete_resource = function (resource) {
        var url, success_callback, error_callback, doRequest, msg, context;

        url = URIs.GET_POST_RESOURCES + "/" + resource.getVendor() + "/" + resource.getName() + "/" + resource.getVersion().text;

        success_callback = function (response) {
            // processing command
            var layoutManager, result, opManager, i, gadgetId;

            layoutManager = LayoutManagerFactory.getInstance();
            result = JSON.parse(response.responseText);

            layoutManager.logSubTask(gettext('Removing affected iGadgets'));
            opManager = OpManagerFactory.getInstance();
            for (i = 0; i < result.removedIGadgets.length; i += 1) {
                opManager.removeInstance(result.removedIGadgets[i], true);
            }

            layoutManager.logSubTask(gettext('Purging gadget info'));
            gadgetId = resource.getVendor() + '_' + resource.getName() + '_' + resource.getVersion().text;
            ShowcaseFactory.getInstance().deleteGadget(gadgetId);

            layoutManager._notifyPlatformReady();
            this.process();
        };

        error_callback = function (transport, e) {
            var logManager, layoutManager, msg;

            logManager = LogManagerFactory.getInstance();
            layoutManager = LayoutManagerFactory.getInstance();

            msg = logManager.formatError(gettext("Error deleting the Gadget: %(errorMsg)s."), transport, e);

            logManager.log(msg);
            layoutManager._notifyPlatformReady();
            layoutManager.showMessageMenu(msg, Constants.Logging.ERROR_MSG);
        };

        doRequest = function () {
            var layoutManager, response_command;

            layoutManager = LayoutManagerFactory.getInstance();
            layoutManager._startComplexTask(gettext("Deleting gadget resource from catalogue"), 3);
            layoutManager.logSubTask(gettext('Requesting server'));

            response_command = new ResponseCommand(this.resp_command_processor, this);
            response_command.set_id('REPEAT_SEARCH');

            //Send request to delete de gadget
            this.persistence_engine.send_delete(url, response_command, success_callback, error_callback);
        };

        // First ask the user
        msg = gettext('Do you really want to remove the "%(name)s" (vendor: "%(vendor)s", version: "%(version)s") gadget?');
        context = {
            name: resource.getName(),
            vendor: resource.getVendor(),
            version: resource.getVersion().text
        };

        msg = interpolate(msg, context, true);
        LayoutManagerFactory.getInstance().showYesNoDialog(msg, doRequest.bind(this));
    };

    this.update_resource_html = function (resource) {
        var context, url, success_callback, error_callback, response_command;

        context = {
            'vendor': resource.getVendor(),
            'name': resource.getName(),
            'version': resource.getVersion().text
        };

        url = URIs.GET_GADGET.evaluate(context);
        url += '/xhtml';

        success_callback = function (response) {
            // processing command
            var resource = this.get_data();

            resource.setExtraData({'update_result': gettext('Done!')});

            this.set_data(resource);

            this.process();
        };

        error_callback = function (transport, e) {
            var logManager, msg;

            logManager = LogManagerFactory.getInstance();
            msg = logManager.formatError(gettext("Error deleting the Gadget: %(errorMsg)s."), transport, e);

            logManager.log(msg);

            resource.setExtraData({'update_result': gettext('Error: the Gadget has not cached its HTML code. Instantiate it previously!')});

            // processing command
            this.process();
        };

        response_command = new ResponseCommand(this.resp_command_processor, this);
        response_command.set_id('PAINT_RESOURCE_DETAILS');

        // "this" is binded to a "ResponseCommand" object
        response_command.set_data(resource);

        //Send request to update gadget's code
        this.persistence_engine.send_update(url, {}, response_command, success_callback, error_callback);
    };
};

var CatalogueVoter = function () {
    CatalogueService.call(this);

    this.vote = function (resource, vote) {
        var url, success_callback, error_callback, response_command;
        url = URIs.POST_RESOURCE_VOTES + '/' + resource.getVendor() + '/' + resource.getName() + '/' + resource.getVersion().text;

        success_callback = function (response) {
            var response_obj, resource;

            // processing command
            response_obj = JSON.parse(response.responseText);
            resource = this.get_data();

            resource.setVotes(response_obj);

            resource.setExtraData({'voting_result': gettext('Done!')});

            this.set_data(resource);

            this.process();
        };

        error_callback = function (transport, e) {
            var logManager = LogManagerFactory.getInstance(),
                msg = logManager.formatError(gettext("Error deleting the Gadget: %(errorMsg)s."), transport, e);

            logManager.log(msg);

            resource.setExtraData({'voting_result': gettext('Error during voting!')});

            // processing command
            this.process();
        };

        response_command = new ResponseCommand(this.resp_command_processor, this);
        response_command.set_id('PAINT_RESOURCE_DETAILS');

        // "this" is binded to a "ResponseCommand" object
        response_command.set_data(resource);

        // Send request to update gadget's code
        if (resource.getUserVote() === 0) {
            this.persistence_engine.send_post(url, {'vote': vote }, response_command, success_callback, error_callback);
        } else {
            this.persistence_engine.send_update(url, {'vote': vote }, response_command, success_callback, error_callback);
        }
    };
};

var CatalogueTagger = function () {
    CatalogueService.call(this);

    this.tag = function (resource, tags_data) {
        var url, success_callback, error_callback, response_command, params;

        url = URIs.POST_RESOURCE_TAGS + '/' + resource.getVendor() + '/' + resource.getName() + '/' + resource.getVersion().text;

        success_callback = function (response) {
            var response_obj, resource, new_tags;

            // processing command
            response_obj = JSON.parse(response.responseText);
            resource = this.get_data();
            new_tags = response_obj.tagList;

            resource.setTags(new_tags);

            resource.setExtraData({'tagging_result': gettext('Done!')});

            this.set_data(resource);

            this.process();
        };

        error_callback = function (transport, e) {
            var logManager = LogManagerFactory.getInstance(),
                msg = logManager.formatError(gettext("Error tagging Gadget: %(errorMsg)s."), transport, e);

            logManager.log(msg);

            resource.setExtraData({'tagging_result': gettext('Error during tagging!')});

            // processing command
            this.process();
        };

        response_command = new ResponseCommand(this.resp_command_processor, this);
        response_command.set_id('PAINT_RESOURCE_DETAILS');

        // "this" is binded to a "ResponseCommand" object
        response_command.set_data(resource);

        //Send request to update gadget's code
        params = new Hash({tags_xml: tags_data});

        this.persistence_engine.send_post(url, params, response_command, success_callback, error_callback);
    };

    this.delete_tag = function (resource, tag_id) {
        var url, success_callback, error_callback, response_command;

        url = URIs.POST_RESOURCE_TAGS + '/' + resource.getVendor() + '/' + resource.getName() + '/' + resource.getVersion().text + '/' + tag_id;

        success_callback = function (response) {
            var response_obj, resource, new_tags;

            // processing command
            response_obj = JSON.parse(response.responseText);
            resource = this.get_data();
            new_tags = response_obj.tagList;

            resource.setTags(new_tags);

            resource.setExtraData({'tagging_result': gettext('Done!')});

            this.set_data(resource);

            this.process();
        };

        error_callback = function (transport, e) {
            var logManager = LogManagerFactory.getInstance(),
                msg = logManager.formatError(gettext("Error tagging Gadget: %(errorMsg)s."), transport, e);

            logManager.log(msg);

            resource.setExtraData({'tagging_result': gettext('Error during tagging!')});

            // processing command
            this.process();
        };

        response_command = new ResponseCommand(this.resp_command_processor, this);
        response_command.set_id('PAINT_RESOURCE_DETAILS');

        // "this" is binded to a "ResponseCommand" object
        response_command.set_data(resource);

        this.persistence_engine.send_delete(url, response_command, success_callback, error_callback);
    };
};
