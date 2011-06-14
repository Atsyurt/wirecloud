# -*- coding: utf-8 -*-

#...............................licence...........................................
#
#     (C) Copyright 2008 Telefonica Investigacion y Desarrollo
#     S.A.Unipersonal (Telefonica I+D)
#
#     This file is part of Morfeo EzWeb Platform.
#
#     Morfeo EzWeb Platform is free software: you can redistribute it and/or modify
#     it under the terms of the GNU Affero General Public License as published by
#     the Free Software Foundation, either version 3 of the License, or
#     (at your option) any later version.
#
#     Morfeo EzWeb Platform is distributed in the hope that it will be useful,
#     but WITHOUT ANY WARRANTY; without even the implied warranty of
#     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#     GNU Affero General Public License for more details.
#
#     You should have received a copy of the GNU Affero General Public License
#     along with Morfeo EzWeb Platform.  If not, see <http://www.gnu.org/licenses/>.
#
#     Info about members and contributors of the MORFEO project
#     is available at
#
#     http://morfeo-project.org
#
#...............................licence...........................................#


#

from django.conf.urls.defaults import patterns

from catalogue.views import ResourceCollection, ResourceCollectionByGlobalSearch
from catalogue.views import ResourceCollectionBySimpleSearch, ResourceTagCollection
from catalogue.views import ResourceVoteCollection, ResourceVersionCollection

urlpatterns = patterns('catalogue.views',
    # Resources
    (r'^resource/(?P<vendor>[\@_\%_\._\!_\s_\-_\|_\&_\/_\:_\(_\)_\w]+)/(?P<name>[\@_\%_\._\!_\s_\-_\|_\&_\/_\:_\(_\)_\w]+)/(?P<version>[\@_\%_\._\!_\s_\-_\|_\&_\/_\:_\(_\)_\w]+)$', ResourceCollection(permitted_methods=('DELETE', 'PUT'))),
    (r'^resource/(?P<pag>\d+)/(?P<offset>\d+)$', ResourceCollection(permitted_methods=('GET',))),
    (r'^resource/(?P<vendor>[\@_\%_\._\!_\s_\-_\|_\&_\/_\:_\(_\)_\w]+)/(?P<name>[\@_\%_\._\!_\s_\-_\|_\&_\/_\:_\(_\)_\w]+)$', ResourceCollection(permitted_methods=('DELETE',))),
    (r'^resource$', ResourceCollection(permitted_methods=('GET', 'POST',))),

    # Search Resources
    (r'^globalsearch/(?P<pag>\d+)/(?P<offset>\d+)$', ResourceCollectionByGlobalSearch(permitted_methods=('GET',))),
    (r'^search/(?P<criteria>\w+)/(?P<pag>\d+)/(?P<offset>\d+)$', ResourceCollectionBySimpleSearch(permitted_methods=('GET',))),

    # Tags
    (r'^tag(s)?/(?P<vendor>[\@_\%_\._\!_\s_\-_\|_\&_\/_\:_\(_\)_\w]+)/(?P<name>[\@_\%_\._\!_\s_\-_\|_\&_\/_\:_\(_\)_\w]+)/(?P<version>[\@_\%_\._\!_\s_\-_\|_\&_\/_\:_\(_\)_\w]+)/(?P<tag>\d+)$',
        ResourceTagCollection(permitted_methods=('DELETE',))),
    (r'^tag(s)?/(?P<vendor>[\@_\%_\._\!_\s_\-_\|_\&_\/_\:_\(_\)_\w]+)/(?P<name>[\@_\%_\._\!_\s_\-_\|_\&_\/_\:_\(_\)_\w]+)/(?P<version>[\@_\%_\._\!_\s_\-_\|_\&_\/_\:_\(_\)_\w]+)$',
        ResourceTagCollection(permitted_methods=('GET', 'POST',))),

    # Vote resources
    (r'^voting/(?P<vendor>[\@_\%_\._\!_\s_\-_\|_\&_\/_\:_\(_\)_\w]+)/(?P<name>[\@_\%_\._\!_\s_\-_\|_\&_\/_\:_\(_\)_\w]+)/(?P<version>[\@_\%_\._\!_\s_\-_\|_\&_\/_\:_\(_\)_\w]+)$',
        ResourceVoteCollection(permitted_methods=('GET', 'POST', 'PUT',))),

    #version check
    (r'^versions', ResourceVersionCollection(permitted_methods=('POST',))),
)
