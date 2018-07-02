var api = require('../controllers/api');
var express = require('express');
var router = express.Router();

/**
 * Router options
 * 1 : router.get('/', controller.test);
 * 2 : 
 * router.route('/')
 * .get(controller.test)
 * .post(controller.getOwner)
 */

/**
 * API
 */
// Basic
router.route('/')
.get(api.getTest)
.post(api.postTest)

// GET 
router.get('/network', api.networkInfo);
router.get('/generate-seed', api.generateSeed);
router.get('/get-balance/:publicKey', api.getBalance);
router.get('/ledger/:sequence', api.getLedger);
router.get('/transaction/:transactionHash', api.getTransaction);
router.get('/offer/:offerId', api.getOfferById);
router.get('/offers/:accountId', api.getOffersByAccount);

// POST
router.post('/decode-xdr', api.decodeXDR);
router.post('/create-friendbot-account/:publicKey', api.createFriendBotAccount);
router.post('/create-account', api.createAccount);
router.post('/payment', api.payment);

// Stellar Assets/Credits/Tokens
router.post('/asset', api.getAsset);//get details about asset from request object
router.post('/orderbook', api.getOrderbookDetails);//get details about offers
router.post('/trades', api.getTradesDetails);//get details about offers
router.post('/create-asset', api.createAsset);//trust and issue
router.post('/trust-asset', api.trustAsset);
router.post('/issue-asset', api.issueAssetToDistributor);

// Stellar Offers
router.post('/create-offer', api.createoffer);


module.exports = router;