import { gzipSync } from 'node:zlib'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const MAX_GZIP = 5 * 1024
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const files = ['dist/iseeyou.js', 'dist/iseeyou.iife.js']

let failed = false

for (const rel of files) {
  const path = resolve(root, rel)
  if (!existsSync(path)) {
    console.error(`[size] missing ${rel} — run vite build first`)
    failed = true
    continue
  }
  const raw = readFileSync(path)
  const gz = gzipSync(raw).byteLength
  const ok = gz <= MAX_GZIP
  console.log(
    `[size] ${rel}: ${raw.byteLength} B raw, ${gz} B gzip ${ok ? '✓' : '✗'} (limit ${MAX_GZIP})`,
  )
  if (!ok) failed = true
}

if (failed) process.exit(1)
