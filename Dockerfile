# Sử dụng Node 18 bản Alpine cho nhẹ
FROM node:18-alpine

# Cài đặt các công cụ cần thiết (đặc biệt quan trọng cho Strapi/Sharp)
RUN apk update && apk add --no-cache \
    build-base \
    gcc \
    autoconf \
    automake \
    zlib-dev \
    libpng-dev \
    vips-dev \
    git

# Thư mục làm việc trong container
WORKDIR /app

# Copy file quản lý thư viện
COPY package*.json ./

# Cài đặt thư viện
RUN npm install

# Copy toàn bộ mã nguồn
COPY . .

# Mở cổng (ví dụ 1337 cho Strapi hoặc 3000 cho React)
EXPOSE 1337

# Lệnh chạy ứng dụng
CMD ["npm", "run", "develop"]
