from wirecloud import VERSION
from wirecloud.plugins import WirecloudPlugin

from wirecloud.core.catalogue_manager import WirecloudCatalogueManager


class WirecloudCorePlugin(WirecloudPlugin):

    features = {
        'Wirecloud': '.'.join(map(str, VERSION)),
    }

    def get_scripts(self, view):
        if view == 'index':
            return (
                'js/wirecloud/MarketManager.js',
            )
        else:
            return ()

    def get_market_classes(self):
        return {
            'wirecloud': WirecloudCatalogueManager,
        }

    def get_ajax_endpoints(self, views):
        return (
            {'id': 'MARKET_COLLECTION', 'url': '/api/markets'},
            {'id': 'MARKET_ENTRY', 'url': '/api/market/#{market}'},
            {'id': 'WIRING_ENTRY', 'url': '/api/workspace/#{id}/wiring'},
            {'id': 'OPERATOR_COLLECTION', 'url': '/api/operators'},
            {'id': 'OPERATOR_ENTRY', 'url': '/api/operator/#{vendor}/#{name}/#{version}/html'},
        )
