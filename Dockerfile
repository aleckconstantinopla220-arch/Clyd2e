FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
ARG VITE_API_URL
ARG VITE_PAYMONGO_PUBLIC_KEY
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_PAYMONGO_PUBLIC_KEY=$VITE_PAYMONGO_PUBLIC_KEY
RUN npm run build

FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY server.js users.json products.json orders.json ./

EXPOSE 3001
CMD ["npm", "run", "server"]