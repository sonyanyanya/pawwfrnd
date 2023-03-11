require("dotenv").config();
const express = require("express");
const mysql = require("mysql");
const app = express();

// for parsing json
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const PORT = 3000;

const con = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

app.use(express.static("public"));

function convertNMEAtoDecimal(nmeaCoord) {
  // $GPRMC,102923.984,A,3537.228,N,06928.900,E,,,020323,000.0,W*72
  // Split the NMEA coordinate string into components
  const components = nmeaCoord.split(",");

  // Extract the latitude and longitude components from the array
  const latitude = components[2];
  const longitude = components[4];

  // Convert the latitude and longitude components to decimal degrees
  const latDegrees = parseInt(latitude.substring(0, 2));
  const latMinutes = parseFloat(latitude.substring(2));
  const latDecimal = latDegrees + latMinutes / 60;

  const longDegrees = parseInt(longitude.substring(0, 3));
  const longMinutes = parseFloat(longitude.substring(3));
  const longDecimal = longDegrees + longMinutes / 60;

  // Determine the hemisphere for latitude and longitude
  const latHemisphere = components[3];
  const longHemisphere = components[5];

  // Add negative sign if latitude or longitude is in southern or western hemisphere
  const latSign = latHemisphere === "S" ? -1 : 1;
  const longSign = longHemisphere === "W" ? -1 : 1;

  // Calculate the final latitude and longitude values
  const latitudeDecimal = latSign * latDecimal;
  const longitudeDecimal = longSign * longDecimal;

  return [latitudeDecimal, longitudeDecimal];
}

app.get("/s", (req, res) => {
  const collarId = req.query.collarId || 1;

  con.query(
    `SELECT * FROM collars WHERE collar_id = ${collarId}`,
    (err, result) => {
      if (err) {
        res.send(JSON.stringify({ err }));
      } else {
        res.send(result);
      }
    }
  );
});

app.post("/s", (req, res) => {
  const nmeaCoords = req.body.nmeaCoords;
  const collarId = req.body.collarId;

  let [latitude, longitude] = convertNMEAtoDecimal(nmeaCoords);
  latitude = Number.parseFloat(latitude).toFixed(6);
  longitude = Number.parseFloat(longitude).toFixed(6);

  con.query(
    `
    UPDATE collars SET lat = ${latitude}, lng = ${longitude} WHERE collar_id = ${collarId}
  `,
    (err, result) => {
      if (err) {
        res.send(JSON.stringify({ err }));
      } else {
        res.send("Success");
      }
    }
  );
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
