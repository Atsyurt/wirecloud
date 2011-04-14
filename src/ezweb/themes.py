# Copyright 2011 Yaco Sistemas <lgs@yaco.es>
#
# This file is part of EzWeb.

# EzWeb is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.

# EzWeb is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.

# You should have received a copy of the GNU General Public License
# along with EzWeb.  If not, see <http://www.gnu.org/licenses/>.

# This code is inspired/stolen from the Merengue
# project (www.merengueproject.org)

import os

from django.conf import settings
from django.contrib.staticfiles.finders import BaseFinder
from django.contrib.staticfiles import utils
from django.core.files.storage import FileSystemStorage
from django.template import TemplateDoesNotExist
from django.utils._os import safe_join

DEFAULT_THEME = 'defaulttheme'


def get_active_theme_name():
    try:
        return settings.THEME_ACTIVE
    except AttributeError:
        return DEFAULT_THEME


def active_theme_context_processor(request):
    return {'THEME_ACTIVE': get_active_theme_name()}


def get_theme_dir(theme_name, dir_type):
    try:
        active_theme_module = __import__(theme_name)
    except ImportError:
        return

    active_theme_file = active_theme_module.__file__
    active_theme_dir = os.path.dirname(os.path.abspath(active_theme_file))
    return safe_join(active_theme_dir, dir_type)


def get_template_sources(template_name, template_dirs=None):
    """
    Look for template into active theme directory
    """

    def try_template(templates_dir):
        if templates_dir and os.path.isdir(templates_dir):
            try:
                return safe_join(templates_dir, template_name)
            except UnicodeDecodeError:
                raise
            except ValueError:
                pass

    yield try_template(get_theme_dir(get_active_theme_name(), 'templates'))
    yield try_template(get_theme_dir(DEFAULT_THEME, 'templates'))


def load_template_source(template_name, template_dirs=None):
    tried = []
    for filepath in get_template_sources(template_name, template_dirs):
        try:
            return (open(filepath).read().decode(settings.FILE_CHARSET), filepath)
        except IOError:
            tried.append(filepath)
    if tried:
        error_msg = "Tried %s" % tried
    else:
        error_msg = "Your TEMPLATE_DIRS setting is empty. Change it to point to at least one template directory."
    raise TemplateDoesNotExist(error_msg)
load_template_source.is_usable = True


class ActiveThemeFinder(BaseFinder):

    def __init__(self, apps=None, *args, **kwargs):
        self.location = get_theme_dir(get_active_theme_name(), 'static')

    def find(self, path, all=False):
        filename = safe_join(self.location, path)
        if os.path.exists(filename):
            return filename
        return []

    def list(self, ignore_patterns=[]):
        storage = FileSystemStorage(location=self.location)
        for path in utils.get_files(storage, ignore_patterns):
            yield path, storage
