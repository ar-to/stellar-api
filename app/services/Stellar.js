let request = require('request');
let rp = require('request-promise')
let StellarSdk = require('stellar-sdk');
const connections = require('./connections.js');

function Stellar() {
  'use strict'

  this.network = connections.network;
  switch (connections.networkType) {
    case 'testnet':
      this.server = new StellarSdk.Server(connections.networkUrl, { allowHttp: true });
      StellarSdk.Network.useTestNetwork()
      break;
  }
}

Stellar.prototype.generateSeed = function () {
  let obj = new Object();
  let pair = StellarSdk.Keypair.random();
  obj.publicKey = pair.publicKey()
  obj.seed = pair.secret()
  return obj;
}

Stellar.prototype.createFriendBotAccount = async function (publicKey) {
  return await rp.get({
    uri: 'https://horizon-testnet.stellar.org/friendbot',
    qs: { addr: publicKey },
    json: true
  })
}

Stellar.prototype.getBalance = function (address) {
  return this.server.loadAccount(address)
}

module.exports = Stellar;

