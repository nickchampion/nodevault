FROM node:26-alpine

WORKDIR /app

COPY .output/package.json .output/pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --prod --frozen-lockfile --ignore-scripts

COPY .output/ ./

EXPOSE 8002

CMD ["node", "--enable-source-maps", "index.js"]
