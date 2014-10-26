SHELL = /bin/bash
MAKEFLAGS += --no-print-directory --silent
export PATH := ./node_modules/.bin/:$(PATH)

test:
	@NODE_ENV=test \
		mocha \
		--require blanket \
		--reporter mocha-spec-cov \
		$(TESTFLAGS)


test-coverage-report:
	@NODE_ENV=test \
		mocha \
		--require blanket \
		--reporter html-cov > coverage.html
	echo "Coverage report available on coverage.html"

test-watch:
	@TESTFLAGS=--watch $(MAKE) test

test-browser:
	open test/browser.html

dev:
	grunt watch

dev-test:
	make dev & \
	make test-watch

all:
	grunt

lint:
	grunt lint

build:
	grunt build

docclean:
	rm -f docs/*.{1,html}

dist: build

clean: docclean test-clean-instrument test-watch test

.PHONY: test build lint test-cov docclean dev dist