'use client'

import { Input, ListBox, Select } from '@heroui/react'
import { Countries } from '@platform/components.contracts'
import type { Phone } from '@platform/components.contracts'

export type PhoneValue = Phone | undefined

type PhoneInputProps = {
  value: PhoneValue
  onChange: (value: PhoneValue) => void
}

function flag(iso: string): string {
  return [...iso.toUpperCase()].map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join('')
}

export const PhoneInput = ({ value, onChange }: PhoneInputProps) => {
  const countryCode = value?.countryCode ?? Countries[0]?.countryCode ?? ''

  // ids must be unique, so use the ISO code (several countries share a dialling code)
  const selectedIso = Countries.find(c => c.countryCode === countryCode)?.iso ?? Countries[0]?.iso ?? ''

  return (
    <div className="flex gap-2">
      <Select
        aria-label="Country code"
        className="w-36 shrink-0"
        value={selectedIso}
        onChange={(key) => {
          const country = Countries.find(c => c.iso === key)

          if (!country) return

          onChange({ countryCode: country.countryCode, number: value?.number ?? '' })
        }}
      >
        <Select.Trigger>
          <Select.Value />

          <Select.Indicator />
        </Select.Trigger>

        <Select.Popover>
          <ListBox>
            {Countries.map(country => (
              <ListBox.Item
                key={country.iso}
                id={country.iso}
                textValue={`${country.name} ${country.countryCode}`}
              >
                {flag(country.iso)}
                {' '}
                {country.countryCode}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>

      <Input
        type="tel"
        aria-label="Phone number"
        placeholder="7700 900000"
        value={value?.number ?? ''}
        className="flex-1"
        onChange={(event) => {
          onChange(event.target.value ? { countryCode, number: event.target.value } : undefined)
        }}
      />
    </div>
  )
}
