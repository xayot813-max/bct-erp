import { rm } from "node:fs/promises"
import { join } from "node:path"

const nextBuildDir = join(process.cwd(), ".next")

await rm(nextBuildDir, { recursive: true, force: true })

