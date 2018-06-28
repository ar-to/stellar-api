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
      let that = this;
      try {
        // run request
        rp.get({
          uri: connections.networkUrl,
          resolveWithFullResponse: true
        })
          .then((result) => {
            // check res is 200
            console.log('Stellar connection statusCode 200:', result.statusCode === 200)
            if (result.statusCode === 200) {
              this.connectedNetworkUrl = connections.networkUrl;
              this.server = new StellarSdk.Server(connections.networkUrl, { allowHttp: true });
              StellarSdk.Network.useTestNetwork()
            } else {
              throw new Error(`Failed to connect to the network: ${connections.networkUrl}`)
            }
          })
          // else pic fallback url
          .catch((error) => {
            // console.log('error', error.statusCode)
            this.connectedNetworkUrl = connections.fallbackUrl;
            this.server = new StellarSdk.Server(connections.fallbackUrl, { allowHttp: true });
            StellarSdk.Network.useTestNetwork()
          })
      } catch (error) {
        console.log('Stellar connection error', error)
        throw new Error(`Failed to connect to a valid network, please verify your connection. Error: ${error}`)
      }
      break;
  }
}

Stellar.prototype.networkInfo = function (network) {
  let obj = new Object();
  obj.network = network;
  obj.currentNetworkUrl = this.connectedNetworkUrl;
  return obj;
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
      publicKey: pair.publicKey(),
      seed: pair.secret()
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

/**
 * Send Lumens between accounts
 * @param {string} secretSeed 
 * @param {string} startingBalance 
 * @param {string} destinationPublicKey 
 */
Stellar.prototype.payment = async function (secretSeed, amount, destinationPublicKey) {
  let obj = new Object();
  let that = this;

  let sourcePair = StellarSdk.Keypair.fromSecret(secretSeed);
  obj.sourceCanSign = sourcePair.canSign();
  obj.sourcePublicKey = sourcePair.publicKey();
  return await this.server.loadAccount(obj.sourcePublicKey)
    .then(async function (source) {
      var transaction = new StellarSdk.TransactionBuilder(source)
        .addOperation(StellarSdk.Operation.payment({
          destination: destinationPublicKey,
          asset: StellarSdk.Asset.native(),
          amount: amount
        }))
        .build();
      transaction.sign(sourcePair);
      obj.tx = await that.server.submitTransaction(transaction);
      return Promise.resolve(obj)

    }).catch(function (e) {
      return Promise.reject(e);
    });
}

Stellar.prototype.getLedger = function (sequence) {
  return this.server.transactions()
    .forLedger(sequence)
    .call()
    .then(function (details) {
      return Promise.resolve(details)
    })
    .catch(function (err) {
      console.log('err', err);
      return Promise.reject(err);
    });
}

Stellar.prototype.getTransaction = function (transactionHash) {
  let obj = new Object();
  return this.server.transactions()
    .transaction(transactionHash)
    .call()
    .then(function (details) {
      let tx = new StellarSdk.Transaction(details.envelope_xdr);
      obj.txOperations = tx.operations;
      obj.details = details;
      obj.txFromEnvelopeXDR = tx;
      return Promise.resolve(obj)
    })
    .catch(function (err) {
      console.log('err', err);
      return Promise.reject(err);
    });
}

/**
 * Create Asset/Credit/Token with Stellar
 * Steps:
 * source account creates issuing and distribution accounts
 * Issuer account creates new tokens
 * Distributor account send token publically and must first trust issuing asset
 * @see [Assets ](https://www.stellar.org/developers/guides/issuing-assets.html)
 * @see [Assets Steps](https://www.stellar.org/developers/guides/walkthroughs/custom-assets.html)
 * @param {string} assetCode 
 * @param {string} assetLimit 
 * @param {string} creationAmount 
 * @param {string} issuerSecretSeed 
 * @param {string} distributorSecretSeed 
 */
Stellar.prototype.createAsset = async function (assetCode, assetLimit, creationAmount, issuerSecretSeed, distributorSecretSeed) {
  let obj = new Object();
  let that = this;

  let issuerPair = StellarSdk.Keypair.fromSecret(issuerSecretSeed);
  let distributorPair = StellarSdk.Keypair.fromSecret(distributorSecretSeed);
  // obj.sourceCanSign = sourcePair.canSign();
  obj.issuerPublicKey = issuerPair.publicKey();
  obj.distributorPublicKey = distributorPair.publicKey();

  // create new asset object
  obj.newAsset = new StellarSdk.Asset(assetCode, obj.issuerPublicKey);

  // First, the receiving(distributor) account must trust the asset
  return await this.server.loadAccount(obj.distributorPublicKey)
    .then(async function (receiver) {
      var transaction = new StellarSdk.TransactionBuilder(receiver)
        // The `changeTrust` operation creates (or alters) a trustline
        // The `limit` parameter below is optional
        .addOperation(StellarSdk.Operation.changeTrust({
          asset: obj.newAsset,
          limit: assetLimit
        }))
        .build();
      transaction.sign(distributorPair);
      return await that.server.submitTransaction(transaction);
    })
    .then(async function (trustTx) {
      // Second, the issuing account actually sends a payment using the asset
      obj.trustTx = trustTx;
      return await that.server.loadAccount(obj.issuerPublicKey)
    })
    .then(async function (issuer) {
      // issuer sends payment to distributor to create asset with amount
      var transaction = new StellarSdk.TransactionBuilder(issuer)
        .addOperation(StellarSdk.Operation.payment({
          destination: obj.distributorPublicKey,
          asset: obj.newAsset,
          amount: creationAmount
        }))
        .build();
      transaction.sign(issuerPair);
      obj.paymentTx = await that.server.submitTransaction(transaction);
      return Promise.resolve(obj)
    })
    .catch(function (e) {
      return Promise.reject(e);
    });
}

/**
 * Issuer Asset/Credit/Token creates more Assets by issuing them to the distributor
 * @see [Assets ](https://www.stellar.org/developers/guides/issuing-assets.html)
 * @see [Assets Steps](https://www.stellar.org/developers/guides/walkthroughs/custom-assets.html)
 * @param {string} assetCode 
 * @param {string} issueAmount 
 * @param {string} issuerSecretSeed 
 * @param {string} distributorSecretSeed 
 */
Stellar.prototype.issueAssetToDistributor = async function (assetCode, issueAmount, issuerSecretSeed, distributorSecretSeed) {
  let obj = new Object();
  let that = this;

  let issuerPair = StellarSdk.Keypair.fromSecret(issuerSecretSeed);
  let distributorPair = StellarSdk.Keypair.fromSecret(distributorSecretSeed);
  obj.issuerPublicKey = issuerPair.publicKey();
  obj.distributorPublicKey = distributorPair.publicKey();

  // create new asset object
  obj.newAsset = new StellarSdk.Asset(assetCode, obj.issuerPublicKey);

  return await this.server.loadAccount(obj.issuerPublicKey)
    .then(async function (issuer) {
      // issuer sends payment to distributor to create asset with amount
      var transaction = new StellarSdk.TransactionBuilder(issuer)
        .addOperation(StellarSdk.Operation.payment({
          destination: obj.distributorPublicKey,
          asset: obj.newAsset,
          amount: issueAmount
        }))
        .build();
      transaction.sign(issuerPair);
      obj.paymentTx = await that.server.submitTransaction(transaction);
      return Promise.resolve(obj)
    })
    .catch(function (e) {
      return Promise.reject(e);
    });
  // return Promise.resolve(obj)
}

Stellar.prototype.getTransaction = function (transactionHash) {
  let obj = new Object();
  return this.server.transactions()
    .transaction(transactionHash)
    .call()
    .then(function (details) {
      let tx = new StellarSdk.Transaction(details.envelope_xdr);
      obj.txOperations = tx.operations;
      obj.details = details;
      obj.txFromEnvelopeXDR = tx;
      return Promise.resolve(obj)
    })
    .catch(function (err) {
      console.log('err', err);
      return Promise.reject(err);
    });
}

/**
 * Get details about asset
 * @param {assetCode} assetCode 
 * @param {issuerPublicKey} issuerPublicKey 
 */
Stellar.prototype.getAsset = function (assetCode, issuerPublicKey) {
  let obj = new Object();

  return this.server.assets()
    .forCode(assetCode)
    .forIssuer(issuerPublicKey)
    .call()
    .then(function (details) {
      obj.results = details;
      return Promise.resolve(obj)
    })
    .catch(function (err) {
      console.log('err', err);
      return Promise.reject(err);
    });

  return Promise.resolve(obj)
}

module.exports = Stellar;

