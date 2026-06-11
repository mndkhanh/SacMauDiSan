FROM node:22-alpine
WORKDIR /app
COPY be/package*.json ./
RUN npm install --omit=dev
COPY be/ .
COPY fe/ ./public
EXPOSE 3000
CMD ["npm", "start"]
