let request = require('request');
let rp = require('request-promise')
let StellarSdk = require('stellar-sdk');
const connections = require('./connections.js');
let utils = require("../utils");
let crypto = require("crypto");

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
              console.log('connectedNetworkUrl', this.connectedNetworkUrl)
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
            console.log('connectedNetworkUrl', this.connectedNetworkUrl)
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

Stellar.prototype.networkInfo = async function (network) {
  let obj = new Object();
  obj.network = network;
  obj.currentNetworkUrl = this.connectedNetworkUrl;

  return await rp.get({
    uri: this.connectedNetworkUrl,
    json: true
  })
    .then((result) => {
      obj.result = result;
      return Promise.resolve(obj)
    })
    .catch((error) => {
      console.log('error', error)
      return Promise.reject(error);
    })



  // return obj;
}

/**
 * Decode xdr from ledgers or transactions
 * @param {string} xdr 
 */
Stellar.prototype.decodeXDR = function (xdr) {
  let obj = new Object();
  let tx = new StellarSdk.Transaction(xdr);
  obj.txOperations = tx.operations;
  obj.decodedXDR = tx;
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
 * Send Lumens between accounts
 * @param {string} senderSecretSeed 
 * @param {string} startingBalance 
 * @param {string} destinationPublicKey 
 * @param {string|object} [memo] @see [Memo ](http://stellar.github.io/js-stellar-sdk/Memo.html) for types available. Defaults to 
 * @param {string} [memo.type] Accepts value in string: none, id,text,hash,return
 * @param {string} [memo.value] depends on the type selected
 * @param {string} [memo.generateRandom] if true it will generate random string else it takes the value and generates the hash
 * @param {string|object} [customAsset] @see [Asset ](http://stellar.github.io/js-stellar-sdk/Asset.html). defaults to "native"
 * @param {string|object} [customAsset.code] 
 * @param {string|object} [customAsset.issuer] 
 * 
 */
Stellar.prototype.payment = async function (senderSecretSeed, amount, destinationPublicKey, memo, customAsset) {
  let obj = new Object();
  let that = this;

  if (typeof customAsset === 'object') {
    obj.customAsset = new StellarSdk.Asset(customAsset.code, customAsset.issuer);
  } else if (customAsset === 'native') {
    obj.customAsset = StellarSdk.Asset.native();
  }
  if (typeof memo === 'object') {
    if (memo.type === 'hash' && memo.generateRandom) {
      const buf = crypto.randomBytes(32);
      obj.value = buf.toString('hex');
    } else if (memo.type === 'hash') {
      let hash = crypto.createHash('sha256');
      hash.update(memo.value);
      obj.value = hash.digest('hex');
    } else if (memo.type === 'id') {
      // const buf2 = Math.random().toString().substr(2, 10);
      // console.log('crypto.randomBytes(32)', typeof buf2)
      if (memo.value != "") {
        obj.memo = new StellarSdk.Memo('id', memo.value);
      } else {
        const buf2 = utils.getRndInteger(0, 10000000).toString()
        obj.value = buf2;
      }
    }
    /**
     * Pending Error: when type is text  and value is string sdk seems to check it as object.
     * Solution: added an 'else if' check for string below
     */
    // obj.memo = new StellarSdk.Memo(memo.type, obj.value);
  } else if (memo === 'MemoText') {
    obj.memo = new StellarSdk.Memo('text', 'Sent Payment');
  } else if (typeof memo === 'string') {
    obj.memo = new StellarSdk.Memo('id', memo);
  }


  let sourcePair = StellarSdk.Keypair.fromSecret(senderSecretSeed);
  obj.sourceCanSign = sourcePair.canSign();
  obj.sourcePublicKey = sourcePair.publicKey();
  return await this.server.loadAccount(obj.sourcePublicKey)
    .then(async function (source) {
      var transaction = new StellarSdk.TransactionBuilder(source)
        .addOperation(StellarSdk.Operation.payment({
          destination: destinationPublicKey,
          asset: obj.customAsset,
          amount: amount
        }))
        .addMemo(obj.memo)
        .build();
      transaction.sign(sourcePair);
      obj.tx = await that.server.submitTransaction(transaction);
      let tx = new StellarSdk.Transaction(obj.tx.envelope_xdr);
      obj.txOperations = tx.operations;
      return Promise.resolve(obj)

    }).catch(function (e) {
      return Promise.reject(e);
    });
}

Stellar.prototype.getLedger = function (sequence) {
  return this.server.ledgers()
    .ledger(sequence)
    .call()
    .then(function (details) {
      return Promise.resolve(details)
    })
    .catch(function (err) {
      console.log('err', err);
      return Promise.reject(err);
    });
}

Stellar.prototype.getLedgerTxs = function (sequence) {
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

Stellar.prototype.getOfferById = function (offerId) {
  let obj = new Object();

  return this.server.trades()
    .forOffer(offerId)
    .call()
    .then(function (details) {
      obj.results = details;
      return Promise.resolve(obj)
    })
    .catch(function (err) {
      console.log('err', err);
      return Promise.reject(err);
    });
}

/**
 * Get offers by account
 * Currently there are not filters so all offers are taken. To filter refer to the available horizon endpoints
 * @see [Offers by account](https://www.stellar.org/developers/horizon/reference/endpoints/offers-for-account.html)
 * @param {string} accountId 
 */
Stellar.prototype.getOffersByAccount = function (accountId) {
  let obj = new Object();
  return this.server.offers('accounts', accountId)
    .call()
    .then(function (details) {
      obj = details;
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
}

/**
 * Get offers by selling and buying assets
 * @param {object|string} sellingAsset 
 * @param {object|string} buyingAsset 
 */
Stellar.prototype.getOrderbookDetails = function (sellingAsset, buyingAsset) {
  let obj = new Object();

  if (typeof sellingAsset === 'object') {
    obj.sellingAsset = new StellarSdk.Asset(sellingAsset.code, sellingAsset.issuer);
  } else if (sellingAsset === 'native') {
    obj.sellingAsset = StellarSdk.Asset.native();
  }
  if (typeof buyingAsset === 'object') {
    obj.buyingAsset = new StellarSdk.Asset(buyingAsset.code, buyingAsset.issuer);
  } else if (buyingAsset === 'native') {
    obj.buyingAsset = StellarSdk.Asset.native();
  }

  return this.server.orderbook(obj.sellingAsset, obj.buyingAsset)
    .call()
    .then(function (details) {
      obj.results = details;
      return Promise.resolve(obj)
    })
    .catch(function (err) {
      console.log('err', err);
      return Promise.reject(err);
    });
}

/**
 * 
 * @param {object|string} baseAsset 
 * @param {object|string} counterAsset 
 */
Stellar.prototype.getTradesDetails = function (baseAsset, counterAsset) {
  let obj = new Object();

  if (typeof baseAsset === 'object') {
    obj.base = new StellarSdk.Asset(baseAsset.code, baseAsset.issuer);
  } else if (baseAsset === 'native') {
    obj.base = StellarSdk.Asset.native();
  }
  if (typeof counterAsset === 'object') {
    obj.counter = new StellarSdk.Asset(counterAsset.code, counterAsset.issuer);
  } else if (counterAsset === 'native') {
    obj.counter = StellarSdk.Asset.native();
  }

  return this.server.trades()
    .forAssetPair(obj.base, obj.counter)
    .forOffer()
    .call()
    .then(function (details) {
      obj.results = details;
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
 * Send a changeTrust() Operation to allow account to accept asset
 * An account must trust the asset/issuer before it can accept asset
 * @param {string} assetCode 
 * @param {string} assetLimit 
 * @param {string} issuerPublicKey 
 * @param {string} distributorSecretSeed 
 */
Stellar.prototype.trustAsset = async function (assetCode, assetLimit, issuerPublicKey, distributorSecretSeed) {
  let obj = new Object();
  let that = this;

  let distributorPair = StellarSdk.Keypair.fromSecret(distributorSecretSeed);
  obj.issuerPublicKey = issuerPublicKey;
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
      obj.paymentTx = await that.server.submitTransaction(transaction);
      let tx = new StellarSdk.Transaction(obj.paymentTx.envelope_xdr);
      obj.txOperations = tx.operations;
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
 * @param {string} distributorPublicKey 
 */
Stellar.prototype.issueAssetToDistributor = async function (assetCode, issueAmount, issuerSecretSeed, distributorPublicKey) {
  let obj = new Object();
  let that = this;

  let issuerPair = StellarSdk.Keypair.fromSecret(issuerSecretSeed);
  obj.issuerPublicKey = issuerPair.publicKey();
  obj.distributorPublicKey = distributorPublicKey;

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
      let tx = new StellarSdk.Transaction(obj.paymentTx.envelope_xdr);
      obj.txOperations = tx.operations;
      return Promise.resolve(obj)
    })
    .catch(function (e) {
      return Promise.reject(e);
    });
}

/**
 * Create an offer to buy or sell assets
 * @param {string} distributorSecretSeed 
 * @param {object} sellingAsset 
 * @param {object} buyingAsset 
 * @param {string} sellingAmount 
 * @param {string|object} price 
 * @param {int} offerID 
 */
Stellar.prototype.createoffer = async function (distributorSecretSeed, sellingAsset, buyingAsset, sellingAmount, price, offerID) {
  let obj = new Object();
  let that = this;

  let distributorPair = StellarSdk.Keypair.fromSecret(distributorSecretSeed);
  obj.distributorPublicKey = distributorPair.publicKey();

  // create new asset object
  if (typeof sellingAsset === 'object') {
    obj.sellingAsset = new StellarSdk.Asset(sellingAsset.code, sellingAsset.issuer);
  } else if (sellingAsset === 'native') {
    obj.sellingAsset = StellarSdk.Asset.native();
  }
  if (typeof buyingAsset === 'object') {
    obj.buyingAsset = new StellarSdk.Asset(buyingAsset.code, buyingAsset.issuer);
  } else if (buyingAsset === 'native') {
    obj.buyingAsset = StellarSdk.Asset.native();
  }

  return await this.server.loadAccount(obj.distributorPublicKey)
    .then(async function (distributor) {
      // issuer sends payment to distributor to create asset with amount
      var transaction = new StellarSdk.TransactionBuilder(distributor)
        .addOperation(StellarSdk.Operation.manageOffer({
          selling: obj.sellingAsset,
          buying: obj.buyingAsset,
          amount: sellingAmount,
          price: price,
          offerId: offerID
        }))
        .build();
      transaction.sign(distributorPair);
      obj.paymentTx = await that.server.submitTransaction(transaction);
      let tx = new StellarSdk.Transaction(obj.paymentTx.envelope_xdr);
      obj.txOperations = tx.operations;
      return Promise.resolve(obj)
    })
    .catch(function (e) {
      return Promise.reject(e);
    });
}

module.exports = Stellar;

