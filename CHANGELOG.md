# CHANGELOG

## Nuevas Características
- add interactive wizard CLI for hito 8 (#wizard) (`wizard`) (`435737c58cd47354228d7ba42b76ece2bf2fbfd5`)
  > Implements the wizard subcommand with two conversational flows:
- wizard init: creates/updates .gitdocrc.json interactively
- wizard generate: guides report generation step by step

Co-authored-by: wizard-cli branch
- implement enriched PAP sections and remote autolinking for hito 7 (`renderer`) (`d72b8f5876382e112c20c5c17576e78e124cbe22`)
  > - Add parseInstructions(body): extracts RUN/MIGRATE, ROLLBACK, VERIFY directives from commit body
- Refactor groupForPap(): enriches each commit with structured instructions (run/rollback/verify) and hasInstructions flag
- implementar hito 6 personalizacion, rutas flexibles y verbosidad (`cli`) (`1433e8ed46801517a39fdf8d0bcee5f6bae4ff86`)
- implement grouping, Handlebars rendering and file output (`renderer`) (`a073a7b06e38a17398dfc3ecee839a020d7932a4`)
  > - Add groupForChangelog(): filters feat|fix|perf|refactor, isolates BREAKING
  CHANGES into a dedicated section, orders sections canonically in Spanish
- Add groupForPap(): filters ci|build and infra scopes (db, infra, docker,
  config), groups by scope key
- Add loadTemplate() for async .hbs file loading
- Add renderDocument() orchestrating grouping + Handlebars compile + inject
- Enrich templates/changelog.hbs: Breaking Changes block, scope labels, spacing
- Enrich templates/pap.hbs: bold subject, optional body blockquote
- Update pipeline.js: integrate renderDocument, wire --scope filter, write
  physical CHANGELOG.md / PAP.md in normal mode, print Markdown + yellow
  simulation notice in --dry-run mode
- Add 13 unit tests for renderer (groupForChangelog, groupForPap, renderDocument)
- Update 3 integration tests to match new --dry-run Markdown contract
- implement business linter engine (`linter`) (`fde975eda8e9f3d585910652121db807dd7f3305`)
  > - loadRules() reads config/rules.json from disk
- lintCommit() validates required fields, allowedTypes and forbidden terms (case-insensitive)
- Pipeline aborts with exit code 1 and red output on violations
- 8 unit tests + 2 integration tests — 23/23 passing
- Hito 3 marked complete in docs and README updated with linter guide
- implement Git extraction and semantic parsing for milestone 2 (`git-parser`) (`8e3de673fe1ca2b30c99857ed320dbb836ed1684`)
  > - Integrate simple-git to retrieve commit logs with dynamic range selection
- Add repository check and commit presence validation to prevent empty/invalid runs
- Parse commit messages using conventional-commits-parser into structured JSON format
- Refactor bin/cli.js by delegating execution flow and validation logic to runPipeline/runGenerate helpers in src/pipeline.js
- Implement comprehensive unit tests for getCommits and parseCommit, and integration tests for cli.js
- Update project status and documentation in README.md and hitos planning
- rename option --desde to --from and add --to in English (`cli`) (`5a5948e5dbd8e70e5dc27e9d6ed3eb7f84ca7031`)
- add validation for generate command tipo argument (`cli`) (`0119ef2421805076cbc16af78b0adfb568f39a8f`)
- initialize project structure and define branching agent (`setup`) (`01eef76e62acbc12ef997b0306d9140a57da55ad`)
- definir perfiles y especificaciones para el equipo de agentes (`agentes`) (`a69d5b9580b72d12b5a784b2a8c40bd188afd8bb`)

## Correcciones de Bugs
- skip linter for non-conventional commits (null type) (`pipeline`) (`3efcbc8a3d385d659a53a3f82e7d94f3516d1ad7`)

## Documentación
- update README with hitos 5, 6 and 7 progress and new features (`readme`) (`87aeaf74aa4d6061e49f7350dd0a070be7320df2`)
- mark hito 7 complete and update epica with implementation details (`hitos`) (`1ddd610e0d6747b1364f584ca36c82c64c49dcc7`)
- add ERS and milestone planning for phase 2 (`plan`) (`d777b39f3c8b7b644be5144b5ac0d9dc2c69c3c2`)
- generate CHANGELOG documentation for milestone 5 (`changelog`) (`6c4003d5edc6aa7448e896ebd9581aa1e0b08c6c`)
- generate PAP documentation for milestone 5 (`pap`) (`799c7a40f98ce4c9ca01400829163d00981a85d7`)
- mark hito 4 complete and update epica with implementation details (`hitos`) (`baf8ab0cc28f761fa18d8ab9b2e699d932d12ae6`)
- add project readme with user guide and milestone 1 progress (`readme`) (`bb25c2a61b599e56be13f012f0b615f34d68395f`)
- document git error handling and edge cases (`hitos`) (`fe3428ba6b7af40b17458e46d215c07c98702807`)
- add milestones and epics planning structure (`hitos`) (`961c0e575fa69507ef8030874a8035e0acdb4dac`)
- add software requirements specification (ERS) (`requirements`) (`4a71c1e64823465759255c7e101e21b98e1ea06c`)
- mejorar el formato del archivo de especificacion de proyecto (`espec`) (`42fd5954b905c7f123b1d01a53c46edc949725db`)

## Pruebas
- add integration tests for tipo validation (`cli`) (`ae2a002b54ef8beb2ee2da809ec37bcdaeed27a9`)

## Compilación
- implement mock tests and complete hito 5 (`config`) (`df6d6e43c5a067a71a0bdcc543207d1a074d5166`)

