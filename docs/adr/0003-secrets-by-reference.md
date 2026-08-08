# ADR-0003 — Secrets by reference only

Status: ACCEPTED — 2026-08-08

Connections may persist identifiers, endpoint metadata, capabilities and status. Raw secret values are not part of `BrainlinkState`, must not be rendered in governance views and must be supplied by the eventual platform secret broker at execution time.
