# Influx-to-Website

npm install @influxdata/influxdb-client





# Next Steps

Feature Requests

1. Allow custom x-axis, to plot sensor value against another value
2. [completed] Overlay of graphs (Influxdb graph viewer supports natively) 
3. Pull units from InfluxDB and display on the graph
# Testing setup - with Python script and docker Influx - HZ



1. clone https://github.com/Western-Formula-Racing/car_to_influx
2. The relevant python script here is **readCAN2.py**
3. Make sure to set the correct TOKEN in the script



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
2. Create an organization called WFR
   1. click your profile icon, then click Create Organization
3. Create a new bucket in Influx: call it "ourCar" <- you can change this in the python script, just make sure it matches.
   1. Consider changing the data retention policy to 1 hour to keep it clean for every testing session



Now, start running the Python code and use the graph viewer to view the testing data:

If you want something that's constantly moving:

ourCar-canBus-sensorReading-M166_Current_info-166-INV_Phase_A_Current



## Query Data Processing Pipeline

1. **Query Execution (executeQuery function)**:
   - Takes a Flux query as input
   - Makes a POST request to InfluxDB's API endpoint with:
     * URL: `${influxConfig.url}/api/v2/query?org=${influxConfig.org}`
     * Authentication: Token-based via headers
     * Request format: Flux query language (`application/vnd.flux`)
     * Response format: CSV (`application/csv`)
   - Checks for successful response (response.ok)
   - Converts response to text (CSV format)
   - Passes CSV to parseInfluxResponse

2. **CSV Parsing (parseInfluxResponse function)**:
   
   Input Validation:
   ```javascript
   if (!csvData || csvData.trim() === '') {
     return [];
   }
   ```
   - Checks if data exists and isn't empty
   
   Data Structure Analysis:
   ```javascript
   const lines = csvData.trim().split('\n');
   if (lines.length < 2) {
     return [];
   }
   ```
   - Splits CSV into lines
   - Ensures there's at least a header and one data row
   
   Header Processing:
   ```javascript
   const headers = lines[0].split(',');
   const timeIndex = headers.findIndex(h => h === '_time');
   const valueIndex = headers.findIndex(h => h === '_value');
   ```
   - Extracts column headers
   - Locates critical columns: '_time' and '_value'
   
   Data Transformation Pipeline:
   ```javascript
   return lines.slice(1)
       .filter(line => line.trim() !== '')
       .map(line => {
         const values = line.split(',');
         return {
           _time: values[timeIndex],
           _value: parseFloat(values[valueIndex])
         };
       })
       .filter(point => !isNaN(point._value));
   ```
   1. `slice(1)`: Skips header row
   2. First `filter`: Removes empty lines
   3. `map`: Transforms each line into an object with _time and _value
   4. Second `filter`: Removes entries with invalid numerical values

The final output is an array of objects, each containing:
- `_time`: Timestamp from InfluxDB
- `_value`: Numerical value (sensor reading)

Example transformation:
```
Input CSV:
_time,_value,_field,_measurement
2024-02-09T12:00:00Z,23.5,temperature,sensors
2024-02-09T12:00:01Z,24.0,temperature,sensors

Output:
[
  { _time: "2024-02-09T12:00:00Z", _value: 23.5 },
  { _time: "2024-02-09T12:00:01Z", _value: 24.0 }
]
```


Future Development: 
On the live monitor dashboard, the x-axis of the plot should be -60s to 0s (current), instead of absolute time. 





# Hosting

1. Export local docker: docker tag influxdb:latest myusername/influxdb:latest

docker push myusername/influxdb:latest

https://docs.docker.com/engine/install/ubuntu/



sudo docker build --platform linux/amd64 -t myusername/influxdb:latest .





Install docker on Ubuntu/whatever version of linux that you are using



docker login

docker pull myusername/influxdb:latest



And then run it



sudo docker start influxwfr



## Change on React



Change influxClient.js

```
export const INFLUX_URL = "http://[YOUR IPV6]:8086";
```



Add TCP 8086 rule on Lightsail



