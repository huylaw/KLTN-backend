const express = require('express');
const app = express();
//const bodyParser = require('body-parser');
const cors = require('cors');
const router = require('./routes/router')
const port = process.env.PORT || 3000;
//
const { createServer } = require('http');
const createSocketIO = require('./config/socket');
const httpServer = createServer(app);
createSocketIO(httpServer);
app.use(express.json());
app.use(cors());
app.use('/api', router);
app.use('/image', express.static('image'));

httpServer.listen(port, () => {
    console.log(`Server: http://localhost:${port}`);
});