// app.js
const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();

// MySQL database connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'rent',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Set up EJS as the view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Index page route
// app.js

// ... (existing code)

// Index page route
app.get('/', async (req, res) => {
    try {
      // Fetch unique state names, state descriptions, author names, and publication dates from the database
      const [states] = await pool.query(`
        SELECT 
          DISTINCT states.STATE_NAME,
          states.STATE_DESC,
          author.Author_Name,
          cities.Pub_Date
        FROM 
          states
        LEFT JOIN 
          cities ON states.ID = cities.ID_STATE
        LEFT JOIN 
          author ON cities.Author_ID = author.Author_ID
      `);
  
      // Organize the data to group by state
      const stateData = states.reduce((acc, row) => {
        const stateName = row.STATE_NAME;
        if (!acc[stateName]) {
          acc[stateName] = {
            STATE_NAME: stateName,
            STATE_DESC: row.STATE_DESC,
            cities: [],
            authorInfo: {
              Author_Name: row.Author_Name,
              Pub_Date: row.Pub_Date
            }
          };
        }
        acc[stateName].cities.push({
          CITY: row.CITY,
          CITY_DESC: row.CITY_DESC
        });
        return acc;
      }, {});
  
      res.render('index', { states: Object.values(stateData) }); // Convert object to array
    } catch (error) {
      console.error('Error fetching data from the database:', error);
      res.status(500).send(`Internal Server Error: ${error.message}`);
    }
  });
  
  // ... (existing code)
  

// City page route with cleaner URL
// City page route with cleaner URL
app.get('/:state', async (req, res) => {
    const state = req.params.state;
    const canonicalUrl = `https://domain.com/${state}`;
    try {
      // Fetch city data for the specified state from the database
      const [cities] = await pool.query(`
        SELECT cities.CITY, cities.CITY_DESC, states.STATE_NAME AS stateName
        FROM cities
        LEFT JOIN states ON cities.ID_STATE = states.ID
        WHERE states.STATE_NAME = ?
      `, [state]);
  
      // Fetch author name and publication date for the specified state from the database
      const [authorInfo] = await pool.query(`
        SELECT DISTINCT author.Author_Name, cities.Pub_Date
        FROM cities
        LEFT JOIN author ON cities.Author_ID = author.Author_ID
        LEFT JOIN states ON cities.ID_STATE = states.ID
        WHERE states.STATE_NAME = ?
      `, [state]);
  
      res.render('city', { state, cities, canonicalUrl, authorInfo: authorInfo[0] });
    } catch (error) {
      console.error('Error fetching data from the database:', error);
      res.status(500).send(`Internal Server Error: ${error.message}`);
    }
  });
  
  
// Content page route
app.get('/:state/:city', async (req, res) => {
  const state = req.params.state;
  const city = req.params.city;
  const canonicalUrl = `https://domain.com/${state}/${city}`;
  try {
    // Fetch author information, publication date, and FAQs
    const [contentData, faqsData] = await Promise.all([
      pool.query(`
        SELECT
          cities.CITY,
          cities.CITY_DESC,
          cities.FAQ,
          cities.Pub_Date,
          author.Author_Name,
          author.Author_Bio
        FROM
          cities
        JOIN
          author ON cities.Author_ID = author.Author_ID
        WHERE
          cities.CITY = ? AND cities.ID_STATE IN (SELECT ID FROM states WHERE STATE_NAME = ?)
      `, [city, state]),
      pool.query(`
        SELECT FAQ
        FROM cities
        WHERE CITY = ? AND ID_STATE IN (SELECT ID FROM states WHERE STATE_NAME = ?)
      `, [city, state])
    ]);

    // Extract relevant information
    const cityInfo = {
      CITY: contentData[0][0].CITY,
      CITY_DESC: contentData[0][0].CITY_DESC,
      FAQ: contentData[0][0].FAQ,
      Pub_Date: contentData[0][0].Pub_Date
    };

    const authorInfo = {
      Author_Name: contentData[0][0].Author_Name,
      Author_Bio: contentData[0][0].Author_Bio
    };

    const faqs = faqsData[0];

    res.render('content', { state, cityInfo, canonicalUrl, authorInfo, faqs });
  } catch (error) {
    console.error('Error fetching data from the database:', error);
    res.status(500).send(`Internal Server Error: ${error.message}`);
  }
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}/`);
});
