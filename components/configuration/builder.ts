import type { EnvironmentSettings } from './types.js'

export interface BuildOptions {
  overrides?: Record<string, any>
  applyTestOverrides?: boolean
  freeze?: boolean
  extras?: Record<string, any>
  decrypt?: (text: string, key: string, salt?: string) => string | null
}

const settings = {
  default: 'default',
  encrypted: 'encrypted',
}

const getEnvironmentValue = (value: any) => {
  const environments: Record<string, any> = {}

  Object.keys(value).forEach((property) => {
    property.split('_').forEach((e) => {
      environments[e] = value[property]
    })
  })

  return environments
}

/**
 * Take a period separated path i.e. redis.connection.host from a developers overrides.json file, split it on period
 * and use the recursive function below to locate the property at the path, once located replace the value with the
 * value from the developers overrides.json file
 */
const overrideProperty = (config: any, pathParts: string[], index: number, replacement: string) => {
  if (config[pathParts[index]] && typeof config[pathParts[index]] === 'object') {
    return overrideProperty(config[pathParts[index]], pathParts, index + 1, replacement)
  }

  config[pathParts[index]] = replacement
}

/**
 * We iterate through all properties on the configuration json file and apply the following logic
 * 1. If the value of the property is an array just set the value on to the resulting configuration instance
 * 2. If the value is an object and it has a key named default then we know its a property that contains a set
 * of environment specific child properties. In which case we locate the correct value using the environment we're
 * building the configuration for and if necessary decrypt the value.
 * 3. If its an object but has no default property then recursively call this function for its child properties
 * 4. Finally If the property value is a function or string just copy the value to the resulting configuration
 */
const assignProperty = (environment: EnvironmentSettings, parent: any, name: string, value: any, decrypt?: BuildOptions['decrypt']) => {
  if (!value || Array.isArray(value)) {
    parent[name] = value
  } else if (typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, settings.default)) {
    const encrypted = Object.prototype.hasOwnProperty.call(value, settings.encrypted) ? value[settings.encrypted] : false

    const environmentValues = getEnvironmentValue(value)

    const exists = Object.prototype.hasOwnProperty.call(environmentValues, environment.environment)
      || Object.prototype.hasOwnProperty.call(environmentValues, settings.default)

    const extracted = exists
      ? Object.prototype.hasOwnProperty.call(environmentValues, environment.environment)
        ? environmentValues[environment.environment]
        : environmentValues[settings.default]
      : null

    if (!exists || extracted === null) {
      parent[name] = null
    } else if (extracted.toString().toLowerCase().startsWith('env$')) {
      parent[name] = process.env[extracted.toString().split('$', 2)[1].toUpperCase()]
    } else {
      parent[name] = encrypted && extracted && decrypt ? decrypt(extracted, environment.key!, environment.salt!) : extracted
    }
  } else if (typeof value === 'object') {
    parent[name] = {}
    Object.keys(value).forEach((property) => {
      assignProperty(environment, parent[name], property, value[property], decrypt)
    })
  } else if (value?.toString().toLowerCase().startsWith('env$')) {
    parent[name] = process.env[value?.toString().split('$', 2)[1].toUpperCase()]
  } else {
    parent[name] = value
  }
}

/**
 * Generic configuration builder. Walks the baseline shape and resolves each property for the supplied
 * environment (default values, environment-specific values, env$ references, encrypted values). Optionally
 * applies overrides loaded by the caller and freezes the result.
 */
export const build = <T>(baseline: any, environment: EnvironmentSettings, options: BuildOptions = {}): T => {
  const builder: Record<string, any> = {}
  const { decrypt } = options

  Object.keys(baseline).forEach((property) => {
    assignProperty(environment, builder, property, baseline[property], decrypt)
  })

  if (options.overrides) {
    const local = options.overrides

    const applyOverride = (path: string) => {
      let value = local[path]

      if (path.startsWith('encrypted.') && decrypt) {
        value = decrypt(value, environment.key!, environment.salt!)
        path = path.replace('encrypted.', '')
      }

      overrideProperty(builder, path.split('.'), 0, value)
    }

    Object.keys(local).forEach(applyOverride)
  }

  if (options.extras) {
    Object.assign(builder, options.extras)
  }

  if (options.freeze) {
    Object.keys(builder).forEach((property) => {
      if (typeof builder[property] === 'object' && builder[property] !== null) {
        builder[property] = Object.freeze(builder[property])
      }
    })
    return Object.freeze(builder) as T
  }

  return builder as T
}
