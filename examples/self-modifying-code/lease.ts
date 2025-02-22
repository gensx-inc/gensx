import fs from 'fs/promises'
import os from 'os'
import path from 'path'

interface FileSystemError extends Error {
  code?: string
}

export interface Lease {
  id: string
  acquiredAt: Date
  expiresAt: Date
}

const LEASE_DIR = path.join(os.homedir(), '.self-modifying-code')
const LEASE_FILE = path.join(LEASE_DIR, 'lease.json')

async function ensureLeaseDirExists(): Promise<void> {
  await fs.mkdir(LEASE_DIR, { recursive: true })
}

export async function acquireLease(): Promise<Lease> {
  await ensureLeaseDirExists()

  try {
    // Check if lease exists and is valid
    const existingLease = await fs.readFile(LEASE_FILE, 'utf-8')
    const lease = JSON.parse(existingLease) as Lease

    // Convert date strings back to Date objects
    lease.acquiredAt = new Date(lease.acquiredAt)
    lease.expiresAt = new Date(lease.expiresAt)

    if (lease.expiresAt > new Date()) {
      throw new Error('Lease is already held')
    }
  } catch (error) {
    // Error reading file or expired lease - we can acquire it
    if (
      (error as FileSystemError).code !== 'ENOENT' &&
      (error as Error).message !== 'Lease is already held'
    ) {
      throw error
    }
  }

  // Create new lease
  const lease: Lease = {
    id: Math.random().toString(36).slice(2),
    acquiredAt: new Date(),
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minute lease
  }

  await fs.writeFile(LEASE_FILE, JSON.stringify(lease, null, 2))
  return lease
}

export async function releaseLease(lease: Lease): Promise<void> {
  console.log('Releasing lease', lease)
  await ensureLeaseDirExists()
  try {
    const existingLease = await fs.readFile(LEASE_FILE, 'utf-8')
    const currentLease = JSON.parse(existingLease) as Lease

    if (currentLease.id === lease.id) {
      await fs.unlink(LEASE_FILE)
    }
  } catch (error) {
    if ((error as FileSystemError).code !== 'ENOENT') {
      throw error
    }
  }
}

export async function renewLease(lease: Lease): Promise<Lease> {
  await ensureLeaseDirExists()
  try {
    const existingLease = await fs.readFile(LEASE_FILE, 'utf-8')
    const currentLease = JSON.parse(existingLease) as Lease

    if (currentLease.id !== lease.id) {
      throw new Error('Lease is held by another process')
    }

    const newLease: Lease = {
      ...lease,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // Extend by 5 minutes
    }

    await fs.writeFile(LEASE_FILE, JSON.stringify(newLease, null, 2))
    return newLease
  } catch (error) {
    if ((error as FileSystemError).code === 'ENOENT') {
      throw new Error('Lease has been released')
    }
    throw error
  }
}
