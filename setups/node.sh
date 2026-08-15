#!/bin/bash
set -e

echo "apt-get -y update ----------------------------------"
sudo apt-get -y update

echo "apt-get -y upgrade ----------------------------------"
sudo apt-get -y upgrade

echo "apt-get -y autoremove ----------------------------------"
sudo apt-get -y autoremove

echo "apt-get -y autoclean ----------------------------------"
sudo apt-get -y autoclean

echo "apt-get -y install nodejs npm ----------------------------------"
sudo apt install -y nodejs npm
