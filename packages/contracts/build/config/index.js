'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.maxReputationBudget =
    exports.userStateTreeDepth =
    exports.maxAttesters =
    exports.maxUsers =
    exports.numAttestationsPerProof =
    exports.numEpochKeyNoncePerEpoch =
    exports.globalStateTreeDepth =
    exports.epochTreeDepth =
    exports.epochLength =
    exports.circuitEpochTreeDepth =
    exports.circuitUserStateTreeDepth =
    exports.circuitGlobalStateTreeDepth =
    exports.attestingFee =
        void 0
const ethers_1 = require('ethers')
const attestingFee = ethers_1.ethers.utils.parseEther('0.1')
exports.attestingFee = attestingFee
const numEpochKeyNoncePerEpoch = 3
exports.numEpochKeyNoncePerEpoch = numEpochKeyNoncePerEpoch
const numAttestationsPerProof = 5
exports.numAttestationsPerProof = numAttestationsPerProof
const epochLength = 30 // 30 seconds
exports.epochLength = epochLength
const circuitGlobalStateTreeDepth = 4
exports.circuitGlobalStateTreeDepth = circuitGlobalStateTreeDepth
const circuitUserStateTreeDepth = 4
exports.circuitUserStateTreeDepth = circuitUserStateTreeDepth
const circuitEpochTreeDepth = 32
exports.circuitEpochTreeDepth = circuitEpochTreeDepth
const globalStateTreeDepth = circuitGlobalStateTreeDepth
exports.globalStateTreeDepth = globalStateTreeDepth
const userStateTreeDepth = circuitUserStateTreeDepth
exports.userStateTreeDepth = userStateTreeDepth
const epochTreeDepth = circuitEpochTreeDepth
exports.epochTreeDepth = epochTreeDepth
const maxReputationBudget = 10
exports.maxReputationBudget = maxReputationBudget
const maxUsers = 2 ** circuitGlobalStateTreeDepth - 1
exports.maxUsers = maxUsers
const maxAttesters = 2 ** circuitUserStateTreeDepth - 1
exports.maxAttesters = maxAttesters
