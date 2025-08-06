import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import cors from 'cors';
import crypto from 'crypto';

// Chargement du fichier .env
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Variables d’environnement
const {
  TUYA_ACCESS_ID,
  TUYA_ACCESS_SECRET,
  TUYA_DEVICE_ID,
  TUYA_REGION,
  PORT = 3000
} = process.env;

const REGION_URL = {
  eu: 'https://openapi.tuyaeu.com',
  us: 'https://openapi.tuyaus.com',
  cn: 'https://openapi.tuyacn.com'
};

const API_URL = REGION_URL[TUYA_REGION];

let accessToken = '';
let expiresIn = 0;

// === Fonction pour obtenir un token Tuya ===
async function getToken() {
  try {
    const now = Date.now();
    const signStr = TUYA_ACCESS_ID + now;
    const sign = crypto
      .createHmac('sha256', TUYA_ACCESS_SECRET)
      .update(signStr)
      .digest('hex')
      .toUpperCase();

    const res = await axios.get(`${API_URL}/v1.0/token?grant_type=1`, {
      headers: {
        'client_id': TUYA_ACCESS_ID,
        sign,
        t: now,
        sign_method: 'HMAC-SHA256'
      }
    });

    accessToken = res.data.result.access_token;
    expiresIn = now + res.data.result.expire_time;

    console.log('✅ Token Tuya récupéré avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de la récupération du token Tuya :');
    console.error(error.response?.data || error.message);
    throw new Error("Impossible d'obtenir un token Tuya.");
  }
}

// === Fonction pour envoyer une commande au ventilateur ===
async function sendCommand(code, value) {
  if (!accessToken || Date.now() > expiresIn) {
    await getToken();
  }

  const now = Date.now();
  const signStr = TUYA_ACCESS_ID + accessToken + now;
  const sign = crypto
    .createHmac('sha256', TUYA_ACCESS_SECRET)
    .update(signStr)
    .digest('hex')
    .toUpperCase();

  const command = {
    commands: [
      {
        code,
        value
      }
    ]
  };

  return axios.post(
    `${API_URL}/v1.0/devices/${TUYA_DEVICE_ID}/commands`,
    command,
    {
      headers: {
        'client_id': TUYA_ACCESS_ID,
        'access_token': accessToken,
        sign,
        t: now,
        sign_method: 'HMAC-SHA256'
      }
    }
  );
}

// === Routes ===

app.post('/fan/on', async (req, res) => {
  try {
    await sendCommand('switch', true);
    res.send({ status: 'on' });
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

app.post('/fan/off', async (req, res) => {
  try {
    await sendCommand('switch', false);
    res.send({ status: 'off' });
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

// === Lancement du serveur ===
app.listen(PORT, () => {
  console.log(`🚀 Serveur Tuya Fan Backend démarré sur le port ${PORT}`);
});