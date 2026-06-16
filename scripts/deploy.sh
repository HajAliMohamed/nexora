#!/usr/bin/env bash
set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}=== Nexora Deployment ===${NC}"

# Check for .env file
if [ ! -f .env ]; then
  echo -e "${RED}Error: .env file not found${NC}"
  echo "Create one from .env.example:"
  echo "  cp .env.example .env"
  echo "Then edit .env with your values."
  exit 1
fi

# Source .env (only first =, skip comments/empty)
export $(grep -v '^\s*#' .env | grep -v '^\s*$' | sed 's/\s*=\s*/=/g')

# Validate required vars
for var in JWT_SECRET WEB_DOMAIN API_DOMAIN STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET STRIPE_PRO_PRICE_ID STRIPE_AGENCY_PRICE_ID; do
  if [ -z "${!var:-}" ]; then
    echo -e "${RED}Error: $var is not set in .env${NC}"
    exit 1
  fi
done

# Create searxng-settings.yml if not present
if [ ! -f searxng-settings.yml ]; then
  echo -e "${YELLOW}Creating searxng-settings.yml from nexora-api...${NC}"
  cp nexora-api/searxng-settings.yml searxng-settings.yml
fi

echo -e "${GREEN}Building images...${NC}"
docker compose build

echo -e "${GREEN}Starting containers...${NC}"
docker compose up -d

echo -e "${GREEN}Waiting for API to be ready...${NC}"
sleep 10

echo -e "${GREEN}Seeding admin account...${NC}"
curl -s -X POST http://127.0.0.1:3003/auth/seed-admin || echo -e "${YELLOW}Warning: seed-admin failed (may already exist)${NC}"

echo ""
echo -e "${GREEN}=== Deployment complete! ===${NC}"
echo ""
echo -e "Nexora Web:  ${YELLOW}https://${WEB_DOMAIN}${NC}"
echo -e "Nexora API:  ${YELLOW}https://${API_DOMAIN}${NC}"
echo ""
echo -e "Next steps:"
echo -e "  1. Set up SSL with Certbot:"
echo -e "     ${YELLOW}sudo certbot --nginx -d ${WEB_DOMAIN} -d ${API_DOMAIN}${NC}"
echo ""
echo -e "  2. Update Stripe webhook URL in Stripe Dashboard:"
echo -e "     ${YELLOW}https://dashboard.stripe.com/webhooks${NC}"
echo -e "     Endpoint: ${YELLOW}https://${API_DOMAIN}/billing/webhook${NC}"
echo ""
echo -e "  3. Logs:"
echo -e "     ${YELLOW}docker compose logs -f${NC}"
