FROM node:20-bookworm-slim

WORKDIR /app

# Native deps for bcrypt
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV NODE_ENV=development
ENV PORT=4250
ENV HOST=0.0.0.0

EXPOSE 4250

# Hot-reload: nodemon reinicia a cada alteração em src/
CMD ["npx", "nodemon", "--legacy-watch", "--watch", "src", "--ext", "js,json", "src/server.js"]
