import type { ReactNode } from 'react'

export const EmailLayout = ({ title, children }: { title: string, children: ReactNode }) => (
  <html lang="en">
    <head>
      <meta charSet="utf-8" />
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1"
      />
      <title>{title}</title>
    </head>

    <body style={{
      margin: 0,
      padding: 0,
      backgroundColor: '#09090b',
      fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
      WebkitTextSizeAdjust: '100%',
    }}
    >
      <table
        width="100%"
        cellPadding="0"
        cellSpacing="0"
        border={0}
        style={{ backgroundColor: '#09090b', width: '100%', minHeight: '100vh' }}
      >
        <tbody>
          <tr>
            <td
              align="center"
              style={{ padding: '40px 16px' }}
            >
              <table
                width="600"
                cellPadding="0"
                cellSpacing="0"
                border={0}
                style={{ maxWidth: '600px', width: '100%' }}
              >
                <tbody>
                  {/* Header */}
                  <tr>
                    <td style={{
                      backgroundColor: '#18181b',
                      borderRadius: '12px 12px 0 0',
                      padding: '20px 28px',
                      borderBottom: '1px solid #27272a',
                    }}
                    >
                      <a
                        href="https://www.nodevault.cloud"
                        style={{
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="28"
                          height="28"
                          viewBox="0 0 24 24"
                          fill="none"
                          style={{ display: 'block', flexShrink: 0 }}
                        >
                          <path
                            d="M12 2L4 5.5V12C4 16.4 7.4 20.5 12 22C16.6 20.5 20 16.4 20 12V5.5L12 2Z"
                            fill="#6366f1"
                            stroke="#6366f1"
                            strokeWidth="0"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          <path
                            d="M9 12L11 14L15 10"
                            stroke="white"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>

                        <span style={{
                          fontSize: '16px',
                          fontWeight: 600,
                          color: '#ffffff',
                          letterSpacing: '-0.02em',
                          lineHeight: 1,
                        }}
                        >
                          NodeVault
                        </span>
                      </a>
                    </td>
                  </tr>

                  {/* Page content */}
                  <tr>
                    <td style={{ backgroundColor: '#18181b', padding: '32px 28px' }}>
                      {children}
                    </td>
                  </tr>

                  {/* Footer */}
                  <tr>
                    <td style={{
                      backgroundColor: '#18181b',
                      borderRadius: '0 0 12px 12px',
                      padding: '20px 28px',
                      borderTop: '1px solid #27272a',
                    }}
                    >
                      <table
                        width="100%"
                        cellPadding="0"
                        cellSpacing="0"
                        border={0}
                      >
                        <tbody>
                          <tr>
                            <td style={{ verticalAlign: 'middle' }}>
                              <p style={{
                                margin: 0,
                                fontSize: '12px',
                                color: '#71717a',
                                lineHeight: 1.5,
                              }}
                              >
                                ©
                                {' '}
                                {new Date().getFullYear()}
                                {' '}
                                NodeVault. All rights reserved.
                              </p>
                            </td>

                            <td
                              align="right"
                              style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}
                            >
                              <a
                                href="https://www.nodevault.cloud/company/about"
                                style={{
                                  fontSize: '12px',
                                  color: '#71717a',
                                  textDecoration: 'none',
                                  marginLeft: '16px',
                                }}
                              >
                                About
                              </a>

                              <a
                                href="https://www.nodevault.cloud/company/contact"
                                style={{
                                  fontSize: '12px',
                                  color: '#71717a',
                                  textDecoration: 'none',
                                  marginLeft: '16px',
                                }}
                              >
                                Contact
                              </a>

                              <a
                                href="https://www.nodevault.cloud/company/privacy"
                                style={{
                                  fontSize: '12px',
                                  color: '#71717a',
                                  textDecoration: 'none',
                                  marginLeft: '16px',
                                }}
                              >
                                Privacy Policy
                              </a>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </body>
  </html>
)
