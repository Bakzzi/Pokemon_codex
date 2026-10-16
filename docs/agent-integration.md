# AI agent integration

The displayed product name is **AI Agent 포켓몬 키우기**. Readable Codex and Claude Code sources are tracked independently. The header uses `CODEX`, `CLAUDE`, or `CODEX + CLAUDE`; no source uses `AI AGENT`. The connection indicator is the short `연결됨` / `연결 대기`, with per-agent local and SSH information in its tooltip.

- Codex keeps its existing rollout reader and usage identity.
- Claude Code uses `CLAUDE_CONFIG_DIR/projects` or `~/.claude/projects`, including nested subagent transcripts. It does not inspect general Claude chat storage, authentication files or settings.
- Every record is reduced to a lifecycle marker, hashed message identity and validated integer counters at the reader boundary. Prompt/response bodies and tool arguments are neither persisted nor forwarded by the collector.
- The initial tail is a baseline, including any partial historical line completed later. New Claude messages count their actual output tokens from zero; repeated updates to the same message count only positive growth. Session activity has one identity independent of the message counters.
- The SSH collector uses the same readers, sends only reduced events, and retains existing host verification and credential storage. Mirrored local/remote records use the same hashed identity, preventing duplicate credit.
- Codex quota windows stay attributed to Codex. Claude transcripts do not supply remaining account quota through this adapter, so the UI shows `미제공` rather than reusing another agent's quota or estimating it.
- Display names do not change existing progress paths, updater identity, executable name or saved SSH configuration.

Format references: [Claude Code session storage](https://code.claude.com/docs/en/agent-sdk/sessions), [lifecycle events and transcript paths](https://code.claude.com/docs/en/hooks), [usage counter definitions](https://code.claude.com/docs/en/monitoring-usage).

Validation uses generated transcript fixtures and an isolated SSH server. A real Claude Code session is not available on this development PC; fixture results must not be reported as an actual Claude account/session test.
