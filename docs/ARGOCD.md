# Gettin started

## Requirements¶
- Installed kubectl command-line tool.
- Have a kubeconfig file (default location is ~/.kube/config).
- CoreDNS. Can be enabled for microk8s by microk8s enable dns && microk8s stop && microk8s start

## Install Argo CD

```shell
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```
This will create a new namespace, argocd, where Argo CD services and application resources will live.

## Log in to Argo CD

To be able to acces your application on your cluster you'll need to enable the Argo CD loadbalancer or create a port forward. For the sake of this example we'll use a port forward so we don't have to setup Ingress and loadbalancers.

```shell
kubectl port-forward svc/argocd-server -n argocd 8080:80
```

After that you'll need to log in, use the following command to retreive the initial admin password.

```shell
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

## Bootstrapping Argo CD
Now that we got Argo CD up and running it's time to bootstrap our cluster so that argocd can manage itself. We'll do that by applying our app-of-apps.

```shell
kubectl apply -f ./argocd/app-of-apps.yaml
```

You should now see two apps appear in the application overview in Argo CD.

## Adding Argo CD Image Updater

To enable automatic image updates for your applications, you can use the [Argo CD Image Updater](https://argocd-image-updater.readthedocs.io/). We'll add it to the cluster using Argo CD itself, following the app-of-apps pattern. This means you do **not** need to manually apply the image updater application—it's managed by Argo CD as part of your `app-of-apps` setup.

### Configuring the Argo CD Image Updater Application

The image updater is defined as an Argo CD Application in your repository (see `argocd/apps/argocd-image-updater.yaml`). Here is an example configuration:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: argocd-image-updater
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "5"
spec:
  project: default
  sources:
    - repoURL: https://argoproj.github.io/argo-helm
      targetRevision: 0.11.0
      chart: argocd-image-updater
      helm:
        values: |
          config:
            gitCommitTemplate: |
              build: automatic update of "{{ .AppName }}"

              {{ range .AppChanges -}}
              updates image "{{ .Image }}" tag "{{ .OldTag }}" to "{{ .NewTag }}"
              {{ end -}}
            applicationsAPIKind: kubernetes
            logLevel: info
            gitCommitUser: "argocd-bot"
            gitCommitMail: "argocd-bot@example.com"
            gitCommitSigningKey: ""
            gitCommitSignOff: "false"
            gitCommitSigningMethod: "none"
            disableKubeEvents: "false"
  destination:
    server: 'https://kubernetes.default.svc'
    namespace: argocd
  syncPolicy:
    syncOptions:
    - CreateNamespace=true
    - ServerSideApply=true
    automated:
      selfHeal: true
      prune: true
```

This configuration ensures the image updater is deployed and managed by Argo CD. You can adjust the `helm.values` section to fit your registry and GitOps workflow.

### Why do we need annotations?

Argo CD Image Updater works by scanning your Argo CD Application resources for special annotations. These annotations tell the updater which images to track, how to update them, and how to write back changes (e.g., to your Git repository or Helm values).

### Example: Annotating an Application for Image Updates

Below is an example of the required annotations in an Argo CD Application manifest (see `argocd/apps/argocd-app-web.yaml`):

```yaml
metadata:
  name: web
  namespace: argocd
  annotations:
    argocd-image-updater.argoproj.io/image-list: "web=ghcr.io/gvengelen/ready-changeset-argo-web"
    argocd-image-updater.argoproj.io/web.helm.image-tag: image.tag
    argocd-image-updater.argoproj.io/web.helm.image-name: image.repository
    argocd-image-updater.argoproj.io/web.update-strategy: "newest-build"
    argocd-image-updater.argoproj.io/write-back-method: "git:secret:argocd/ghcr-repo-creds"
    argocd-image-updater.argoproj.io/git-repository: https://github.com/GVengelen/ready-changeset-argo.git
    argocd-image-updater.argoproj.io/write-back-target: "helmvalues:/argocd/values/argocd-app-web.yaml"
    argocd-image-updater.argoproj.io/git-branch: main
```

**Key annotations:**
- `image-list`: Which images to track for updates.
- `web.helm.image-tag` and `web.helm.image-name`: Where in your Helm values the tag and image name are set.
- `update-strategy`: How to select new images (e.g., `newest-build`).
- `write-back-method`, `git-repository`, `write-back-target`, `git-branch`: How and where to write back the updated image tags (e.g., to a Git repo and values file).

These annotations are required so the image updater knows what to update and how to persist those changes. Without them, the updater will not make any changes to your application.

### Example: Helm values file

Your Helm values file (e.g., `argocd/values/argocd-app-web.yaml`) should contain the image fields referenced by the annotations:

```yaml
image:
  name: ready-changeset-argo-web
  repository: ghcr.io/gvengelen/ready-changeset-argo-web
  tag: a4ea1a3
```

---

With these steps, your cluster will automatically update application images when new versions are available, and persist those changes to your Git repository for full GitOps automation.

---

## Configuring Git Write-Back with a GitHub App Secret

To allow Argo CD Image Updater to write updated image tags back to your Git repository, you need to provide credentials. In this setup, we use a **GitHub App** for secure, auditable Git access. The secret referenced in the annotation (`git:secret:argocd/ghcr-repo-creds`) contains the credentials for this GitHub App.

### Why use a GitHub App?
A GitHub App provides fine-grained permissions and can be scoped to only the repositories and actions required. This is more secure than using a personal access token.

### Steps to set up the GitHub App and secret

1. **Create a GitHub App**
   - Go to your GitHub organization or user settings → Developer settings → GitHub Apps → New GitHub App.
   - Set a name (e.g., `ArgoCD Image Updater`).
   - Set the homepage URL (can be your repo or ArgoCD instance).
   - Disable callback URL (not required for this use case).
   - Permissions:
     - Repository permissions: `Contents` → `Read & write`
     - (Set by default) Metadata → `Read-only`
   - Subscribe to events: none required.
   - Save the app.

2. **Generate a private key**
   - In the app settings, generate a new private key and download the `.pem` file.

3. **Install the app in your repository**
   - Click "Install App" in the app settings and select the repository you want ArgoCD to update.

4. **Retrieve required values**
   - **App ID**: Shown in the app settings as "App ID".
   - **Installation ID**: After installing, go to the app's installation page URL. The number at the end is the installation ID, or use the GitHub API to retrieve it. [installations](https://github.com/settings/installations/) > select your installation.
   - **Private key**: The `.pem` file you downloaded.

5. **Create the Kubernetes secret**
```shell
kubectl create secret generic ghcr-repo-creds -n argocd \
  --from-literal=url="https://github.com/<your-username-or-org>" \
  --from-literal=type="git" \
  --from-literal=githubAppID="<your-app-id>" \
  --from-literal=githubAppInstallationID="<your-installation-id>" \
  --from-file=githubAppPrivateKey=</path/to/your/private-key.pem>
```

This secret will be referenced by the image updater using the annotation:

```yaml
argocd-image-updater.argoproj.io/write-back-method: "git:secret:argocd/ghcr-repo-creds"
```

---

With this setup, Argo CD Image Updater can securely commit changes to your GitHub repository using the GitHub App, following GitOps best practices.
