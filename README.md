# Influx-to-Website

npm install @influxdata/influxdb-client



# Testing setup - with Python script and docker Influx - HZ



1. clone https://github.com/Western-Formula-Racing/car_to_influx
2. The relevant python script here is **readCAN2.py**
3. 



## Docker - Influx

1. Install Docker
2. in cmd: 

```docker run -d -p 8086:8086 -v "%cd%/influxdb/data:/var/lib/influxdb2" -v "%cd%/influxdb/config:/etc/influxdb2" -e DOCKER_INFLUXDB_INIT_MODE=setup -e DOCKER_INFLUXDB_INIT_USERNAME=myuser -e DOCKER_INFLUXDB_INIT_PASSWORD=mypassword123 -e DOCKER_INFLUXDB_INIT_ORG=myorg -e DOCKER_INFLUXDB_INIT_BUCKET=mybucket --name influxdb influxdb:2``` 



In the address bar at the top, type: `http://localhost:8086`

You should see a login screen

Log in using:

- Username: myuser
- Password: mypassword123

Then: 

1. Find API Key
2. Create organization called WFR
   1. click your profile icon, then click Create Organization
3. Create a new bucket in Influx: call it "ourCar" <- you can change this in the python script, just make sure it matches.
   1. Consider changing the data retention policy to 1 hour to keep it clean for every testing session



Now, start running the Python code and use the graph viewer to view the testing data:

If you want something that's constantly moving:

ourCar-canBus-sensorReading-M166_Current_info-166-INV_Phase_A_Current









