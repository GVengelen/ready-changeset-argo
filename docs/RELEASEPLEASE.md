# Release Please for Helm Charts

This guide explains how to use [Release Please](https://github.com/googleapis/release-please) to automate versioning and releasing of Helm charts in this monorepo, and how to integrate the released charts with ArgoCD.

## Add the base Helm chart

Create your base Helm chart in `charts/base/`:

```sh
helm create charts/base
```

Commit the chart to the repository.

## Add app Helm charts

For each app (for example, `web`, `docs`), create a Helm chart **without templates**:

```sh
helm create charts/web
helm create charts/docs
```

Remove the `templates/` directory from each app chart:

```sh
rm -rf charts/web/templates charts/docs/templates
```

In each app chart, configure the base chart as a dependency by editing `charts/web/Chart.yaml` and `charts/docs/Chart.yaml`:

```yaml
# Example for charts/web/Chart.yaml
apiVersion: v2
name: web
version: 0.1.0
dependencies:
  - name: next-app
    version: {{version}}
    repository: oci://ghcr.io/gvengelen/helm
```

Repeat for `charts/docs/Chart.yaml`.

Commit these charts to the repository.

## Configure Release Please

Add a `release-please-config.json` in the `charts/` directory:

```json
{
  "packages": {
    "charts/base": {
      "package-name": "base-helm",
      "release-type": "helm",
      "include-v-in-tag": false
    },
    "charts/web": {
      "package-name": "web-helm",
      "release-type": "helm",
      "include-v-in-tag": false
    },
    "charts/docs": {
      "package-name": "docs-helm",
      "release-type": "helm",
      "include-v-in-tag": false
    }
  }
}
```

Commit this config file.

## Set up GitHub App permissions

Release Please needs to label PRs and create releases.

- The GitHub App used for automation must have **read and write access to Issues** (to add labels to PRs).
- Also ensure it has access to contents and pull requests.

## Add Release Please pipelines

Add a workflow to trigger Release Please for Helm chart changes (for example, `.github/workflows/trigger.on-push-main.helm.yml`):

```yaml
name: Release Helm Chart

on:
  push:
    branches:
      - main
    paths:
      - 'charts/**'

permissions:
  contents: write
  pull-requests: write

jobs:
  create-release:
    secrets: inherit
    strategy:
      fail-fast: true
    uses: ./.github/workflows/action.helmrelease.yml
```

Add a workflow to package and push Helm charts on tag (for example, `.github/workflows/trigger.on-push-tag.helm.yml`):

```yaml
name: Push Helm Tag
on:
  push:
    tags:
      - "base-helm-*.*.*"
      - "docs-helm-*.*.*"
      - "web-helm-*.*.*"
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  normalize_tag:
    runs-on: ubuntu-latest
    outputs:
      tag: ${{ steps.generate_tag.outputs.tag }}
      app: ${{ steps.generate_tag.outputs.app }}
    steps:
      - id: generate_tag
        run: |
          tagname=${{ github.ref_name }}
          app=$(echo ${tagname} | cut -d'-' -f 1)
          formatted_tag=$(echo ${tagname} | cut -d'-' -f 3)
          echo "app=$app" >> $GITHUB_OUTPUT
          echo "tag=$formatted_tag" >> $GITHUB_OUTPUT

  build:
    needs: [normalize_tag]
    strategy:
      fail-fast: true
    uses: ./.github/workflows/action.helmpackage.yml
    secrets: inherit
    with:
      path: charts/${{ needs.normalize_tag.outputs.app }}
      environment: testing
      helm_version: ${{ needs.normalize_tag.outputs.tag }}
      name: ${{ needs.normalize_tag.outputs.app }}
```

Add the reusable workflow for packaging and pushing Helm charts (`.github/workflows/action.helmpackage.yml`).

## Configure ArgoCD to use the Helm registry

Add a secret in ArgoCD to allow it to pull charts from the registry (for example, `argocd/apps/argocd-repo-demo-secret.yaml`):

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: repo-demo-secret
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
  annotations:
    managed-by: argocd.argoproj.io
stringData:
  url: ghcr.io/<your-org-or-user>/helm
  enableOCI: "true"
  name: demo
  project: default
  type: helm
```

ArgoCD wil sync this and does not require a manual `kubectl apply` step.

## Update ArgoCD applications

Update your ArgoCD app manifests (for example, `argocd/apps/argocd-app-web.yaml`, `argocd-app-docs.yaml`) to reference the new chart versions and the OCI registry.

```yaml
spec:
  project: default
  sources:
    - repoURL: https://github.com/GVengelen/ready-changeset-argo.git
      targetRevision: HEAD
      ref: values
    - repoURL: "ghcr.io/gvengelen/helm"
      chart: docs
      targetRevision: "*"
      helm:
        valueFiles:
          - $values/argocd/values/argocd-app-docs.yaml
```

Sync the apps in ArgoCD to deploy the new chart versions.

## Release flow

- Make changes to a chart (for example, `charts/web/`).
- Merge to `main`.
- Release Please creates a PR and, when merged, tags a new release.
- The tag triggers the Helm packaging workflow, which pushes the chart to `ghcr.io`.
- ArgoCD pulls the new chart version from the registry and deploys it.

## Troubleshooting

- Ensure the GitHub App has **write access to Issues** for PR labeling.
- Check that the Helm registry secret in ArgoCD is correct and has access to the registry.
- Verify that ArgoCD app manifests reference the correct chart and version.

This process ensures automated, versioned Helm chart releases and seamless deployment with ArgoCD.
