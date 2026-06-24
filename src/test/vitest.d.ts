// Augmentação de tipos: adiciona os matchers do @testing-library/jest-dom
// (toBeInTheDocument, toHaveClass, toBeDisabled, ...) ao `expect` do vitest.
// O import em runtime fica em src/test/setup.ts (`@testing-library/jest-dom/vitest`);
// este arquivo garante que o tsc enxergue a augmentação globalmente.
import 'vitest'
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers'

declare module 'vitest' {
  interface Assertion<T = unknown>
    extends TestingLibraryMatchers<unknown, T> {}
  interface AsymmetricMatchersContaining
    extends TestingLibraryMatchers<unknown, unknown> {}
}
