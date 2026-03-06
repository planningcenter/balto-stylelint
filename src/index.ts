import * as core from "@actions/core"
import { detectChangedFiles, detectChangedFilesInFolder } from "./git_utils"
import { getExecOutput } from "@actions/exec"
import { ResultObject, StylelintResult } from "./stylelint_result"

async function run() {
  let workingDirectory = core.getInput("working-directory")
  if (workingDirectory) {
    process.chdir(workingDirectory)
  }

  core.debug(`Current directory: ${process.cwd()}`)

  let eventPath = process.env.GITHUB_EVENT_PATH
  if (!eventPath)
    throw new Error("GITHUB_EVENT_PATH environment variable not found.")
  let event = require(eventPath)

  core.debug(`Event: ${event}`)

  let compareSha = event.pull_request.base.sha

  core.debug(`Compare sha: ${compareSha}`)

  let changedFiles = []
  if (workingDirectory) {
    changedFiles = await detectChangedFilesInFolder(
      compareSha,
      workingDirectory,
    )
  } else {
    changedFiles = await detectChangedFiles(compareSha)
  }

  core.debug(`Changed files: ${changedFiles}`)

  let extensions = core.getInput("extensions").split(",")
  core.debug(`Extensions: ${extensions}`)
  let changedFilesMatchingExtensions = changedFiles.filter((file) =>
    extensions.some((ext) => file.endsWith(ext)),
  )
  core.debug(
    `Changed files matching extensions: ${changedFilesMatchingExtensions}`,
  )

  if (changedFilesMatchingExtensions.length === 0) return

  let { stdout: stylelintOut, exitCode } = await getExecOutput(
    "npx stylelint --formatter=json",
    changedFilesMatchingExtensions,
    { ignoreReturnCode: true },
  )
  let stylelintJson = JSON.parse(stylelintOut)
  core.debug(`Stylelint exit code: ${exitCode}`)

  let promises: Array<Promise<StylelintResult>> = stylelintJson.map(
    (resultObject: ResultObject) =>
      StylelintResult.for(resultObject, compareSha),
  )
  let stylelintResults = await Promise.all(promises)

  core.debug("Stylelint results ->")
  stylelintResults.forEach((result) => core.debug(JSON.stringify(result)))
  core.debug("<- Stylelint results")

  let isFailure = null
  let warningCount = 0
  let errorCount = 0

  stylelintResults.forEach((r) => {
    r.outputAnnotations()
    warningCount += r.relevantWarningCount
    errorCount += r.relevantErrorCount
  })

  let totalCount = warningCount + errorCount
  core.exportVariable("warning-count", warningCount)
  core.exportVariable("error-count", errorCount)
  core.exportVariable("total-count", totalCount)

  let failureLevel = core.getInput("failure-level").toLowerCase()
  switch (failureLevel) {
    case "warning":
      if (warningCount > 0 || errorCount > 0) isFailure = true
      break
    case "error":
      if (errorCount > 0) isFailure = true
      break
    default:
      throw new Error("Unrecognized failure-level input")
  }

  let exitCodeOnFailure = core.getInput("conclusion-level").toLowerCase()
  if (isFailure && exitCodeOnFailure === "failure") {
    core.setFailed(
      `Action failed because failure-level is ${failureLevel}, conclusion-level is ${exitCodeOnFailure}, and there are ${warningCount} warning(s) and ${errorCount} error(s)`,
    )
  }
}

run()
