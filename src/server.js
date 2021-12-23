const app = require('./app');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('../docs/swagger.json');

init();

async function init() {
  try {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    app.listen(3001, () => {
      console.log('Express App Listening on Port 3001');
    });
  } catch (error) {
    console.error(`An error occurred: ${JSON.stringify(error)}`);
    process.exit(1);
  }
}
