# Security policy

## Reporting a vulnerability

Please report suspected vulnerabilities privately. Once this repository is published, use GitHub's private vulnerability reporting or security advisory form from the repository's **Security** tab. If that feature is unavailable, contact the maintainers through a private, non-public channel before sharing details. Do not open a public issue for an unpatched vulnerability.

Include the affected area, a clear reproduction or proof of concept, the potential impact, and any suggested mitigation. Please allow maintainers reasonable time to investigate and release a fix before public disclosure.

## In scope

Reports are welcome for issues that could cause unauthorized access or data exposure, including:

- authentication, session, invite-token, role, or access-control bypasses;
- exposure of `AUTH_SECRET`, database credentials, The Odds API keys, or other server-side configuration;
- cross-user access to watchlists, alerts, invites, or administrative data;
- unsafe handling of database queries, route-handler inputs, or provider responses;
- vulnerabilities introduced by application dependencies or the deployment configuration.

The public repository, mock data, documented placeholder values, and known unimplemented features are not themselves vulnerabilities. Do not use real accounts, real personal data, or live provider credits while testing.

## Secret-handling warning

Never commit `.env`, `.env.local`, any other `.env*` file containing real values, an API key, a database connection string with credentials, an auth secret, an invite token, or a password. If a The Odds API key is leaked, rotate it immediately at [the-odds-api.com](https://the-odds-api.com), then remove the exposed key from the affected secret store and review logs and history.
