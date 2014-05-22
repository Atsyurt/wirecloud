# -*- coding: utf-8 -*-

# Copyright (c) 2011-2014 CoNWeT Lab., Universidad Politécnica de Madrid

# This file is part of Wirecloud.

# Wirecloud is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.

# Wirecloud is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.

# You should have received a copy of the GNU Affero General Public License
# along with Wirecloud.  If not, see <http://www.gnu.org/licenses/>.

from lxml import etree
from cStringIO import StringIO

from django.conf import settings
from django.db.models import Q

from wirecloud.catalogue.models import CatalogueResource
from wirecloud.commons.exceptions import Http403
from wirecloud.commons.utils.downloader import download_http_content
from wirecloud.commons.utils.http import get_absolute_static_url
from wirecloud.commons.utils.template import TemplateParser
from wirecloud.commons.utils.wgt import WgtDeployer, WgtFile
from wirecloud.platform.models import Widget, UserPrefOption, UserWorkspace, VariableDef, Workspace, XHTML
from wirecloud.platform.plugins import get_active_features, get_widget_api_extensions


wgt_deployer = WgtDeployer(settings.GADGETS_DEPLOYMENT_DIR)


def check_requirements(resource):

    active_features = get_active_features()

    for requirement in resource['requirements']:
        if requirement['type'] == 'feature':

            if requirement['name'] not in active_features:
                raise Exception('Required feature is not enabled: %s' % requirement['name'])

        else:

            raise Exception('Unsupported requirement type: %s' % requirement['type'])


def create_widget_from_template(template, user, request=None, base=None):

    """Creates a widget from a template"""

    if isinstance(template, TemplateParser):
        parser = template
    else:
        template_content = download_http_content(template, user=user)
        if base is None:
            base = template
        parser = TemplateParser(template_content, base=base)

    if parser.get_resource_type() != 'widget':
        raise Exception()

    widget_info = parser.get_resource_info()
    check_requirements(widget_info)

    widget = Widget()
    widget.resource = CatalogueResource.objects.get(vendor=parser.get_resource_vendor(), short_name=parser.get_resource_name(), version=parser.get_resource_version())
    widget_code = parser.get_absolute_url(widget_info['code_url'], base)
    widget.xhtml = XHTML.objects.create(
        uri=widget.uri + "/xhtml",
        url=widget_code,
        content_type=widget_info['code_content_type'],
        use_platform_style=widget_info['code_uses_platform_style'],
        cacheable=widget_info['code_cacheable']
    )

    widget.width = widget_info['widget_width']
    widget.height = widget_info['widget_height']

    widget.save()

    for preference in widget_info['preferences']:
        vDef = VariableDef.objects.create(
            name=preference['name'],
            type=parser.typeText2typeCode(preference['type']),
            aspect='PREF',
            readonly=preference['readonly'],
            default_value=preference['default'],
            value=preference['value'],
            widget=widget,
            secure=preference['secure']
        )

    for prop in widget_info['properties']:
        vDef = VariableDef.objects.create(
            name=prop['name'],
            type=parser.typeText2typeCode(prop['type']),
            aspect='PROP',
            default_value=prop['default'],
            widget=widget,
            secure=prop['secure'],
        )

    return widget


def create_widget_from_wgt(wgt, user, deploy_only=False):

    if isinstance(wgt, WgtFile):
        wgt_file = wgt
    else:
        wgt_file = WgtFile(StringIO(download_http_content(wgt)))

    template = wgt_deployer.deploy(wgt_file)
    if not deploy_only:
        return create_widget_from_template(template, user)


def get_or_add_widget_from_catalogue(vendor, name, version, user, request=None, assign_to_users=None):
    resource_list = CatalogueResource.objects.filter(Q(vendor=vendor, version=version) & (Q(short_name=name) | Q(short_name__startswith=(name + '@'))))

    for resource in resource_list:
        if resource.is_available_for(user):
            return resource.widget

    return None


def xpath(tree, query, xmlns):
    if xmlns is None:
        query = query.replace('xhtml:', '')
        return tree.xpath(query)
    else:
        return tree.xpath(query, namespaces={'xhtml': xmlns})


def fix_widget_code(widget_code, base_url, content_type, request, encoding, use_platform_style, requirements, force_base, mode):

    # This line is here for raising UnicodeDecodeError in case the widget_code is not encoded using the expecified encoding
    widget_code.decode(encoding)

    if content_type == 'text/html':
        parser = etree.HTMLParser(encoding=encoding)
        serialization_options = {'method': 'html'}
    elif content_type == 'application/xhtml+xml':
        parser = etree.XMLParser(encoding=encoding)
        serialization_options = {'method': 'xml', 'xml_declaration': False}
    else:
        return widget_code

    xmltree = etree.parse(StringIO(widget_code), parser)

    prefix = xmltree.getroot().prefix
    xmlns = None
    if prefix in xmltree.getroot().nsmap:
        xmlns = xmltree.getroot().nsmap[prefix]

    # Fix head element
    head_elements = xpath(xmltree, '/xhtml:html/xhtml:head', xmlns)
    if len(head_elements) == 0:
        head_element = etree.Element("head")
        xmltree.getroot().insert(0, head_element)
    else:
        head_element = head_elements[0]

    # Fix base element
    base_elements = xpath(xmltree, '/xhtml:html/xhtml:head/xhtml:base', xmlns)
    for base_element in base_elements[1:]:
        base_element.getparent().remove(base_element)

    if len(base_elements) >= 1 and force_base:
        base_elements[0].set('href', base_url)
    elif len(base_elements) == 0:
        head_element.insert(0, etree.Element('base', href=base_url))

    # Fix scripts
    scripts = xpath(xmltree, '/xhtml:html//xhtml:script', xmlns)
    for script in scripts:

        if 'src' in script.attrib:
            script.text = ''

    head_element.insert(0, etree.Element('script', type="text/javascript", src=get_absolute_static_url('js/WirecloudAPI/WirecloudAPIClosure.js', request=request)))
    files = get_widget_api_extensions(mode, requirements)
    files.reverse()
    for file in files:
        head_element.insert(0, etree.Element('script', type="text/javascript", src=get_absolute_static_url(file, request=request)))
    head_element.insert(0, etree.Element('script', type="text/javascript", src=get_absolute_static_url('js/WirecloudAPI/WirecloudAPICommon.js', request=request)))
    head_element.insert(0, etree.Element('script', type="text/javascript", src=get_absolute_static_url('js/WirecloudAPI/WirecloudWidgetAPI.js', request=request)))

    if use_platform_style:
        head_element.insert(0, etree.Element('link', rel="stylesheet", type="text/css", href=get_absolute_static_url('js/EzWebAPI_ext/EzWebGadgets.css', request=request)))
        head_element.insert(0, etree.Element('link', rel="stylesheet", type="text/css", href=get_absolute_static_url('css/gadget.css', request=request)))

    # return modified code
    return etree.tostring(xmltree, pretty_print=False, encoding=encoding, **serialization_options)
