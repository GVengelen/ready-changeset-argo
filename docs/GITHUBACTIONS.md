# GitHub Actions Automation

## Overview

This document explains how GitHub Actions are used in this repository to automate releases, Docker image builds, and other CI/CD tasks. It covers the workflow structure, authentication using a GitHub App, and how to extend or troubleshoot the automation.

## Requirements
- A GitHub App with appropriate permissions (see below)
- Repository secrets for the GitHub App credentials
- Docker and Node.js configured in your workflows

## Workflows

### 1. Release Workflow (`on-main.yaml`)

This workflow is triggered on every push to the `main` branch. It automates the process of creating release pull requests, tagging releases, and publishing changes using [Changesets](https://github.com/changesets/changesets).

**Key steps:**
- **Authenticate with GitHub App:** Uses the `peter-murray/workflow-application-token-action` to generate a token from your GitHub App credentials. This token is used for all subsequent steps that require repository access. Note: The default `GITHUB_TOKEN` will not trigger workflows on tag creation (such as Docker image builds) due to GitHub security restrictions. Using a GitHub App token is required for workflows that need to trigger additional workflows or build on tag events.
- **Checkout repository:** Uses the generated token to securely check out the code.
- **Install dependencies:** Sets up Node.js and installs dependencies with PNPM.
- **Create release PR:** Runs the Changesets action to create or update a release pull request and publish GitHub releases.
- **Tag release:** If a release was created, tags the commit and pushes the tag to the repository.

**Required secrets:**
- `APPLICATION_ID`: The App ID of your GitHub App
- `APPLICATION_PRIVATE_KEY`: The private key for your GitHub App

### 2. Docker Image Build & Push Workflow (`on-tag.yaml`)

This workflow runs when a tag matching `docs@*.*.*` or `web@*.*.*` is pushed. It builds and pushes Docker images for the corresponding app to the GitHub Container Registry (GHCR).

**Key steps:**
- **Extract package name and version:** Parses the tag to determine which app and version to build.
- **Checkout repository:** Checks out the code at the tagged commit.
- **Set up Docker Buildx:** Prepares the environment for multi-platform Docker builds.
- **Authenticate to GHCR:** Logs in to the GitHub Container Registry using the default `GITHUB_TOKEN`.
- **Build and push image:** Builds the Docker image for the app and pushes it to GHCR with both a short SHA and `latest` tag. Uses build cache for faster builds.

## Authentication with a GitHub App

Instead of using a Personal Access Token (PAT), these workflows use a GitHub App for authentication. This provides fine-grained permissions and improved security.

**How it works:**
- The workflow uses the `peter-murray/workflow-application-token-action` to generate a temporary token from your GitHub App credentials.
- This token is used for all steps that require repository write access (e.g., pushing tags, creating releases).

**Setting up the GitHub App:**
1. Create a GitHub App in your organization or user settings.
2. Grant the app `Contents: Read & write` and `Metadata: Read-only` permissions.
3. Install the app in your repository.
4. Generate a private key and add the following secrets to your repository:
   - `APPLICATION_ID`: The App ID of your GitHub App
   - `APPLICATION_PRIVATE_KEY`: The private key (as a single-line string, with line breaks as `\n`)

## Customization
- **Add new workflows:** Copy the authentication and checkout steps to ensure secure access.
- **Change build targets:** Update the `on-tag.yaml` workflow to match new app names or tag patterns.
- **Update dependencies:** Adjust the Node.js or PNPM versions as needed in the workflow files.

## Troubleshooting
- **Token errors:** Ensure your GitHub App is installed in the repository and the secrets are correct.
- **Docker push failures:** Check that the `packages: write` permission is set in the workflow and that the `GITHUB_TOKEN` is valid.
- **Changeset issues:** Make sure the Changesets action is configured with the correct environment variables and permissions.