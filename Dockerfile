FROM node:22-alpine

WORKDIR /app/be

COPY be/package*.json ./
RUN npm install --omit=dev

COPY be ./
COPY fe /app/fe

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "start"]