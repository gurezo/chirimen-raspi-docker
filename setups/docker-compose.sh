
echo "docker-compose install  ----------------------------------"
dockerInstallCmd=`sudo curl -L --fail https://raw.githubusercontent.com/linuxserver/docker-docker-compose/master/run.sh -o /usr/local/bin/docker-compose`
eval ${dockerInstallCmd}
sudo chmod +x /usr/local/bin/docker-compose

echo "docker-compose install  ----------------------------------"
docker-compose --version
