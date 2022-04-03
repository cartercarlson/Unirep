"use strict";
/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IUnirep__factory = void 0;
const ethers_1 = require("ethers");
const _abi = [
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "uint256",
                name: "epoch",
                type: "uint256",
            },
            {
                indexed: true,
                internalType: "uint256",
                name: "epochKey",
                type: "uint256",
            },
            {
                indexed: true,
                internalType: "address",
                name: "attester",
                type: "address",
            },
            {
                indexed: false,
                internalType: "enum IUnirep.AttestationEvent",
                name: "attestationEvent",
                type: "uint8",
            },
            {
                components: [
                    {
                        internalType: "uint256",
                        name: "attesterId",
                        type: "uint256",
                    },
                    {
                        internalType: "uint256",
                        name: "posRep",
                        type: "uint256",
                    },
                    {
                        internalType: "uint256",
                        name: "negRep",
                        type: "uint256",
                    },
                    {
                        internalType: "uint256",
                        name: "graffiti",
                        type: "uint256",
                    },
                    {
                        internalType: "uint256",
                        name: "signUp",
                        type: "uint256",
                    },
                ],
                indexed: false,
                internalType: "struct UnirepTypes.Attestation",
                name: "attestation",
                type: "tuple",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "toProofIndex",
                type: "uint256",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "fromProofIndex",
                type: "uint256",
            },
        ],
        name: "AttestationSubmitted",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "uint256",
                name: "epoch",
                type: "uint256",
            },
        ],
        name: "EpochEnded",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "uint256",
                name: "proofIndex",
                type: "uint256",
            },
            {
                indexed: true,
                internalType: "uint256",
                name: "epoch",
                type: "uint256",
            },
            {
                indexed: true,
                internalType: "uint256",
                name: "epochKey",
                type: "uint256",
            },
            {
                components: [
                    {
                        internalType: "uint256",
                        name: "globalStateTree",
                        type: "uint256",
                    },
                    {
                        internalType: "uint256",
                        name: "epoch",
                        type: "uint256",
                    },
                    {
                        internalType: "uint256",
                        name: "epochKey",
                        type: "uint256",
                    },
                    {
                        internalType: "uint256[8]",
                        name: "proof",
                        type: "uint256[8]",
                    },
                ],
                indexed: false,
                internalType: "struct UnirepTypes.EpochKeyProof",
                name: "proof",
                type: "tuple",
            },
        ],
        name: "IndexedEpochKeyProof",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "uint256",
                name: "proofIndex",
                type: "uint256",
            },
            {
                indexed: true,
                internalType: "uint256",
                name: "inputBlindedUserState",
                type: "uint256",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "outputBlindedUserState",
                type: "uint256",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "outputBlindedHashChain",
                type: "uint256",
            },
            {
                indexed: false,
                internalType: "uint256[8]",
                name: "proof",
                type: "uint256[8]",
            },
        ],
        name: "IndexedProcessedAttestationsProof",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "uint256",
                name: "proofIndex",
                type: "uint256",
            },
            {
                indexed: true,
                internalType: "uint256",
                name: "epoch",
                type: "uint256",
            },
            {
                indexed: true,
                internalType: "uint256",
                name: "epochKey",
                type: "uint256",
            },
            {
                components: [
                    {
                        internalType: "uint256[]",
                        name: "repNullifiers",
                        type: "uint256[]",
                    },
                    {
                        internalType: "uint256",
                        name: "epoch",
                        type: "uint256",
                    },
                    {
                        internalType: "uint256",
                        name: "epochKey",
                        type: "uint256",
                    },
                    {
                        internalType: "uint256",
                        name: "globalStateTree",
                        type: "uint256",
                    },
                    {
                        internalType: "uint256",
                        name: "attesterId",
                        type: "uint256",
                    },
                    {
                        internalType: "uint256",
                        name: "proveReputationAmount",
                        type: "uint256",
                    },
                    {
                        internalType: "uint256",
                        name: "minRep",
                        type: "uint256",
                    },
                    {
                        internalType: "uint256",
                        name: "proveGraffiti",
                        type: "uint256",
                    },
                    {
                        internalType: "uint256",
                        name: "graffitiPreImage",
                        type: "uint256",
                    },
                    {
                        internalType: "uint256[8]",
                        name: "proof",
                        type: "uint256[8]",
                    },
                ],
                indexed: false,
                internalType: "struct UnirepTypes.ReputationProof",
                name: "proof",
                type: "tuple",
            },
        ],
        name: "IndexedReputationProof",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "uint256",
                name: "proofIndex",
                type: "uint256",
            },
            {
                indexed: true,
                internalType: "uint256",
                name: "blindedUserState",
                type: "uint256",
            },
            {
                indexed: true,
                internalType: "uint256",
                name: "globalStateTree",
                type: "uint256",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "blindedHashChain",
                type: "uint256",
            },
            {
                indexed: false,
                internalType: "uint256[8]",
                name: "proof",
                type: "uint256[8]",
            },
        ],
        name: "IndexedStartedTransitionProof",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "uint256",
                name: "proofIndex",
                type: "uint256",
            },
            {
                indexed: true,
                internalType: "uint256",
                name: "epoch",
                type: "uint256",
            },
            {
                indexed: true,
                internalType: "uint256",
                name: "epochKey",
                type: "uint256",
            },
            {
                components: [
                    {
                        internalType: "uint256",
                        name: "epoch",
                        type: "uint256",
                    },
                    {
                        internalType: "uint256",
                        name: "epochKey",
                        type: "uint256",
                    },
                    {
                        internalType: "uint256",
                        name: "globalStateTree",
                        type: "uint256",
                    },
                    {
                        internalType: "uint256",
                        name: "attesterId",
                        type: "uint256",
                    },
                    {
                        internalType: "uint256",
                        name: "userHasSignedUp",
                        type: "uint256",
                    },
                    {
                        internalType: "uint256[8]",
                        name: "proof",
                        type: "uint256[8]",
                    },
                ],
                indexed: false,
                internalType: "struct UnirepTypes.SignUpProof",
                name: "proof",
                type: "tuple",
            },
        ],
        name: "IndexedUserSignedUpProof",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "uint256",
                name: "proofIndex",
                type: "uint256",
            },
            {
                components: [
                    {
                        internalType: "uint256",
                        name: "newGlobalStateTreeLeaf",
                        type: "uint256",
                    },
                    {
                        internalType: "uint256[]",
                        name: "epkNullifiers",
                        type: "uint256[]",
                    },
                    {
                        internalType: "uint256",
                        name: "transitionFromEpoch",
                        type: "uint256",
                    },
                    {
                        internalType: "uint256[]",
                        name: "blindedUserStates",
                        type: "uint256[]",
                    },
                    {
                        internalType: "uint256",
                        name: "fromGlobalStateTree",
                        type: "uint256",
                    },
                    {
                        internalType: "uint256[]",
                        name: "blindedHashChains",
                        type: "uint256[]",
                    },
                    {
                        internalType: "uint256",
                        name: "fromEpochTree",
                        type: "uint256",
                    },
                    {
                        internalType: "uint256[8]",
                        name: "proof",
                        type: "uint256[8]",
                    },
                ],
                indexed: false,
                internalType: "struct UnirepTypes.UserTransitionProof",
                name: "proof",
                type: "tuple",
            },
            {
                indexed: false,
                internalType: "uint256[]",
                name: "proofIndexRecords",
                type: "uint256[]",
            },
        ],
        name: "IndexedUserStateTransitionProof",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "uint256",
                name: "epoch",
                type: "uint256",
            },
            {
                indexed: false,
                internalType: "enum IUnirep.Event",
                name: "userEvent",
                type: "uint8",
            },
        ],
        name: "Sequencer",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "uint256",
                name: "epoch",
                type: "uint256",
            },
            {
                indexed: true,
                internalType: "uint256",
                name: "identityCommitment",
                type: "uint256",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "attesterId",
                type: "uint256",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "airdropAmount",
                type: "uint256",
            },
        ],
        name: "UserSignedUp",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "uint256",
                name: "epoch",
                type: "uint256",
            },
            {
                indexed: true,
                internalType: "uint256",
                name: "hashedLeaf",
                type: "uint256",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "proofIndex",
                type: "uint256",
            },
        ],
        name: "UserStateTransitioned",
        type: "event",
    },
    {
        inputs: [],
        name: "attesterSignUp",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "attester",
                type: "address",
            },
            {
                internalType: "bytes",
                name: "signature",
                type: "bytes",
            },
        ],
        name: "attesterSignUpViaRelayer",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
];
class IUnirep__factory {
    static createInterface() {
        return new ethers_1.utils.Interface(_abi);
    }
    static connect(address, signerOrProvider) {
        return new ethers_1.Contract(address, _abi, signerOrProvider);
    }
}
exports.IUnirep__factory = IUnirep__factory;
IUnirep__factory.abi = _abi;