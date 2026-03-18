ARG TENANT=empresa_a

FROM mcr.microsoft.com/azure-databases/data-api-builder:latest

WORKDIR /App

# Build for a specific tenant — default empresa_a
# Override at build time: docker build --build-arg TENANT=empresa_b -t dataagent-dab-empresa-b .
COPY ${TENANT}/dab-config.json ./dab-config.json

EXPOSE 5000
