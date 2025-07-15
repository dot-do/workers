FROM oven/bun:alpine

WORKDIR /app

COPY . .

RUN bun install

CMD ["bun", "run", "build"]