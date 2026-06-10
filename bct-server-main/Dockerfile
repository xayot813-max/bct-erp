FROM golang:1.23.6-alpine AS builder

WORKDIR /app

# Install git and other dependencies
RUN apk add --no-cache git ca-certificates

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Ensure runtime directories exist for the final image
RUN mkdir -p uploads

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# Final stage
FROM scratch

WORKDIR /app

# Copy CA certificates for HTTPS support
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Copy the binary from builder
COPY --from=builder /app/main ./main

# Create uploads directory
COPY --from=builder /app/uploads ./uploads

# Expose port
EXPOSE 9000

# Run the binary
CMD ["./main"]
