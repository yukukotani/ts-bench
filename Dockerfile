FROM oven/bun:latest

RUN apt-get update && apt-get install -y \
    git \
    curl \
    npm \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install Agent CLIs
RUN curl -LsSf https://aider.chat/install.sh | sh
RUN CONFIGURE=false curl -fsSL https://github.com/block/goose/releases/download/stable/download_cli.sh | bash
RUN npm install -g \
    @anthropic-ai/claude-code \
    @openai/codex \
    @google/gemini-cli \
    @qwen-code/qwen-code \
    opencode-ai
RUN curl -fsS https://cursor.com/install | bash

ENV PATH="/root/.local/bin:/root/.cursor/bin:${PATH}"

WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

COPY . .

RUN npm i -g corepack@0.29.4 && corepack enable

CMD ["bash"]
