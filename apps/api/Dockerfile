FROM node:26-alpine

WORKDIR /app

COPY .output/package.json ./
COPY .output/ ./

EXPOSE 8002

CMD ["node", "--enable-source-maps", "index.js"]
