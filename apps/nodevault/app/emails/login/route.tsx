import { appConfig } from '../../../lib/config'
import { EmailLayout } from '../EmailLayout'
import { emailResponse } from '../render'

const LoginEmail = ({ name, code, app }: { name: string, code: string, app: string }) => (
  <EmailLayout title="Your NodeVault sign-in link">
    <h1 style={{
      margin: '0 0 16px',
      fontSize: '22px',
      fontWeight: 600,
      color: '#ffffff',
      letterSpacing: '-0.02em',
    }}
    >
      Hi
      {' '}
      {name}
      , here&apos;s your sign-in link
    </h1>

    <p style={{
      margin: '0 0 16px',
      fontSize: '14px',
      color: '#a1a1aa',
      lineHeight: 1.6,
    }}
    >
      Click the button below to sign in to your NodeVault account. This link
      expires in 10 minutes and can only be used once.
    </p>

    <p style={{
      margin: '0 0 28px',
      fontSize: '14px',
      color: '#a1a1aa',
      lineHeight: 1.6,
    }}
    >
      If you did not request this email, you can safely ignore it.
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
              href={`${app}/auth/login?code=${encodeURIComponent(code)}`}
              style={{
                display: 'inline-block',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#ffffff',
                textDecoration: 'none',
              }}
            >
              Sign in to NodeVault
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  </EmailLayout>
)

export const GET = (request: Request) => {
  const { searchParams } = new URL(request.url)
  const name = searchParams.get('name') || 'there'
  const code = searchParams.get('code') || ''

  return emailResponse(<LoginEmail name={name} code={code} app={appConfig().app} />)
}
