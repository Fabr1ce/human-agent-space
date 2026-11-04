MASTER IMPLEMENTATION PROMPT
Agent Workspace: Universal Human + AI Coding Agent Workspace
1. YOUR ROLE

You are the principal software architect, senior full-stack engineer, AI systems engineer, and technical product owner responsible for designing and building an open, local-first, agent-independent workspace for human developers and AI coding agents.

You are responsible for:

Researching existing implementations and academic research.
Designing the system architecture.
Defining the workspace specification.
Building the core implementation.
Implementing agent integrations.
Developing the memory and context engines.
Building the CLI and human interface.
Creating automated tests and evaluation benchmarks.
Maintaining compatibility with existing agent standards.
Documenting the system so independent developers can implement compatible integrations.

Do not treat this as a simple agent memory application.

The goal is to create a persistent, transparent, human-owned environment that manages everything surrounding AI-assisted software development.

You should think of this as infrastructure that sits between the developer, their projects, and all the AI coding agents they use.

2. PRODUCT VISION

Build a universal, local-first workspace where humans and AI agents share persistent knowledge, memory, context, rules, skills, decisions, projects, and working history.

The workspace must work independently of any particular coding agent.

A developer should be able to use the same workspace with:

OpenAI Codex.
Claude Code.
Cursor.
Windsurf.
Aider.
Gemini CLI.
OpenCode.
Future coding agents.
Custom agent implementations.

The developer must never have to rebuild their knowledge when switching coding agents.

The workspace owns the knowledge.

Coding agents consume and contribute to that knowledge through standardized interfaces.

The human can inspect, modify, approve, reject, export, and delete information.

Core product statement

An open, local-first, agent-independent knowledge and collaboration environment that allows humans and AI agents to build, share, maintain, and evolve a common understanding of their work.

Core principles
Agent agnostic.
Local first.
Human readable.
Human controlled.
Portable.
Extensible.
Modular.
Interoperable.
Secure by default.
Transparent and auditable.
Designed for multiple projects and multiple agents.
Capable of evolving knowledge over time.

The workspace must not require a cloud account or proprietary service.

Cloud synchronization may eventually be an optional extension.

3. RESEARCH AND EXISTING IMPLEMENTATIONS

Before implementation, inspect the referenced research and projects.

Do not blindly copy them.

Identify useful architecture patterns, understand their limitations, and incorporate the strongest ideas into this implementation.

Record findings in:

docs/research/

Include:

Source URL.
Project or paper name.
Publication date where available.
Research or implementation approach.
Relevant findings.
Architectural ideas worth adopting.
Limitations.
How the findings influence our implementation.

Verify that repositories and papers exist and that their current documentation supports the stated features. Do not assume earlier research summaries are perfectly accurate or current.

3.1 Academic research
Memory architecture
A Survey on the Memory Mechanism of Large Language Model-based Agents (2025)

https://arxiv.org/abs/2404.13501

Important concepts:

Memory writing.
Memory reading.
Memory management.
Consolidation.
Deduplication.
Reflection.
Forgetting.
External knowledge.

Application:

Build memory as a complete lifecycle rather than a simple save-and-retrieve mechanism.

Memory Matters: The Need to Improve Long-Term Memory in LLM-Agents (2024)

https://ojs.aaai.org/index.php/AAAI-SS/article/view/27688

Important concepts:

Episodic memory.
Semantic memory.
Procedural memory.
Working memory.
Long-term memory.

Application:

Use distinct memory categories and retrieval strategies.

Generative Agents: Interactive Simulacra of Human Behavior (2023)

https://arxiv.org/abs/2304.03442

Important concepts:

Memory streams.
Reflection.
Planning.
Higher-level knowledge extraction from experiences.

Application:

Build a reflection engine that can identify recurring patterns and generate candidate knowledge from accumulated experiences.

MemGPT: Towards LLMs as Operating Systems (2023)

https://arxiv.org/abs/2310.08560

Important concepts:

Hierarchical memory.
Active context.
External memory.
Selective information transfer.
Context management.

Application:

Build hierarchical context management. Never load the entire workspace into an agent's context.

Learning from experience
Reflexion: Language Agents with Verbal Reinforcement Learning (2023)

https://arxiv.org/abs/2303.11366

Important concepts:

Attempt evaluation.
Verbal feedback.
Reflection.
Learning from failures.

Application:

Preserve unsuccessful attempts and verified solutions so future agents can avoid repeating mistakes.

Voyager: An Open-Ended Embodied Agent with Large Language Models (2023)

https://arxiv.org/abs/2305.16291

Important concepts:

Growing skill libraries.
Reusable capabilities.
Skill discovery.
Skill retrieval.
Skill improvement.

Application:

Build a portable skills registry supporting instructional, executable, and composite skills.

Context engineering and evaluation
A Survey of Context Engineering for Large Language Models (2025)

https://arxiv.org/abs/2507.13334

Important concepts:

Context retrieval.
Context generation.
Context processing.
Context management.
Tool integration.
Multi-agent context.

Application:

Treat context engineering as a separate core subsystem, not merely a memory feature.

LongMemEval: Benchmarking Chat Assistants on Long-Term Interactive Memory (2025)

https://arxiv.org/abs/2410.10813

Important concepts:

Information extraction.
Multi-session reasoning.
Temporal reasoning.
Knowledge updates.
Abstention.

Application:

Build a memory evaluation suite based on these capabilities.

MemBench: Towards More Comprehensive Evaluation on the Memory of LLM-based Agents (2025)

https://aclanthology.org/2025.findings-acl.989/

Important concepts:

Factual memory.
Reflective memory.
Memory effectiveness.
Efficiency.
Memory capacity.

Application:

Measure whether stored information actually improves future agent performance.

UTILMEM: Benchmarking Evidence Utilization in Long-Term Conversational Memory (2026)

https://arxiv.org/abs/2608.30508

Important concepts:

Evidence utilization.
Multi-session reasoning.
Distributed evidence.
Relevant versus irrelevant information.

Application:

Measure both retrieval quality and successful use of retrieved context.

Learning to Remember: Advances in Memory Mechanisms for Large Language Models (October 2026)

https://arxiv.org/abs/2610.35089

Important concepts:

Memory construction.
Maintenance.
Retrieval.
Consolidation.
Forgetting.
Governance.
Evaluation.

Application:

Treat memory as an evolving managed resource.

Human-agent collaboration
When Combinations of Humans and AI Are Useful (2024)

https://www.nature.com/articles/s41562-024-02024-1

Important concepts:

Human-AI complementarity.
Human oversight.
Division of responsibilities.
Limitations of combined human-AI performance.

Application:

Optimize for human-agent collaboration, not maximum autonomy.

Shared Mental Models in Human-AI Teams

https://www.tandfonline.com/doi/full/10.1080/1463922X.2022.2061080

Important concepts:

Shared understanding.
Common goals.
Shared environment.
Responsibilities.
Situation awareness.

Application:

Create a structured shared workspace state representing what the human and agents understand about the project.

Agent Transparency: A Review of Current Theory and Evidence (2020)

https://ieeexplore.ieee.org/document/8982042/

Important concepts:

Transparency.
Explainability.
Situation awareness.
Trust.
Human oversight.

Application:

Build context inspection, memory provenance, evidence tracking, and transparent agent activity.

3.2 Existing open-source projects to study

These repositories are architectural references.

Inspect their actual source code, directory structures, documentation, issues, and available tests when practical.

ProjectMem

https://github.com/riponcm/projectmem

Study:

Local-first memory.
Structured events.
Failed-attempt tracking.
MCP integration.
Cross-agent memory.
Project-specific knowledge.
Shared Agent Memory

https://github.com/dan-calin/shared-agent-memory

Study:

Shared agent memory.
Global and project scopes.
Agent configuration generation.
Multi-agent coordination.
Session management.
Orqenix

https://orqenix.dev/

Study:

Local runtime architecture.
Modular subsystems.
Memory.
Skills.
Plugins.
Orchestration.
MCP integration.
Local control plane.
Agent Workbench

https://github.com/chud-lori/agent-workbench

Study:

Local memory.
SQLite.
FTS5.
Code indexing.
Agent diagnostics.
deja

https://github.com/vshulcz/deja-vu

Study:

Cross-agent session history.
Historical conversation indexing.
MCP-based retrieval.
Session synchronization.
Secret filtering.
Memryzed

https://github.com/hamzaarja/memryzed

Study:

Global, project, and session memory.
SQLite.
MCP.
Memory approval queues.
mnemo

https://github.com/jmeiracorbal/mnemo

Study:

Stable memory contracts.
Event controllers.
Project activation.
Provenance.
Diagnostics.
Cairntir

https://github.com/pnmc
