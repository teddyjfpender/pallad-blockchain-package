import { Mina } from '@palladxyz/mina-core'
import * as bip32 from '@scure/bip32'
import { HDKey } from '@scure/bip32'
import { deepStrictEqual } from 'assert'
import * as starknet from 'micro-starknet'
import Client from 'mina-signer'
import sinon from 'sinon'
import { expect } from 'vitest'

import {
  EthereumPayload,
  EthereumSpecificArgs
} from '../src/chains/Ethereum/types'
import { MinaPayload, MinaSpecificArgs } from '../src/chains/Mina'
import { reverseBytes } from '../src/chains/Mina/keyDerivationUtils'
import {
  StarknetPayload,
  StarknetSpecificArgs
} from '../src/chains/Starknet/types'
import { emip3encrypt } from '../src/emip3'
import { getPassphraseRethrowTypedError } from '../src/InMemoryKeyAgent'
import { KeyAgentBase } from '../src/KeyAgentBase'
import {
  GetPassphrase,
  KeyAgentType,
  Network,
  SerializableKeyAgentData
} from '../src/types'
import * as util from '../src/util/bip39'
import { constructTransaction } from '../src/util/Transactions/buildMinaTx'

// Provide the passphrase for testing purposes
const params = {
  passphrase: 'passphrase'
}
const getPassphrase = async () => Buffer.from(params.passphrase)

describe('KeyAgentBase', () => {
  class KeyAgentBaseInstance extends KeyAgentBase {
    constructor(data: SerializableKeyAgentData, getPassphrase: GetPassphrase) {
      super(data, getPassphrase)
    }
  }

  let instance: KeyAgentBaseInstance
  let instanceStarknet: KeyAgentBaseInstance
  let serializableData: SerializableKeyAgentData
  let serializableDataStarknet: SerializableKeyAgentData
  let networkType: Mina.NetworkType
  let passphrase: Uint8Array
  let rootKeyBytes: Uint8Array
  let encryptedSeedBytes: Uint8Array
  let mnemonic: string[]
  let mnemonicStarknet: string[]
  let encryptedSeedBytesStarknet: Uint8Array

  beforeEach(async () => {
    // Generate a mnemonic (24 words)
    //const strength = 128 // increase to 256 for a 24-word mnemonic
    mnemonic = [
      'habit',
      'hope',
      'tip',
      'crystal',
      'because',
      'grunt',
      'nation',
      'idea',
      'electric',
      'witness',
      'alert',
      'like'
    ]
    const seed = util.mnemonicToSeed(mnemonic)
    // Create root node from seed
    const root = bip32.HDKey.fromMasterSeed(seed)
    // unencrypted root key bytes
    rootKeyBytes = root.privateKey ? root.privateKey : new Uint8Array([])

    // passphrase
    passphrase = await getPassphraseRethrowTypedError(getPassphrase)
    // define the agent properties
    passphrase = await getPassphraseRethrowTypedError(getPassphrase)
    // Works with seed
    encryptedSeedBytes = await emip3encrypt(seed, passphrase)

    mnemonicStarknet = [
      'range',
      'mountain',
      'blast',
      'problem',
      'vibrant',
      'void',
      'vivid',
      'doctor',
      'cluster',
      'enough',
      'melody',
      'salt',
      'layer',
      'language',
      'laptop',
      'boat',
      'major',
      'space',
      'monkey',
      'unit',
      'glimpse',
      'pause',
      'change',
      'vibrant'
    ]
    const seedStarknet = util.mnemonicToSeed(mnemonicStarknet)
    // Works with seed
    encryptedSeedBytesStarknet = await emip3encrypt(seedStarknet, passphrase)
  })

  afterEach(() => {
    // Clean up all sinon stubs after each test.
    sinon.restore()
  })

  describe('Mina KeyAgent', () => {
    beforeEach(() => {
      // Define your own appropriate initial data, network, accountKeyDerivationPath, and accountAddressDerivationPath
      serializableData = {
        __typename: KeyAgentType.InMemory,
        encryptedSeedBytes: encryptedSeedBytes,
        id: 'http://example.gov/wallet/3732',
        type: ['VerifiableCredential', 'EncryptedWallet'],
        issuer: 'did:example:123',
        issuanceDate: '2020-05-22T17:38:21.910Z',
        credentialSubject: {
          id: 'did:example:123',
          contents: []
        }
      }
      networkType = 'testnet'
      instance = new KeyAgentBaseInstance(serializableData, getPassphrase)
    })
    it('should return the correct empty knownAddresses', () => {
      expect(instance.knownCredentials).to.deep.equal(
        serializableData.credentialSubject.contents
      )
    })

    it('should return the correct empty serializableData', () => {
      expect(instance.serializableData).to.deep.equal(serializableData)
    })

    it('should derive correct Mina address', async () => {
      // Define a mocked publicKey, which should be expected from the derivation
      const expectedPublicKey: Mina.PublicKey =
        'B62qjsV6WQwTeEWrNrRRBP6VaaLvQhwWTnFi4WP4LQjGvpfZEumXzxb'

      const expectedGroupedCredentials = {
        '@context': ['https://w3id.org/wallet/v1'],
        id: 'did:mina:B62qjsV6WQwTeEWrNrRRBP6VaaLvQhwWTnFi4WP4LQjGvpfZEumXzxb',
        type: 'MinaAddress',
        controller:
          'did:mina:B62qjsV6WQwTeEWrNrRRBP6VaaLvQhwWTnFi4WP4LQjGvpfZEumXzxb',
        name: 'Mina Account',
        description: 'My Mina account.',
        chain: Network.Mina,
        accountIndex: 0,
        addressIndex: 0,
        address: expectedPublicKey
      }

      const args: MinaSpecificArgs = {
        network: Network.Mina,
        accountIndex: 0,
        addressIndex: 0,
        networkType: networkType
      }
      const payload = new MinaPayload()

      const groupedCredential = await instance.deriveCredentials(
        payload,
        args,
        getPassphrase,
        true
      )
      console.log('Mina groupedCredential account index 0', groupedCredential)

      expect(groupedCredential.address).to.deep.equal(
        expectedGroupedCredentials.address
      )
    })

    it('should derive correct address for account index other than 0', async () => {
      // Define a mocked publicKey, which should be expected from the derivation
      const expectedPublicKey: Mina.PublicKey =
        'B62qnhgMG71bvPDvAn3x8dEpXB2sXKCWukj2B6hFKACCHp6uVTCt6HB'

      const expectedGroupedCredentials = {
        '@context': ['https://w3id.org/wallet/v1'],
        id: 'did:mina:B62qnhgMG71bvPDvAn3x8dEpXB2sXKCWukj2B6hFKACCHp6uVTCt6HB',
        type: 'MinaAddress',
        controller:
          'did:mina:B62qnhgMG71bvPDvAn3x8dEpXB2sXKCWukj2B6hFKACCHp6uVTCt6HB',
        name: 'Mina Account',
        description: 'My Mina account.',
        chain: Network.Mina,
        accountIndex: 1,
        addressIndex: 0,
        address: expectedPublicKey
      }

      const args: MinaSpecificArgs = {
        network: Network.Mina,
        accountIndex: 1,
        addressIndex: 0,
        networkType: networkType
      }
      const payload = new MinaPayload()

      const groupedCredential = await instance.deriveCredentials(
        payload,
        args,
        getPassphrase,
        true
      )
      expect(groupedCredential.address).to.deep.equal(
        expectedGroupedCredentials.address
      )
    })

    it('should derive multiple unique Mina addresses for each account index and store credentials properly', async () => {
      const mockedPublicKeys: Mina.PublicKey[] = [
        'B62qjsV6WQwTeEWrNrRRBP6VaaLvQhwWTnFi4WP4LQjGvpfZEumXzxb',
        'B62qnhgMG71bvPDvAn3x8dEpXB2sXKCWukj2B6hFKACCHp6uVTCt6HB'
      ]
      const payload = new MinaPayload()

      const expectedGroupedCredentialsArray = mockedPublicKeys.map(
        (publicKey, index) => ({
          '@context': ['https://w3id.org/wallet/v1'],
          id: `did:mina:${publicKey}`,
          type: 'MinaAddress',
          controller: `did:mina:${publicKey}`,
          name: 'Mina Account',
          description: 'My Mina account.',
          chain: Network.Mina,
          accountIndex: index,
          addressIndex: 0,
          address: publicKey
        })
      )

      const resultArray = []

      for (let i = 0; i < mockedPublicKeys.length; i++) {
        const args: MinaSpecificArgs = {
          network: Network.Mina,
          accountIndex: i,
          addressIndex: 0,
          networkType: networkType
        }
        // when pure is false it will store the credentials
        const result = await instance.deriveCredentials(
          payload,
          args,
          getPassphrase,
          false
        )

        resultArray.push(result)
      }

      // Check if the credentials were stored properly.
      expect(instance.knownCredentials[0]?.address).to.deep.equal(
        expectedGroupedCredentialsArray[0]?.address
      )
      expect(instance.knownCredentials[1]?.address).to.deep.equal(
        expectedGroupedCredentialsArray[1]?.address
      )
    })

    it('should reverse bytes correctly', () => {
      const originalBuffer = Buffer.from('1234', 'hex')
      const reversedBuffer = Buffer.from('3412', 'hex')

      expect(reverseBytes(originalBuffer)).to.deep.equal(reversedBuffer)
    })

    it('should export root key successfully', async () => {
      const decryptedRootKey = await instance.exportRootPrivateKey()
      expect(decryptedRootKey).to.deep.equal(rootKeyBytes)
    })
    it('should use the generic sign<T> function for signing a transaction', async () => {
      // Define a mocked publicKey, which should be expected from the derivation
      const expectedPublicKey: Mina.PublicKey =
        'B62qjsV6WQwTeEWrNrRRBP6VaaLvQhwWTnFi4WP4LQjGvpfZEumXzxb'

      const expectedGroupedCredentials = {
        '@context': ['https://w3id.org/wallet/v1'],
        id: 'did:mina:B62qjsV6WQwTeEWrNrRRBP6VaaLvQhwWTnFi4WP4LQjGvpfZEumXzxb',
        type: 'MinaAddress',
        controller:
          'did:mina:B62qjsV6WQwTeEWrNrRRBP6VaaLvQhwWTnFi4WP4LQjGvpfZEumXzxb',
        name: 'Mina Account',
        description: 'My Mina account.',
        chain: Network.Mina,
        accountIndex: 0,
        addressIndex: 0,
        address: expectedPublicKey
      }

      const args: MinaSpecificArgs = {
        network: Network.Mina,
        accountIndex: 0,
        addressIndex: 0,
        networkType: networkType
      }
      const payload = new MinaPayload()

      const groupedCredential = await instance.deriveCredentials(
        payload,
        args,
        getPassphrase,
        true
      )

      expect(groupedCredential.address).to.deep.equal(
        expectedGroupedCredentials.address
      )

      const transaction: Mina.TransactionBody = {
        to: groupedCredential.address,
        from: groupedCredential.address,
        fee: 1,
        amount: 100,
        nonce: 0,
        memo: 'hello Bob',
        validUntil: 321,
        type: 'payment'
      }
      const constructedTx: Mina.ConstructedTransaction = constructTransaction(
        transaction,
        Mina.TransactionKind.PAYMENT
      )
      const signedTx = await instance.sign(
        groupedCredential,
        constructedTx,
        args,
        getPassphrase
      )
      const minaClient = new Client({ network: args.networkType })
      const isVerified = minaClient.verifyTransaction(
        signedTx as Mina.SignedTransaction
      )
      expect(isVerified).toBeTruthy()
    })
    it('should use the generic sign<T> function for signing a message', async () => {
      // Define a mocked publicKey, which should be expected from the derivation
      const expectedPublicKey: Mina.PublicKey =
        'B62qjsV6WQwTeEWrNrRRBP6VaaLvQhwWTnFi4WP4LQjGvpfZEumXzxb'

      const expectedGroupedCredentials = {
        '@context': ['https://w3id.org/wallet/v1'],
        id: 'did:mina:B62qjsV6WQwTeEWrNrRRBP6VaaLvQhwWTnFi4WP4LQjGvpfZEumXzxb',
        type: 'MinaAddress',
        controller:
          'did:mina:B62qjsV6WQwTeEWrNrRRBP6VaaLvQhwWTnFi4WP4LQjGvpfZEumXzxb',
        name: 'Mina Account',
        description: 'My Mina account.',
        chain: Network.Mina,
        accountIndex: 0,
        addressIndex: 0,
        address: expectedPublicKey
      }

      const args: MinaSpecificArgs = {
        network: Network.Mina,
        accountIndex: 0,
        addressIndex: 0,
        networkType: networkType
      }
      const payload = new MinaPayload()

      const groupedCredential = await instance.deriveCredentials(
        payload,
        args,
        getPassphrase,
        true
      )
      expect(groupedCredential.address).to.deep.equal(
        expectedGroupedCredentials.address
      )

      const message: Mina.MessageBody = {
        message: 'Hello, Bob!'
      }
      const signedMessage = await instance.sign(
        groupedCredential,
        message,
        args,
        getPassphrase
      )
      const minaClient = new Client({ network: args.networkType })
      const isVerified = await minaClient.verifyMessage(
        signedMessage as Mina.SignedMessage
      )
      expect(isVerified).toBeTruthy()
    })
    it('should use the generic sign<T> function to sign fields correctly and the client should be able to verify it', async () => {
      // Define a mocked publicKey, which should be expected from the derivation
      const expectedPublicKey: Mina.PublicKey =
        'B62qjsV6WQwTeEWrNrRRBP6VaaLvQhwWTnFi4WP4LQjGvpfZEumXzxb'

      const expectedGroupedCredentials = {
        '@context': ['https://w3id.org/wallet/v1'],
        id: 'did:mina:B62qjsV6WQwTeEWrNrRRBP6VaaLvQhwWTnFi4WP4LQjGvpfZEumXzxb',
        type: 'MinaAddress',
        controller:
          'did:mina:B62qjsV6WQwTeEWrNrRRBP6VaaLvQhwWTnFi4WP4LQjGvpfZEumXzxb',
        name: 'Mina Account',
        description: 'My Mina account.',
        chain: Network.Mina,
        accountIndex: 0,
        addressIndex: 0,
        address: expectedPublicKey
      }

      const args: MinaSpecificArgs = {
        network: Network.Mina,
        accountIndex: 0,
        addressIndex: 0,
        networkType: networkType
      }
      const payload = new MinaPayload()

      const groupedCredential = await instance.deriveCredentials(
        payload,
        args,
        getPassphrase,
        true
      )
      expect(groupedCredential.address).to.deep.equal(
        expectedGroupedCredentials.address
      )

      const fields: Mina.SignableFields = {
        fields: [
          BigInt(10),
          BigInt(20),
          BigInt(30),
          BigInt(340817401),
          BigInt(2091283),
          BigInt(1),
          BigInt(0)
        ]
      }
      const signedFields = await instance.sign(
        groupedCredential,
        fields,
        args,
        getPassphrase
      )
      const minaClient = new Client({ network: args.networkType })
      const isVerified = await minaClient.verifyFields(
        signedFields as Mina.SignedFields
      )
      expect(isVerified).toBeTruthy()
    })
    it('should use the generic sign<T> function to sign a zkapp command correctly and the client should be able to verify it', async () => {
      // Define a mocked publicKey, which should be expected from the derivation
      const expectedPublicKey: Mina.PublicKey =
        'B62qjsV6WQwTeEWrNrRRBP6VaaLvQhwWTnFi4WP4LQjGvpfZEumXzxb'

      const expectedGroupedCredentials = {
        '@context': ['https://w3id.org/wallet/v1'],
        id: 'did:mina:B62qjsV6WQwTeEWrNrRRBP6VaaLvQhwWTnFi4WP4LQjGvpfZEumXzxb',
        type: 'MinaAddress',
        controller:
          'did:mina:B62qjsV6WQwTeEWrNrRRBP6VaaLvQhwWTnFi4WP4LQjGvpfZEumXzxb',
        name: 'Mina Account',
        description: 'My Mina account.',
        chain: Network.Mina,
        accountIndex: 0,
        addressIndex: 0,
        address: expectedPublicKey
      }

      const args: MinaSpecificArgs = {
        network: Network.Mina,
        accountIndex: 0,
        addressIndex: 0,
        networkType: networkType
      }
      const payload = new MinaPayload()

      const groupedCredential = await instance.deriveCredentials(
        payload,
        args,
        getPassphrase,
        true
      )
      expect(groupedCredential.address).to.deep.equal(
        expectedGroupedCredentials.address
      )

      const zkAppCommand: Mina.SignableZkAppCommand = {
        command: {
          zkappCommand: {
            accountUpdates: [],
            memo: 'E4YM2vTHhWEg66xpj52JErHUBU4pZ1yageL4TVDDpTTSsv8mK6YaH',
            feePayer: {
              body: {
                publicKey:
                  'B62qjsV6WQwTeEWrNrRRBP6VaaLvQhwWTnFi4WP4LQjGvpfZEumXzxb',
                fee: '100000000',
                validUntil: '100000',
                nonce: '1'
              },
              authorization: ''
            }
          },
          feePayer: {
            feePayer: 'B62qjsV6WQwTeEWrNrRRBP6VaaLvQhwWTnFi4WP4LQjGvpfZEumXzxb',
            fee: '100000000',
            nonce: '1',
            memo: 'test memo'
          }
        }
      }
      const signedZkAppCommand = await instance.sign(
        groupedCredential,
        zkAppCommand,
        args,
        getPassphrase
      )
      const minaClient = new Client({ network: args.networkType })
      const isVerified = await minaClient.verifyZkappCommand(
        signedZkAppCommand as Mina.SignedZkAppCommand
      )
      expect(isVerified).toBeTruthy()
    })
  })
  describe('Ethereum KeyAgent', () => {
    beforeEach(() => {
      // Define your own appropriate initial data, network, accountKeyDerivationPath, and accountAddressDerivationPath
      serializableData = {
        __typename: KeyAgentType.InMemory,
        encryptedSeedBytes: encryptedSeedBytes,
        id: 'http://example.gov/wallet/3732',
        type: ['VerifiableCredential', 'EncryptedWallet'],
        issuer: 'did:example:123',
        issuanceDate: '2020-05-22T17:38:21.910Z',
        credentialSubject: {
          id: 'did:example:123',
          contents: []
        }
      }
      networkType = 'testnet'
      instance = new KeyAgentBaseInstance(serializableData, getPassphrase)
    })
    it('should return the correct empty knownAddresses', () => {
      expect(instance.knownCredentials).to.deep.equal(
        serializableData.credentialSubject.contents
      )
    })
    it('should derive correct Ethereum address', async () => {
      // Define a mocked publicKey, which should be expected from the derivation
      const expectedPublicKey = '0xA98005e6ce8E62ADf8f9020fa99888E8f107e3C9'
      const expectedGroupedCredentials = {
        '@context': ['https://w3id.org/wallet/v1'],
        id: 'did:ethr:0xA98005e6ce8E62ADf8f9020fa99888E8f107e3C9',
        type: 'EthereumAddress',
        controller: 'did:ethr:0xA98005e6ce8E62ADf8f9020fa99888E8f107e3C9',
        name: 'Ethereum Account',
        description: 'My Ethereum account.',
        chain: Network.Ethereum,
        accountIndex: 0,
        addressIndex: 0,
        address: expectedPublicKey
      }

      const args: EthereumSpecificArgs = {
        network: Network.Ethereum,
        accountIndex: 0,
        addressIndex: 0
      }
      const payload = new EthereumPayload()

      const groupedCredential = await instance.deriveCredentials(
        payload,
        args,
        getPassphrase,
        true
      )
      console.log(
        'Ethereum groupedCredential account index 0',
        groupedCredential
      )

      expect(groupedCredential.address).to.deep.equal(
        expectedGroupedCredentials.address
      )
    })
  })
  describe('Starknet KeyAgent', () => {
    beforeEach(() => {
      serializableDataStarknet = {
        __typename: KeyAgentType.InMemory,
        encryptedSeedBytes: encryptedSeedBytesStarknet,
        id: 'http://example.gov/wallet/3732',
        type: ['VerifiableCredential', 'EncryptedWallet'],
        issuer: 'did:example:123',
        issuanceDate: '2020-05-22T17:38:21.910Z',
        credentialSubject: {
          id: 'did:example:123',
          contents: []
        }
      }
      instanceStarknet = new KeyAgentBaseInstance(
        serializableDataStarknet,
        getPassphrase
      )
    })
    it('should return the correct empty knownAddresses', () => {
      expect(instanceStarknet.knownCredentials).to.deep.equal(
        serializableDataStarknet.credentialSubject.contents
      )
    })
    it('should derive correct Starknet address', async () => {
      const expectedGroupedCredentials = {
        '@context': ['https://w3id.org/wallet/v1'],
        id: 'did:starknet:0x70676403d63dad9b4080044bd8ce4ea7fe0ad253f0c764d3bf7f0ca04d77cd0',
        type: 'StarknetAddress',
        controller:
          'did:starknet:0x70676403d63dad9b4080044bd8ce4ea7fe0ad253f0c764d3bf7f0ca04d77cd0',
        name: 'Starknet Account',
        description: 'My Starknet account.',
        chain: 'Starknet',
        accountIndex: 0,
        addressIndex: 0,
        address:
          '0x70676403d63dad9b4080044bd8ce4ea7fe0ad253f0c764d3bf7f0ca04d77cd0'
      }
      const args: StarknetSpecificArgs = {
        network: Network.Starknet,
        layer: 'starkex',
        application: 'starkdeployement',
        ethAddress: '0xa4864d977b944315389d1765ffa7e66F74ee8cd7',
        addressIndex: 0
      }
      const payload = new StarknetPayload()

      const groupedCredential = await instanceStarknet.deriveCredentials(
        payload,
        args,
        getPassphrase,
        true
      )
      console.log(
        'Starknet groupedCredential address index 0',
        groupedCredential
      )
      expect(groupedCredential.address).to.deep.equal(
        expectedGroupedCredentials.address
      )
    })
    it('should derive correct Starknet private key', async () => {
      const layer = 'starkex'
      const application = 'starkdeployement'
      const mnemonic =
        'range mountain blast problem vibrant void vivid doctor cluster enough melody ' +
        'salt layer language laptop boat major space monkey unit glimpse pause change vibrant'
      const ethAddress = '0xa4864d977b944315389d1765ffa7e66F74ee8cd7'

      const seedStarknet = util.mnemonicToSeedSync(mnemonic)
      const hdKey = HDKey.fromMasterSeed(seedStarknet)
      const path = starknet.getAccountPath(layer, application, ethAddress, 0)
      const childNode = hdKey.derive(path)
      if (!childNode?.privateKey)
        throw new Error('Unable to derive private key')
      const privateKey = childNode.privateKey
      const starknetPrivateKey = starknet.grindKey(privateKey)
      console.log('seedStarknet', seedStarknet)
      console.log('path', path) // m/2645'/579218131'/891216374'/1961790679'/2135936222'/0
      console.log('privateKey', privateKey) // 25486417377744602430134038014327759826617030786832542130610103070956358065571n
      console.log('starknetPrivateKey', starknetPrivateKey)
      deepStrictEqual(
        starknetPrivateKey,
        '6cf0a8bf113352eb863157a45c5e5567abb34f8d32cddafd2c22aa803f4892c'
      )
    })
  })
})
