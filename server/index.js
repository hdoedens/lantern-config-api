// server/index.js
const fs = require("fs");
const fileName = "/opt/currentmonitor/breaker_config.json";
const { exec } = require("child_process");
const defaultFileContent =
  "ewogICJodWIiOiB7CiAgICAiaHViIjogMSwKICAgICJ2b2x0YWdlX2NhbGlicmF0aW9uX2ZhY3RvciI6IDAuMDUsCiAgICAicGhhc2VzIjogWwogICAgICB7CiAgICAgICAgImlkIjogMSwKICAgICAgICAibmFtZSI6ICJmYXNlMSIsCiAgICAgICAgInBoYXNlX29mZnNldF9ucyI6IDAKICAgICAgfSwKICAgICAgewogICAgICAgICJpZCI6IDIsCiAgICAgICAgIm5hbWUiOiAiZmFzZTIiLAogICAgICAgICJwaGFzZV9vZmZzZXRfbnMiOiA2NjY2NjY3CiAgICAgIH0sCiAgICAgIHsKICAgICAgICAiaWQiOiAzLAogICAgICAgICJuYW1lIjogImZhc2UzIiwKICAgICAgICAicGhhc2Vfb2Zmc2V0X25zIjogMTMzMzMzMzMKICAgICAgfQogICAgXSwKICAgICJmcmVxdWVuY3kiOiA1MCwKICAgICJuZWVkc19jYWxpYnJhdGlvbiI6IGZhbHNlLAogICAgIm1xdHRfYnJva2VyX3VybCI6ICJ0Y3A6Ly8xOTIuMTY4LjEuMToxODgzIiwKICAgICJtcXR0X3Bhc3N3b3JkIjogInBhc3N3b3JkIgogIH0sCiAgImJyZWFrZXJzIjogW10KfQ==";

const express = require("express");
const PORT = process.env.PORT || 3001;

const app = express();

var content = "";

const createDefaultContent = () => {
  // write default file and try loading again
  let buff = new Buffer.from(defaultFileContent, "base64");
  fs.writeFileSync(fileName, buff.toString("ascii"));
  loadContentFromFile();
};

const loadContentFromFile = () => {
  try {
    if (fs.existsSync(fileName)) {
      content = JSON.parse(fs.readFileSync(fileName, "utf8"));
    } else {
      console.log(
        "No breaker config found in '" + fileName + "'. Writing default config."
      );
      createDefaultContent();
    }
  } catch (err) {
    console.error(err);
  }
};

loadContentFromFile();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/hub", (req, res) => {
  res.json(content.hub);
});

app.get("/api/breakers", (req, res) => {
  res.json(content.breakers);
});

app.get("/api/breaker", (req, res) => {
  let { id } = req.query;
  res.json(content.breakers.filter((breaker) => breaker.id == id)[0]);
});

app.get("/api/config", (_, res) => {
  res.json(content);
});

app.get("/api/status", (_, res) => {
  exec("systemctl status currentmonitor", (error, stdout, stderror) => {
    if (error) {
      res.json({ error: error.message });
      return;
    }
    if (stderror) {
      res.json({ error: stderr });
      return;
    }
    res.json({ message: stdout });
  });
});

app.post("/api/calibration", (req, res) => {
  content.hub.voltage_calibration_factor = req.body.voltage_calibration_factor;
  content.hub.needs_calibration = false;
  saveContent();
  res.json({ message: "Calibration saved" });
});

app.post("/api/hub", (req, res) => {
  content.hub = req.body;
  saveContent();
  res.json({ message: "Changes to hub saved" });
});

app.post("/api/breaker", (req, res) => {
  for (var i = 0; i < content.breakers.length; i++) {
    if (content.breakers[i].id == req.body.id) {
      content.breakers[i] = req.body;
    }
  }
  saveContent();
  res.json({ message: "Changes saved to breaker: " + req.body.name });
});

app.post("/api/restart", (_, res) => {
  exec("sudo systemctl restart currentmonitor", (error, stdout, stderr) => {
    if (error) {
      res.json({ error: error.message });
      return;
    }
    if (stderr) {
      res.json({ error: stderr });
      return;
    }
    // no message is given when the command succeeds, so write a custom one
    res.json({ message: "Service succesfully restarted" });
  });
});

app.delete("/api/breaker", (req, res) => {
  for (var i = 0; i < content.breakers.length; i++) {
    if (content.breakers[i].id == req.body.id) {
      content.breakers.splice(i, 1);
    }
  }
  saveContent();
  res.json({ message: "Deleted breaker: " + req.body.name });
});

app.post("/api/breaker/new", (req, res) => {
  let newBreaker = req.body;
  newBreaker.id = getUnusedLowestId(content.breakers);
  content.breakers.push(newBreaker);
  saveContent();
  res.json({ message: "Saved new breaker: " + req.body.name });
});

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});

function saveContent() {
  fs.writeFile(
    fileName,
    JSON.stringify(content, null, 2),
    function writeJSON(err) {
      if (err) return console.log(err);
    }
  );
}

function validateQuery(type, query) {
  switch (type) {
    case "hub":
      if (!query.hubID) return "missing hubID";
      break;

    default:
      break;
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getUnusedLowestId(list) {
  for (var i = 0; i < 50; i++) {
    if (
      list.filter((b) => {
        if (b.id == i) return b;
      }).length == 0
    )
      return i;
  }
}
