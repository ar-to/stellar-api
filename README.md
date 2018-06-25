# Stellar-API

## Table of Contents

- [Quick Start](#quick-start)
- Getting Started
  - [Config](#config)
- [List of All API Endpoints](#endpoints)

## Quick Start

Run Stellar Core and Horizon via [Docker Container](https://hub.docker.com/r/stellar/quickstart/).

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



### Config

```
{
  "networks": {
    "connectApi": "local",
    "local":{
      "url": "http://0.0.0.0:8000",
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


## Resources

Stellar testnet server: https://horizon-testnet.stellar.org/
Run this in the browser to see what methods are available and the ledger history.


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
        "path": "/api/get-balance/:address",
        "methods": [
            "GET"
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