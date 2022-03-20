import { ethers } from 'ethers'
declare const globalStateTreeDepth = 16
declare const userStateTreeDepth = 16
declare const epochTreeDepth = 64
declare const attestingFee: ethers.BigNumber
declare const numEpochKeyNoncePerEpoch = 3
declare const numAttestationsPerProof = 5
declare const epochLength = 30
declare const circuitGlobalStateTreeDepth = 4
declare const circuitUserStateTreeDepth = 4
declare const circuitEpochTreeDepth = 32
declare const maxReputationBudget = 10
declare const maxUsers: number
declare const maxAttesters: number
export {
    attestingFee,
    circuitGlobalStateTreeDepth,
    circuitUserStateTreeDepth,
    circuitEpochTreeDepth,
    epochLength,
    epochTreeDepth,
    globalStateTreeDepth,
    numEpochKeyNoncePerEpoch,
    numAttestationsPerProof,
    maxUsers,
    maxAttesters,
    userStateTreeDepth,
    maxReputationBudget,
}
