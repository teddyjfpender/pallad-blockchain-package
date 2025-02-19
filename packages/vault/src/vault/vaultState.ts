import {
  ChainSignablePayload,
  ChainSpecificArgs,
  ChainSpecificPayload,
  FromBip39MnemonicWordsProps,
  GroupedCredentials,
  InMemoryKeyAgent,
  Network
} from '@palladxyz/key-management'
import { Mina, Networks, SubmitTxArgs } from '@palladxyz/mina-core'
import { Multichain } from '@palladxyz/multi-chain-core'

import {
  CredentialName,
  SearchQuery,
  SingleCredentialState,
  StoredCredential
} from '../credentials'
import { KeyAgentName, KeyAgents } from '../keyAgent'

type CurrentWallet = {
  keyAgent: InMemoryKeyAgent | undefined
  credential: SingleCredentialState
  accountInfo: Multichain.MultiChainAccountInfo
  transactions: Multichain.MultiChainTransactionBody[]
}

type CurrentWalletPayload = {
  keyAgentName: string
  credentialName: string
  currentAccountIndex: number
  currentAddressIndex: number
}

export type GlobalVaultState = {
  keyAgentName: string
  credentialName: string
  currentAccountIndex: number
  currentAddressIndex: number
  chain: Network
  walletNetwork: Multichain.MultiChainNetworks
  walletName: string
}

type CreateWalletReturn = {
  mnemonic: string[]
}

export type GlobalVaultActions = {
  setChain: (chain: Network) => void
  getCurrentWallet: () => CurrentWallet
  setCurrentWallet: (payload: CurrentWalletPayload) => void
  _syncAccountInfo: (
    network: Networks,
    derivedCredential: GroupedCredentials
  ) => Promise<void>
  _syncTransactions: (
    network: Networks,
    derivedCredential: GroupedCredentials
  ) => Promise<void>
  _syncWallet: (
    network: Networks,
    derivedCredential: GroupedCredentials
  ) => Promise<void>
  onNetworkChanged: (
    listener: (network: Multichain.MultiChainNetworks) => void
  ) => void
  getCurrentNetwork: () => Networks
  switchNetwork: (network: Multichain.MultiChainNetworks) => Promise<void>
  getCredentials: (query: SearchQuery, props: string[]) => StoredCredential[]
  getWalletAccountInfo: () => Promise<unknown>
  getWalletTransactions: () => Promise<unknown[]>
  sign: (signable: ChainSignablePayload) => Promise<unknown>
  constructTx: (
    transaction: Mina.TransactionBody,
    kind: Mina.TransactionKind
  ) => Promise<unknown>
  submitTx: (submitTxArgs: SubmitTxArgs) => Promise<unknown>
  createWallet: (strength?: number) => Promise<CreateWalletReturn>
  restoreWallet: <T extends ChainSpecificPayload>(
    payload: T,
    args: ChainSpecificArgs,
    network: Multichain.MultiChainNetworks,
    { mnemonicWords, getPassphrase }: FromBip39MnemonicWordsProps,
    keyAgentName: KeyAgentName,
    keyAgentType: KeyAgents,
    credentialName: CredentialName
  ) => Promise<void>
}

export type GlobalVaultStore = GlobalVaultState & GlobalVaultActions
