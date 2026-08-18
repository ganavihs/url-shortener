require('dotenv').config();
const { Client } = require('pg');
(async function(){
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    const res = await client.query('SELECT long_url FROM urls WHERE short_code = $1', ['e']);
    console.log('DB_ROWS', JSON.stringify(res.rows));
  } catch (err) {
    console.error('DB_ERR', err.message);
  } finally {
    await client.end();
  }
})();
