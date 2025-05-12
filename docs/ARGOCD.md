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

