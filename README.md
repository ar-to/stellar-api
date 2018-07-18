# Stellar-API

## Table of Contents

- [Quick Start](#quick-start)
- Getting Started
  - [Config](#config)
  - [Stellar API Notes](#stellar-api-notes)
      - [Assets](#assets)
      - [Offers](#offers)
          - [Offer Steps](#offer-steps)
  - [Resources](#resources)
- [List of All API Endpoints](#endpoints)

## Quick Start

Run Stellar Core and Horizon via [Docker Container](https://hub.docker.com/r/stellar/quickstart/). If you need help read [getting started]($getting-started) for more information.

```
docker run --rm -it -p "8088:8000" -p "5433:5432" --name stellar stellar/quickstart —testnet
```
Save the postgresql password generated and then detach from the container with Control=P then Control-Q to avoid breaking the instance.

Add [config](#config) and make sure the `networkType` parameter value is set to "testnet". This ensures the stellar-sdk instance is set to test network.

Run API
```
git clone git@github.com:ar-to/stellar-api.git
cd stellar-api
npm i
npm start
```

## Getting Started

### Setting Up Docker
Follow these instructions to setup Docker for running a local development stellar-core and horizon in MacOS but it is similar in other OSs. This setup runs a testnet network with the docker container in ephemeral mode.

- install [Docker](https://docs.docker.com/docker-for-mac/install/)
- Run container to pull docker stellar image and initiate container. The command below sets the horizon port to 8088 local and postgresql database to 5433 local. These are the ports used to connect to these services. Read about the [Docker stellar image](https://hub.docker.com/r/stellar/quickstart/) and available options. 

```
docker run --rm -it -p "8088:8000" -p "5433:5432" --name stellar stellar/quickstart —testnet
```
- To access the container internally:

```
docker exec -it stellar /bin/bash
```
- test horizon connection via browser or curl. Command below will return available endpoints and status of the network sync. You can now communicate with the Stellar network!

```
curl http://0.0.0.0:8000/
```


### Testing Horizon locally
Once the docker container is setup you need to wait until the node is synched with the network and the database is updated. You can do can check by accessing the container manually or via a curl command to the localhost and port given in the docker command.

**Manual Check**
```
$ docker exec -it stellar /bin/bash
root@0000000:/#stellar-core -c info
```
**Via Curl**
```
curl http://0.0.0.0:8000/accounts/GDZCM7KFIFMW2SU4RS5YMUZPEKFWUI6WQTHBRB6AHPBRT5UQZJ4WM3II
```


### Config

```
{
  "networks": {
    "connectApi": "local",
    "local":{
      "url": "http://0.0.0.0:8000",
      "fallbackUrl": "https://horizon-testnet.stellar.org",
      "networkName": "docker",
      "networkType": "testnet"
    },
    "external":{
      "url": "https://horizon-testnet.stellar.org",
      "networkName": "stellar",
      "networkType": "testnet"
    },
    "mainnet":{}
  }
}
```
Notes about the config file:
- fallbackUrl - used to guarantee the connections continues even if the primary url fails to provide a successful 200 status code or for any other reason.

## Stellar Operations

### Creating Assets
Assets allow accounts to trade currencies(via Anchors) and custom tokens (via the Stellar Distributed Exchange). Creating assets requires the distributor to performs two steps: 
1. distributor needs to trust the issuer and asset. See [stellar api notes](#stellar-api-notes)
2. distributor needs to receive initial assets from the issuer directly or buy them by creating an [offer](#making-offers).


### Making Offers
Offers allow accounts to trade assets.

## Stellar API Notes

#### POST /decode-xdr
Stellar encode most of the information in its responses in XDR(External Data Representation). You can read more about it [here](https://www.stellar.org/developers/horizon/reference/xdr.html). This endpoint helps decode a xdr string into human readable json format.

Request:
```
{
	"xdr": "AAAAAPImfUVBWW1KnIy7hlMvIotqI9aEzhiHwDvDGfaQynlmAAAAZACTF2oAAAAPAAAAAAAAAAAAAAABAAAAAAAAAAEAAAAAAbwCS+VX8lr4x2u++az6OQJ3HN5FeKTWLQ961cp4kPoAAAAAAAAAABfXhAAAAAAAAAAAAZDKeWYAAABAvn1FDG5pB/MO6qX90qt5dW6e/CiGG6Mikoyal3K96rT6Ki73VmtRRHLTzovg266ig8UXYUA6rPNNQQLL97bMAg=="
}
```
Response:
```
{
    "txOperations": [
        {
            "type": "manageOffer",
            "selling": {
                "code": "LTC",
                "issuer": "GA77B6GK5K3FH2YJ6I5VJ7VPFZKPBQUX2IIC2MJYAERQTGJI4VOPKRYJ"
            },
            "buying": {
                "code": "BTC",
                "issuer": "GA77B6GK5K3FH2YJ6I5VJ7VPFZKPBQUX2IIC2MJYAERQTGJI4VOPKRYJ"
            },
            "amount": "60.5323181",
            "price": "0.0125324",
            "offerId": "145229"
        },
        ...
    ]
}
```

#### GET /ledger/:sequence
Pass the sequence number for the ledger to get details. Example:
```
http://localhost:3000/api/ledger/9708859
```

#### GET /get-balance/:publicKey
Get balance details for a provided public key. Example:
```
http://localhost:3000/api/get-balance/GAQOXRMYFJQYE4JZG254MW62GUVPVQOES3RFC4PUX6NWYJ4YL7XTZY3J
```


#### GET /generate-seed
Generate a new seed and public key

#### POST /create-account
The `secretSeed` and `startingBalance` are required. Passing on the seed will generate a new seed and create the new account. To simply create a new account from an existing seed, first create the seed via `/generate-seed` and pass the public key as the `destinationPublicKey` parameter.
Request:
```
{
	"secretSeed": "secretSeed",
    "startingBalance": "40"
    "destinationPublicKey": "optional public key"
}
```
Response:
```
{
    "body": {
        "secretSeed": "secretSeed"
    },
    "success": {
        "newSeed": {
            "publicKey": "publicKey",
            "seed": "seed"
        },
        "sourceCanSign": true,
        "sourcePublicKey": "sourcePublicKey",
        "tx": {
        ...
        }
    }
}
```

### Assets
#### POST /payment
Send Lumens between accounts
There a few things to keep in mind when constructing this request object:

- the memo is optional and defaults to a string "Sent Payment"
- change the memo type changes what is sent, see [docs](http://stellar.github.io/js-stellar-sdk/Memo.html). In this api, the following apply
    - type : id -  and pass valid number string, or leave value empty and it generates a random number string between 10 - 10000000
    - type : hash - generates a 32 byte hash using the `value` parameter data via `crypto.createHash('sha256')`
    - type : hash and generateRandom : true - generates a 32 byte random string via `crypto.randomBytes(32)`
- customAsset parameter is optional and defaults to "native" which is Lumens

Request:
```
{
	"senderSecretSeed": "senderSecretSeed",
	"amount": "5",
	"destinationPublicKey": "destinationPublicKey",
	"memo": {
		"type":"id",
		"generateRandom":true,
		"value":"message"
	},
	"customAsset": {
		"code": "rocketMan",
		"issuer": "GDZCM7KFIFMW2SU4RS5YMUZPEKFWUI6WQTHBRB6AHPBRT5UQZJ4WM3II"
	}
}
```

#### POST /create-asset
Creates a new stellar asset/credit/token. This endpoint will first create the asset object, then the distributor will call the changeTrust operation to set the limit of assets it expects from the issuer. The issuer will then create the asset but issuing some amount of assets to the distributor. Read about issuing assets from the [stellar docs](https://www.stellar.org/developers/guides/issuing-assets.html)

Request:
```
{
	"assetCode":"AssetName",
	"assetLimit": "500",
	"creationAmount": "50",
	"issuerSecretSeed":"issuerSecretSeed",
	"distributorSecretSeed": "distributorSecretSeed"
}
```

Response: 
```
{
    "body": {
	...
    },
    "success": {
        "issuerPublicKey": "issuerPublicKey",
        "distributorPublicKey": "distributorPublicKey",
        "newAsset": {
            "code": "AssetName",
            "issuer": "issuer public key"
        },
        "trustTx": {}
        "paymentTx": {}
    }
}
```

#### POST /trust-asset

An account must trust the asset/issuer before it can accept asset. This endpoint sends a changeTrust() Operation to allow account to accept asset. Then the `/issue-asset` endpoint can be performed.

Request:
```
{
	"assetCode":"rocketMan",
	"assetLimit":"200",
	"issuerPublicKey":"GDZCM7KFIFMW2SU4RS5YMUZPEKFWUI6WQTHBRB6AHPBRT5UQZJ4WM3II",
	"distributorSecretSeed":"SDWKMXDDMXNDUX7OHXCLIFE3XLAVUSIF76V5E4GS6SCQ7B4YRNNQHUVR"
}
```

Response:
```
{
    "body": {
	...
    },
    "success": {
        "issuerPublicKey": "issuerPublicKey",
        "distributorPublicKey": "distributorPublicKey",
        "newAsset": {
            "code": "AssetName",
            "issuer": "issuer public key"
        },
        "trustTx": {}
        "paymentTx": {}
        "txOperations":{}
    }
}
```

#### POST /issue-asset
Issuing assets to a distributor the first time will create the assets, afterwards it adds to the balance below the limit that distributor is trusting issuer to have.

Request:
```
{
	"assetCode":"rocketWoman",
	"issueAmount": "10",
	"issuerSecretSeed":"SAOULBQPK6ANAYHRS4AGOGGQSLUJQVB4NUNZOQAH3KFMEM5LHZ26XO6G",
	"distributorSecretSeed": "SBIONFH7TZWWGLWG43KWN2CQIFX2DTOWBHD37AHRNXWA3LKDJN4ALYEY"
}
```

Response:

```
{
    "body": {
	...
    },
    "success": {
        "issuerPublicKey": "issuerPublicKey",
        "distributorPublicKey": "distributorPublicKey",
        "newAsset": {
            "code": "AssetName",
            "issuer": "issuer public key"
        },
        "paymentTx": {
        }
    }
}
```

### Offers
Offers allow accounts to trade assets. 

#### Offer Steps
The following steps can be used to create and lookup offers with this api, but can also be done with the [stellar laboratory](#https://www.stellar.org/laboratory/) and [horizon endpoints](#https://www.stellar.org/developers/horizon/reference/resources/offer.html).

1. ensure account has balances for the assets you wish to buy/sell via `get-balance`
2. ensure the account you wish to use to create the offer trusts the asset/issuer via `trust-asset`
3. create offer with `/create-offer`
4. query orderbook for offer via `/orderbook`
5. query offers by account via `/offers`
6. query trades performed for base/counter assets via `/trades`

#### POST /create-offer

Notes on crafting the request keep these things in mind:

- `sellingAsset` and `buyingAsset` parameters can both be objects or the string "native" to refer to Lumens (XML). All parameters are required.
- Delete an offer by passing `sellingAmount:0` and the offerId for the offer, which you can get from [stellar.expert](https://stellar.expert/explorer/public/) or via this api with `/offers`
- 
Request:
```
{
	"distributorSecretSeed":"distributorSecretSeed",
	"sellingAsset": {
		"code": "rocketWoman",
		"issuer": "issuer public key"
	},
	"buyingAsset": "native",
	"sellingAmount": "10",
	"price":"10",
	"offerID":0
}
```
Response:
```
{
    "body": {
	...
    },
    "success": {
        "distributorPublicKey": "distributorPublicKey",
        "buyingAsset": {
            "code": "XLM"
        },
        "paymentTx": {}
        "txOperations": [
            {
                "type": "manageOffer",
                "selling": {
                    "code": "rocketWoman",
                    "issuer": "issuer public key"
                },
                "buying": {
                    "code": "XLM"
                },
                "amount": "10",
                "price": "10",
                "offerId": "0"
            }
        ]
    }
}
```

#### POST /orderbook

Request:
```
{
    "sellingAsset": {
        "code": "rocketWoman",
        "issuer": "issuer public key"
    },
    "buyingAsset": "native"
}
```

Response:
```
{
...
    "success": {
        "sellingAsset": {},
        "buyingAsset": {},
        "results": {
            "bids": [],
            "asks": [
                {
                    "price_r": {
                        "n": 10,
                        "d": 1
                    },
                    "price": "10.0000000",
                    "amount": "10.0000000"
                }
            ],
            "base": {
                "asset_type": "credit_alphanum12",
                "asset_code": "rocketWoman",
                "asset_issuer": "issuer public key"
            },
            "counter": {
                "asset_type": "native"
            }
        }
    }
}
```

#### GET /offers

Request:
```
http://localhost:3000/api/offers/GB5BTJFMQXSZB2733O2SL6GJLDX5BMUCES3I7VN2XCDGH2XWXTPYCIND
```

Response:

```
{
    "params": {},
    "success": {
        "records": [
            {
                "_links": {
                    "self": {
                        "href": "https://horizon-testnet.stellar.org/offers/457886"
                    },
                    "offer_maker": {
                        "href": "https://horizon-testnet.stellar.org/accounts/GB5BTJFMQXSZB2733O2SL6GJLDX5BMUCES3I7VN2XCDGH2XWXTPYCIND"
                    }
                },
                "id": 457886,
                "paging_token": "457886",
                "seller": "GB5BTJFMQXSZB2733O2SL6GJLDX5BMUCES3I7VN2XCDGH2XWXTPYCIND",
                "selling": {
                    "asset_type": "credit_alphanum12",
                    "asset_code": "rocketWoman",
                    "asset_issuer": "issuer public key"
                },
                "buying": {
                    "asset_type": "native"
                },
                "amount": "10.0000000",
                "price_r": {
                    "n": 10,
                    "d": 1
                },
                "price": "10.0000000"
            }
        ]
    }
}
```

#### POST /trades

Request:
```
{
    "baseAsset": {
        "code": "rocketWoman",
        "issuer": "GDZCM7KFIFMW2SU4RS5YMUZPEKFWUI6WQTHBRB6AHPBRT5UQZJ4WM3II"
    },
    "counterAsset": "native"
}
```
Response:
```
{
    "body": {},
    "success": {
        "base": {},
        "counter": {},
        "results": {
            "records": [
                {
                    "_links": {
                        "self": {
                            "href": ""
                        },
                        "base": {
                            "href": "https://horizon-testnet.stellar.org/accounts/GB5BTJFMQXSZB2733O2SL6GJLDX5BMUCES3I7VN2XCDGH2XWXTPYCIND"
                        },
                        "counter": {
                            "href": "https://horizon-testnet.stellar.org/accounts/GANYSXPWMGO4Z36CY324C63LGGBN3DIMAQPJGPHOD7AXF3ESS4TI3K76"
                        },
                        "operation": {
                            "href": "https://horizon-testnet.stellar.org/operations/41920229428695041"
                        }
                    },
                    "id": "41920229428695041-0",
                    "paging_token": "41920229428695041-0",
                    "ledger_close_time": "2018-06-29T23:22:55Z",
                    "offer_id": "457886",
                    "base_account": "GB5BTJFMQXSZB2733O2SL6GJLDX5BMUCES3I7VN2XCDGH2XWXTPYCIND",
                    "base_amount": "1.7499940",
                    "base_asset_type": "credit_alphanum12",
                    "base_asset_code": "rocketWoman",
                    "base_asset_issuer": "GDZCM7KFIFMW2SU4RS5YMUZPEKFWUI6WQTHBRB6AHPBRT5UQZJ4WM3II",
                    "counter_account": "GANYSXPWMGO4Z36CY324C63LGGBN3DIMAQPJGPHOD7AXF3ESS4TI3K76",
                    "counter_amount": "17.4999400",
                    "counter_asset_type": "native",
                    "base_is_seller": true,
                    "price": {
                        "n": 10,
                        "d": 1
                    }
                },
                {
                    "_links": {
                        "self": {
                            "href": ""
                        },
                        "base": {
                            "href": "https://horizon-testnet.stellar.org/accounts/GB5BTJFMQXSZB2733O2SL6GJLDX5BMUCES3I7VN2XCDGH2XWXTPYCIND"
                        },
                        "counter": {
                            "href": "https://horizon-testnet.stellar.org/accounts/GANYSXPWMGO4Z36CY324C63LGGBN3DIMAQPJGPHOD7AXF3ESS4TI3K76"
                        },
                        "operation": {
                            "href": "https://horizon-testnet.stellar.org/operations/41922484286533633"
                        }
                    },
                    "id": "41922484286533633-0",
                    "paging_token": "41922484286533633-0",
                    "ledger_close_time": "2018-06-30T00:06:40Z",
                    "offer_id": "457886",
                    "base_account": "GB5BTJFMQXSZB2733O2SL6GJLDX5BMUCES3I7VN2XCDGH2XWXTPYCIND",
                    "base_amount": "8.2499990",
                    "base_asset_type": "credit_alphanum12",
                    "base_asset_code": "rocketWoman",
                    "base_asset_issuer": "GDZCM7KFIFMW2SU4RS5YMUZPEKFWUI6WQTHBRB6AHPBRT5UQZJ4WM3II",
                    "counter_account": "GANYSXPWMGO4Z36CY324C63LGGBN3DIMAQPJGPHOD7AXF3ESS4TI3K76",
                    "counter_amount": "82.4999900",
                    "counter_asset_type": "native",
                    "base_is_seller": true,
                    "price": {
                        "n": 10,
                        "d": 1
                    }
                }
            ]
        }
    }
}
```

## Resources

Stellar testnet server: https://horizon-testnet.stellar.org/
Run this in the browser to see what methods are available and the ledger history. For example, to check a transaction:
```
https://horizon-testnet.stellar.org/transactions/074847e1fd022d7084e69ca4b767af9c7c3ed473bea82047810bea0f1ae10966
```
To check an account:
```
https://horizon-testnet.stellar.org/accounts/GDZCM7KFIFMW2SU4RS5YMUZPEKFWUI6WQTHBRB6AHPBRT5UQZJ4WM3II
```


## Endpoints

```
[
    {
        "path": "/",
        "methods": [
            "GET"
        ]
    },
    {
        "path": "/api",
        "methods": [
            "GET",
            "POST"
        ]
    },
    {
        "path": "/api/network",
        "methods": [
            "GET"
        ]
    },
    {
        "path": "/api/generate-seed",
        "methods": [
            "GET"
        ]
    },
    {
        "path": "/api/get-balance/:publicKey",
        "methods": [
            "GET"
        ]
    },
    {
        "path": "/api/ledger/:sequence",
        "methods": [
            "GET"
        ]
    },
    {
        "path": "/api/transaction/:transactionHash",
        "methods": [
            "GET"
        ]
    },
    {
        "path": "/api/offer/:offerId",
        "methods": [
            "GET"
        ]
    },
    {
        "path": "/api/offers/:accountId",
        "methods": [
            "GET"
        ]
    },
    {
        "path": "/api/decode-xdr",
        "methods": [
            "POST"
        ]
    },
    {
        "path": "/api/create-friendbot-account/:publicKey",
        "methods": [
            "POST"
        ]
    },
    {
        "path": "/api/create-account",
        "methods": [
            "POST"
        ]
    },
    {
        "path": "/api/payment",
        "methods": [
            "POST"
        ]
    },
    {
        "path": "/api/asset",
        "methods": [
            "POST"
        ]
    },
    {
        "path": "/api/orderbook",
        "methods": [
            "POST"
        ]
    },
    {
        "path": "/api/trades",
        "methods": [
            "POST"
        ]
    },
    {
        "path": "/api/create-asset",
        "methods": [
            "POST"
        ]
    },
    {
        "path": "/api/trust-asset",
        "methods": [
            "POST"
        ]
    },
    {
        "path": "/api/issue-asset",
        "methods": [
            "POST"
        ]
    },
    {
        "path": "/api/create-offer",
        "methods": [
            "POST"
        ]
    },
    {
        "path": "/api-endpoints",
        "methods": [
            "GET"
        ]
    }
]
```