"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyProof = exports.genProofAndPublicSignals = exports.getSignalByName = exports.getVKey = exports.formatProofForSnarkjsVerification = exports.formatProofForVerifierContract = exports.executeCircuit = exports.Circuit = void 0;
const path = __importStar(require("path"));
const config_1 = require("./config");
Object.defineProperty(exports, "Circuit", { enumerable: true, get: function () { return config_1.Circuit; } });
const processAttestations_vkey_json_1 = __importDefault(require("../zksnarkBuild/processAttestations.vkey.json"));
const proveReputation_vkey_json_1 = __importDefault(require("../zksnarkBuild/proveReputation.vkey.json"));
const proveUserSignUp_vkey_json_1 = __importDefault(require("../zksnarkBuild/proveUserSignUp.vkey.json"));
const startTransition_vkey_json_1 = __importDefault(require("../zksnarkBuild/startTransition.vkey.json"));
const userStateTransition_vkey_json_1 = __importDefault(require("../zksnarkBuild/userStateTransition.vkey.json"));
const verifyEpochKey_vkey_json_1 = __importDefault(require("../zksnarkBuild/verifyEpochKey.vkey.json"));
const snarkjs = require('snarkjs');
const buildPath = '../zksnarkBuild';
const executeCircuit = async (circuit, inputs) => {
    const witness = await circuit.calculateWitness(inputs, true);
    await circuit.checkConstraints(witness);
    await circuit.loadSymbols();
    return witness;
};
exports.executeCircuit = executeCircuit;
const getVKey = async (circuitName) => {
    if (circuitName === config_1.Circuit.verifyEpochKey) {
        return verifyEpochKey_vkey_json_1.default;
    }
    else if (circuitName === config_1.Circuit.proveReputation) {
        return proveReputation_vkey_json_1.default;
    }
    else if (circuitName === config_1.Circuit.proveUserSignUp) {
        return proveUserSignUp_vkey_json_1.default;
    }
    else if (circuitName === config_1.Circuit.startTransition) {
        return startTransition_vkey_json_1.default;
    }
    else if (circuitName === config_1.Circuit.processAttestations) {
        return processAttestations_vkey_json_1.default;
    }
    else if (circuitName === config_1.Circuit.userStateTransition) {
        return userStateTransition_vkey_json_1.default;
    }
    else {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        console.log(`"${circuitName}" not found. Valid circuit name: verifyEpochKey, proveReputation, proveUserSignUp, startTransition, processAttestations, userStateTransition`);
    }
};
exports.getVKey = getVKey;
const getSignalByName = (circuit, witness, signal) => {
    return witness[circuit.symbols[signal].varIdx];
};
exports.getSignalByName = getSignalByName;
const genProofAndPublicSignals = async (circuitName, inputs) => {
    const circuitWasmPath = path.join(__dirname, buildPath, `${circuitName}.wasm`);
    const zkeyPath = path.join(__dirname, buildPath, `${circuitName}.zkey`);
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(inputs, circuitWasmPath, zkeyPath);
    return { proof, publicSignals };
};
exports.genProofAndPublicSignals = genProofAndPublicSignals;
const verifyProof = async (circuitName, proof, publicSignals) => {
    const vkey = await getVKey(circuitName);
    return snarkjs.groth16.verify(vkey, publicSignals, proof);
};
exports.verifyProof = verifyProof;
const formatProofForVerifierContract = (proof) => {
    return [
        proof.pi_a[0],
        proof.pi_a[1],
        proof.pi_b[0][1],
        proof.pi_b[0][0],
        proof.pi_b[1][1],
        proof.pi_b[1][0],
        proof.pi_c[0],
        proof.pi_c[1],
    ].map((x) => x.toString());
};
exports.formatProofForVerifierContract = formatProofForVerifierContract;
const formatProofForSnarkjsVerification = (proof) => {
    return {
        pi_a: [BigInt(proof[0]), BigInt(proof[1]), BigInt('1')],
        pi_b: [
            [BigInt(proof[3]), BigInt(proof[2])],
            [BigInt(proof[5]), BigInt(proof[4])],
            [BigInt('1'), BigInt('0')],
        ],
        pi_c: [BigInt(proof[6]), BigInt(proof[7]), BigInt('1')],
    };
};
exports.formatProofForSnarkjsVerification = formatProofForSnarkjsVerification;
