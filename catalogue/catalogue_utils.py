# -*- coding: utf-8 -*-

# MORFEO Project 
# http://morfeo-project.org 
# 
# Component: EzWeb
# 
# (C) Copyright 2004 Telef�nica Investigaci�n y Desarrollo 
#     S.A.Unipersonal (Telef�nica I+D) 
# 
# Info about members and contributors of the MORFEO project 
# is available at: 
# 
#   http://morfeo-project.org/
# 
# This program is free software; you can redistribute it and/or modify 
# it under the terms of the GNU General Public License as published by 
# the Free Software Foundation; either version 2 of the License, or 
# (at your option) any later version. 
# 
# This program is distributed in the hope that it will be useful, 
# but WITHOUT ANY WARRANTY; without even the implied warranty of 
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the 
# GNU General Public License for more details. 
# 
# You should have received a copy of the GNU General Public License 
# along with this program; if not, write to the Free Software 
# Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA 02111-1307, USA. 
# 
# If you want to use this software an plan to distribute a 
# proprietary application in any way, and you are not licensing and 
# distributing your source code under GPL, you probably need to 
# purchase a commercial license of the product.  More info about 
# licensing options is available at: 
# 
#   http://morfeo-project.org/
#

from django.core import serializers
from django.http import HttpResponse, HttpResponseServerError
from django.db.models import Q

from commons.utils import json_encode
from commons.utils import get_xml_error
from catalogue.get_json_catalogue_data import get_gadgetresource_data, get_tag_data, get_vote_data
from catalogue.get_xml_catalogue_data import get_xml_description, get_tags_by_resource, get_vote_by_resource
from catalogue.models import GadgetResource, UserTag

from django.utils.translation import ugettext as _

# This function returns a list with non-repeated elements.
# The second parameter indicates the minimum number of repetions of the elements
# in the original list to be part of the result list.
def get_uniquelist(list, value = None):

    uniquelist = []

    if value==None or value == 1:
        [uniquelist.append(x) for x in list if x not in uniquelist]
    else:
        for x in list:
            if x not in uniquelist and list.count(x) >= value:
                uniquelist.append(x)

    return uniquelist

# This function returns a list ordered by the criteria passed as parameter.
def get_sortedlist(list, orderby):
    if orderby=='-creation_date':
        list.sort(lambda x,y: cmp(y.creation_date,x.creation_date))
    elif orderby=='short_name':
        list.sort(lambda x,y: cmp(x.short_name.lower(),y.short_name.lower()))
    elif orderby=='vendor':
        list.sort(lambda x,y: cmp(x.vendor.lower(),y.vendor.lower()))
    elif orderby=='author':
        list.sort(lambda x,y: cmp(x.author.lower(),y.author.lower()))
    return list

# This function returns a list paginated with the parameters pag and offset.
def get_paginatedlist(gadgetlist, pag, offset):
    a= int(pag)
    b= int(offset)
    if a != 0 and b != 0:
        c=((a-1)*b)
        d= (b*a)
        if a==1:
            c=0
        gadgetlist = gadgetlist[c:d]

    return gadgetlist

# This function returns a list of gadgets that match all the criteria in the list passed as parameter.
def get_and_list(criterialist):
    #List of the gadgets that match the criteria in the database table GadgetResource
    gadgetlist = []
    #List of the gadgets that match the criteria in the database table UserTag
    taglist = []
    result = []
    is_first_element = True

    criterialist = criterialist.split()
    # This loop gets a result list of the gadgets that match any of the criteria
    for e in criterialist:
        # Get a list of elements that match the given criteria
        gadgetlist = GadgetResource.objects.filter(Q(short_name__icontains = e) | Q(vendor__icontains = e) | Q(author__icontains = e) | Q(mail__icontains = e) | Q(description__icontains = e) | Q(version__icontains = e))
        taglist = GadgetResource.objects.filter(usertag__tag__icontains = e)
        if taglist:
            gadgetlist = gadgetlist | taglist
        gadgetlist = get_uniquelist(gadgetlist)
        result.append(gadgetlist)
    # This loop gets the gadgets that match all the criteria
    for j in result:
        if is_first_element:
            gadgetlist = j
            is_first_element = False
        else:
            gadgetlist = get_uniquelist(gadgetlist+j, 2)
    return gadgetlist

# This function returns a list of gadgets that match any of the criteria in the list passed as parameter.
def get_or_list(criterialist):

    gadgetlist = []
    taglist = []
    criterialist = criterialist.split()

    for e in criterialist:
        # Get a list of elements that match the given value
        gadgetlist += GadgetResource.objects.filter(Q(short_name__icontains = e) |  Q(vendor__icontains = e) | Q(author__icontains = e) | Q(mail__icontains = e) | Q(description__icontains = e) | Q(version__icontains = e))
        taglist += GadgetResource.objects.filter(usertag__tag__icontains = e)
    gadgetlist += taglist
    gadgetlist = get_uniquelist(gadgetlist)
    return gadgetlist

# This function returns a list of gadgets that don't match any of the criteria in the list passed as parameter.
def get_not_list(criterialist):

    gadgetlist = []
    taglist = []
    is_first_element = True
    criterialist = criterialist.split()

    for e in criterialist:
        # Get the list of elements that don't match the given criteria in the GadgetResource table
        if is_first_element:
            gadgetlist = GadgetResource.objects.exclude(Q(short_name__icontains = e) |  Q(vendor__icontains = e) | Q(author__icontains = e) | Q(mail__icontains = e) | Q(description__icontains = e) | Q(version__icontains = e))
            is_first_element = False
        else:
            gadgetlist = gadgetlist.exclude(Q(short_name__icontains = e) |  Q(vendor__icontains = e) | Q(author__icontains = e) | Q(mail__icontains = e) | Q(description__icontains = e) | Q(version__icontains = e))
        #Get the list of gadgets that match any of the criteria in the UserTag database table
        taglist += GadgetResource.objects.filter(usertag__tag__icontains = e)
    gadgetlist = list(gadgetlist)
    # Remove the gadgets in taglist of gadgetlist
    for b in taglist:
        if (b in gadgetlist):
            gadgetlist.remove(b)
    gadgetlist = get_uniquelist(gadgetlist)
    return gadgetlist

# This function obtains the all the information related to a gadget encoded in
# the properly format (json or xml)
def get_resource_response(gadgetlist, format, items, user):

    if format == 'json' or format=='default':
        gadgetresource = {}
        resource_data = serializers.serialize('python', gadgetlist, ensure_ascii=False)
        resource_data_list = [get_gadgetresource_data(d, user) for d in resource_data]
        gadgetresource['resourceList'] = resource_data_list
        response = HttpResponse(json_encode(gadgetresource), mimetype='application/json; charset=UTF-8')
        response.__setitem__('items', items)
        return response
    elif format == 'xml':
        response = get_xml_description(gadgetlist, user)
        response = HttpResponse(response,mimetype='text/xml; charset=UTF-8')
        response.__setitem__('items', items)
        return response
    else:
        return HttpResponseServerError(get_xml_error(_("Invalid format. Format must be either xml or json")), mimetype='application/xml; charset=UTF-8')

# This function obtains the all the tags related to a gadget encoded in
# the properly format (json or xml)
def get_tag_response(gadget, user, format):

    if format == 'json' or format == 'default':
        tag = {}
        tag_data_list = get_tag_data(gadget, user.id)
        tag['tagList'] = tag_data_list
        return HttpResponse(json_encode(tag), mimetype='application/json; charset=UTF-8')
    elif format == 'xml':
        response = '<?xml version="1.0" encoding="UTF-8" ?>\n'
        response += get_tags_by_resource(gadget, user)
        return HttpResponse(response,mimetype='text/xml; charset=UTF-8')
    else:
        return HttpResponseServerError(get_xml_error(_("Invalid format. Format must be either xml or json")), mimetype='application/xml; charset=UTF-8')

# This function obtains the vote related to a gadget and a user encoded in
# the properly format (json or xml)
def get_vote_response(gadget, user, format):
    if format == 'json' or format == 'default':
        vote = {}
        vote_data = get_vote_data(gadget, user)
        vote['voteData'] = vote_data
        return HttpResponse(json_encode(vote), mimetype='application/json; charset=UTF-8')
    elif format == 'xml':
        response = '<?xml version="1.0" encoding="UTF-8" ?>\n'
        response += get_vote_by_resource(gadget, user)
        return HttpResponse(response,mimetype='text/xml; charset=UTF-8')
    else:
        return HttpResponseServerError(get_xml_error(_("Invalid format. Format must be either xml or json")), mimetype='application/xml; charset=UTF-8')