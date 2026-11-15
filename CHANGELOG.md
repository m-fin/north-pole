# Changelog

## [1.0.0] - 2026-11-15

### Added

- Semantic token colors so modern VS Code highlighting stays on the holiday palette
- Workbench colors for editor selection, the terminal, git decorations, diffs, and peek views
- Theme checks, a current `@vscode/vsce` package script, and a GitHub Pages preview
- An original mark: pine, candle star, and a striped pole on polar night

### Changed

- Palette shifted from pure red, pure green, and pure white to polar night, holly, evergreen, candle gold, and snow
- Theme file renamed to `themes/north-pole-color-theme.json`
- Minimum VS Code version raised to 1.85

### Fixed

- Comments (`#333333` on `#111111`) failed contrast and were hard to read
- Numbers, function calls, and plain text all used the same white
- Editor selections never set `editor.selectionBackground`
- Deprecated workbench color ids from the 2019 theme
- A duplicated global token-color rule
- Removed the unused starter palette that was not part of North Pole

### Removed

- Checked-in `.vsix` packages and `.DS_Store` files

## [0.0.6] - 2019-11-04

Last published build of the original red, green, and white theme.
