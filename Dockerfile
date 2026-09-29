FROM node:22-alpine
WORKDIR /app
ARG BACKEND_API_URL=http://localhost:4000
ENV BACKEND_API_URL=$BACKEND_API_URL
COPY package.json .
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3007
CMD ["npm","run","start"]
