{{- define "defaultTag" -}}
{{- .Values.global.image.tag | default .Chart.AppVersion }}
{{- end -}}

{{- define "resources"  }}
{{- if . }}
resources:
{{ . | toYaml | indent 2 }}
{{- end }}
{{- end  }}

{{- define "imagePullSecretName" -}}
{{- .Release.Name }}-image-pull
{{- end -}}

{{/*
Builds the `.dockerconfigjson` payload. Credentials are keyed by "host/path"
(e.g. ghcr.io/it4change), NOT by bare host: an instance pulls from several GHCR organizations at
once — its own plus ocelot-social-community for the neo4j image — and those may use different
tokens, which a single `ghcr.io` key could not hold. The kubelet keyring prefix-matches an image
reference against these keys, so the longest matching path wins.
*/}}
{{- define "imagePullSecretDockerConfigJson" -}}
{{- $auths := dict -}}
{{- range .Values.imagePullCredentials.registries -}}
{{- $_ := set $auths .registry (dict "username" .username "password" .password "auth" (printf "%s:%s" .username .password | b64enc)) -}}
{{- end -}}
{{- dict "auths" $auths | toJson -}}
{{- end -}}

{{- define "imagePullSecrets"  }}
{{- $names := list }}
{{- if .Values.imagePullCredentials.registries }}
{{- $names = append $names (include "imagePullSecretName" .) }}
{{- end }}
{{- range .Values.imagePullCredentials.existingSecrets }}
{{- $names = append $names . }}
{{- end }}
{{- if $names }}
imagePullSecrets:
{{- range $names }}
  - name: {{ . }}
{{- end }}
{{- end }}
{{- end  }}
