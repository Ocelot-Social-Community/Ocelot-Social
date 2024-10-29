{{- define "defaultTag" -}}
{{- .Values.global.image.tag | default .Chart.AppVersion }}
{{- end -}}
