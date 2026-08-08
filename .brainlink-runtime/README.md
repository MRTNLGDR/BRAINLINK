# Brainlink runtime overlay bundle

The ordered `runtime.part*.b64` files concatenate into one Base64-encoded `tar.gz`. The decoded archive SHA-256 is `1b4e3aa98dd378eb7299e071aa83329643114e40b3e66a378c319613a2a94b8d`.

The materialization scripts verify this checksum before extraction. The archive contains the Brainlink-owned runtime source, AFFiNE route integrations, package metadata, validators, unit tests and ADRs produced from the audited source package.
