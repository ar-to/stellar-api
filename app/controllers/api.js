var stringify = require('json-stringify-safe');
var StellarService = require('../services/Stellar.js');
const stellar = new StellarService();

module.exports = {
  getTest: function (req, res, next) {
    res.send("API!")
  },
  postTest: function (req, res, next) {
    res.send(req.body);
  },
  networkInfo: function (req, res, next) {
    let obj = new Object();
    try {
      stellar.networkInfo({ network: stellar.network })
        .then(function (tx) {
          obj.success = tx;
          res.send(obj)
        })
        .catch((error) => {
          console.log('error: ', error)
          obj.error = JSON.parse(stringify(error));
          res.status(404).send(obj).end();
        });

    } catch (error) {
      console.log('catch error', error)
      obj.error = error;
      res.status(404).send(obj).end();
    }
  },
  decodeXDR: function (req, res, next) {
    res.send(stellar.decodeXDR(req.body.xdr));
  },
  generateSeed: function (req, res, next) {
    res.send(stellar.generateSeed());
  },
  getBalance: function (req, res, next) {
    let obj = new Object();
    obj.params = req.params;
    obj.balances = new Array();
    let { publicKey } = req.params;

    stellar.getBalance(publicKey)
      .then(function (account) {
        // console.log('account:', account)
        account.balances.forEach(function (balance) {
          obj.balances.push(balance);
        });
        res.send(obj)
      }).catch((error) => {
        console.log('error: ', error)
        obj.error = error;
        res.status(404).send(obj).end();
      });
  },
  getLedger: function (req, res, next) {
    let obj = new Object();
    obj.params = req.params;
    let sequence = req.params.sequence;

    try {
      stellar.getLedger(sequence)
        .then(function (tx) {
          obj.success = tx;
          res.send(obj)
        })
        .catch((error) => {
          console.log('error: ', error)
          obj.error = JSON.parse(stringify(error));
          res.status(404).send(obj).end();
        });

    } catch (error) {
      console.log('catch error', error)
      obj.error = error;
      res.status(404).send(obj).end();
    }
  },
  getTransaction: function (req, res, next) {
    let obj = new Object();
    obj.params = req.params;
    let { transactionHash } = req.params;

    try {
      stellar.getTransaction(transactionHash)
        .then(function (tx) {
          obj.success = tx;
          res.send(obj)
          // res.json(obj)
        })
        .catch((error) => {
          console.log('error: ', error)
          obj.error = JSON.parse(stringify(error));
          res.status(404).send(obj).end();
        });

    } catch (error) {
      console.log('catch error', error)
      obj.error = error;
      res.status(404).send(obj).end();
    }
  },
  getOfferById: function (req, res, next) {
    let obj = new Object();
    obj.params = req.params;
    let { offerId } = req.params;

    try {
      stellar.getOfferById(offerId)
        .then(function (tx) {
          obj.success = tx;
          res.send(obj)
        })
        .catch((error) => {
          console.log('error: ', error)
          obj.error = JSON.parse(stringify(error));
          res.status(404).send(obj).end();
        });

    } catch (error) {
      console.log('catch error', error)
      obj.error = error;
      res.status(404).send(obj).end();
    }
  },
  getOffersByAccount: function (req, res, next) {
    let obj = new Object();
    obj.params = req.params;
    let { accountId } = req.params;

    try {
      stellar.getOffersByAccount(accountId)
        .then(function (tx) {
          obj.success = tx;
          res.send(obj)
          // res.json(obj)
        })
        .catch((error) => {
          console.log('error: ', error)
          obj.error = JSON.parse(stringify(error));
          res.status(404).send(obj).end();
        });

    } catch (error) {
      console.log('catch error', error)
      obj.error = error;
      res.status(404).send(obj).end();
    }
  },
  createFriendBotAccount: function (req, res, next) {
    let obj = new Object();
    obj.params = req.params;
    let publicKey = req.params.publicKey;
    stellar.createFriendBotAccount(publicKey)
      .then(function (account) {
        obj.account = account;
        res.send(obj)
      }).catch((error) => {
        console.log('error: ', error)
        obj.error = error;
        res.status(404).send(obj).end();
      });
  },
  createAccount: function (req, res, next) {
    let obj = new Object();
    obj.body = req.body;
    let secretSeed = req.body.secretSeed;
    let startingBalance = req.body.startingBalance;
    let destinationPublicKey = req.body.destinationPublicKey;

    try {
      if (secretSeed === "" || secretSeed === null || secretSeed === undefined) {
        throw "missing seed needed for creating, signing and sending transaction"
      }
      if (startingBalance === "" || startingBalance === null) {
        throw "missing starting balance"
      }
      stellar.createAccount(secretSeed, startingBalance, destinationPublicKey)
        .then(function (tx) {
          obj.success = tx;
          res.send(obj)
        })
        .catch((error) => {
          console.log('error: ', error)
          obj.error = JSON.parse(stringify(error));
          res.status(404).send(obj).end();
        });

    } catch (error) {
      console.log('catch error', error)
      obj.error = error;
      res.status(404).send(obj).end();
    }
  },
  payment: function (req, res, next) {
    let obj = new Object();
    obj.body = req.body;
    // let secretSeed = req.body.secretSeed;
    // let amount = req.body.amount;
    // let destinationPublicKey = req.body.destinationPublicKey;
    let {
      senderSecretSeed,
      amount,
      destinationPublicKey,
      memo,
      customAsset
    } = req.body;

    try {
      if (senderSecretSeed === "" || senderSecretSeed === null || senderSecretSeed === undefined) {
        throw "missing seed needed for creating, signing and sending transaction"
      }
      if (amount === "" || amount === null || amount === undefined) {
        throw "missing amount"
      }
      if (destinationPublicKey === "" || destinationPublicKey === null || destinationPublicKey === undefined) {
        throw "missing destination public key"
      }
      if (memo === "" || memo === null || memo === undefined) {
        memo = "MemoText";
      }
      if (customAsset === "" || customAsset === null || customAsset === undefined) {
        customAsset = "native";
      }
      stellar.payment(senderSecretSeed, amount, destinationPublicKey, memo, customAsset)
        .then(function (tx) {
          obj.success = tx;
          res.send(obj)
        })
        .catch((error) => {
          obj.error = JSON.parse(stringify(error.message));
          if (error.response != undefined) {
            console.log('error: ', error.response.data)
            obj.stellarError = error.response.data;
          }
          res.status(404).send(obj).end();
        });

    } catch (error) {
      console.log('catch error', error)
      obj.error = error;
      res.status(404).send(obj).end();
    }
  },
  getAsset: function (req, res, next) {
    let obj = new Object();
    obj.body = req.body;
    let {
      assetCode,
      issuerPublicKey,
    } = req.body;

    stellar.getAsset(assetCode, issuerPublicKey)
      .then(function (account) {
        obj.success = account;
        res.send(obj)
      }).catch((error) => {
        console.log('error: ', error)
        obj.error = error;
        res.status(404).send(obj).end();
      });
  },
  getOrderbookDetails: function (req, res, next) {
    let obj = new Object();
    obj.body = req.body;
    let {
      sellingAsset,
      buyingAsset,
    } = req.body;

    stellar.getOrderbookDetails(sellingAsset, buyingAsset)
      .then(function (account) {
        obj.success = account;
        res.send(obj)
      }).catch((error) => {
        console.log('error: ', error)
        obj.error = error;
        res.status(404).send(obj).end();
      });
  },
  getTradesDetails: function (req, res, next) {
    let obj = new Object();
    obj.body = req.body;
    let {
      baseAsset,
      counterAsset,
    } = req.body;

    stellar.getTradesDetails(baseAsset, counterAsset)
      .then(function (account) {
        obj.success = account;
        res.send(obj)
      }).catch((error) => {
        console.log('error: ', error)
        obj.error = error;
        res.status(404).send(obj).end();
      });
  },
  trustAsset: function (req, res, next) {
    let obj = new Object();
    obj.body = req.body;
    let {
      assetCode,
      assetLimit,
      issuerPublicKey,
      distributorSecretSeed
    } = req.body;

    stellar.trustAsset(assetCode, assetLimit, issuerPublicKey, distributorSecretSeed)
      .then(function (account) {
        obj.success = account;
        res.send(obj)
      }).catch((error) => {
        console.log('error: ', error)
        obj.error = error;
        res.status(404).send(obj).end();
      });
  },
  createAsset: function (req, res, next) {
    let obj = new Object();
    obj.body = req.body;
    let {
      assetCode,
      assetLimit,
      creationAmount,
      issuerSecretSeed,
      distributorSecretSeed
    } = req.body;

    stellar.createAsset(assetCode, assetLimit, creationAmount, issuerSecretSeed, distributorSecretSeed)
      .then(function (account) {
        obj.success = account;
        res.send(obj)
      }).catch((error) => {
        console.log('error: ', error)
        obj.error = error;
        res.status(404).send(obj).end();
      });
  },
  issueAssetToDistributor: function (req, res, next) {
    let obj = new Object();
    obj.body = req.body;
    let {
      assetCode,
      issueAmount,
      issuerSecretSeed,
      distributorPublicKey
    } = req.body;

    stellar.issueAssetToDistributor(assetCode, issueAmount, issuerSecretSeed, distributorPublicKey)
      .then(function (account) {
        obj.success = account;
        res.send(obj)
      }).catch((error) => {
        console.log('error: ', error)
        obj.error = error;
        res.status(404).send(obj).end();
      });
  },
  createoffer: function (req, res, next) {
    let obj = new Object();
    obj.body = req.body;
    let {
      distributorSecretSeed,
      sellingAsset,
      buyingAsset,
      sellingAmount,
      price,
      offerID
    } = req.body;

    try {
      if (sellingAsset == null || sellingAsset.code === null || sellingAsset.issuer === null) {
        throw "sellingAsset or its parameters cannot be null";
      }
      else if (sellingAsset == "" || sellingAsset.code === "" || sellingAsset.issuer === "") {
        throw "sellingAsset or its parameters cannot be empty strings";
      }
      if (buyingAsset == null || buyingAsset.code === null || buyingAsset.issuer === null) {
        throw "buyingAsset or its parameters cannot be null";
      }
      else if (buyingAsset == "" || buyingAsset.code === "" || buyingAsset.issuer === "") {
        throw "buyingAsset or its parameters cannot be empty strings";
      }
      stellar.createoffer(distributorSecretSeed, sellingAsset, buyingAsset, sellingAmount, price, offerID)
        .then(function (account) {
          obj.success = account;
          res.send(obj)
        }).catch((error) => {
          console.log('error: ', error.response.data)
          // obj.result_codes = error.response.data;
          obj.error = JSON.parse(stringify(error.response.data));
          // obj.error = JSON.parse(stringify(error));
          // obj.error = error;
          res.status(404).send(obj).end();
        });
    } catch (error) {
      console.log('catch error', error)
      obj.error = error;
      res.status(404).send(obj).end();
    }
  },
}