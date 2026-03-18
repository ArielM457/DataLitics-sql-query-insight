FROM mcr.microsoft.com/azure-databases/data-api-builder:latest

# ARG must be declared after FROM to be available in the build stage
ARG TENANT=empresa_a

WORKDIR /App

# Build for a specific tenant — default empresa_a
# Override at build time: docker build --build-arg TENANT=empresa_b -t dataagent-dab-empresa-b .
COPY ${TENANT}/dab-config.json ./dab-config.json

EXPOSE 5000
