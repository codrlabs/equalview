require('dotenv').config();
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/health', (req, res)=>{
    res.status(200).json({status: 'okay', message : "Server is running!"});
})

app.listen(PORT, () => {  
    console.log(`Server is running on port ${PORT}`);
});