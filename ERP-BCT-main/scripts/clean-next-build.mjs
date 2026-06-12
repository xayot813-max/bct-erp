import { rm } from "node:fs/promises"
import { join } from "node:path"

const outputMode = process.env.NEXT_OUTPUT_MODE === "dev" ? "dev" : "build"
const targetDir = outputMode === "dev" ? ".next-dev" : ".next-build"
const nextBuildDir = join(process.cwd(), targetDir)

await rm(nextBuildDir, { recursive: true, force: true })
