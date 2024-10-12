terraform {
  required_version = ">= 1.5.0"
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
    }
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = ">= 1.43.0"
    }
  }

  encryption {
    key_provider "pbkdf2" "hcloud_token" {
      # Specify a long / complex passphrase (min. 16 characters)
      passphrase= var.hcloud_token
    }

    method "aes_gcm" "new_method" {
      keys = key_provider.pbkdf2.hcloud_token
    }

    state {
      ## Step 3: Link the desired encryption method:
      method = method.aes_gcm.new_method

      ## Step 4: Run "tofu apply".

      ## Step 5: Consider adding the "enforced" option:
      enforced = true
    }
  }
}
