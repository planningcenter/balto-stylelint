import * as core from "@actions/core"
import { ChangeRange, generateChangeRanges } from "./git_utils"

export type ResultObject = {
  source: string
  warnings: StylelintWarning[]
}

type StylelintWarning = {
  rule: string
  severity: "warning" | "error"
  text: string
  line: number
  column: number
  endLine?: number
  endColumn?: number
}

export class StylelintResult {
  public relevantWarningCount: number = 0
  public relevantErrorCount: number = 0
  private resultObject: ResultObject
  private changeRanges: ChangeRange[]
  private relevantMessages: StylelintWarning[] = []

  static async for(
    resultObject: ResultObject,
    compareSha: string,
  ): Promise<StylelintResult> {
    const changeRanges = await generateChangeRanges(
      resultObject.source,
      compareSha,
    )
    return new StylelintResult(resultObject, changeRanges)
  }

  constructor(resultObject: ResultObject, changeRanges: ChangeRange[]) {
    this.resultObject = resultObject
    this.changeRanges = changeRanges
    this.findRelevantMessages()
    this.calculateCounts()
  }

  outputAnnotations() {
    this.relevantMessages.forEach((msg) => {
      let options: core.AnnotationProperties = {
        title: msg.rule,
        file: this.repoFilePath,
        startLine: msg.line,
        endLine: msg.endLine,
        startColumn: msg.column,
        endColumn: msg.endColumn,
      }
      switch (msg.severity) {
        case "warning":
          core.warning(msg.text, options)
          break
        case "error":
          core.error(msg.text, options)
        default:
          break
      }
    })
  }

  private findRelevantMessages() {
    this.relevantMessages = this.warnings.filter((m) =>
      this.changeRanges.some((changeRange) => changeRange.doesInclude(m.line)),
    )
  }

  private calculateCounts() {
    this.relevantMessages.forEach((msg) => {
      switch (msg.severity) {
        case "warning":
          this.relevantWarningCount += 1
          break
        case "error":
          this.relevantErrorCount += 1
        default:
          break
      }
    })
  }

  private get warnings() {
    return this.resultObject.warnings
  }

  private get repoFilePath() {
    let absoluteFolderPath = process.env.GITHUB_WORKSPACE
    if (!absoluteFolderPath)
      throw new Error("process.env.GITHUB_WORKSPACE was empty")
    return this.resultObject.source.replace(`${absoluteFolderPath}/`, "")
  }
}
