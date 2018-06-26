let request = require('request');
let rp = require('request-promise')
let StellarSdk = require('stellar-sdk');
const connections = require('./connections.js');

function Stellar() {
  'use strict'

  this.network = connections.network;
  switch (connections.networkType) {
    case 'testnet':
      this.testnet = true;
      this.server = new StellarSdk.Server(connections.networkUrl, { allowHttp: true });
      StellarSdk.Network.useTestNetwork()
      break;
  }
}

/**
 * Generate seed pair (secret and public key)
 * @return {object} seed pair
 */
Stellar.prototype.generateSeed = function () {
  let obj = new Object();
  let pair = StellarSdk.Keypair.random();
  obj.publicKey = pair.publicKey()
  obj.seed = pair.secret()
  return obj;
}

/**
 * Create an account via the friendbot for testnet only!
 * @param {string} publicKey 
 * @return {object} receipt with public key and transaction hash
 */
Stellar.prototype.createFriendBotAccount = async function (publicKey) {
  if (this.testnet) {
    return await rp.get({
      uri: 'https://horizon-testnet.stellar.org/friendbot',
      qs: { addr: publicKey },
      json: true
    })
  }
  return Promise.reject('Not in testnet. This endpoint only works for testnet connections.')
}

/**
 * Create an account with a source account
 * @param {string} secretSeed that will be used as the source to get the account object and to sign the transaction
 * @param {string} startingBalance
 * @param {string} detinationPublicKey checks for null which then generates a new keypair
 * @return {object} receipt with public key, ledger height and transaction hash
 */
Stellar.prototype.createAccount = async function (secretSeed, startingBalance, destinationPublicKey) {
  let obj = new Object();
  let that = this;
  let destination;
  // generate seed and public key for new account
  if (destinationPublicKey) {
    destination = destinationPublicKey
  } else {
    let pair = StellarSdk.Keypair.random();
    obj.newSeed = {
      publicKey : pair.publicKey(),
      seed : pair.secret()
    };
    destination = pair.publicKey();

  }

  //create account using destination parameter or generated publicKey
    let sourcePair = StellarSdk.Keypair.fromSecret(secretSeed);
    obj.sourceCanSign = sourcePair.canSign();
    obj.sourcePublicKey = sourcePair.publicKey(); 
    return await this.server.loadAccount(obj.sourcePublicKey)
      .then(async function (source) {
        var transaction = new StellarSdk.TransactionBuilder(source)
          .addOperation(StellarSdk.Operation.createAccount({
            destination: destination,
            startingBalance: startingBalance
          }))
          .build();
        transaction.sign(sourcePair);
        obj.tx = await that.server.submitTransaction(transaction);
        return Promise.resolve(obj)
      }).catch(function (e) {
        return Promise.reject(e);
      });
}

Stellar.prototype.getBalance = function (address) {
  return this.server.loadAccount(address)
}

module.exports = Stellar;

