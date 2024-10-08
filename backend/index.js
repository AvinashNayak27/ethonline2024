const express = require("express");
const { ReclaimClient } = require("@reclaimprotocol/zk-fetch");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = 3000;

// Middleware to parse JSON request bodies
app.use(cors());
app.use(express.json());

const client = new ReclaimClient(
  process.env.RECLAIM_APP_ID,
  process.env.RECLAIM_APP_SECRET
);

// Endpoint to get daily steps proof
app.post("/get-daily-steps", async (req, res) => {
  const { authorization } = req.headers;
  const { startTimeMillis, endTimeMillis } = req.body;

  if (!authorization) {
    return res.status(400).json({ error: "Authorization header is missing" });
  }

  try {
    const data = {
      aggregateBy: [
        {
          dataTypeName: "com.google.step_count.delta",
          dataSourceId:
            "derived:com.google.step_count.delta:com.google.android.gms:estimated_steps",
        },
      ],
      bucketByTime: { durationMillis: endTimeMillis - startTimeMillis },
      startTimeMillis: startTimeMillis,
      endTimeMillis: endTimeMillis,
    };

    const publicOptions = {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        accept: "*/*",
        "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
        "content-type": "application/json",
      },
    };

    const privateOptions = {
      headers: {
        authorization,
      },
    };

    const proof = await client.zkFetch(
      "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate",
      publicOptions,
      privateOptions
    );
    const transformedProof = await ReclaimClient.transformForOnchain(proof);

    return res.json({ proof: transformedProof });
  } catch (error) {
    console.error("Error fetching proof:", error);
    return res.status(500).json({ error: "Failed to fetch proof" });
  }
});

app.get("/get-history", async (req, res) => {
  const { authorization } = req.headers;

  if (!authorization) {
    return res.status(400).json({ error: "Authorization header is missing" });
  }

  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0); // Set to start of today
  const daysToFetch = 7;
  const proofs = [];

  for (let i = 0; i < daysToFetch; i++) {
    const endTimeMillis = currentDate.getTime() - i * 24 * 60 * 60 * 1000;
    const startTimeMillis = endTimeMillis - 24 * 60 * 60 * 1000;

    const data = {
      aggregateBy: [
        {
          dataTypeName: "com.google.step_count.delta",
          dataSourceId:
            "derived:com.google.step_count.delta:com.google.android.gms:estimated_steps",
        },
      ],
      bucketByTime: { durationMillis: 24 * 60 * 60 * 1000 }, // 24 hours
      startTimeMillis: startTimeMillis,
      endTimeMillis: endTimeMillis,
    };

    const publicOptions = {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        accept: "*/*",
        "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
        "content-type": "application/json",
      },
    };

    const privateOptions = {
      headers: {
        authorization,
      },
    };

    const proof = await client.zkFetch(
      "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate",
      publicOptions,
      privateOptions
    );

    const transformedProof = await ReclaimClient.transformForOnchain(proof);
    proofs.push(transformedProof);
  }

  return res.json({ proofs });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
