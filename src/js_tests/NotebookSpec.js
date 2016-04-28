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

/* jshint jasmine:true */
/* globals StyledElements */

(function () {

    "use strict";

    describe("Styled Notebook", function () {
        var dom = null;

        beforeEach(function () {
            dom = document.createElement('div');
            document.body.appendChild(dom);
        });

        afterEach(function () {
            if (dom != null) {
                dom.remove();
                dom = null;
            }
        });

        it("should support adding new tabs programmatically (through the createTab method)", function () {
            var element = new StyledElements.Notebook();
            var tab1 = element.createTab();
            var tab2 = element.createTab();

            expect(element.visibleTab).toBe(tab1);
            expect(element.tabs).toEqual([tab1, tab2]);
            expect(element.tabArea.wrapperElement.children[0]).toBe(tab1.tabElement);
            expect(element.tabArea.wrapperElement.children[1]).toBe(tab2.tabElement);
        });

        it("should support adding new tabs through a user interface button", function () {
            var element, tab, btnCreate;

            element = new StyledElements.Notebook();
            element.addEventListener('newTab', function (notebook) {tab = notebook.createTab();});
            btnCreate = element.new_tab_button_tabs;

            btnCreate.click();

            expect(element.visibleTab).toBe(tab);
            expect(element.tabs).toEqual([tab]);
            expect(element.tabArea.wrapperElement.children[0]).toBe(tab.tabElement);
            expect(element.tabArea.wrapperElement.children[1]).toBe(btnCreate.wrapperElement);
        });

        describe("goToTab(tab)", function () {
            var element, tab1, tab2, tab3;

            beforeEach(function () {
                element = new StyledElements.Notebook();
                element.appendTo(dom);
                tab1 = element.createTab();
                tab2 = element.createTab();
                tab3 = element.createTab();
            });

            it("throws an exception if tab is null", function () {
                expect(function () {element.goToTab(null);}).toThrow(jasmine.any(TypeError));
            });

            it("throws an exception if tab is not a valid tab id", function () {
                expect(function () {element.goToTab("mytab4");}).toThrow(jasmine.any(TypeError));
            });

            it("should raise an exception if the passed tab is not owned by the notebook", function () {
                var other_notebook = new StyledElements.Notebook();
                var other_tab = other_notebook.createTab();
                expect(function () {element.goToTab(other_tab);}).toThrow(jasmine.any(TypeError));
            });

            it("does nothing if the passed tab is the visible tab", function () {
                element.goToTab(tab1);
                expect(element.tabArea.wrapperElement.children[2]).toBe(tab3.tabElement);
            });

        });

        describe("removeTab(tab)", function () {
            var element, tab1, tab2, tab3;

            beforeEach(function () {
                element = new StyledElements.Notebook();
                element.appendTo(dom);
                tab1 = element.createTab();
                tab2 = element.createTab();
                tab3 = element.createTab();
            });

            it("does nothing if tab is null", function () {
                element.removeTab(null);
                expect(element.tabs).toEqual([tab1, tab2, tab3]);
                expect(element.tabArea.wrapperElement.children[0]).toBe(tab1.tabElement);
                expect(element.tabArea.wrapperElement.children[1]).toBe(tab2.tabElement);
                expect(element.tabArea.wrapperElement.children[2]).toBe(tab3.tabElement);
            });

            it("does nothing if tab is not found", function () {
                element.removeTab("mytab4");
                expect(element.tabs).toEqual([tab1, tab2, tab3]);
                expect(element.tabArea.wrapperElement.children[0]).toBe(tab1.tabElement);
                expect(element.tabArea.wrapperElement.children[1]).toBe(tab2.tabElement);
                expect(element.tabArea.wrapperElement.children[2]).toBe(tab3.tabElement);
            });

            it("should allow removing tabs by id", function () {
                element.removeTab(tab2.getId());
                expect(element.tabs).toEqual([tab1, tab3]);
                expect(element.tabArea.wrapperElement.children[0]).toBe(tab1.tabElement);
                expect(element.tabArea.wrapperElement.children[1]).toBe(tab3.tabElement);
            });

            it("should allow removing tabs using Tab instances", function () {
                element.removeTab(tab2);
                expect(element.tabs).toEqual([tab1, tab3]);
                expect(element.tabArea.wrapperElement.children[0]).toBe(tab1.tabElement);
                expect(element.tabArea.wrapperElement.children[1]).toBe(tab3.tabElement);
            });

            it("should raise an exception if the passed tab is not owned by the notebook", function () {
                var other_notebook = new StyledElements.Notebook();
                var other_tab = other_notebook.createTab();
                expect(function () {element.removeTab(other_tab);}).toThrow(jasmine.any(TypeError));
                expect(element.tabs).toEqual([tab1, tab2, tab3]);
                expect(element.tabArea.wrapperElement.children[0]).toBe(tab1.tabElement);
                expect(element.tabArea.wrapperElement.children[1]).toBe(tab2.tabElement);
                expect(element.tabArea.wrapperElement.children[2]).toBe(tab3.tabElement);
            });

            it("should allow removing the active tab", function () {
                expect(element.visibleTab).toBe(tab1);
                element.removeTab(tab1);
                expect(element.visibleTab).toBe(tab2);
                expect(element.tabs).toEqual([tab2, tab3]);
                expect(element.tabArea.wrapperElement.children[0]).toBe(tab2.tabElement);
                expect(element.tabArea.wrapperElement.children[1]).toBe(tab3.tabElement);
            });

            it("should allow removing the active tab when the active tab is the right most tab", function () {
                element.goToTab(tab3);
                expect(element.visibleTab).toBe(tab3);
                element.removeTab(tab3);
                expect(element.visibleTab).toBe(tab2);
                expect(element.tabs).toEqual([tab1, tab2]);
                expect(element.tabArea.wrapperElement.children[0]).toBe(tab1.tabElement);
                expect(element.tabArea.wrapperElement.children[1]).toBe(tab2.tabElement);
            });

            it("should allow removing the latest tab", function () {
                element.removeTab(tab1);
                element.removeTab(tab2);
                element.removeTab(tab3);
                expect(element.visibleTab).toEqual(null);
                expect(element.tabs).toEqual([]);
                expect(element.tabArea.wrapperElement.children.length).toBe(0);
            });

        });

        describe("addButton(button, position)", function () {
            var element;

            beforeEach(function () {
                element = new StyledElements.Notebook();
            });

            it("throws an exception if button is not a button", function () {
                expect(function () {element.addButton(null);}).toThrow(jasmine.any(TypeError));
            });

            it("place buttons on the right by default", function () {
                var button = new StyledElements.Button();
                element.addButton(button);
                expect(element.tabWrapper.east.children).toEqual([element.moveRightButton, button]);
            });

            it("place buttons on the right by default", function () {
                var button = new StyledElements.Button();
                element.addButton(button, 'right');
                expect(element.tabWrapper.east.children).toEqual([element.moveRightButton, button]);
            });

            it("should allow to add buttons on the left side", function () {
                var button = new StyledElements.Button();
                element.addButton(button, 'left');
                expect(element.tabWrapper.west.children).toEqual([button, element.moveLeftButton]);
            });
        });

    });

})();
