export type SemVerType = 'major' | 'minor' | 'revision'

export const incrementSemVer = (version: string, type: SemVerType) => {
  if (!version) version = '1.0.0' // start with version 1 by default

  const parts = version.split('.')

  switch (type) {
    case 'major': {
      return `${Number.parseInt(parts[0]) + 1}.${parts[1]}.${parts[2]}`
    }

    case 'minor': {
      return `${parts[0]}.${Number.parseInt(parts[1]) + 1}.${parts[2]}`
    }

    case 'revision': {
      if (+parts[2] === 999) {
        return `${parts[0]}.${Number.parseInt(parts[1]) + 1}.0`
      }

      return `${parts[0]}.${parts[1]}.${Number.parseInt(parts[2]) + 1}`
    }
  }
}
