import { EmailLayout } from '../EmailLayout'
import { emailResponse } from '../render'

const ProfileUpdatedEmail = ({ name }: { name: string }) => (
  <EmailLayout title="Your account details were changed">
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
      , your account details were changed
    </h1>

    <p style={{
      margin: '0 0 16px',
      fontSize: '14px',
      color: '#a1a1aa',
      lineHeight: 1.6,
    }}
    >
      This is a confirmation that the personal details on your NodeVault
      account — such as your name, email address or phone number — were
      just updated.
    </p>

    <p style={{
      margin: '0 0 28px',
      fontSize: '14px',
      color: '#a1a1aa',
      lineHeight: 1.6,
    }}
    >
      If you made this change, no further action is needed. If you did not
      make this change, please contact us straight away so we can secure
      your account.
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
              Review your account
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

  return emailResponse(<ProfileUpdatedEmail name={name} />)
}
