#!/bin/bash

PID=$(lsof -ti tcp:3000)

if [ -z "$PID" ]; then
  echo "No process found on port 3000."
  exit 0
fi

kill "$PID"
echo "Stopped process $PID on port 3000."
