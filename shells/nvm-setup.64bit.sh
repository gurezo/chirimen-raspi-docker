#!/bin/bash
set -e

echo "nvm setup ----------------------------------"

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash

echo "source ~/.bashrc ----------------------------------"

source ~/.bashrc

echo "nvm install ----------------------------------"

nvm install 24
nvm use 24
nvm alias default 24
