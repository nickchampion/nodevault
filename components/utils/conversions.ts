export const convert = {
  to: {
    isoPhone: (phone?: { number: string, countryCode: string }): string | null => {
      if (!phone) return null

      return phone.number.startsWith('+') ? phone.number : `${phone.countryCode}${phone.number}`
    },
  },
}
