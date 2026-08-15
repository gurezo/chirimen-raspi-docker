# setups

Raspberry Pi host の Node.js / nvm / Docker 環境構築。

## Node.js

```sh
chmod +x setups/node.sh
./setups/node.sh
```

## nvm

### 共通

```sh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash
source ~/.bashrc
```

### 32-bit

```sh
nvm install 22
nvm use 22
nvm alias default 22
```

### 64-bit

```sh
nvm install 24
nvm use 24
nvm alias default 24
```

## Docker

```sh
chmod +x setups/docker.sh setups/docker-compose.sh
./setups/docker.sh
```

`docker.sh` はインストール完了後に reboot する。reboot 後に Compose を入れる。

```sh
./setups/docker-compose.sh
```
