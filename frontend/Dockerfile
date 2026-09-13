FROM node:20-alpine

WORKDIR /app

# Install dependencies first leveraging layer caching
COPY package.json package-lock.json ./
RUN npm install

# Copy application source code
COPY . .

ENV PORT=3000
EXPOSE 3000

CMD ["npm", "run", "dev"]
