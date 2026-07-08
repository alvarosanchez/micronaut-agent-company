---
name: gh-cli
description: "Reference the upstream GitHub gh CLI skill only for explicit human/operator exceptions where a non-plugin GitHub client is authorized. Normal GitHub API operations must use the GitHub Sync plugin tools, including the Hermes MCP-bridged runtime names when present. Do not depend on a propagated GITHUB_TOKEN and do not search the filesystem, plugin config, or other files for a token. Any maintainer-visible non-plugin GitHub write still requires the manual GitHub-flavored Markdown footer: one blank line, `---` on its own line, then `###### \u2728 This message was AI-generated using <exact model id>`."
metadata:
  sources:
    - kind: url
      url: https://skills.sh/github/awesome-copilot/gh-cli
      attribution: awesome-copilot
      usage: identity
    - kind: github-file
      repo: github/awesome-copilot
      path: skills/gh-cli/SKILL.md
      commit: e9a7805e2b1dbda5ad4d0cc9be1fc3ef6273e115
      sha256: 18e53a9f4c154406a072ed4cfbc524d40f9a4734ef25102086c1ef5e24113a76
      attribution: awesome-copilot
      usage: referenced
---
