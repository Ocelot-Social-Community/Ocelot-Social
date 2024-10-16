variable "cloudflare_api_token" {
  type = string
  sensitive = true
  nullable = false
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

data "cloudflare_zone" "roschaeferde" {
  name = "roschaefer.de"
}

resource "cloudflare_record" "terraform_managed_resource_f74d9e9ce7f4efa02204fac4f5296647" {
  content = module.kube-hetzner.ingress_public_ipv4
  name    = "ocelot-social"
  proxied = false
  type    = "A"
  zone_id = data.cloudflare_zone.roschaeferde.id
}

resource "cloudflare_record" "terraform_managed_resource_aad453c5a627017d66250b3513322148" {
  content = module.kube-hetzner.ingress_public_ipv6
  name    = "ocelot-social"
  proxied = false
  type    = "AAAA"
  zone_id = data.cloudflare_zone.roschaeferde.id
}
