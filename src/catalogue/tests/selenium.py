# -*- coding: utf-8 -*-


import time
from shutil import rmtree
from tempfile import mkdtemp

from django.conf import settings

import catalogue.utils
from wirecloudcommons.test import WirecloudSeleniumTestCase
from commons.wgt import WgtDeployer

__test__ = False


class CatalogueSeleniumTests(WirecloudSeleniumTestCase):

    __test__ = True

    def setUp(self):

        self.old_CATALOGUE_MEDIA_ROOT = settings.CATALOGUE_MEDIA_ROOT
        settings.CATALOGUE_MEDIA_ROOT = mkdtemp()
        self.old_deployer = catalogue.utils.wgt_deployer
        catalogue.utils.wgt_deployer = WgtDeployer(settings.CATALOGUE_MEDIA_ROOT)

        super(CatalogueSeleniumTests, self).setUp()

    def tearDown(self):
        rmtree(settings.CATALOGUE_MEDIA_ROOT, ignore_errors=True)
        settings.CATALOGUE_MEDIA_ROOT = self.old_CATALOGUE_MEDIA_ROOT
        catalogue.utils.wgt_deployer = self.old_deployer

        super(CatalogueSeleniumTests, self).tearDown()

    def test_add_widget_to_catalog_wgt(self):

        driver = self.driver

        self.login()

        self.change_main_view("marketplace")
        time.sleep(3)

        self.add_wgt_widget_to_catalogue('Morfeo_Calendar_Viewer.wgt', 'Calendar Viewer')
        self.add_wgt_widget_to_catalogue('Morfeo_Cliente_Correo.wgt', 'Cliente Correo')
        self.add_wgt_widget_to_catalogue('Morfeo_FeedList.wgt', 'Feed List')
        self.add_wgt_widget_to_catalogue('Morfeo_FeedReader.wgt', 'Feed Reader')

        driver.implicitly_wait(30)
        driver.get(self.live_server_url + "/admin/")
        driver.find_element_by_link_text("Catalogue resources").click()
        driver.find_element_by_link_text("Calendar Viewer").click()
        driver.find_element_by_link_text("Delete").click()
        driver.find_element_by_xpath("//input[@value=\"Yes, I'm sure\"]").click()
        driver.find_element_by_link_text("Cliente Correo").click()
        driver.find_element_by_link_text("Delete").click()
        driver.find_element_by_xpath("//input[@value=\"Yes, I'm sure\"]").click()
        driver.find_element_by_link_text("FeedList").click()
        driver.find_element_by_link_text("Delete").click()
        driver.find_element_by_xpath("//input[@value=\"Yes, I'm sure\"]").click()
        driver.find_element_by_link_text("FeedReader").click()
        driver.find_element_by_link_text("Delete").click()
        driver.find_element_by_xpath("//input[@value=\"Yes, I'm sure\"]").click()
        driver.find_element_by_link_text("Log out").click()

    def test_add_widget_to_catalogue_xml(self):

        self.login()

        self.change_main_view("marketplace")
        time.sleep(3)

        self.add_template_to_catalogue('http://localhost:8001/test/test.xml', 'Test_Selenium')

    def test_add_widget_to_catalogue_rdf(self):

        self.login()

        self.change_main_view("marketplace")
        time.sleep(3)

        self.add_template_to_catalogue('http://localhost:8001/test/test.rdf', 'Test_Selenium')

    def test_add_invalid_widget_to_catalogue_rdf(self):

        self.login()

        self.change_main_view("marketplace")
        time.sleep(3)

        self.add_template_to_catalogue_with_error('http://localhost:8001/test/invalidTest.rdf', 'Test_Selenium', '[TemplateParseException] missing required field: versionInfo.')

    def test_add_widget_twice(self):

        self.login()

        self.change_main_view("marketplace")
        time.sleep(3)

        self.add_template_to_catalogue('http://localhost:8001/test/test.rdf', 'Test_Selenium')
        self.add_template_to_catalogue_with_error('http://localhost:8001/test/test.rdf', 'Test_Selenium', 'Resource already exists.')

    def test_add_fiware_marketplace(self):

        self.login()

        self.change_main_view("marketplace")
        time.sleep(3)

        self.add_marketplace('fiware', 'fiware', 'http://localhost:8080', 'fiware')

    def test_delete_fiware_marketpace(self):

        self.login()

        self.change_main_view("marketplace")
        time.sleep(3)

        self.add_marketplace('fiware', 'fiware', 'http://localhost:8080', 'fiware')
        time.sleep(3)
        self.delete_marketplace('fiware')

    def test_add_and_instantiate_widget_rdf(self):

        self.login()

        self.change_main_view("marketplace")
        time.sleep(3)

        resource = self.add_template_to_catalogue('http://localhost:8001/test/test.rdf', 'Test_Selenium')
        self.instanciate(resource)

    def test_add_and_delete_widget_rdf(self):

        self.login()

        self.change_main_view("marketplace")
        time.sleep(3)

        self.add_template_to_catalogue('http://localhost:8001/test/test.rdf', 'Test_Selenium')
        self.delete_widget('Test_Selenium')
