FROM node:25.5.0-alpine AS base
LABEL org.label-schema.name="ocelot.social:ui"
LABEL org.label-schema.description="UI Component Library for ocelot.social"
LABEL org.label-schema.usage="https://github.com/Ocelot-Social-Community/Ocelot-Social/blob/master/packages/ui/README.md"
LABEL org.label-schema.url="https://ocelot.social"
LABEL org.label-schema.vcs-url="https://github.com/Ocelot-Social-Community/Ocelot-Social/tree/master/packages/ui"
LABEL org.label-schema.vendor="ocelot.social Community"
LABEL org.label-schema.schema-version="1.0"
LABEL maintainer="devops@ocelot.social"
RUN mkdir -p /app
WORKDIR /app

FROM base AS development
ENV NODE_ENV="development"
EXPOSE 6006
CMD ["/bin/sh", "-c", "npm install && npm run dev"]

FROM base AS build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run storybook:build

FROM nginx:alpine AS production
LABEL org.label-schema.name="ocelot.social:ui-storybook"
LABEL org.label-schema.description="UI Component Library Storybook for ocelot.social"
COPY --from=build /app/storybook-static /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
