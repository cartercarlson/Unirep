import { ethers } from 'ethers'
import Keyv from 'keyv'
import { getUnirepContract, Event, AttestationEvent } from '@unirep/contracts'
import {
    hash5,
    hashLeftRight,
    IncrementalMerkleTree,
    SnarkBigInt,
    SparseMerkleTree,
} from '@unirep/crypto'

import {
    Attestation,
    IEpochTreeLeaf,
    ISettings,
    IUnirepState,
    UnirepState,
} from './UnirepState'
import { IUserState, IUserStateLeaf, Reputation, UserState } from './UserState'
import {
    EPOCH_KEY_NULLIFIER_DOMAIN,
    REPUTATION_NULLIFIER_DOMAIN,
} from '../config/nullifierDomainSeparator'
import {
    Circuit,
    formatProofForSnarkjsVerification,
    verifyProof,
} from '@unirep/circuits'
import { IAttestation } from '.'
import { DEFAULT_START_BLOCK } from '../cli/defaults'
import { EPOCH_TREE_DEPTH } from '@unirep/config'

const defaultUserStateLeaf = hash5([
    BigInt(0),
    BigInt(0),
    BigInt(0),
    BigInt(0),
    BigInt(0),
])
const SMT_ZERO_LEAF = hashLeftRight(BigInt(0), BigInt(0))
const SMT_ONE_LEAF = hashLeftRight(BigInt(1), BigInt(0))

const computeEmptyUserStateRoot = (treeDepth: number): BigInt => {
    const t = new IncrementalMerkleTree(treeDepth, defaultUserStateLeaf, 2)
    return t.root
}

const computeInitUserStateRoot = async (
    treeDepth: number,
    leafIdx?: number,
    airdropPosRep?: number
): Promise<BigInt> => {
    const t = await SparseMerkleTree.create(
        new Keyv(),
        treeDepth,
        defaultUserStateLeaf
    )
    if (leafIdx && airdropPosRep) {
        const airdropReputation = new Reputation(
            BigInt(airdropPosRep),
            BigInt(0),
            BigInt(0),
            BigInt(1)
        )
        const leafValue = airdropReputation.hash()
        await t.update(BigInt(leafIdx), leafValue)
    }
    return t.getRootHash()
}

const genEpochKey = (
    identityNullifier: SnarkBigInt,
    epoch: number,
    nonce: number,
    _epochTreeDepth: number = EPOCH_TREE_DEPTH
): SnarkBigInt => {
    const values: any[] = [
        identityNullifier,
        epoch,
        nonce,
        BigInt(0),
        BigInt(0),
    ]
    let epochKey = hash5(values).toString()
    // Adjust epoch key size according to epoch tree depth
    const epochKeyModed = BigInt(epochKey) % BigInt(2 ** _epochTreeDepth)
    return epochKeyModed
}

const genEpochKeyNullifier = (
    identityNullifier: SnarkBigInt,
    epoch: number,
    nonce: number
): SnarkBigInt => {
    return hash5([
        EPOCH_KEY_NULLIFIER_DOMAIN,
        identityNullifier,
        BigInt(epoch),
        BigInt(nonce),
        BigInt(0),
    ])
}

const genReputationNullifier = (
    identityNullifier: SnarkBigInt,
    epoch: number,
    nonce: number,
    attesterId: BigInt
): SnarkBigInt => {
    return hash5([
        REPUTATION_NULLIFIER_DOMAIN,
        identityNullifier,
        BigInt(epoch),
        BigInt(nonce),
        attesterId,
    ])
}

const genNewSMT = async (
    treeDepth: number,
    defaultLeafHash: BigInt
): Promise<SparseMerkleTree> => {
    return SparseMerkleTree.create(new Keyv(), treeDepth, defaultLeafHash)
}

const verifyEpochKeyProofEvent = async (
    event: ethers.Event
): Promise<boolean> => {
    const args = event?.args?.proof
    const emptyArray = []
    const formatPublicSignals = emptyArray
        .concat(args?.globalStateTree, args?.epoch, args?.epochKey)
        .map((n) => BigInt(n))
    const formatProof = formatProofForSnarkjsVerification(args?.proof)
    const isProofValid = await verifyProof(
        Circuit.verifyEpochKey,
        formatProof,
        formatPublicSignals
    )
    return isProofValid
}

const verifyReputationProofEvent = async (
    event: ethers.Event
): Promise<boolean> => {
    const args = event?.args?.proof
    const emptyArray = []
    const formatPublicSignals = emptyArray
        .concat(
            args?.repNullifiers,
            args?.epoch,
            args?.epochKey,
            args?.globalStateTree,
            args?.attesterId,
            args?.proveReputationAmount,
            args?.minRep,
            args?.proveGraffiti,
            args?.graffitiPreImage
        )
        .map((n) => BigInt(n))
    const formatProof = formatProofForSnarkjsVerification(args?.proof)
    const isProofValid = await verifyProof(
        Circuit.proveReputation,
        formatProof,
        formatPublicSignals
    )
    return isProofValid
}

const verifySignUpProofEvent = async (
    event: ethers.Event
): Promise<boolean> => {
    const args = event?.args?.proof
    const emptyArray = []
    const formatPublicSignals = emptyArray
        .concat(
            args?.epoch,
            args?.epochKey,
            args?.globalStateTree,
            args?.attesterId,
            args?.userHasSignedUp
        )
        .map((n) => BigInt(n))
    const formatProof = formatProofForSnarkjsVerification(args?.proof)
    const isProofValid = await verifyProof(
        Circuit.proveUserSignUp,
        formatProof,
        formatPublicSignals
    )
    return isProofValid
}

const verifyStartTransitionProofEvent = async (
    event: ethers.Event
): Promise<boolean> => {
    const args = event?.args
    const emptyArray = []
    const formatPublicSignals = emptyArray
        .concat(
            args?.blindedUserState,
            args?.blindedHashChain,
            args?.globalStateTree
        )
        .map((n) => BigInt(n))
    const formatProof = formatProofForSnarkjsVerification(args?.proof)
    const isProofValid = await verifyProof(
        Circuit.startTransition,
        formatProof,
        formatPublicSignals
    )
    return isProofValid
}

const verifyProcessAttestationEvent = async (
    event: ethers.Event
): Promise<boolean> => {
    const args = event?.args
    const emptyArray = []
    const formatPublicSignals = emptyArray
        .concat(
            args?.outputBlindedUserState,
            args?.outputBlindedHashChain,
            args?.inputBlindedUserState
        )
        .map((n) => BigInt(n))
    const formatProof = formatProofForSnarkjsVerification(args?.proof)
    const isProofValid = await verifyProof(
        Circuit.processAttestations,
        formatProof,
        formatPublicSignals
    )
    return isProofValid
}

const verifyUserStateTransitionEvent = async (
    event: ethers.Event
): Promise<boolean> => {
    const transitionArgs = event?.args?.proof
    const emptyArray = []
    let formatPublicSignals = emptyArray
        .concat(
            transitionArgs.newGlobalStateTreeLeaf,
            transitionArgs.epkNullifiers,
            transitionArgs.transitionFromEpoch,
            transitionArgs.blindedUserStates,
            transitionArgs.fromGlobalStateTree,
            transitionArgs.blindedHashChains,
            transitionArgs.fromEpochTree
        )
        .map((n) => BigInt(n))
    let formatProof = formatProofForSnarkjsVerification(transitionArgs.proof)
    const isProofValid = await verifyProof(
        Circuit.userStateTransition,
        formatProof,
        formatPublicSignals
    )
    return isProofValid
}

const verifyUSTEvents = async (
    transitionEvent: ethers.Event,
    startTransitionEvent: ethers.Event,
    processAttestationEvents: ethers.Event[]
): Promise<boolean> => {
    // verify the final UST proof
    const isValid = await verifyUserStateTransitionEvent(transitionEvent)
    if (!isValid) return false

    // verify the start transition proof
    const isStartTransitionProofValid = await verifyStartTransitionProofEvent(
        startTransitionEvent
    )
    if (!isStartTransitionProofValid) return false

    // verify process attestations proofs
    const transitionArgs = transitionEvent?.args?.proof
    const isProcessAttestationValid = await verifyProcessAttestationEvents(
        processAttestationEvents,
        transitionArgs.blindedUserStates[0],
        transitionArgs.blindedUserStates[1]
    )
    if (!isProcessAttestationValid) return false
    return true
}

const verifyProcessAttestationEvents = async (
    processAttestationEvents: ethers.Event[],
    startBlindedUserState: ethers.BigNumber,
    finalBlindedUserState: ethers.BigNumber
): Promise<boolean> => {
    let currentBlindedUserState = startBlindedUserState
    // The rest are process attestations proofs
    for (let i = 0; i < processAttestationEvents.length; i++) {
        const args = processAttestationEvents[i]?.args
        const isValid = await verifyProcessAttestationEvent(
            processAttestationEvents[i]
        )
        if (!isValid) return false
        currentBlindedUserState = args?.outputBlindedUserState
    }
    return currentBlindedUserState.eq(finalBlindedUserState)
}

const genUnirepStateFromParams = (_unirepState: IUnirepState) => {
    const parsedGSTLeaves = {}
    const parsedEpochTreeLeaves = {}
    const parsedNullifiers = {}
    const parsedAttestationsMap = {}

    for (let key in _unirepState.GSTLeaves) {
        parsedGSTLeaves[key] = _unirepState.GSTLeaves[key].map((n) => BigInt(n))
    }

    for (let key in _unirepState.epochTreeLeaves) {
        const leaves: IEpochTreeLeaf[] = []
        _unirepState.epochTreeLeaves[key].map((n) => {
            const splitStr = n.split(': ')
            const epochTreeLeaf: IEpochTreeLeaf = {
                epochKey: BigInt(splitStr[0]),
                hashchainResult: BigInt(splitStr[1]),
            }
            leaves.push(epochTreeLeaf)
        })
        parsedEpochTreeLeaves[key] = leaves
    }

    for (let n of _unirepState.nullifiers) {
        parsedNullifiers[n] = true
    }

    for (let key in _unirepState.latestEpochKeyToAttestationsMap) {
        const parsedAttestations: IAttestation[] = []
        for (const attestation of _unirepState.latestEpochKeyToAttestationsMap[
            key
        ]) {
            const jsonAttestation = JSON.parse(attestation)
            const attestClass = new Attestation(
                BigInt(jsonAttestation.attesterId),
                BigInt(jsonAttestation.posRep),
                BigInt(jsonAttestation.negRep),
                BigInt(jsonAttestation.graffiti),
                BigInt(jsonAttestation.signUp)
            )
            parsedAttestations.push(attestClass)
        }
        parsedAttestationsMap[key] = parsedAttestations
    }
    const unirepState = new UnirepState(
        _unirepState.settings,
        _unirepState.currentEpoch,
        _unirepState.latestProcessedBlock,
        parsedGSTLeaves,
        parsedEpochTreeLeaves,
        parsedAttestationsMap,
        parsedNullifiers
    )

    return unirepState
}

/*
 * Retrieves and parses on-chain Unirep contract data to create an off-chain
 * representation as a UnirepState object.
 * @param provider An Ethereum provider
 * @param address The address of the Unirep contract
 * @param startBlock The block number when Unirep contract is deployed
 */
const genUnirepStateFromContract = async (
    provider: ethers.providers.Provider,
    address: string,
    _unirepState?: IUnirepState
) => {
    const unirepContract = await getUnirepContract(address, provider)
    let unirepState: UnirepState

    if (_unirepState === undefined) {
        const treeDepths_ = await unirepContract.treeDepths()
        const globalStateTreeDepth = treeDepths_.globalStateTreeDepth
        const userStateTreeDepth = treeDepths_.userStateTreeDepth
        const epochTreeDepth = treeDepths_.epochTreeDepth

        const attestingFee = await unirepContract.attestingFee()
        const epochLength = await unirepContract.epochLength()
        const numEpochKeyNoncePerEpoch =
            await unirepContract.numEpochKeyNoncePerEpoch()
        const maxReputationBudget = await unirepContract.maxReputationBudget()

        const setting: ISettings = {
            globalStateTreeDepth: globalStateTreeDepth,
            userStateTreeDepth: userStateTreeDepth,
            epochTreeDepth: epochTreeDepth,
            attestingFee: attestingFee,
            epochLength: epochLength.toNumber(),
            numEpochKeyNoncePerEpoch: numEpochKeyNoncePerEpoch,
            maxReputationBudget: maxReputationBudget,
        }
        unirepState = new UnirepState(setting)
    } else {
        unirepState = genUnirepStateFromParams(_unirepState)
    }

    const latestBlock = _unirepState?.latestProcessedBlock
    const startBlock =
        latestBlock != undefined ? latestBlock + 1 : DEFAULT_START_BLOCK

    const UserSignedUpFilter = unirepContract.filters.UserSignedUp()
    const userSignedUpEvents = await unirepContract.queryFilter(
        UserSignedUpFilter,
        startBlock
    )

    const UserStateTransitionedFilter =
        unirepContract.filters.UserStateTransitioned()
    const userStateTransitionedEvents = await unirepContract.queryFilter(
        UserStateTransitionedFilter,
        startBlock
    )

    const attestationSubmittedFilter =
        unirepContract.filters.AttestationSubmitted()
    const attestationSubmittedEvents = await unirepContract.queryFilter(
        attestationSubmittedFilter,
        startBlock
    )

    const epochEndedFilter = unirepContract.filters.EpochEnded()
    const epochEndedEvents = await unirepContract.queryFilter(
        epochEndedFilter,
        startBlock
    )

    const sequencerFilter = unirepContract.filters.Sequencer()
    const sequencerEvents = await unirepContract.queryFilter(
        sequencerFilter,
        startBlock
    )

    // proof events
    const transitionFilter =
        unirepContract.filters.IndexedUserStateTransitionProof()
    const transitionEvents = await unirepContract.queryFilter(transitionFilter)

    const startTransitionFilter =
        unirepContract.filters.IndexedStartedTransitionProof()
    const startTransitionEvents = await unirepContract.queryFilter(
        startTransitionFilter
    )

    const processAttestationsFilter =
        unirepContract.filters.IndexedProcessedAttestationsProof()
    const processAttestationsEvents = await unirepContract.queryFilter(
        processAttestationsFilter
    )

    const epochKeyProofFilter = unirepContract.filters.IndexedEpochKeyProof()
    const epochKeyProofEvent = await unirepContract.queryFilter(
        epochKeyProofFilter
    )

    const repProofFilter = unirepContract.filters.IndexedReputationProof()
    const repProofEvent = await unirepContract.queryFilter(repProofFilter)

    const signUpProofFilter = unirepContract.filters.IndexedUserSignedUpProof()
    const signUpProofEvent = await unirepContract.queryFilter(signUpProofFilter)

    // Reverse the events so pop() can start from the first event
    userSignedUpEvents.reverse()
    attestationSubmittedEvents.reverse()
    epochEndedEvents.reverse()
    userStateTransitionedEvents.reverse()

    const proofIndexMap = {}
    const isProofIndexValid = {}
    const spentProofIndex = {}
    isProofIndexValid[0] = true
    const events = transitionEvents.concat(
        startTransitionEvents,
        processAttestationsEvents,
        epochKeyProofEvent,
        repProofEvent,
        signUpProofEvent
    )
    for (const event of events) {
        const proofIndex = Number(event?.args?.proofIndex)
        proofIndexMap[proofIndex] = event
    }

    for (let i = 0; i < sequencerEvents.length; i++) {
        const sequencerEvent = sequencerEvents[i]
        // console.log('Generating Unirep State progress: ', i, '/', sequencerEvents.length)
        const blockNumber = sequencerEvent.blockNumber
        if (blockNumber < startBlock) continue
        const occurredEvent = sequencerEvent.args?.userEvent
        if (occurredEvent === Event.UserSignedUp) {
            const signUpEvent = userSignedUpEvents.pop()
            if (signUpEvent === undefined) {
                console.log(
                    `Event sequence mismatch: missing UserSignedUp event`
                )
                continue
            }
            const args = signUpEvent?.args
            const epoch = Number(args?.epoch)
            const commitment = BigInt(args?.identityCommitment)
            const attesterId = Number(args?.attesterId)
            const airdrop = Number(args?.airdropAmount)

            await unirepState.signUp(
                epoch,
                commitment,
                attesterId,
                airdrop,
                blockNumber
            )
        } else if (occurredEvent === Event.AttestationSubmitted) {
            const attestationSubmittedEvent = attestationSubmittedEvents.pop()
            if (attestationSubmittedEvent === undefined) {
                console.log(
                    `Event sequence mismatch: missing AttestationSubmitted event`
                )
                continue
            }
            const args = attestationSubmittedEvent?.args
            const epoch = Number(args?.epoch)
            const toProofIndex = Number(args?.toProofIndex)
            const fromProofIndex = Number(args?.fromProofIndex)
            const attestation_ = args?.attestation
            const event = proofIndexMap[toProofIndex]
            const results = event?.args?.proof

            if (isProofIndexValid[toProofIndex] === undefined) {
                let isValid
                if (event.event === 'IndexedEpochKeyProof') {
                    isValid = await verifyEpochKeyProofEvent(event)
                } else if (event.event === 'IndexedReputationProof') {
                    isValid = await verifyReputationProofEvent(event)
                } else if (event.event === 'IndexedUserSignedUpProof') {
                    isValid = await verifySignUpProofEvent(event)
                } else {
                    console.log('Cannot find the attestation event')
                    continue
                }

                // verify the proof of the given proof index
                if (!isValid) {
                    console.log(
                        'Proof is invalid: ',
                        event.event,
                        ' , transaction hash: ',
                        event.transactionHash
                    )
                    isProofIndexValid[toProofIndex] = false
                    continue
                }

                // verify GSTRoot of the proof
                const isGSTRootExisted = unirepState.GSTRootExists(
                    results?.globalStateTree,
                    epoch
                )
                if (!isGSTRootExisted) {
                    console.log('Global state tree root does not exist')
                    isProofIndexValid[toProofIndex] = false
                    continue
                }

                // if it is SpendRepuation event, check the reputation nullifiers
                if (
                    args?.attestationEvent === AttestationEvent.SpendReputation
                ) {
                    let validNullifier = true
                    const nullifiers = results?.repNullifiers.map((n) =>
                        BigInt(n)
                    )
                    const nullifiersAmount = Number(
                        results?.proveReputationAmount
                    )
                    for (let j = 0; j < nullifiersAmount; j++) {
                        if (unirepState.nullifierExist(nullifiers[j])) {
                            console.log(
                                'duplicated nullifier',
                                BigInt(nullifiers[j]).toString()
                            )
                            validNullifier = false
                            break
                        }
                    }

                    if (validNullifier) {
                        for (let j = 0; j < nullifiersAmount; j++) {
                            unirepState.addReputationNullifiers(
                                nullifiers[j],
                                blockNumber
                            )
                        }
                    } else {
                        isProofIndexValid[toProofIndex] = false
                        continue
                    }
                }
                isProofIndexValid[toProofIndex] = true
            }
            if (fromProofIndex && isProofIndexValid[fromProofIndex]) {
                const fromEvent = proofIndexMap[fromProofIndex]
                if (fromEvent?.event !== 'IndexedReputationProof') {
                    console.log(
                        `The proof index ${fromProofIndex} is not a reputation proof`
                    )
                    continue
                }

                const proveReputationAmount = Number(
                    fromEvent?.args?.proof?.proveReputationAmount
                )
                const repInAttestation =
                    Number(attestation_.posRep) + Number(attestation_.negRep)
                if (proveReputationAmount < repInAttestation) {
                    console.log(
                        `The attestation requires ${repInAttestation} reputation`
                    )
                    continue
                }
            }
            if (fromProofIndex && spentProofIndex[fromProofIndex]) {
                console.log(
                    `The reputation proof index ${fromProofIndex} has been spent in other attestation`
                )
                continue
            }
            if (
                isProofIndexValid[toProofIndex] &&
                isProofIndexValid[fromProofIndex]
            ) {
                // update attestation
                const attestation = new Attestation(
                    BigInt(attestation_.attesterId),
                    BigInt(attestation_.posRep),
                    BigInt(attestation_.negRep),
                    BigInt(attestation_.graffiti),
                    BigInt(attestation_.signUp)
                )
                const epochKey = args?.epochKey
                if (epochKey.eq(results?.epochKey)) {
                    unirepState.addAttestation(
                        epochKey.toString(),
                        attestation,
                        blockNumber
                    )
                }
                if (fromProofIndex !== 0) spentProofIndex[fromProofIndex] = true
            }
        } else if (occurredEvent === Event.EpochEnded) {
            const epochEndedEvent = epochEndedEvents.pop()
            if (epochEndedEvent === undefined) {
                console.log(`Event sequence mismatch: missing epochEndedEvent`)
                continue
            }
            const epoch = epochEndedEvent.args?.epoch.toNumber()

            await unirepState.epochTransition(epoch, blockNumber)
        } else if (occurredEvent === Event.UserStateTransitioned) {
            const userStateTransitionedEvent = userStateTransitionedEvents.pop()
            if (userStateTransitionedEvent === undefined) {
                console.log(
                    `Event sequence mismatch: missing userStateTransitionedEvent`
                )
                continue
            }
            const args = userStateTransitionedEvent?.args
            const epoch = Number(args?.epoch)
            const newLeaf = BigInt(args?.hashedLeaf)
            const proofIndex = Number(args?.proofIndex)
            const event = proofIndexMap[proofIndex]
            const proofArgs = event?.args?.proof
            const fromEpoch = Number(proofArgs?.transitionFromEpoch)

            if (isProofIndexValid[proofIndex] === undefined) {
                let isValid = false
                if (event.event !== 'IndexedUserStateTransitionProof') {
                    isProofIndexValid[proofIndex] = false
                    continue
                }

                const proofIndexes = event?.args?.proofIndexRecords.map((n) =>
                    Number(n)
                )
                const startTransitionEvent = proofIndexMap[proofIndexes[0]]
                if (
                    startTransitionEvent === undefined ||
                    startTransitionEvent?.event !==
                        'IndexedStartedTransitionProof'
                ) {
                    isProofIndexValid[proofIndex] = false
                    continue
                }

                const processAttestationEvents: ethers.Event[] = []
                for (let j = 1; j < proofIndexes.length; j++) {
                    if (proofIndexes[j] === 0) isValid = false
                    const processAttestationEvent =
                        proofIndexMap[proofIndexes[j]]
                    if (
                        processAttestationEvent === undefined ||
                        processAttestationEvent?.event !==
                            'IndexedProcessedAttestationsProof'
                    ) {
                        isProofIndexValid[proofIndex] = false
                        continue
                    }
                    processAttestationEvents.push(processAttestationEvent)
                }
                isValid = await verifyUSTEvents(
                    event,
                    startTransitionEvent,
                    processAttestationEvents
                )
                if (!isValid) {
                    console.log(
                        'Proof is invalid: ',
                        event.event,
                        ' , transaction hash: ',
                        event.transactionHash
                    )
                    isProofIndexValid[proofIndex] = false
                    continue
                }

                const GSTRoot = proofArgs?.fromGlobalStateTree
                // check if GST root matches
                const isGSTRootExisted = unirepState.GSTRootExists(
                    GSTRoot,
                    fromEpoch
                )
                if (!isGSTRootExisted) {
                    console.log('Global state tree root does not exist')
                    isProofIndexValid[proofIndex] = false
                    continue
                }

                // Check if epoch tree root matches
                const epochTreeRoot = proofArgs?.fromEpochTree
                const isEpochTreeExisted =
                    await unirepState.epochTreeRootExists(
                        epochTreeRoot,
                        fromEpoch
                    )
                if (!isEpochTreeExisted) {
                    console.log('Epoch tree root mismatches')
                    isProofIndexValid[proofIndex] = false
                    continue
                }
                isProofIndexValid[proofIndex] = true
            }

            if (isProofIndexValid[proofIndex]) {
                const epkNullifiersInEvent = proofArgs?.epkNullifiers?.map(
                    (n) => BigInt(n)
                )
                let exist = false
                for (let nullifier of epkNullifiersInEvent) {
                    if (unirepState.nullifierExist(nullifier)) {
                        console.log(
                            'duplicated nullifier',
                            nullifier.toString()
                        )
                        exist = true
                        break
                    }
                }
                if (!exist) {
                    unirepState.userStateTransition(
                        fromEpoch,
                        newLeaf,
                        epkNullifiersInEvent,
                        blockNumber
                    )
                }
            }
        } else {
            console.log('unexpected event', occurredEvent)
        }
    }
    return unirepState
}

/*
 * Create UserState object from given user state and
 * retrieves and parses on-chain Unirep contract data to create an off-chain
 * representation as a UserState object (including UnirepState object).
 * (This assumes user has already signed up in the Unirep contract)
 * @param userIdentity The semaphore identity of the user
 * @param _userState The stored user state that the function start with
 */
const genUserStateFromParams = (userIdentity: any, _userState: IUserState) => {
    const unirepState = genUnirepStateFromParams(_userState.unirepState)
    const userStateLeaves: IUserStateLeaf[] = []
    const transitionedFromAttestations: { [key: string]: IAttestation[] } = {}
    for (const key in _userState.latestUserStateLeaves) {
        const parsedLeaf = JSON.parse(_userState.latestUserStateLeaves[key])
        const leaf: IUserStateLeaf = {
            attesterId: BigInt(key),
            reputation: new Reputation(
                BigInt(parsedLeaf.posRep),
                BigInt(parsedLeaf.negRep),
                BigInt(parsedLeaf.graffiti),
                BigInt(parsedLeaf.signUp)
            ),
        }
        userStateLeaves.push(leaf)
    }
    for (const key in _userState.transitionedFromAttestations) {
        transitionedFromAttestations[key] = []
        for (const attest of _userState.transitionedFromAttestations[key]) {
            const parsedAttest = JSON.parse(attest)
            const attestation: IAttestation = new Attestation(
                BigInt(parsedAttest.attesterId),
                BigInt(parsedAttest.posRep),
                BigInt(parsedAttest.negRep),
                BigInt(parsedAttest.graffiti),
                BigInt(parsedAttest.signUp)
            )
            transitionedFromAttestations[key].push(attestation)
        }
    }
    const userState = new UserState(
        unirepState,
        userIdentity,
        _userState.hasSignedUp,
        _userState.latestTransitionedEpoch,
        _userState.latestGSTLeafIndex,
        userStateLeaves,
        transitionedFromAttestations
    )
    return userState
}

/*
 * This function works mostly the same as genUnirepStateFromContract,
 * except that it also updates the user's state during events processing.
 * @param provider An Ethereum provider
 * @param address The address of the Unirep contract
 * @param userIdentity The semaphore identity of the user
 * @param _userState The stored user state that the function start with
 */
const genUserStateFromContract = async (
    provider: ethers.providers.Provider,
    address: string,
    userIdentity: any,
    _userState?: IUserState
) => {
    const unirepContract = await getUnirepContract(address, provider)

    let unirepState: UnirepState
    let userState: UserState

    if (_userState === undefined) {
        const treeDepths_ = await unirepContract.treeDepths()
        const globalStateTreeDepth = treeDepths_.globalStateTreeDepth
        const userStateTreeDepth = treeDepths_.userStateTreeDepth
        const epochTreeDepth = treeDepths_.epochTreeDepth

        const attestingFee = await unirepContract.attestingFee()
        const epochLength = await unirepContract.epochLength()
        const numEpochKeyNoncePerEpoch =
            await unirepContract.numEpochKeyNoncePerEpoch()
        const maxReputationBudget = await unirepContract.maxReputationBudget()

        const setting: ISettings = {
            globalStateTreeDepth: globalStateTreeDepth,
            userStateTreeDepth: userStateTreeDepth,
            epochTreeDepth: epochTreeDepth,
            attestingFee: attestingFee,
            epochLength: epochLength.toNumber(),
            numEpochKeyNoncePerEpoch: numEpochKeyNoncePerEpoch,
            maxReputationBudget: maxReputationBudget,
        }
        unirepState = new UnirepState(setting)
        userState = new UserState(unirepState, userIdentity)
    } else {
        userState = genUserStateFromParams(userIdentity, _userState)
        unirepState = userState.getUnirepState()
    }

    const latestBlock = unirepState?.latestProcessedBlock
    const startBlock =
        latestBlock != undefined ? latestBlock + 1 : DEFAULT_START_BLOCK

    const UserSignedUpFilter = unirepContract.filters.UserSignedUp()
    const userSignedUpEvents = await unirepContract.queryFilter(
        UserSignedUpFilter,
        startBlock
    )

    const UserStateTransitionedFilter =
        unirepContract.filters.UserStateTransitioned()
    const userStateTransitionedEvents = await unirepContract.queryFilter(
        UserStateTransitionedFilter,
        startBlock
    )

    const attestationSubmittedFilter =
        unirepContract.filters.AttestationSubmitted()
    const attestationSubmittedEvents = await unirepContract.queryFilter(
        attestationSubmittedFilter,
        startBlock
    )

    const epochEndedFilter = unirepContract.filters.EpochEnded()
    const epochEndedEvents = await unirepContract.queryFilter(
        epochEndedFilter,
        startBlock
    )

    const sequencerFilter = unirepContract.filters.Sequencer()
    const sequencerEvents = await unirepContract.queryFilter(
        sequencerFilter,
        startBlock
    )

    // proof events
    const transitionFilter =
        unirepContract.filters.IndexedUserStateTransitionProof()
    const transitionEvents = await unirepContract.queryFilter(transitionFilter)

    const startTransitionFilter =
        unirepContract.filters.IndexedStartedTransitionProof()
    const startTransitionEvents = await unirepContract.queryFilter(
        startTransitionFilter
    )

    const processAttestationsFilter =
        unirepContract.filters.IndexedProcessedAttestationsProof()
    const processAttestationsEvents = await unirepContract.queryFilter(
        processAttestationsFilter
    )

    const epochKeyProofFilter = unirepContract.filters.IndexedEpochKeyProof()
    const epochKeyProofEvent = await unirepContract.queryFilter(
        epochKeyProofFilter
    )

    const repProofFilter = unirepContract.filters.IndexedReputationProof()
    const repProofEvent = await unirepContract.queryFilter(repProofFilter)

    const signUpProofFilter = unirepContract.filters.IndexedUserSignedUpProof()
    const signUpProofEvent = await unirepContract.queryFilter(signUpProofFilter)

    // Reverse the events so pop() can start from the first event
    userSignedUpEvents.reverse()
    attestationSubmittedEvents.reverse()
    epochEndedEvents.reverse()
    userStateTransitionedEvents.reverse()

    const proofIndexMap = {}
    const isProofIndexValid = {}
    const spentProofIndex = {}
    isProofIndexValid[0] = true
    const events = transitionEvents.concat(
        startTransitionEvents,
        processAttestationsEvents,
        epochKeyProofEvent,
        repProofEvent,
        signUpProofEvent
    )
    for (const event of events) {
        const proofIndex = Number(event?.args?.proofIndex)
        proofIndexMap[proofIndex] = event
    }

    for (let i = 0; i < sequencerEvents.length; i++) {
        // console.log('Generating User State progress: ', i, '/', sequencerEvents.length)
        const sequencerEvent = sequencerEvents[i]
        const blockNumber = sequencerEvent.blockNumber
        if (blockNumber < startBlock) continue
        const occurredEvent = sequencerEvent.args?.userEvent
        if (occurredEvent === Event.UserSignedUp) {
            const signUpEvent = userSignedUpEvents.pop()
            if (signUpEvent === undefined) {
                console.log(
                    `Event sequence mismatch: missing UserSignedUp event`
                )
                continue
            }
            const args = signUpEvent?.args
            const epoch = Number(args?.epoch)
            const commitment = BigInt(args?.identityCommitment)
            const attesterId = Number(args?.attesterId)
            const airdrop = Number(args?.airdropAmount)

            await userState.signUp(
                epoch,
                commitment,
                attesterId,
                airdrop,
                blockNumber
            )
        } else if (occurredEvent === Event.AttestationSubmitted) {
            const attestationSubmittedEvent = attestationSubmittedEvents.pop()
            if (attestationSubmittedEvent === undefined) {
                console.log(
                    `Event sequence mismatch: missing AttestationSubmitted event`
                )
                continue
            }
            const args = attestationSubmittedEvent?.args
            const epoch = Number(args?.epoch)
            const toProofIndex = Number(args?.toProofIndex)
            const fromProofIndex = Number(args?.fromProofIndex)
            const attestation_ = args?.attestation
            const event = proofIndexMap[toProofIndex]
            const results = event?.args?.proof

            if (isProofIndexValid[toProofIndex] === undefined) {
                let isValid
                if (event.event === 'IndexedEpochKeyProof') {
                    isValid = await verifyEpochKeyProofEvent(event)
                } else if (event.event === 'IndexedReputationProof') {
                    isValid = await verifyReputationProofEvent(event)
                } else if (event.event === 'IndexedUserSignedUpProof') {
                    isValid = await verifySignUpProofEvent(event)
                } else {
                    console.log('Cannot find the attestation event')
                    continue
                }

                // verify the proof of the given proof index
                if (!isValid) {
                    console.log(
                        'Proof is invalid: ',
                        event.event,
                        ' , transaction hash: ',
                        event.transactionHash
                    )
                    isProofIndexValid[toProofIndex] = false
                    continue
                }

                // verify GSTRoot of the proof
                const isGSTRootExisted = userState.GSTRootExists(
                    results?.globalStateTree,
                    epoch
                )
                if (!isGSTRootExisted) {
                    console.log('Global state tree root does not exist')
                    isProofIndexValid[toProofIndex] = false
                    continue
                }

                // if it is SpendRepuation event, check the reputation nullifiers
                if (
                    args?.attestationEvent === AttestationEvent.SpendReputation
                ) {
                    let validNullifier = true
                    const nullifiers = results?.repNullifiers.map((n) =>
                        BigInt(n)
                    )
                    const nullifiersAmount = Number(
                        results?.proveReputationAmount
                    )
                    for (let j = 0; j < nullifiersAmount; j++) {
                        if (userState.nullifierExist(nullifiers[j])) {
                            console.log(
                                'duplicated nullifier',
                                BigInt(nullifiers[j]).toString()
                            )
                            validNullifier = false
                            break
                        }
                    }

                    if (validNullifier) {
                        for (let j = 0; j < nullifiersAmount; j++) {
                            userState.addReputationNullifiers(
                                nullifiers[j],
                                blockNumber
                            )
                        }
                    } else {
                        isProofIndexValid[toProofIndex] = false
                        continue
                    }
                }
                isProofIndexValid[toProofIndex] = true
            }
            if (fromProofIndex && isProofIndexValid[fromProofIndex]) {
                const fromEvent = proofIndexMap[fromProofIndex]
                if (fromEvent?.event !== 'IndexedReputationProof') {
                    console.log(
                        `The proof index ${fromProofIndex} is not a reputation proof`
                    )
                    continue
                }

                const proveReputationAmount = Number(
                    fromEvent?.args?.proof?.proveReputationAmount
                )
                const repInAttestation =
                    Number(attestation_.posRep) + Number(attestation_.negRep)
                if (proveReputationAmount < repInAttestation) {
                    console.log(
                        `The attestation requires ${repInAttestation} reputation`
                    )
                    continue
                }
            }
            if (fromProofIndex && spentProofIndex[fromProofIndex]) {
                console.log(
                    `The reputation proof index ${fromProofIndex} has been spent in other attestation`
                )
                continue
            }
            if (
                isProofIndexValid[toProofIndex] &&
                isProofIndexValid[fromProofIndex]
            ) {
                // update attestation
                const attestation = new Attestation(
                    BigInt(attestation_.attesterId),
                    BigInt(attestation_.posRep),
                    BigInt(attestation_.negRep),
                    BigInt(attestation_.graffiti),
                    BigInt(attestation_.signUp)
                )
                const epochKey = args?.epochKey
                if (epochKey.eq(results?.epochKey)) {
                    userState.addAttestation(
                        epochKey.toString(),
                        attestation,
                        blockNumber
                    )
                }
                if (fromProofIndex !== 0) spentProofIndex[fromProofIndex] = true
            }
        } else if (occurredEvent === Event.EpochEnded) {
            const epochEndedEvent = epochEndedEvents.pop()
            if (epochEndedEvent === undefined) {
                console.log(`Event sequence mismatch: missing epochEndedEvent`)
                continue
            }
            const epoch = epochEndedEvent.args?.epoch.toNumber()

            await userState.epochTransition(epoch, blockNumber)
        } else if (occurredEvent === Event.UserStateTransitioned) {
            const userStateTransitionedEvent = userStateTransitionedEvents.pop()
            if (userStateTransitionedEvent === undefined) {
                console.log(
                    `Event sequence mismatch: missing userStateTransitionedEvent`
                )
                continue
            }
            const args = userStateTransitionedEvent?.args
            const epoch = Number(args?.epoch)
            const newLeaf = BigInt(args?.hashedLeaf)
            const proofIndex = Number(args?.proofIndex)
            const event = proofIndexMap[proofIndex]
            const proofArgs = event?.args?.proof
            const fromEpoch = Number(proofArgs?.transitionFromEpoch)

            if (isProofIndexValid[proofIndex] === undefined) {
                let isValid = false
                if (event.event !== 'IndexedUserStateTransitionProof') {
                    isProofIndexValid[proofIndex] = false
                    continue
                }

                const proofIndexes = event?.args?.proofIndexRecords.map((n) =>
                    Number(n)
                )
                const startTransitionEvent = proofIndexMap[proofIndexes[0]]
                if (
                    startTransitionEvent === undefined ||
                    startTransitionEvent?.event !==
                        'IndexedStartedTransitionProof'
                ) {
                    isProofIndexValid[proofIndex] = false
                    continue
                }

                const processAttestationEvents: ethers.Event[] = []
                for (let j = 1; j < proofIndexes.length; j++) {
                    if (proofIndexes[j] === 0) isValid = false
                    const processAttestationEvent =
                        proofIndexMap[proofIndexes[j]]
                    if (
                        processAttestationEvent === undefined ||
                        processAttestationEvent?.event !==
                            'IndexedProcessedAttestationsProof'
                    ) {
                        isProofIndexValid[proofIndex] = false
                        continue
                    }
                    processAttestationEvents.push(processAttestationEvent)
                }
                isValid = await verifyUSTEvents(
                    event,
                    startTransitionEvent,
                    processAttestationEvents
                )
                if (!isValid) {
                    console.log(
                        'Proof is invalid: ',
                        event.event,
                        ' , transaction hash: ',
                        event.transactionHash
                    )
                    isProofIndexValid[proofIndex] = false
                    continue
                }

                const GSTRoot = proofArgs?.fromGlobalStateTree
                // check if GST root matches
                const isGSTRootExisted = userState.GSTRootExists(
                    GSTRoot,
                    fromEpoch
                )
                if (!isGSTRootExisted) {
                    console.log('Global state tree root does not exist')
                    isProofIndexValid[proofIndex] = false
                    continue
                }

                // Check if epoch tree root matches
                const epochTreeRoot = proofArgs?.fromEpochTree
                const isEpochTreeExisted = await userState.epochTreeRootExists(
                    epochTreeRoot,
                    fromEpoch
                )
                if (!isEpochTreeExisted) {
                    console.log('Epoch tree root mismatches')
                    isProofIndexValid[proofIndex] = false
                    continue
                }
                isProofIndexValid[proofIndex] = true
            }

            if (isProofIndexValid[proofIndex]) {
                const epkNullifiersInEvent = proofArgs?.epkNullifiers?.map(
                    (n) => BigInt(n)
                )
                let exist = false
                for (let nullifier of epkNullifiersInEvent) {
                    if (userState.nullifierExist(nullifier)) {
                        console.log(
                            'duplicated nullifier',
                            nullifier.toString()
                        )
                        exist = true
                        break
                    }
                }
                if (!exist) {
                    await userState.userStateTransition(
                        fromEpoch,
                        newLeaf,
                        epkNullifiersInEvent,
                        blockNumber
                    )
                }
            }
        } else {
            console.log('unexpected event', occurredEvent)
        }
    }
    return userState
}

export {
    defaultUserStateLeaf,
    SMT_ONE_LEAF,
    SMT_ZERO_LEAF,
    computeEmptyUserStateRoot,
    computeInitUserStateRoot,
    formatProofForSnarkjsVerification,
    verifyEpochKeyProofEvent,
    verifyReputationProofEvent,
    verifySignUpProofEvent,
    verifyStartTransitionProofEvent,
    verifyProcessAttestationEvent,
    verifyProcessAttestationEvents,
    verifyUserStateTransitionEvent,
    verifyUSTEvents,
    genEpochKey,
    genEpochKeyNullifier,
    genReputationNullifier,
    genNewSMT,
    genUnirepStateFromContract,
    genUnirepStateFromParams,
    genUserStateFromContract,
    genUserStateFromParams,
}
