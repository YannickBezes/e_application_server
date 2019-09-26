import express from 'express'
import routes from './routes'
import middlewares from './routes/middlewares'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
async function launch() {
  middlewares(app) // Initialiseation des midllewares AVANT les routes
  routes(app) // Initilisatopn des routes

  app.listen(process.env.PORT, () => {
    console.log('Server on')
  })
}

launch()

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
