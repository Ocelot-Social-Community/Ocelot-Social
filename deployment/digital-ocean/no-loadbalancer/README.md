# Solution Withou A Loadbalancer

## Expose Port 80 On Digital Ocean's Managed Kubernetes Without A Loadbalancer

Follow [this solution](https://stackoverflow.com/questions/54119399/expose-port-80-on-digital-oceans-managed-kubernetes-without-a-load-balancer/55968709) and install a second firewall, nginx, and use external DNS via Helm 3.

{% hint style="info" %}
CAUTION: Some of the Helm charts are already depricated, so do an investigation of the approbriate charts and fill the correct commands in here.
{% endhint %}
