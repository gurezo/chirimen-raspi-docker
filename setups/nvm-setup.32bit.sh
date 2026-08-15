#!/bin/bash
set -e

echo "nvm setup ----------------------------------"

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash

echo "source ~/.bashrc ----------------------------------"

source ~/.bashrc

echo "nvm install ----------------------------------"

nvm install 22
nvm use 22
nvm alias default 22
