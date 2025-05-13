# Getting Started with Changesets

## Install Changesets in Your Repository

Install Changesets as a dev dependency in your monorepo:

```shell
pnpm add -D @changesets/cli
```

Then, initialize Changesets (this will create a `.changeset` folder and a config file):

```shell
pnpm changeset init
```

## Set Up GitHub Actions for Automated Versioning

To automate versioning and releases, add the Changesets GitHub Action to your repository. Create a workflow file at `.github/workflows/on-main.yaml` (or update your existing one) with the following key steps:

- Use the `peter-murray/workflow-application-token-action` to authenticate with a GitHub App.
- Use the generated token for all steps that require repository access (checkout, changesets, tagging, etc.).
- Run the Changesets action to create or update a release PR.
- When the release PR is merged, tag the release and publish packages if configured.

Refer to the `docs/GITHUBACTIONS.md` for a detailed example and explanation of the workflow file.

## Add the Changesets Bot

The Changesets bot helps automate the release PR process. To add it:

1. Go to the [Changesets bot GitHub App page](https://github.com/apps/changeset-bot).
2. Click "Install" and select your repository.
3. The bot will now be able to create and update release PRs automatically when changesets are merged to `main`.

## Add a Changeset When Making Changes

Whenever you make a change that should result in a new release (bug fix, feature, breaking change), add a changeset to your pull request:

```shell
pnpm changeset
```

Follow the prompts to select affected packages and the type of change. Commit the generated markdown file in `.changeset/` along with your code changes.

## The Automated Versioning Flow

1. **Open a PR with a changeset file.**
2. **Merge to `main`.** The workflow detects new changesets and creates a release PR.
3. **Merge the release PR.** The workflow tags the release and publishes packages if configured.

## Example Workflow

```shell
# Install Changesets (one-time setup)
pnpm add -D @changesets/cli
pnpm changeset init

# Make your code changes
git checkout -b my-feature

# Add a changeset
pnpm changeset

# Commit your changes and the changeset file
git add .
git commit -m "Add new feature with changeset"

# Push and open a PR
git push origin my-feature
# (Open a PR on GitHub)

# After review, merge the PR to main
# The GitHub Action will create a release PR
# Merge the release PR to main to tag and publish the release
```

## Troubleshooting

- **No release PR is created:** Ensure your PR includes a changeset file in `.changeset/`.
- **Workflow fails on tag:** Check that the GitHub App credentials are set up correctly in repository secrets.
- **Changelog not updated:** Only changes described in changesets will appear in the changelog.
