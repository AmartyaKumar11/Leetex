export {
  findResultPanels,
  findResultContainers,
  CONSOLE_RESULT_LOCATOR,
  SUBMISSION_RESULT_LOCATOR,
  TESTCASE_RESULT_LOCATOR
} from "~/features/results/panel-discovery"
export type { ExtractionSource, ResultPanelMatch } from "~/features/results/panel-discovery"
export {
  extractPanelModel,
  normalizePanelModel
} from "~/features/results/panel-model"
export type { PanelModel } from "~/features/results/panel-model"
export { extractResultDataFromDom } from "~/features/results/extract-result-from-dom"
