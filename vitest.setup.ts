import { vi } from 'vitest'

// Global mocks for Next.js specific functions
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Any other global mocks can go here
