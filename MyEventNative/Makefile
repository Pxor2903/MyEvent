# MyEventNative — commandes console
# Usage : make [cible]
# Depuis MyEvent : make -C MyEventNative open
# Depuis MyEventNative : make open

SHELL := /bin/bash
ROOT := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

.PHONY: deps gen open clean run regenerate setup

# Installer XcodeGen (Homebrew)
deps:
	brew install xcodegen

# Générer le projet Xcode
gen:
	cd $(ROOT) && xcodegen generate

# Ouvrir le projet dans Xcode
open: gen
	cd $(ROOT) && open MyEventNative.xcodeproj

# Nettoyer build
clean:
	cd $(ROOT) && xcodebuild -project MyEventNative.xcodeproj -scheme MyEventNative clean 2>/dev/null || true
	rm -rf $(ROOT)/build

# Régénérer le projet (supprime .xcodeproj puis gen)
regenerate:
	rm -rf $(ROOT)/MyEventNative.xcodeproj
	$(MAKE) gen

# Setup complet : deps + gen + open
setup:
	$(MAKE) deps
	$(MAKE) open

# Build et lancer sur simulateur iPhone 16
run:
	$(ROOT)/scripts/build-and-run-simulator.sh "iPhone 16"
