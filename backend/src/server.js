const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const config  = require('./config');
const logger  = require('./utils/logger');
const routes  = require('./routes');
const limiter = require('./middleware/rateLimit');
const { notFoundHandler, errorHandler } = require('./middleware/error');

const app = express();

app.use(helmet());
app.use(cors({
  origin: [config.frontendOrigin, 'http://127.0.0.1:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use(morgan(config.env === 'development' ? 'dev' : 'combined'));

app.use('/api', limiter, routes);
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(config.port, () => {
  logger.info(`API listening on http://localhost:${config.port}`);
});
