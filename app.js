const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
const jwt = require("jsonwebtoken");
app.use(express.json());
const bcrypt = require("bcrypt");
const dbPath = path.join(__dirname, "covid19IndiaPortal.db");
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

const Authentication = (request, response, next) => {
  let twttoken;
  const header = request.headers["authorization"];
  if (header !== undefined) {
    twttoken = header.split(" ")[1];
  }
  if (twttoken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    const jwtverify = jwt.verify(
      twttoken,
      "myroman",
      async (error, payload) => {
        if (error) {
          response.status(401);
          response.send("Invalid JWT Token");
        } else {
          request.username = payload.username;
          next();
        }
      }
    );
  }
};
module.exports = app;

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const payload = { username: username };
  const jwttoken = jwt.sign(payload, "myroman");
  const hashedpwd = await bcrypt.hash(password, 10);
  const Querry = `SELECT * FROM user WHERE 
  username='${username}';`;
  let dbuser = await db.get(Querry);
  if (dbuser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    let ismatched = await bcrypt.compare(password, dbuser.password);
    if (ismatched) {
      response.send({ jwtToken: jwttoken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

const getStates = (obj) => {
  return {
    stateId: obj.state_id,
    stateName: obj.state_name,
    population: obj.population,
  };
};

app.get("/states/", Authentication, async (request, response) => {
  const Query = `
    SELECT * FROM state;`;
  const dbstates = await db.all(Query);
  response.send(dbstates.map((object) => getStates(object)));
});

app.get("/states/:stateId/", Authentication, async (request, response) => {
  const { stateId } = request.params;
  const Query = `
    SELECT * FROM state WHERE state_id=${stateId};`;
  const dbstates = await db.get(Query);
  response.send(getStates(dbstates));
});

app.post("/districts/", Authentication, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;

  const Query = `
    INSERT INTO district
    (district_name,state_id,cases,cured,active,deaths)
    VALUES('${districtName}',${stateId},${cases},${cured},${active},${deaths});`;
  const dbstates = await db.run(Query);
  response.send("District Successfully Added");
});

const getDistrict = (object) => {
  return {
    districtId: object.district_id,
    districtName: object.district_name,
    stateId: object.state_id,
    cases: object.cases,
    cured: object.cured,
    active: object.active,
    deaths: object.deaths,
  };
};

app.get(
  "/districts/:districtId/",
  Authentication,
  async (request, response) => {
    const { districtId } = request.params;
    const Query = `
    SELECT * FROM district WHERE district_id=${districtId};`;
    const dbstates = await db.get(Query);
    response.send(getDistrict(dbstates));
  }
);

app.delete(
  "/districts/:districtId/",
  Authentication,
  async (request, response) => {
    const { districtId } = request.params;
    const Query = `
    DELETE FROM district WHERE district_id=${districtId};`;
    const dbstates = await db.run(Query);
    response.send("District Removed");
  }
);

app.put(
  "/districts/:districtId/",
  Authentication,
  async (request, response) => {
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;
    const { districtId } = request.params;
    const Query = `
    UPDATE district SET 
    district_name='${districtName}',
    state_id=${stateId},
    cases=${cases},
    cured=${cured},
    active=${active},
    deaths=${deaths}
    WHERE district_id=${districtId};`;
    const dbstates = await db.run(Query);
    response.send("District Details Updated");
  }
);

const getStats = (obj) => {
  return {
    totalCases: obj.cases,
    totalCured: obj.cured,
    totalActive: obj.deaths,
    totalDeaths: obj.deaths,
  };
};
app.get(
  "/states/:stateId/stats/",
  Authentication,
  async (request, response) => {
    console.log(request.params);
    const Query = `
    SELECT cases,cured,active,deaths FROM district WHERE state_id=${stateId};`;
    const dbstates = await db.get(Query);
    response.send(getStats(dbstates));
  }
);
