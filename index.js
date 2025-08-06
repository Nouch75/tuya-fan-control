require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const qs = require('qs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const TUYA_CLIENT_ID = process.env.TUYA_CLIENT_ID;
const TUYA_CLIENT_SECRET = process.env.TUYA_CLIENT_SECRET;
const TUYA_USERNAME = process.env.TUYA_USERNAME;
const TUYA_PASSWORD = process.env.TUYA_PASSWORD;
const TUYA_DEVICE_ID = process.env.TUYA_DEVICE_ID;
const TUYA_API_BASE = 'https://openapi.tuyaeu.com'; // Modifier selon ta région (ex: tuyaus.com, tuyaglobal.com, etc.)

let accessToken = null;
let accessTokenExpire = 0;

// Fonction pour obtenir un token d’accès Tuya
async function getAccessToken() {
  if (accessToken && Date.now() < accessTokenExpire) {
    return accessToken; // Token encore valide
  }

  const url = `${TUYA_API_BASE}/v1.0/token?grant_type=1`;

  const timestamp = Date.now();
  const signString = `${TUYA_CLIENT_ID}${timestamp}${TUYA_CLIENT_SECRET}`;
  const sign = require('crypto').createHmac('sha256', TUYA_CLIENT_SECRET).update(signString).digest('hex').toUpperCase();

  try {
    const res = await axios.get(url, {
      headers: {
        'client_id': TUYA_CLIENT_ID,
        'sign': sign,
        't': timestamp,
        'sign_method': 'HMAC-SHA256',
      }
    });
    accessToken = res.data.result.access_token;
    accessTokenExpire = Date.now() + (res.data.result.expire_time - 60) * 1000; // expiration token moins 1min
    return accessToken;
  } catch (error) {
    console.error('Erreur obtention token Tuya:', error.response?.data || error.message);
    throw new Error('Impossible d’obtenir un token Tuya.');
  }
}

// Fonction pour envoyer une commande à l’appareil Tuya
async function sendCommand(commands) {
  const token = await getAccessToken();
  const url = `${TUYA_API_BASE}/v1.0/devices/${TUYA_DEVICE_ID}/commands`;

  try {
    const res = await axios.post(url, { commands }, {
      headers: {
        'client_id': TUYA_CLIENT_ID,
        'access_token': token,
        'sign_method': 'HMAC-SHA256',
        'Content-Type': 'application/json',
      }
    });
    return res.data;
  } catch (error) {
    console.error('Erreur envoi commande Tuya:', error.response?.data || error.message);
    throw new Error('Erreur lors de l’envoi de la commande.');
  }
}

// Routes API
app.post('/light/on', async (req, res) => {
  try {
    const response = await sendCommand([{ code: 'switch_1', value: true }]);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/light/off', async (req, res) => {
  try {
    const response = await sendCommand([{ code: 'switch_1', value: false }]);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur Tuya Light Backend démarré sur le port ${PORT}`);
});