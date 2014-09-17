# -*- coding: utf-8 -*-

# Copyright (c) 2014 CoNWeT Lab., Universidad Politécnica de Madrid

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

from __future__ import unicode_literals

from django.conf import settings
from django.contrib.auth.models import Group, User
from whoosh.fields import ID, NGRAM, SchemaClass, TEXT
from whoosh.index import create_in, exists_in, open_dir
from whoosh.qparser import QueryParser

import os


class IndexManager(object):

    indexname = ''
    schema_class = None

    def __init__(self):
        self._index_cached = None

    def clear_index(self):

        dirname = self.get_dirname()
        schema = self.schema_class()

        if not os.path.exists(dirname):
            os.mkdir(dirname)

        self._index_cached = create_in(dirname, schema, self.indexname)

        return self._index_cached

    def get_dirname(self):
        dirname = getattr(settings, 'WIRECLOUD_INDEX_DIR', None)

        if dirname is None:
            raise AttributeError('"dirname" has not been provided.')

        return dirname

    def open_index(self):
        if self._index_cached is not None:
            return self._index_cached

        dirname = self.get_dirname()

        if not os.path.exists(dirname):
            os.mkdir(dirname)

        if not exists_in(dirname, self.indexname):
            schema = self.schema_class()
            self._index_cached = create_in(dirname, schema, self.indexname)
        else:
            self._index_cached = open_dir(dirname, self.indexname)

        return self._index_cached


class IndexWriterMixin(object):

    model = None

    def add_resource(self, resource, render=True):
        if render:
            resource = self.build_compatible_fields(resource)

        ix = self.open_index()

        try:
            with ix.writer() as writer:
                writer.update_document(**resource)
        except:
            with ix.writer() as writer:
                writer.add_document(**resource)

    def build_compatible_fields(self, resource):
        raise NotImplementedError

    def get_model(self):
        if self.model is None:
            raise AttributeError('"model" has not been provided.')

        return self.model


class BaseSearcher(IndexWriterMixin, IndexManager):

    fieldname = 'content'

    def search(self, querytext, *args, **kwargs):
        ix = self.open_index()

        user_q = QueryParser(self.fieldname, ix.schema).parse(querytext)
        result = {}

        with ix.searcher() as searcher:
            hits = searcher.search(user_q)
            result.update({'results': [hit.fields() for hit in hits]})

        return result


class GroupSchema(SchemaClass):

    pk = ID(stored=True, unique=True)
    name = TEXT(stored=True, spelling=True)
    content = NGRAM(phrase=True)


class GroupSearcher(BaseSearcher):

    indexname = 'group'
    model = Group
    schema_class = GroupSchema

    def build_compatible_fields(self, resource):
        fields = {
            'pk': '%s' % resource.pk,
            'name': '%s' % resource.name,
            'content': '%s' % resource.name,
        }

        return fields


class UserSchema(SchemaClass):

    pk = ID(stored=True, unique=True)
    full_name = TEXT(stored=True, spelling=True)
    username = TEXT(stored=True, spelling=True)
    content = NGRAM(phrase=True)


class UserSearcher(BaseSearcher):

    indexname = 'user'
    model = User
    schema_class = UserSchema

    def build_compatible_fields(self, resource):
        fields = {
            'pk': '%s' % resource.pk,
            'full_name': '%s' % (resource.get_full_name()),
            'username': '%s' % resource.username,
            'content': '%s %s' % (resource.get_full_name(), resource.username),
        }

        return fields


available_search_engines = [GroupSearcher(), UserSearcher()]


def is_available(indexname):
    indexnames = [s.indexname for s in available_search_engines]

    return indexname in indexnames


def get_search_engine(indexname):
    for s in available_search_engines:
        if s.indexname == indexname:
            return s

    return None
