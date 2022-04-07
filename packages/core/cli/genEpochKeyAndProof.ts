import base64url from 'base64url'
import { Strategy, ZkIdentity } from '@unirep/crypto'
import {
    Circuit,
    formatProofForVerifierContract,
    verifyProof,
} from '@unirep/circuits'
import { NUM_EPOCH_KEY_NONCE_PER_EPOCH } from '@unirep/config'

import { DEFAULT_ETH_PROVIDER } from './defaults'
import {
    genUserStateFromContract,
    genEpochKey,
} from '../src'
import {
    epkProofPrefix,
    epkPublicSignalsPrefix,
    identityPrefix,
} from './prefix'
import { getProvider } from './utils'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser('genEpochKeyAndProof', {
        add_help: true,
    })

    parser.add_argument('-e', '--eth-provider', {
        action: 'store',
        type: 'str',
        help: `A connection string to an Ethereum provider. Default: ${DEFAULT_ETH_PROVIDER}`,
    })

    parser.add_argument('-id', '--identity', {
        required: true,
        type: 'str',
        help: "The (serialized) user's identity",
    })

    parser.add_argument('-n', '--epoch-key-nonce', {
        required: true,
        type: 'int',
        help: 'The epoch key nonce',
    })

    parser.add_argument('-x', '--contract', {
        required: true,
        type: 'str',
        help: 'The Unirep contract address',
    })

    parser.add_argument("-w", "--write", {
        required: false, 
        type: 'str', 
        help: "The path to file save proof"
    })
}

const genEpochKeyAndProof = async (args: any) => {
    // Ethereum provider
    const ethProvider = args.eth_provider
        ? args.eth_provider
        : DEFAULT_ETH_PROVIDER
    const provider = getProvider(ethProvider)

    // Validate epoch key nonce
    const epkNonce = args.epoch_key_nonce
    const numEpochKeyNoncePerEpoch = NUM_EPOCH_KEY_NONCE_PER_EPOCH
    if (epkNonce >= numEpochKeyNoncePerEpoch) {
        console.error(
            'Error: epoch key nonce must be less than max epoch key nonce'
        )
        return
    }

    // Gen epoch key
    const encodedIdentity = args.identity.slice(identityPrefix.length)
    const decodedIdentity = base64url.decode(encodedIdentity)
    const id = new ZkIdentity(Strategy.SERIALIZED, decodedIdentity)

    // Gen User State
    const userState = await genUserStateFromContract(
        provider,
        args.contract,
        id
    )
    const results = await userState.genVerifyEpochKeyProof(epkNonce)
    const currentEpoch = userState.getUnirepStateCurrentEpoch()
    const epk = genEpochKey(
        id.getNullifier(),
        currentEpoch,
        epkNonce,
    ).toString()

    // TODO: Not sure if this validation is necessary
    const isValid = await verifyProof(
        Circuit.verifyEpochKey,
        results.proof,
        results.publicSignals
    )
    if (!isValid) {
        console.error('Error: epoch key proof generated is not valid!')
        return
    }

    const formattedProof = formatProofForVerifierContract(results.proof)
    const encodedProof = base64url.encode(JSON.stringify(formattedProof))
    const encodedPublicSignals = base64url.encode(
        JSON.stringify(results.publicSignals)
    )
    console.log(
        `Epoch key of epoch ${currentEpoch} and nonce ${epkNonce}: ${epk}`
    )

    const filename = args.write ?? "./epoch_key_and_proof.json";

    const proofEncode = epkProofPrefix + encodedProof;
    const epkPublicSignalsEncode = epkPublicSignalsPrefix + encodedPublicSignals;
        console.log(proofEncode)
        console.log(epkPublicSignalsEncode);
}

export { genEpochKeyAndProof, configureSubparser }
