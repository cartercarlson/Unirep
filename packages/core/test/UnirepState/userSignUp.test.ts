// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { expect } from 'chai'
import { ZkIdentity, hashLeftRight } from '@unirep/crypto'
import { deployUnirep } from '@unirep/contracts'
import {
    computeInitUserStateRoot,
    genUnirepStateFromContract,
    Reputation,
} from '../../src'
import { genNewGST, getTreeDepthsForTesting } from '../utils'

describe('User sign up events in Unirep State', function () {
    this.timeout(0)

    let userIds: any[] = []
    let userCommitments: BigInt[] = []
    let userStateTreeRoots: BigInt[] = []
    let signUpAirdrops: Reputation[] = []

    let unirepContract: ethers.Contract
    let unirepContractCalledByAttester: ethers.Contract
    let _treeDepths = getTreeDepthsForTesting()

    let accounts: ethers.Signer[]
    const attester = new Object()
    const maxUsers = 10
    const userNum = Math.ceil(Math.random() * maxUsers)

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        const _settings = {
            maxUsers,
        }
        unirepContract = await deployUnirep(
            <ethers.Wallet>accounts[0],
            _treeDepths,
            _settings
        )
    })

    describe('Attester sign up and set airdrop', async () => {
        it('attester sign up', async () => {
            attester['acct'] = accounts[2]
            attester['addr'] = await attester['acct'].getAddress()
            unirepContractCalledByAttester = unirepContract.connect(
                attester['acct']
            )
            let tx = await unirepContractCalledByAttester.attesterSignUp()
            let receipt = await tx.wait()
            expect(receipt.status, 'Attester signs up failed').to.equal(1)
        })

        it('attester set airdrop amount', async () => {
            const airdropPosRep = 10
            const tx = await unirepContractCalledByAttester.setAirdropAmount(
                airdropPosRep
            )
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)
            const airdroppedAmount = await unirepContract.airdropAmount(
                attester['addr']
            )
            expect(airdroppedAmount.toNumber()).equal(airdropPosRep)
        })
    })

    describe('Init Unirep State', async () => {
        it('check Unirep state matches the contract', async () => {
            const initUnirepState = await genUnirepStateFromContract(
                hardhatEthers.provider,
                unirepContract.address
            )

            const contractEpoch = await unirepContract.currentEpoch()
            const unirepEpoch = initUnirepState.currentEpoch
            expect(unirepEpoch).equal(Number(contractEpoch))

            const unirepGSTLeaves = initUnirepState.getNumGSTLeaves(unirepEpoch)
            expect(unirepGSTLeaves).equal(0)

            const unirepGSTree = initUnirepState.genGSTree(unirepEpoch)
            const defaultGSTree = genNewGST(
                _treeDepths.globalStateTreeDepth,
                _treeDepths.userStateTreeDepth
            )
            expect(unirepGSTree.root).equal(defaultGSTree.root)
        })
    })

    describe('User Sign Up event', async () => {
        const GSTree = genNewGST(
            _treeDepths.globalStateTreeDepth,
            _treeDepths.userStateTreeDepth
        )
        const rootHistories: BigInt[] = []

        it('sign up users through attester who sets airdrop', async () => {
            for (let i = 0; i < userNum; i++) {
                const id = new ZkIdentity()
                const commitment = id.genIdentityCommitment()
                userIds.push(id)
                userCommitments.push(commitment)

                const tx = await unirepContractCalledByAttester.userSignUp(
                    commitment
                )
                const receipt = await tx.wait()
                expect(receipt.status, 'User sign up failed').to.equal(1)

                await expect(
                    unirepContractCalledByAttester.userSignUp(commitment)
                ).to.be.revertedWith('Unirep: the user has already signed up')

                const unirepState = await genUnirepStateFromContract(
                    hardhatEthers.provider,
                    unirepContract.address
                )

                const contractEpoch = await unirepContract.currentEpoch()
                const unirepEpoch = unirepState.currentEpoch
                expect(unirepEpoch).equal(Number(contractEpoch))

                const unirepGSTLeaves = unirepState.getNumGSTLeaves(unirepEpoch)
                expect(unirepGSTLeaves).equal(i + 1)

                const attesterId = await unirepContract.attesters(
                    attester['addr']
                )
                const airdroppedAmount = await unirepContract.airdropAmount(
                    attester['addr']
                )
                const newUSTRoot = await computeInitUserStateRoot(
                    _treeDepths.userStateTreeDepth,
                    Number(attesterId),
                    Number(airdroppedAmount)
                )
                const newGSTLeaf = hashLeftRight(commitment, newUSTRoot)
                userStateTreeRoots.push(newUSTRoot)
                signUpAirdrops.push(
                    new Reputation(
                        BigInt(airdroppedAmount),
                        BigInt(0),
                        BigInt(0),
                        BigInt(1)
                    )
                )
                GSTree.insert(newGSTLeaf)
                rootHistories.push(GSTree.root)
            }
        })

        it('sign up users with no airdrop', async () => {
            for (let i = 0; i < maxUsers - userNum; i++) {
                const id = new ZkIdentity()
                const commitment = id.genIdentityCommitment()
                userIds.push(id)
                userCommitments.push(commitment)

                const tx = await unirepContract.userSignUp(commitment)
                const receipt = await tx.wait()
                expect(receipt.status, 'User sign up failed').to.equal(1)

                const unirepState = await genUnirepStateFromContract(
                    hardhatEthers.provider,
                    unirepContract.address
                )

                const contractEpoch = await unirepContract.currentEpoch()
                const unirepEpoch = unirepState.currentEpoch
                expect(unirepEpoch).equal(Number(contractEpoch))

                const unirepGSTLeaves = unirepState.getNumGSTLeaves(unirepEpoch)
                expect(unirepGSTLeaves).equal(userNum + i + 1)

                const newUSTRoot = await computeInitUserStateRoot(
                    _treeDepths.userStateTreeDepth
                )
                const newGSTLeaf = hashLeftRight(commitment, newUSTRoot)
                userStateTreeRoots.push(newUSTRoot)
                signUpAirdrops.push(Reputation.default())
                GSTree.insert(newGSTLeaf)
                rootHistories.push(GSTree.root)
            }
        })

        it('Sign up users more than contract capacity will not affect Unirep state', async () => {
            const unirepStateBefore = await genUnirepStateFromContract(
                hardhatEthers.provider,
                unirepContract.address
            )
            const unirepEpoch = unirepStateBefore.currentEpoch
            const unirepGSTLeavesBefore =
                unirepStateBefore.getNumGSTLeaves(unirepEpoch)

            const id = new ZkIdentity()
            const commitment = id.genIdentityCommitment()
            await expect(
                unirepContract.userSignUp(commitment)
            ).to.be.revertedWith(
                'Unirep: maximum number of user signups reached'
            )

            const unirepState = await genUnirepStateFromContract(
                hardhatEthers.provider,
                unirepContract.address
            )
            const unirepGSTLeaves = unirepState.getNumGSTLeaves(unirepEpoch)
            expect(unirepGSTLeaves).equal(unirepGSTLeavesBefore)
        })

        it('Check GST roots match Unirep state', async () => {
            const unirepState = await genUnirepStateFromContract(
                hardhatEthers.provider,
                unirepContract.address
            )
            for (let root of rootHistories) {
                const exist = unirepState.GSTRootExists(
                    root,
                    unirepState.currentEpoch
                )
                expect(exist).to.be.true
            }
        })
    })
})
