# Balto - Stylelint

A GitHub Action that runs [Stylelint](https://stylelint.io/) on changed files in a pull request and only annotates changed lines.

## How it works

When triggered on a pull request, this action:

1. Detects which files have changed compared to the base branch
2. Filters for files matching the configured extensions (`.scss`, `.css` by default)
3. Runs Stylelint on only those files
4. Compares lint results against the git diff to only annotate lines that were actually changed

This means existing lint violations won't clutter your PR — only new issues on lines you touched will be flagged.

## Setup

### Prerequisites

Your repository must have Stylelint installed and configured (e.g., a `.stylelintrc` or `stylelint.config.js`).

### Usage

```yaml
# .github/workflows/stylelint.yml
name: Stylelint
on: [pull_request]

jobs:
  balto-stylelint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
      - run: npm ci
      - uses: planningcenter/balto-stylelint@v1
```

> **Note:** `fetch-depth: 0` is required so the action can diff against the base branch.

### Inputs

| Input               | Description                                                                 | Default        |
| ------------------- | --------------------------------------------------------------------------- | -------------- |
| `failure-level`     | The lowest annotation level to fail on (`"warning"` or `"error"`)           | `"error"`      |
| `conclusion-level`  | Action conclusion (`"success"` or `"failure"`) if failure-level annotations exist | `"success"` |
| `working-directory` | Which directory to run the action in                                        | `"."`          |
| `extensions`        | A comma separated list of extensions to run Stylelint on                    | `".scss,.css"` |

### Outputs

| Output          | Description                              |
| --------------- | ---------------------------------------- |
| `warning-count` | Number of relevant warnings found        |
| `error-count`   | Number of relevant errors found          |
| `total-count`   | Number of relevant warnings and errors   |

## Contributing

1. Install [devbox](https://www.jetify.com/devbox)
2. Run `devbox setup`
3. Make your changes in `src/`
4. Run `npm run build` to bundle
5. Run `npm test` to verify (requires [act](https://github.com/nektos/act))

### Development

```bash
npm run dev  # Watch mode — rebuilds and tests on file changes
```
