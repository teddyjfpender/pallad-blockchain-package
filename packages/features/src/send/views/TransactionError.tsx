import { AlertOctagonIcon } from 'lucide-react'
import colors from 'tailwindcss/colors' // eslint-disable-line

import { AppLayout } from '../../common/components/AppLayout'
import { TransactionResult } from '../components/TransactionResult'

export const TransactionErrorView = () => {
  return (
    <AppLayout>
      <TransactionResult
        title="Submission Error"
        result={{
          icon: AlertOctagonIcon,
          iconColor: colors.red['500'],
          label: 'Transaction Failed',
          content: 'Error: 500 Broadcast API not reachable'
        }}
        button={{
          label: 'Try Again',
          onClick: () => console.log('details')
        }}
      />
    </AppLayout>
  )
}
