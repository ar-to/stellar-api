var request = require('request');
var StellarSdk = require('stellar-sdk');
const connections = require('./connections.js');

function Stellar() {
  'use strict'
  
  this.network = connections.network;
  switch(connections.networkType){
    case 'testnet':
      this.server = new StellarSdk.Server(connections.networkUrl, {allowHttp: true});
      StellarSdk.Network.useTestNetwork()
    break;
  }
}

Stellar.prototype.getBalance = function (address) {
  return this.server.loadAccount(address)
}

module.exports = Stellar;

