/**
 * Utilitários seguros para localStorage e sessionStorage
 */

export interface StorageOptions {
  encrypt?: boolean
  validate?: (value: unknown) => boolean
}

export class SecureStorage {
  private static isAvailable(): boolean {
    try {
      const test = '__storage_test__'
      localStorage.setItem(test, test)
      localStorage.removeItem(test)
      return true
    } catch {
      return false
    }
  }

  private static validateKey(key: string): void {
    if (!key || typeof key !== 'string') {
      throw new Error('Storage key must be a non-empty string')
    }
  }

  private static validateValue(value: unknown): void {
    if (value === undefined) {
      throw new Error('Cannot store undefined values')
    }
  }

  static setItem(key: string, value: unknown, options: StorageOptions = {}): void {
    if (!this.isAvailable()) {
      console.warn('localStorage is not available')
      return
    }

    this.validateKey(key)
    this.validateValue(value)

    if (options.validate && !options.validate(value)) {
      throw new Error(`Value validation failed for key: ${key}`)
    }

    try {
      const serializedValue = JSON.stringify(value)
      localStorage.setItem(key, serializedValue)
    } catch (error) {
      console.error(`Failed to store item with key: ${key}`, error)
      throw new Error(`Storage failed for key: ${key}`)
    }
  }

  static getItem<T = unknown>(key: string): T | null {
    if (!this.isAvailable()) {
      return null
    }

    this.validateKey(key)

    try {
      const item = localStorage.getItem(key)
      if (item === null) {
        return null
      }
      return JSON.parse(item) as T
    } catch (error) {
      console.error(`Failed to retrieve item with key: ${key}`, error)
      return null
    }
  }

  static removeItem(key: string): void {
    if (!this.isAvailable()) {
      return
    }

    this.validateKey(key)

    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error(`Failed to remove item with key: ${key}`, error)
    }
  }

  static clear(): void {
    if (!this.isAvailable()) {
      return
    }

    try {
      localStorage.clear()
    } catch (error) {
      console.error('Failed to clear localStorage', error)
    }
  }
}

export class SecureSessionStorage {
  private static isAvailable(): boolean {
    try {
      const test = '__session_storage_test__'
      sessionStorage.setItem(test, test)
      sessionStorage.removeItem(test)
      return true
    } catch {
      return false
    }
  }

  private static validateKey(key: string): void {
    if (!key || typeof key !== 'string') {
      throw new Error('Session storage key must be a non-empty string')
    }
  }

  static setItem(key: string, value: unknown): void {
    if (!this.isAvailable()) {
      console.warn('sessionStorage is not available')
      return
    }

    this.validateKey(key)

    try {
      const serializedValue = JSON.stringify(value)
      sessionStorage.setItem(key, serializedValue)
    } catch (error) {
      console.error(`Failed to store session item with key: ${key}`, error)
    }
  }

  static getItem<T = unknown>(key: string): T | null {
    if (!this.isAvailable()) {
      return null
    }

    this.validateKey(key)

    try {
      const item = sessionStorage.getItem(key)
      if (item === null) {
        return null
      }
      return JSON.parse(item) as T
    } catch (error) {
      console.error(`Failed to retrieve session item with key: ${key}`, error)
      return null
    }
  }

  static removeItem(key: string): void {
    if (!this.isAvailable()) {
      return
    }

    this.validateKey(key)

    try {
      sessionStorage.removeItem(key)
    } catch (error) {
      console.error(`Failed to remove session item with key: ${key}`, error)
    }
  }
}

/**
 * Utilitário para acesso seguro ao window object
 */
export class SafeWindow {
  static getLocation(): Location | null {
    if (typeof window === 'undefined') {
      return null
    }

    try {
      return window.location
    } catch (error) {
      console.error('Failed to access window.location', error)
      return null
    }
  }

  static reload(): void {
    if (typeof window === 'undefined') {
      return
    }

    try {
      window.location.reload()
    } catch (error) {
      console.error('Failed to reload window', error)
    }
  }

  static navigate(url: string): void {
    if (typeof window === 'undefined') {
      return
    }

    try {
      window.location.href = url
    } catch (error) {
      console.error('Failed to navigate', error)
    }
  }

  static getNavigator(): Navigator | null {
    if (typeof window === 'undefined') {
      return null
    }

    try {
      return window.navigator
    } catch (error) {
      console.error('Failed to access window.navigator', error)
      return null
    }
  }
}
