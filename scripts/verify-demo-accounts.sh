#!/usr/bin/env bash
set -euo pipefail
base="${1:-http://127.0.0.1:5000}"
accounts=(
  'admin@eventsphere.demo|/admin/stats'
  'organizer@eventsphere.demo|/events/mine'
  'attendee@eventsphere.demo|/events'
  'volunteer@eventsphere.demo|/volunteers/me'
  'speaker@eventsphere.demo|/speakers/me/sessions'
)
for item in "${accounts[@]}"; do
  email="${item%%|*}"
  endpoint="${item##*|}"
  response=$(curl -fsS -X POST "$base/api/auth/login" -H 'Content-Type: application/json' --data "{\"email\":\"$email\",\"password\":\"Event@123\"}")
  token=$(node -e "const x=JSON.parse(process.argv[1]); if(!x.success||!x.data?.token) process.exit(1); process.stdout.write(x.data.token)" "$response")
  curl -fsS "$base/api$endpoint" -H "Authorization: Bearer $token" >/dev/null
  printf '%s login and %s passed\n' "$email" "$endpoint"
done
