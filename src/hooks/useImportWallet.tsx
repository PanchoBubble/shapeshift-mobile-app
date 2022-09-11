import { deleteItemAsync, getItemAsync } from 'expo-secure-store'
import { useEffect, useState } from 'react'
import { getMessageManager } from '../lib/getMessageManager'
import { getWalletManager } from '../lib/getWalletManager'
import memoize from 'lodash.memoize'

/**
 * Send a message to the webview that the wallet was imported
 *
 * memoize it by deviceId to avoid accidentally sending multiple events
 */
const raiseImportEvent = memoize((deviceId: string) =>
  getMessageManager().postMessage({ event: 'wallet_imported', deviceId }),
)

export const useImportWallet = () => {
  const [started, setStarted] = useState(false)
  const [status, setStatus] = useState<string | false | null>(null)

  useEffect(() => {
    if (!started) return

    console.debug('[useImportWallet] Checking for an existing wallet...')
    void (async () => {
      try {
        const prevWallet = await getItemAsync('mnemonic')
        // It's time to convert it to a new wallet
        if (prevWallet) {
          const walletManager = getWalletManager()
          const newWallet = await walletManager.add({
            label: 'Imported Wallet',
            mnemonic: prevWallet,
          })
          if (newWallet) {
            // We need to double-check that the mnemonic got imported correctly before deleting it
            const gotWallet = await walletManager.get(newWallet.id)
            if (gotWallet?.mnemonic === prevWallet) {
              console.info('[useImportWallet] Imported a wallet')
              await deleteItemAsync('mnemonic')
              return setStatus(gotWallet.id)
            }
          }
        }

        setStatus(false)
      } catch (e) {
        console.error('[useImportWallet] Error', e)
      }
    })()
  }, [started])

  useEffect(() => {
    if (typeof status === 'string') {
      raiseImportEvent(status)
    }
  }, [status])

  return {
    startImport: () => setStarted(true),
  }
}
