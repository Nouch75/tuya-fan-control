const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const app = express();
app.use(express.json());

const TUYA_ACCESS_ID = process.env.TUYA_ACCESS_ID;
const TUYA_ACCESS_SECRET = process.env.TUYA_ACCESS_SECRET;
const DEVICE_ID = process.env.TUYA_DEVICE_ID;

let accessToken = null;

async function getAccessToken() {
  const t = Date.now();
  const signStr = TUYA_ACCESS_ID + t;
  const sign = crypto
    .createHmac("sha256", TUYA_ACCESS_SECRET)
    .update(signStr)
    .digest("hex")
    .toUpperCase();

  const res = await axios.get("https://openapi.tuyaeu.com/v1.0/token?grant_type=1", {
    headers: {
      "client_id": TUYA_ACCESS_ID,
      "sign": sign,
      "t": t,
      "sign_method": "HMAC-SHA256",
    },
  });

  accessToken = res.data.result.access_token;
}

app.get("/power/:state", async (req, res) => {
  const state = req.params.state === "on";
  if (!accessToken) await getAccessToken();

  await axios.post(
    `https://openapi.tuyaeu.com/v1.0/devices/${DEVICE_ID}/commands`,
    {
      commands: [
        {
          code: "switch",
          value: state,
        },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "client_id": TUYA_ACCESS_ID,
      },
    }
  );

  res.send(`Ventilateur ${state ? "allumé" : "éteint"}`);
});

app.listen(3000, () => console.log("Serveur Tuya prêt sur le port 3000"));