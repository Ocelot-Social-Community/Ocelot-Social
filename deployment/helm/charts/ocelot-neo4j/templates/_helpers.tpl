{{- define "defaultTag" -}}
{{- .Values.global.image.tag | default .Chart.AppVersion }}
{{- end -}}

{{- define "resources"  }}
{{- if . }}
resources:
{{ . | toYaml | indent 2 }}
{{- end }}
{{- end  }}
