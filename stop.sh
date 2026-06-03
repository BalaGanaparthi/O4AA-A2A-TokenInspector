#!/bin/bash

PIDS=$(lsof -ti tcp:3000)

if [ -z "$PIDS" ]; then
  echo "No process found on port 3000."
  exit 0
fi

echo "$PIDS" | xargs kill
echo "Stopped port 3000 (PIDs: $(echo "$PIDS" | tr '\n' ' '))."
