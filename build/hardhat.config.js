"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("@typechain/hardhat");
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-waffle");
const config = {
    defaultNetwork: 'hardhat',
    paths: {
        artifacts: './artifacts',
    },
    networks: {
        hardhat: {
            blockGasLimit: 12000000,
        },
        local: {
            url: 'http://localhost:8545',
        },
    },
    solidity: {
        compilers: [
            {
                version: '0.8.1',
                settings: {
                    optimizer: { enabled: true, runs: 200 },
                },
            },
        ],
    },
    typechain: {
        outDir: './typechain',
    },
};
exports.default = config;