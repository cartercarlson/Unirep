"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userStateTransitionCircuitPath = exports.processAttestationsCircuitPath = exports.startTransitionCircuitPath = exports.proveUserSignUpCircuitPath = exports.proveReputationCircuitPath = exports.verifyEpochKeyCircuitPath = exports.Circuit = void 0;
var Circuit;
(function (Circuit) {
    Circuit["verifyEpochKey"] = "verifyEpochKey";
    Circuit["proveReputation"] = "proveReputation";
    Circuit["proveUserSignUp"] = "proveUserSignUp";
    Circuit["startTransition"] = "startTransition";
    Circuit["processAttestations"] = "processAttestations";
    Circuit["userStateTransition"] = "userStateTransition";
})(Circuit || (Circuit = {}));
exports.Circuit = Circuit;
const verifyEpochKeyCircuitPath = '../zksnarkBuild/verifyEpochKey_main.circom';
exports.verifyEpochKeyCircuitPath = verifyEpochKeyCircuitPath;
const proveReputationCircuitPath = '../zksnarkBuild/proveReputation_main.circom';
exports.proveReputationCircuitPath = proveReputationCircuitPath;
const proveUserSignUpCircuitPath = '../zksnarkBuild/proveUserSignUp_main.circom';
exports.proveUserSignUpCircuitPath = proveUserSignUpCircuitPath;
const startTransitionCircuitPath = '../zksnarkBuild/startTransition_main.circom';
exports.startTransitionCircuitPath = startTransitionCircuitPath;
const processAttestationsCircuitPath = '../zksnarkBuild/processAttestations_main.circom';
exports.processAttestationsCircuitPath = processAttestationsCircuitPath;
const userStateTransitionCircuitPath = '../zksnarkBuild/userStateTransition_main.circom';
exports.userStateTransitionCircuitPath = userStateTransitionCircuitPath;