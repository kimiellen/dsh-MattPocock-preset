---
"dsh-mattpocock-preset": patch
---

Fix `customSkillDirs` resolution in the generated preset patch. Bundle patches are merged into the profile's root include, so the loader `baseUrl` at mount time is the profile directory, not the patch file. The previous expression therefore resolved to `<dsh home>/skills/engineering`, a directory that does not exist, and the MattPocock preset silently mounted with an empty skill catalog: no skills in the `/` menu, none loadable by the model. The install script now generates an expression that locates this package through Node resolution from `baseUrl`, the same mechanism the official `cordis` preset uses.
