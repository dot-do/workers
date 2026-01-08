#!/bin/bash
# Session start hook for Claude Code web
# Installs beads (bd) issue tracker in fresh VM environments

# Check if bd is already available
if command -v bd &> /dev/null; then
  echo "bd is already installed"
  bd version
else
  echo "Installing bd (beads issue tracker)..."
  npm install -g @beads/bd 2>/dev/null

  # Fallback to Go if npm fails
  if ! command -v bd &> /dev/null; then
    if command -v go &> /dev/null; then
      echo "npm install failed, trying Go..."
      go install github.com/steveyegge/beads/cmd/bd@latest
      export PATH="$PATH:$HOME/go/bin"
    fi
  fi
fi

# Initialize beads if not already initialized
if [ -d .beads ]; then
  echo "Beads database found"
  bd prime 2>/dev/null || true
else
  echo "No .beads directory found - run 'bd init' to initialize"
fi

echo "bd is ready! Use 'bd ready' to see available work."
exit 0
