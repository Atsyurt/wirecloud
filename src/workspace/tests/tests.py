# -*- coding: utf-8 -*-

import codecs
import os

from lxml import etree
from django.contrib.auth.models import User
from django.test import Client, TestCase
from django.utils import simplejson

from commons.get_data import get_global_workspace_data
from connectable.models import InOut
from workspace.mashupTemplateGenerator import build_template_from_workspace
from workspace.mashupTemplateParser import buildWorkspaceFromTemplate, fillWorkspaceUsingTemplate
from workspace.models import WorkSpace, UserWorkSpace, Tab
from workspace.views import createEmptyWorkSpace


class WorkspaceTestCase(TestCase):
    fixtures = ['test_data']

    def setUp(self):
        super(WorkspaceTestCase, self).setUp()

        self.user = User.objects.get(username='test')

    def testGetGlobalWorkspaceData(self):

        workspace = WorkSpace.objects.get(pk=1)
        data = get_global_workspace_data(workspace, self.user)
        self.assertEqual('workspace' in data, True)
        self.assertEqual(len(data['workspace']['tabList']), 1)

    def testCreateEmptyWorkspace(self):

        workspace = createEmptyWorkSpace('Testing', self.user)

        user_workspace = UserWorkSpace.objects.filter(user=self.user, workspace=workspace)
        self.assertEqual(user_workspace.count(), 1)
        self.assertEqual(user_workspace[0].active, True)

        workspace_tabs = Tab.objects.filter(workspace=workspace)
        self.assertEqual(workspace_tabs.count(), 1)

        data = get_global_workspace_data(workspace, self.user)
        self.assertEqual('workspace' in data, True)

    def vars_by_name(self, igadget_data):
        variables = {}

        for var in igadget_data['variables']:
            variables[var['name']] = var

        return variables

    def testVariableValuesCacheInvalidation(self):

        workspace = WorkSpace.objects.get(pk=1)
        # Fill cache
        data = get_global_workspace_data(workspace, self.user)

        client = Client()
        put_data = {
            'igadgetVars': [{'id': 1, 'value': 'new_value'}],
            'workspaceVars': [],
        }
        put_data = simplejson.dumps(put_data, ensure_ascii=False)
        client.login(username='test', password='test')
        client.put('/workspace/1/variables', put_data, content_type='application/json', HTTP_HOST='localhost', HTTP_REFERER='http://localhost')

        data = get_global_workspace_data(workspace, self.user)
        variables = data['workspace']['tabList'][0]['igadgetList'][0]['variables']
        for variable in variables:
            if variable['id'] == 1:
                self.assertEqual(variable['value'], 'new_value')
                break


class ParamatrizedWorkspaceGenerationTestCase(TestCase):
    fixtures = ['test_workspace']

    def setUp(self):

        self.user = User.objects.create_user('test', 'test@example.com', 'test')
        self.workspace = createEmptyWorkSpace('Testing', self.user)

    def testBuildTemplateFromWorkspace(self):

        options = {
            'vendor': 'EzWeb Test Suite',
            'name': 'Test Workspace',
            'version': '1',
            'author': 'test',
            'email': 'a@b.com',
            'readOnlyGadgets': True,
        }
        template = build_template_from_workspace(options, self.workspace, self.user)
        etree.fromstring(template)


class ParametrizedWorkspaceParseTestCase(TestCase):

    def setUp(self):

        self.user = User.objects.create_user('test', 'test@example.com', 'test')
        self.workspace = createEmptyWorkSpace('Testing', self.user)

        f = codecs.open(os.path.join(os.path.dirname(__file__), 'wt1.xml'), 'rb')
        self.template1 = f.read()
        f.close()

        f = codecs.open(os.path.join(os.path.dirname(__file__), 'wt2.xml'), 'rb')
        self.template2 = f.read()
        f.close()

    def testFillWorkspaceUsingTemplate(self):
        fillWorkspaceUsingTemplate(self.workspace, self.template1)
        get_global_workspace_data(self.workspace, self.user)
        self.assertEqual(self.workspace.name, 'Testing')

    def testBuildWorkspaceFromTemplate(self):
        workspace = buildWorkspaceFromTemplate(self.template1, self.user)
        get_global_workspace_data(self.workspace, self.user)

        channels = InOut.objects.filter(workspace=workspace)
        self.assertEqual(channels.count(), 1)
        self.assertEqual(channels[0].readOnly, False)

    def testBlockedChannels(self):
        workspace = buildWorkspaceFromTemplate(self.template2, self.user)

        connectables = InOut.objects.filter(workspace=workspace)
        self.assertEqual(connectables.count(), 1)
        self.assertEqual(connectables[0].readOnly, True)
