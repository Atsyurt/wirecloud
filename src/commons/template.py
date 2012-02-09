# -*- coding: utf-8 -*-

# Copyright 2012 Universidad Politécnica de Madrid

# This file is part of Wirecloud.

# Wirecloud is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.

# Wirecloud is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.

# You should have received a copy of the GNU General Public License
# along with Wirecloud.  If not, see <http://www.gnu.org/licenses/>.

import re
import urlparse

from django.utils.translation import ugettext as _
from lxml import etree

from commons.exceptions import TemplateParseException
from commons.translation_utils import get_trans_index


__all__ = ('TemplateParser',)


NAME_RE = re.compile(r'^[^/]+$')
VENDOR_RE = re.compile(r'^[^/]+$')
VERSION_RE = re.compile(r'^(?:[1-9]\d*\.|0\.)*(?:[1-9]\d*|0)$')

WIRECLOUD_TEMPLATE_NS = 'http://morfeo-project.org/2007/Template'

RESOURCE_DESCRIPTION_XPATH = '/t:Template/t:Catalog.ResourceDescription'
NAME_XPATH = 't:Name'
VENDOR_XPATH = 't:Vendor'
VERSION_XPATH = 't:Version'
DESCRIPTION_XPATH = 't:Description'
AUTHOR_XPATH = 't:Author'
ORGANIZATION_XPATH = 't:Organization'
IMAGE_URI_XPATH = 't:ImageURI'
IPHONE_IMAGE_URI_XPATH = 't:iPhoneImageURI'
MAIL_XPATH = 't:Mail'
DOC_URI_XPATH = 't:WikiURI'

DISPLAY_NAME_XPATH = 't:DisplayName'
CODE_XPATH = '/t:Template/t:Platform.Link/t:XHTML'
PREFERENCES_XPATH = '/t:Template/t:Platform.Preferences'
PREFERENCE_XPATH = 't:Preference'
OPTION_XPATH = 't:Option'
PROPERTY_XPATH = '/t:Template/t:Platform.StateProperties/Property'
WIRING_XPATH = '/t:Template/t:Platform.Wiring'
SLOT_XPATH = 't:Slot'
EVENT_XPATH = 't:Event'
CONTEXT_XPATH = '/t:Template/t:Platform.Context'
GADGET_CONTEXT_XPATH = 't:GadgetContext'
PLATFORM_CONTEXT_XPATH = 't:Context'
PLATFORM_RENDERING_XPATH = '/t:Template/t:Platform.Rendering'
MENUCOLOR_XPATH = '/t:Template/t:MenuColor'

INCLUDED_RESOURCES_XPATH = 't:IncludedResources'
TAB_XPATH = 't:Tab'
RESOURCE_XPATH = 't:Resource'
POSITION_XPATH = 't:Position'
RENDERING_XPATH = 't:Rendering'
PARAM_XPATH = 't:Param'
PROPERTIES_XPATH = 't:Property'
CHANNEL_XPATH = 't:Channel'
IN_XPATH = 't:In'
OUT_XPATH = 't:Out'

TRANSLATIONS_XPATH = '/t:Template/t:Translations'
TRANSLATION_XPATH = 't:Translation'
MSG_XPATH = 't:msg'


class TemplateParser(object):

    _doc = None
    _resource_description = None
    _parsed = False

    def __init__(self, template, base=None):

        self.base = base
        self._info = {}
        self._translation_indexes = {}
        self._url_fields = []

        if isinstance(template, str):
            self._doc = etree.fromstring(template)
        elif isinstance(template, unicode):
            # Work around: ValueError: Unicode strings with encoding
            # declaration are not supported.
            self._doc = etree.fromstring(template.encode('utf-8'))
        else:
            self._doc = template

        prefix = self._doc.prefix
        xmlns = None
        if prefix in self._doc.nsmap:
            xmlns = self._doc.nsmap[prefix]

        if xmlns is not None and xmlns != WIRECLOUD_TEMPLATE_NS:
            raise TemplateParseException('The template is not a valid wirecloud template')
        self._uses_namespace = xmlns is not None


        self._resource_description = self._xpath(RESOURCE_DESCRIPTION_XPATH, self._doc)[0]
        self._parse_basic_info()

        included_resources_elements = self._xpath(INCLUDED_RESOURCES_XPATH, self._resource_description)
        if len(included_resources_elements) == 1:
            self._info['type'] = 'mashup'
        else:
            self._info['type'] = 'gadget'

    def _xpath(self, query, element):
        if self._uses_namespace:
            return element.xpath(query, namespaces={'t': WIRECLOUD_TEMPLATE_NS})
        else:
            query = query.replace('t:', '')
            return element.xpath(query)

    def _add_translation_index(self, value, **kwargs):
        index = get_trans_index(value)
        if not index:
            return

        if index not in self._translation_indexes:
            self._translation_indexes[index] = []

        self._translation_indexes[index].append(kwargs)

    def _parse_extra_info(self):
        if self._info['type'] == 'gadget':
            self._parse_gadget_info()
        elif self._info['type'] == 'mashup':
            self._parse_workspace_info()

        self._parse_translation_catalogue()
        self._parsed = True
        self._doc = None
        self._resource_description = None

    def _get_field(self, xpath, element, required=True):

        elements = self._xpath(xpath, element)
        if len(elements) == 1 and elements[0].text and len(elements[0].text.strip()) > 0:
            return elements[0].text
        elif not required:
            return ''
        else:
            msg = _('missing required field: %(field)s')
            raise TemplateParseException(msg % {'field': xpath})

    def _get_url_field(self, field, *args, **kwargs):

        value = self._get_field(*args, **kwargs)
        self._url_fields.append(field)
        self._info[field] = value

    def _parse_basic_info(self):

        self._info['name'] = self._get_field(NAME_XPATH, self._resource_description).strip()
        if not re.match(NAME_RE, self._info['name']):
            raise TemplateParseException(_('ERROR: the format of the name is invalid.'))

        self._info['vendor'] = self._get_field(VENDOR_XPATH, self._resource_description).strip()
        if not re.match(NAME_RE, self._info['vendor']):
            raise TemplateParseException(_('ERROR: the format of the vendor is invalid.'))

        self._info['version'] = self._get_field(VERSION_XPATH, self._resource_description).strip()
        if not re.match(VERSION_RE, self._info['version']):
            raise TemplateParseException(_('ERROR: the format of the version number is invalid. Format: X.X.X where X is an integer. Ex. "0.1", "1.11" NOTE: "1.01" should be changed to "1.0.1" or "1.1"'))

        self._info['display_name'] = self._get_field(DISPLAY_NAME_XPATH, self._resource_description, required=False)
        self._add_translation_index(self._info['display_name'], type='resource', field='display_name')
        self._info['description'] = self._get_field(DESCRIPTION_XPATH, self._resource_description)
        self._add_translation_index(self._info['description'], type='resource', field='description')

        self._info['author'] = self._get_field(AUTHOR_XPATH, self._resource_description)
        self._info['mail'] = self._get_field(MAIL_XPATH, self._resource_description)
        self._info['organization'] = self._get_field(ORGANIZATION_XPATH, self._resource_description, required=False)
        self._get_url_field('image_uri', IMAGE_URI_XPATH, self._resource_description)
        self._get_url_field('doc_uri', DOC_URI_XPATH, self._resource_description, required=False)

    def _parse_wiring_info(self, parse_channels=False):
        self._info['slots'] = []
        self._info['events'] = []

        wiring_element = self._xpath(WIRING_XPATH, self._doc)[0]

        for slot in self._xpath(SLOT_XPATH, wiring_element):
            self._add_translation_index(slot.get('label'), type='vdef', variable=slot.get('name'))
            self._add_translation_index(slot.get('action_label', ''), type='vdef', variable=slot.get('name'))
            self._add_translation_index(slot.get('description', ''), type='vdef', variable=slot.get('name'))
            self._info['slots'].append({
                'name': slot.get('name'),
                'type': slot.get('type'),
                'label': slot.get('label'),
                'description': slot.get('description', ''),
                'action_label': slot.get('action_label', ''),
                'friendcode': slot.get('friendcode'),
            })

        for event in self._xpath(EVENT_XPATH, wiring_element):
            self._add_translation_index(event.get('label'), type='vdef', variable=event.get('name'))
            self._add_translation_index(event.get('description', ''), type='vdef', variable=event.get('name'))
            self._info['events'].append({
                'name': event.get('name'),
                'type': event.get('type'),
                'label': event.get('label'),
                'description': event.get('description', ''),
                'friendcode': event.get('friendcode'),
            })

        if parse_channels:
            self._parse_wiring_channel_info(wiring_element)

    def _parse_wiring_channel_info(self, wiring_element):

        channels = {}
        for channel in self._xpath(CHANNEL_XPATH, wiring_element):
            channel_info = {
                'id': int(channel.get('id')),
                'name': channel.get('name'),
                'readonly': channel.get('readonly', 'false').lower() == 'true',
                'filter': channel.get('filter'),
                'filter_params': channel.get('filter_params'),
                'ins': [],
                'outs': [],
                'out_channels': [],
            }

            for in_ in self._xpath(IN_XPATH, channel):
                channel_info['ins'].append({
                    'igadget': in_.get('igadget'),
                    'name': in_.get('name'),
                })

            for out in self._xpath(OUT_XPATH, channel):
                channel_info['outs'].append({
                    'igadget': out.get('igadget'),
                    'name': out.get('name'),
                })

            for out_channel in self._xpath(CHANNEL_XPATH, channel):
                channel_info['out_channels'].append(out_channel.get('id'))

            channels[channel.get('id')] = channel_info

        self._info['channels'] = channels

    def _parse_gadget_info(self):

        self._get_url_field('iphone_image_uri', IPHONE_IMAGE_URI_XPATH, self._resource_description, required=False)

        preferences = self._xpath(PREFERENCES_XPATH, self._doc)[0]
        self._info['preferences'] = []
        for preference in self._xpath(PREFERENCE_XPATH, preferences):
            self._add_translation_index(preference.get('label'), type='vdef', variable=preference.get('name'))
            self._add_translation_index(preference.get('description', ''), type='vdef', variable=preference.get('name'))
            preference_info = {
                'name': preference.get('name'),
                'type': preference.get('type'),
                'label': preference.get('label'),
                'description': preference.get('description', ''),
                'default_value': preference.get('default', ''),
                'secure': preference.get('secure', 'false').lower() == 'true',
            }

            if preference_info['type'] == 'list':
                preference_info['options'] = []
                for option in self._xpath(OPTION_XPATH, preference):
                    option_label = option.get('label', option.get('name'))
                    self._add_translation_index(option_label, type='upo', variable=preference.get('name'), option=option_label)
                    preference_info['options'].append({
                        'label': option_label,
                        'value': option.get('value'),
                    })

            self._info['preferences'].append(preference_info)

        self._info['properties'] = []
        for prop in self._xpath(PROPERTY_XPATH, self._doc):
            self._add_translation_index(prop.get('label'), type='vdef', variable=prop.get('name'))
            self._add_translation_index(prop.get('description', ''), type='vdef', variable=prop.get('name'))
            self._info['properties'].append({
                'name': prop.get('name'),
                'type': prop.get('type'),
                'label': prop.get('label'),
                'description': prop.get('description', ''),
                'default_value': prop.get('default', ''),
                'secure': prop.get('secure', 'false').lower() == 'true',
            })

        self._parse_wiring_info()

        self._info['context'] = []

        context_elements = self._xpath(CONTEXT_XPATH, self._doc)
        if len(context_elements) == 1:

            context_element = context_elements[0]

            for gcontext in self._xpath(GADGET_CONTEXT_XPATH, context_element):
                self._info['context'].append({
                    'name': gcontext.get('name'),
                    'type': gcontext.get('type'),
                    'concept': gcontext.get('concept'),
                    'aspect': 'GCTX',
                })
            for pcontext in self._xpath(PLATFORM_CONTEXT_XPATH, context_element):
                self._info['context'].append({
                    'name': pcontext.get('name'),
                    'type': pcontext.get('type'),
                    'concept': pcontext.get('concept'),
                    'aspect': 'ECTX',
                })

        xhtml_elements = self._xpath(CODE_XPATH, self._doc)
        if len(xhtml_elements) == 1 and xhtml_elements[0].get('href', '') != '':
            xhtml_element = xhtml_elements[0]
            self._info['code_url'] = xhtml_element.get('href')
        else:
            msg = _('missing required attribute in Platform.Link: href')
            raise TemplateParseException(msg)

        self._info['code_content_type'] = xhtml_element.get('content-type', 'text/html')
        self._info['code_cacheable'] = xhtml_element.get('cacheable', 'true').lower() == 'true'

        rendering_element = self._xpath(PLATFORM_RENDERING_XPATH, self._doc)[0]
        self._info['gadget_width'] = rendering_element.get('width')
        self._info['gadget_height'] = rendering_element.get('height')

        self._info['gadget_menucolor'] = self._get_field(MENUCOLOR_XPATH, self._doc, required=False)

    def _parse_workspace_info(self):

        workspace_structure = self._xpath(INCLUDED_RESOURCES_XPATH, self._resource_description)[0]
        self._info['readonly'] = workspace_structure.get('readonly', 'false').lower() == 'true'

        preferences = {}
        for preference in self._xpath(PREFERENCE_XPATH, workspace_structure):
            preferences[preference.get('name')] = preference.get('value')
        self._info['preferences'] = preferences

        params = {}
        for param in self._xpath(PARAM_XPATH, workspace_structure):
            params[param.get('name')] = {
               'label': param.get('label'),
               'type': param.get('type'),
            }
        self._info['params'] = params

        tabs = []
        for tab in self._xpath(TAB_XPATH, workspace_structure):
            tab_info = {
                'name': tab.get('name'),
                'preferences': {},
                'resources': [],
            }

            for preference in self._xpath(PREFERENCE_XPATH, tab):
                tab_info['preferences'][preference.get('name')] = preference.get('value')

            for resource in self._xpath(RESOURCE_XPATH, tab):
                position = self._xpath(POSITION_XPATH, resource)[0]
                rendering = self._xpath(RENDERING_XPATH, resource)[0]

                resource_info = {
                    'id': resource.get('id'),
                    'name': resource.get('name'),
                    'vendor': resource.get('vendor'),
                    'version': resource.get('version'),
                    'title': resource.get('title'),
                    'properties': {},
                    'preferences': {},
                    'position': {
                        'x': position.get('x'),
                        'y': position.get('y'),
                        'z': position.get('z'),
                    },
                    'rendering': {
                        'width': rendering.get('width'),
                        'height': rendering.get('height'),
                        'layout': rendering.get('layout'),
                    },
                }

                for prop in self._xpath(PROPERTIES_XPATH, resource):
                    resource_info['properties'][prop.get('name')] = {
                        'readonly': prop.get('readonly', 'false').lower() == 'true',
                        'value': prop.get('value'),
                    }

                for pref in self._xpath(PREFERENCE_XPATH, resource):
                    resource_info['preferences'][pref.get('name')] = {
                        'readonly': pref.get('readonly', 'false').lower() == 'true',
                        'hidden': pref.get('hidden', 'false').lower() == 'true',
                        'value': pref.get('value'),
                    }

                tab_info['resources'].append(resource_info)

            tabs.append(tab_info)

        self._info['tabs'] = tabs

        self._parse_wiring_info(parse_channels=True)
        wiring_element = self._xpath(WIRING_XPATH, self._doc)[0]

    def _parse_translation_catalogue(self):
        self._info['translations'] = {}

        translations_elements = self._xpath(TRANSLATIONS_XPATH, self._doc)

        if len(translations_elements) == 0:
            return

        missing_translations = []
        extra_translations = set()

        translations = translations_elements[0]
        self._info['default_lang'] = translations.get('default')

        for translation in self._xpath(TRANSLATION_XPATH, translations):
            current_catalogue = {}

            for msg in self._xpath(MSG_XPATH, translation):
                if msg.get('name') not in self._translation_indexes:
                    extra_translations.add(msg.get('name'))

                current_catalogue[msg.get('name')] = msg.text

            self._info['translations'][translation.get('lang')] = current_catalogue

        if self._info['default_lang'] not in self._info['translations']:
            raise TemplateParseException(_("ERROR: There isn't a Translation element with the default language (%(default_lang)s) translations") % {'default_lang': self._info['default_lang']})

        for index in self._translation_indexes:
            if index not in self._info['translations'][self._info['default_lang']]:
                missing_translations.append(index)

        if len(missing_translations) > 0:
            msg = _("ERROR: the following translation indexes need a default value: %(indexes)s.")
            raise TemplateParseException(msg % {'indexes': ', '.join(missing_translations)})

        if len(extra_translations) > 0:
            msg = _("ERROR: the following translation indexes are not used: %(indexes)s.")
            raise TemplateParseException(msg % {'indexes': ', '.join(extra_translations)})

        self._info['translation_index_usage'] = self._translation_indexes

    def typeText2typeCode(self, typeText):
        mapping = {
            'text': 'S',
            'number': 'N',
            'date': 'D',
            'boolean': 'B',
            'list': 'L',
            'password': 'P',
        }
        if typeText in mapping:
            return mapping[typeText]
        else:
            raise TemplateParseException(_(u"ERROR: unkown TEXT TYPE ") + typeText)

    def set_base(self, base):
        self.base = base

    def get_contents(self):
        return etree.tostring(self._doc, method='xml', xml_declaration=True, encoding="UTF-8", pretty_print=True)

    def get_resource_type(self):
        return self._info['type']

    def get_resource_uri(self):
        return '/'.join((
            '',
            self._info['type'] + 's',
            self._info['vendor'],
            self._info['name'],
            self._info['version'],
        ))

    def get_resource_name(self):
        return self._info['name']

    def get_resource_vendor(self):
        return self._info['vendor']

    def get_resource_version(self):
        return self._info['version']

    def get_resource_basic_info(self):
        return self._info

    def get_resource_info(self):
        if not self._parsed:
            self._parse_extra_info()

        return dict(self._info)

    def get_absolute_url(self, url, base=None):
        if base is None:
            base = self.base

        return urlparse.urljoin(base, url)

    def get_resource_processed_info(self, base=None):
        info = self.get_resource_info()

        if base is None:
            base = self.base

        # process url fields
        for field in self._url_fields:
            value = info[field]
            if value.strip() != '':
                info[field] = urlparse.urljoin(base, value)
