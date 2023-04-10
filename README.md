# lantern-config-api
NodeJS backend for lantern-config.
## Installation
Create a directory on the Pi using `mkdir /home/pi/lantern-config-api`

Copy the contents of this repo to the folder you just created `scp -r * pi@192.168.1.11:/home/pi/lanternconfig-api`

### Install the dependencies:
- log in to the Pi
- cd to the lantern-config-api folder and run `npm install`. 

Npm will now install all the dependencies for you.

### Run as a service

To run a NodeJS application in the background on the Raspberry Pi you can use PM2. Install using `sudo apt-get install PM2`. 
Then add the server with `PM2 start /home/pi/lantern-config-api/server/index.js`.
PM2 adds a service with 'index' as the name. To restart the service (after you made changes for example) execute `PM2 restart index`.

### Add local proxy
To be able to use the API with the lantern-config front-end, add a proxy to nginx. Open the `/etc/nginx/sites-available/default` and add the following code within the `server` directive:

```
location /api/ {
    proxy_pass http://localhost:3001/
}
```

All requests to `/api` will now be directed to the API.
