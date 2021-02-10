# Mint
A fork of [hastebin](https://github.com/seejohnrun/haste-server), which focuses on security, and stability.

## Features
- Code highlighting
- Netcat support 

## Command-line (client)
### netcat
This only available for Mint instance that have `config.server` enabled.
```
echo "Hello world!" | nc <instance_host> <instance_port>
```

## Installation
1. Git clone the repository.
```bash
git clone https://github.com/xcgc/mint-server.git
```
2. Edit `config.json` to what you like.
3. Install required dependencies.
```bash
# NPM
npm install
# Yarn
yarn
```

## Endpoint
### `POST` `/documents`
```
{
   "key": 00000
}
```
### `GET` `/documents/:id`
```
{
   "key": 00000,
   "data": "Hello world!"
}
```
### `GET` `/raw/:id`
```
Hello world!
```

