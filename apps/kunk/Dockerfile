FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json ./
COPY apps/admin/package.json ./apps/admin/
COPY apps/registration/package.json ./apps/registration/
COPY apps/kunk/package.json ./apps/kunk/
COPY apps/terms/package.json ./apps/terms/
COPY packages ./packages

RUN npm install

COPY apps/kunk ./apps/kunk

WORKDIR /app/apps/kunk

ENV NODE_ENV=development
ENV CHOKIDAR_USEPOLLING=true
ENV WATCHPACK_POLLING=true

EXPOSE 4257

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "4257"]
