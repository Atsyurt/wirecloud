/*
 *     Copyright (c) 2015-2016 CoNWeT Lab., Universidad Politécnica de Madrid
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

/* global StyledElements, Wirecloud */


(function (ns, se, utils) {

    "use strict";

    // ==================================================================================
    // CLASS DEFINITION
    // ==================================================================================

    /**
     * Create a new instance of class ComponentMeta.
     * @extends {Panel}
     *
     * @constructor
     */
    ns.ComponentMeta = utils.defineClass({

        constructor: function ComponentMeta(meta) {
            var thumbnailElement, versionGroup;

            this.title_tooltip = new se.Tooltip({placement: ["top", "bottom", "right", "left"]});

            this.btnAdd = new se.Button({
                title: utils.gettext("Create"),
                iconClass: 'icon-plus',
                extraClass: 'btn-create'
            });

            this.superClass({
                extraClass: "component-meta",
                events: [],
                title: meta.title
            });

            this.heading.title.addClassName(["component-title", "text-truncate"]);

            thumbnailElement = document.createElement('div');
            thumbnailElement.className = "se-thumbnail se-thumbnail-rounded se-thumbnail-sm";

            this.image = document.createElement('img');
            this.image.onerror = onImageError;
            this.image.src = meta.image;

            thumbnailElement.appendChild(this.image);

            versionGroup = document.createElement('div');
            versionGroup.className = "btn-group btn-group-sm component-version-list";

            this.version = new se.Select({'class': 'component-version'});
            this.version.insertInto(versionGroup);
            versionGroup.appendChild(this.btnAdd.get());

            this.vendor = document.createElement('div');
            this.vendor.className = "component-vendor";
            this.vendor.textContent = meta.vendor;

            this.description = document.createElement('div');
            this.description.className = "component-description";
            this.description.textContent = meta.description;

            this.body
                .appendChild(thumbnailElement)
                .appendChild(versionGroup)
                .appendChild(this.vendor)
                .appendChild(this.description);
        },

        inherit: se.Panel,

        members: {

            /**
             * @override
             */
            setTitle: function setTitle(title) {
                var span;

                span = document.createElement('span');
                span.textContent = title;
                this.title_tooltip.options.content = title;
                this.title_tooltip.bind(span);

                return this.superMember(se.Panel, 'setTitle', span);
            },

            showVersion: function showVersion(version) {
                this.setTitle(version.title);
                this.description.textContent = version.description;

                this.image.onerror = onImageError;
                this.image.src = version.image;

                if (version.hasEndpoints()) {
                    this.btnAdd.show();
                } else {
                    this.btnAdd.hide();
                }

                return this;
            }

        }

    });

    var onImageError = function onImageError(event) {
        event.target.parentElement.classList.add('se-thumbnail-missing');
        event.target.parentElement.textContent = utils.gettext('No image available');
    };


})(Wirecloud.ui.WiringEditor, StyledElements, StyledElements.Utils);
