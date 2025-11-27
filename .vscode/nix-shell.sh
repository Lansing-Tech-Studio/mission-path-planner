#!/usr/bin/env bash
# Wrapper script to run commands inside nix develop shell
# The Jest extension passes the command as a single string with -c flag
if [ "$1" = "-c" ]; then
  shift
  exec nix develop --command bash -c "$*"
else
  exec nix develop --command "$@"
fi
