.PHONY: up down logs test e2e

up:
docker-compose up --build
down:
docker-compose down -v
logs:
docker-compose logs -f

test:
docker-compose run --rm backend npm run test

e2e:
npm run e2e:dryrun
