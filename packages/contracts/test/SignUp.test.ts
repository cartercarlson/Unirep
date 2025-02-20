// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { expect } from 'chai'
import { ZkIdentity } from '@unirep/crypto'

import { deployUnirep } from '../src'
import { getTreeDepthsForTesting } from './utils'
import {
    ATTESTTING_FEE,
    EPOCH_LENGTH,
    EPOCH_TREE_DEPTH,
    GLOBAL_STATE_TREE_DEPTH,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
    USER_STATE_TREE_DEPTH,
} from '@unirep/config'

describe('Signup', () => {
    const testMaxUser = 5
    let unirepContract
    let accounts: ethers.Signer[]

    let signedUpUsers = 0
    let signedUpAttesters = 0

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        const _treeDepths = getTreeDepthsForTesting()
        // Set maxUsers to testMaxUser
        const _settings = {
            maxUsers: testMaxUser,
            maxAttesters: testMaxUser,
        }
        unirepContract = await deployUnirep(
            <ethers.Wallet>accounts[0],
            _treeDepths,
            _settings
        )
    })

    it('should have the correct config value', async () => {
        const attestingFee_ = await unirepContract.attestingFee()
        expect(ATTESTTING_FEE).equal(attestingFee_)
        const epochLength_ = await unirepContract.epochLength()
        expect(EPOCH_LENGTH).equal(epochLength_)
        const numEpochKeyNoncePerEpoch_ =
            await unirepContract.numEpochKeyNoncePerEpoch()
        expect(NUM_EPOCH_KEY_NONCE_PER_EPOCH).equal(numEpochKeyNoncePerEpoch_)
        const maxUsers_ = await unirepContract.maxUsers()
        expect(testMaxUser).equal(maxUsers_)

        const treeDepths_ = await unirepContract.treeDepths()
        expect(EPOCH_TREE_DEPTH).equal(treeDepths_.epochTreeDepth)
        expect(GLOBAL_STATE_TREE_DEPTH).equal(treeDepths_.globalStateTreeDepth)
        expect(USER_STATE_TREE_DEPTH).equal(treeDepths_.userStateTreeDepth)
    })

    describe('User sign-ups', () => {
        const id = new ZkIdentity()
        const commitment = id.genIdentityCommitment()

        it('sign up should succeed', async () => {
            const tx = await unirepContract.userSignUp(commitment)
            const receipt = await tx.wait()

            expect(receipt.status).equal(1)
            signedUpUsers++

            const numUserSignUps_ = await unirepContract.numUserSignUps()
            expect(signedUpUsers).equal(numUserSignUps_)
        })

        it('double sign up should fail', async () => {
            await expect(
                unirepContract.userSignUp(commitment)
            ).to.be.revertedWith('Unirep: the user has already signed up')
        })

        it('sign up should fail if max capacity reached', async () => {
            for (let i = 1; i < testMaxUser; i++) {
                let tx = await unirepContract.userSignUp(
                    new ZkIdentity().genIdentityCommitment()
                )
                let receipt = await tx.wait()
                expect(receipt.status).equal(1)
                signedUpUsers++

                const numUserSignUps_ = await unirepContract.numUserSignUps()
                expect(signedUpUsers).equal(numUserSignUps_)
            }
            await expect(
                unirepContract.userSignUp(
                    new ZkIdentity().genIdentityCommitment()
                )
            ).to.be.revertedWith(
                'Unirep: maximum number of user signups reached'
            )
        })
    })

    describe('Attester sign-ups', () => {
        let attester
        let attesterAddress
        let attester2
        let attester2Address
        let attester2Sig
        let unirepContractCalledByAttester

        it('sign up should succeed', async () => {
            attester = accounts[1]
            attesterAddress = await attester.getAddress()
            unirepContractCalledByAttester = unirepContract.connect(attester)
            const tx = await unirepContractCalledByAttester.attesterSignUp()
            const receipt = await tx.wait()

            expect(receipt.status).equal(1)
            signedUpAttesters++

            const attesterId = await unirepContract.attesters(attesterAddress)
            expect(signedUpAttesters).equal(attesterId)
            const nextAttesterId_ = await unirepContract.nextAttesterId()
            // nextAttesterId starts with 1 so now it should be 2
            expect(signedUpAttesters + 1).equal(nextAttesterId_)
        })

        it('sign up via relayer should succeed', async () => {
            let relayer = accounts[0]
            unirepContract.connect(relayer)
            attester2 = accounts[2]
            attester2Address = await attester2.getAddress()

            let message = ethers.utils.solidityKeccak256(
                ['address', 'address'],
                [attester2Address, unirepContract.address]
            )
            attester2Sig = await attester2.signMessage(
                ethers.utils.arrayify(message)
            )
            const tx = await unirepContract.attesterSignUpViaRelayer(
                attester2Address,
                attester2Sig
            )
            const receipt = await tx.wait()

            expect(receipt.status).equal(1)
            signedUpAttesters++

            const attesterId = await unirepContract.attesters(attester2Address)
            expect(signedUpAttesters).equal(attesterId)
            const nextAttesterId_ = await unirepContract.nextAttesterId()
            expect(signedUpAttesters + 1).equal(nextAttesterId_)
        })

        it('sign up with invalid signature should fail', async () => {
            let attester3 = accounts[3]
            let attester3Address = await attester3.getAddress()
            await expect(
                unirepContract.attesterSignUpViaRelayer(
                    attester3Address,
                    attester2Sig
                )
            ).to.be.revertedWith('Unirep: invalid attester sign up signature')
        })

        it('double sign up should fail', async () => {
            await expect(
                unirepContractCalledByAttester.attesterSignUp()
            ).to.be.revertedWith('Unirep: attester has already signed up')

            await expect(
                unirepContract.attesterSignUpViaRelayer(
                    attester2Address,
                    attester2Sig
                )
            ).to.be.revertedWith('Unirep: attester has already signed up')
        })

        it('sign up should fail if max capacity reached', async () => {
            for (let i = 3; i < testMaxUser; i++) {
                attester = accounts[i]
                attesterAddress = await attester.getAddress()
                unirepContractCalledByAttester =
                    unirepContract.connect(attester)
                const tx = await unirepContractCalledByAttester.attesterSignUp()
                const receipt = await tx.wait()
                expect(receipt.status).equal(1)
                signedUpAttesters++

                const attesterId = await unirepContract.attesters(
                    attesterAddress
                )
                expect(signedUpAttesters).equal(attesterId)
                const nextAttesterId_ = await unirepContract.nextAttesterId()
                expect(signedUpAttesters + 1).equal(nextAttesterId_)
            }
            attester = accounts[5]
            attesterAddress = await attester.getAddress()
            unirepContractCalledByAttester = unirepContract.connect(attester)
            await expect(
                unirepContractCalledByAttester.attesterSignUp()
            ).to.be.revertedWith(
                'Unirep: maximum number of attester signups reached'
            )
        })
    })
})
