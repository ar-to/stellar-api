const connections = require('../../config/connections.json');
const connectApi = connections.networks.connectApi;
const network = connections.networks[connectApi]

Connections = {
  connections: connections,
  connectApi: connectApi,
  network: network,
  networkUrl: network.url,
  fallbackUrl: network.fallbackUrl,
  networkName: network.networkName,
  networkType: network.networkType
}

module.exports = Connections;