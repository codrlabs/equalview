require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {  
    console.log(`Server is running on port ${PORT}`);
});