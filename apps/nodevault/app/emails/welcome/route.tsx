import { EmailLayout } from '../EmailLayout'
import { emailResponse } from '../render'

const WelcomeEmail = ({ name }: { name: string }) => (
  <EmailLayout title="Welcome to NodeVault">
    <h1 style={{
      margin: '0 0 16px',
      fontSize: '22px',
      fontWeight: 600,
      color: '#ffffff',
      letterSpacing: '-0.02em',
    }}
    >
      Welcome to NodeVault,
      {' '}
      {name}
    </h1>

    <p style={{
      margin: '0 0 16px',
      fontSize: '14px',
      color: '#a1a1aa',
      lineHeight: 1.6,
    }}
    >
      Your account is ready. Upload your documents and NodeVault will make
      everything searchable — ask questions in plain language and get answers
      straight from your own content.
    </p>

    <p style={{
      margin: '0 0 28px',
      fontSize: '14px',
      color: '#a1a1aa',
      lineHeight: 1.6,
    }}
    >
      Head to your account to create your first vault and start adding content.
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
              href="https://www.nodevault.cloud/account"
              style={{
                display: 'inline-block',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#ffffff',
                textDecoration: 'none',
              }}
            >
              Go to your account
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

  return emailResponse(<WelcomeEmail name={name} />)
}
