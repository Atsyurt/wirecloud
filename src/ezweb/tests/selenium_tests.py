import time

from commons.test import WirecloudSeleniumTestCase
from selenium.webdriver import Firefox
from django.utils.unittest import SkipTest


class widget_operation:

    def __init__(self, driver, widget):
        self.driver = driver
        self.widget = widget

    def __enter__(self):
        self.driver.switch_to_frame(self.widget)
        return None

    def __exit__(self, type, value, traceback):
        self.driver.switch_to_frame(None)


class BasicSeleniumTests(WirecloudSeleniumTestCase):

    def check_popup_menu(self, must_be, must_be_absent):

        time.sleep(0.1)

        for item in must_be:
            menu_item = self.get_popup_menu_item(item)
            self.assertIsNotNone(menu_item)

        for item in must_be_absent:
            menu_item = self.get_popup_menu_item(item)
            self.assertIsNone(menu_item)

    def add_tab(self):

        old_tab_count = len(self.driver.find_elements_by_css_selector('#workspace .tab_wrapper .tab'))

        self.change_main_view('workspace')
        self.driver.find_element_by_css_selector('#workspace .tab_wrapper .add_tab').click()
        self.wait_wirecloud_ready()

        new_tab_count = len(self.driver.find_elements_by_css_selector('#workspace .tab_wrapper .tab'))
        self.assertEqual(new_tab_count, old_tab_count + 1)

        return self.driver.find_elements_by_css_selector('#workspace .tab_wrapper .tab')[-1]

    def test_basic_workspace_operations(self):

        self.login()

        # We need atleast one Workspace, so we cannot delete current workspace
        self.driver.find_element_by_css_selector('#wirecloud_breadcrum .second_level > .icon-menu').click()
        self.check_popup_menu(('Rename', 'Settings', 'New workspace'), ('Remove',))
        self.driver.find_element_by_class_name('disable-layer').click()

        self.create_workspace('Test')

        # Now we have two workspaces so we can remove any of them
        self.driver.find_element_by_css_selector('#wirecloud_breadcrum .second_level > .icon-menu').click()
        self.check_popup_menu(('Rename', 'Settings', 'New workspace', 'Remove'), ())
        self.driver.find_element_by_class_name('disable-layer').click()

        self.rename_workspace('test2')
        tab = self.get_workspace_tab_by_name('Tab')

        # Only one tab => we cannot remove it
        tab_menu_button = tab.find_element_by_css_selector('.icon-tab-menu')
        tab_menu_button.click()
        self.check_popup_menu(('Rename',), ('Remove',))
        self.driver.find_element_by_class_name('disable-layer').click()

        new_tab = self.add_tab()

        # Now we have two tabs so we can remove any of them
        tab_menu_button = tab.find_element_by_css_selector('.icon-tab-menu')
        tab_menu_button.click()
        self.check_popup_menu(('Rename', 'Remove'), ())
        self.driver.find_element_by_class_name('disable-layer').click()

        new_tab.click()
        tab_menu_button = new_tab.find_element_by_css_selector('.icon-tab-menu')
        tab_menu_button.click()
        self.check_popup_menu(('Rename', 'Remove'), ())

        # Remove the recently created one
        self.popup_menu_click('Remove')
        self.wait_wirecloud_ready()
        self.assertEqual(len(self.driver.find_elements_by_css_selector('#workspace .tab_wrapper .tab')), 1)

        self.remove_workspace()

        # Now we have only one workspace, so we cannot remove it
        self.driver.find_element_by_css_selector('#wirecloud_breadcrum .second_level > .icon-menu').click()
        self.check_popup_menu(('Rename', 'Settings', 'New workspace'), ('Remove',))
        self.driver.find_element_by_class_name('disable-layer').click()

    def test_add_widget_from_catalogue(self):

        self.login()
        self.assertEqual(self.count_iwidgets(), 0)
        self.add_widget_to_mashup('Test')
        self.assertEqual(self.count_iwidgets(), 1)

    def test_basic_gadget_functionalities(self):

        if not isinstance(self.driver, Firefox):
            raise SkipTest('Unsupported webdriver instance')

        self.login()
        self.add_widget_to_mashup('Test')

        with widget_operation(self.driver, 1):
            self.assertEqual(self.driver.find_element_by_id('listPref').text, 'default')
            self.assertEqual(self.driver.find_element_by_id('textPref').text, 'initial text')

        # Change widget settings
        self.driver.find_element_by_css_selector('.gadget_window .settingsbutton').click()
        self.popup_menu_click('Settings')

        self.driver.find_element_by_css_selector('.window_menu [name="list"]').send_keys('value1')
        pref_input = self.driver.find_element_by_css_selector('.window_menu [name="text"]')
        pref_input.clear()
        pref_input.send_keys('test')

        self.driver.find_element_by_xpath("//*[contains(@class, 'window_menu')]//*[text()='Accept']").click()

        with widget_operation(self.driver, 1):
            self.assertEqual(self.driver.find_element_by_id('listPref').text, '1')
            self.assertEqual(self.driver.find_element_by_id('textPref').text, 'test')
