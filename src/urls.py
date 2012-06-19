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

from django.conf.urls.defaults import patterns, include
from django.contrib import admin
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.views.decorators.cache import cache_page
from django.views.i18n import javascript_catalog

import wirecloud.urls

admin.autodiscover()

#JavaScript translation
js_info_dict = {
    'packages': ('ezweb', )
}

urlpatterns = patterns('',
    # EzWeb
    (r'^', include('ezweb.urls')),
    (r'^user/(?P<user_name>[\.\-\w\@]+)/$', include('ezweb.urls')),

    # Gadgets
    (r'^user/(?P<user_name>[\.\-\w\@]+)/gadget(s)?', include('gadget.urls')),
    (r'^gadget(s)?', include('gadget.urls')),

    # WorkSpaces
    (r'^workspace(s)?', include('workspace.urls')),

    # Showcase
    (r'^showcase/', include('gadget.showcase_urls')),

    # IGadgets
    (r'^workspace(s)?/(?P<workspace_id>\d+)/tab(s)?/(?P<tab_id>\d+)/igadget(s)?', include('igadget.urls')),

    # context
    (r'^user/(?P<user_name>[\.\-\w\@]+)/context(s)?', include('context.urls')),

    # Platform Preferences
    (r'^user/(?P<user_name>[\.\-\w\@]+)/preference(s)?', include('preferences.urls')),

    # Catalogue
    (r'^catalogue', include('catalogue.urls')),

    # Proxy
    (r'^proxy', include('proxy.urls')),

    # Django contrib
    #(r'^registration/login_form/$', 'registration.views.login_form'),

    #(r'^logout$', 'django.contrib.auth.views.logout'),
    # custom logouts (to enable anonymous access)
    (r'^logout$', 'authentication.logout'),
    (r'^admin/logout/$', 'authentication.logout'),

    #Admin interface
    (r'^admin/', include(admin.site.urls)),

    # Django "set language" (internacionalitation)
    (r'^i18n/', include('django.conf.urls.i18n')),

    # Django JavaScript Internacionalitation
    (r'^jsi18n/$', cache_page(60 * 60 * 24)(javascript_catalog), js_info_dict),

    (r'^API', include('API.urls')),

    (r'^uploader', include('uploader.urls')),

    (r'^marketAdaptor/', include('marketAdaptor.urls')),
)

urlpatterns += wirecloud.urls.urlpatterns
urlpatterns += staticfiles_urlpatterns()

handler404 = "django.views.defaults.page_not_found"
handler500 = "django.views.defaults.server_error"
