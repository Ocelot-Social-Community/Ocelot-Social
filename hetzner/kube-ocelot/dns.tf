variable "cloudflare_api_token" {
  type = string
  sensitive = true
  nullable = false
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

resource "cloudflare_record" "terraform_managed_resource_f74d9e9ce7f4efa02204fac4f5296647" {
  content = "128.140.24.181"
  name    = "ocelot-social"
  proxied = false
  ttl     = 1
  type    = "A"
  zone_id = "075910ecd8f8366d1f1bc7cfd3c8835c"
}

resource "cloudflare_record" "terraform_managed_resource_aad453c5a627017d66250b3513322148" {
  content = "2a01:4f8:c01e:534::1"
  name    = "ocelot-social"
  proxied = false
  ttl     = 1
  type    = "AAAA"
  zone_id = "075910ecd8f8366d1f1bc7cfd3c8835c"
}
