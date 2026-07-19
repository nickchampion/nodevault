import { EmailLayout } from '../EmailLayout'
import { emailResponse } from '../render'

const TopicMatchedEmail = ({ topics, assetName, vaultId }: { topics: string, assetName: string, vaultId: string }) => (
  <EmailLayout title="New content matches a topic you're following">
    <h1 style={{
      margin: '0 0 16px',
      fontSize: '22px',
      fontWeight: 600,
      color: '#ffffff',
      letterSpacing: '-0.02em',
    }}
    >
      New content matches
      {' '}
      {topics}
    </h1>

    <p style={{
      margin: '0 0 28px',
      fontSize: '14px',
      color: '#a1a1aa',
      lineHeight: 1.6,
    }}
    >
      &ldquo;
      {assetName}
      &rdquo; was just added to your account and touches on a topic you&apos;re
      following. Take a look and see if it&apos;s relevant.
    </p>

    <table
      cellPadding="0"
      cellSpacing="0"
      border={0}
    >
      <tbody>
        <tr>
          <td style={{ borderRadius: '8px', backgroundColor: '#6366f1' }}>
            <a
              href={`https://www.nodevault.cloud/account/vaults/${vaultId}`}
              style={{
                display: 'inline-block',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#ffffff',
                textDecoration: 'none',
              }}
            >
              View the document
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  </EmailLayout>
)

export const GET = (request: Request) => {
  const { searchParams } = new URL(request.url)
  const topics = searchParams.get('topics') || 'a topic you follow'
  const assetName = searchParams.get('assetName') || 'New content'
  const vaultId = searchParams.get('vaultId') || ''

  return emailResponse(<TopicMatchedEmail topics={topics} assetName={assetName} vaultId={vaultId} />)
}
